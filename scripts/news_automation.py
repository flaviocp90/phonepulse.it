"""
PhonePulse News Automation
Raccoglie articoli da feed RSS, genera bozze con LLM e le inserisce in Supabase.
"""

import os
import hashlib
import json
import logging
import concurrent.futures
import time
from datetime import date, datetime, timezone

import feedparser
import requests
from supabase import create_client, Client

# ---------------------------------------------------------------------------
# Configurazione logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Variabili d'ambiente
# ---------------------------------------------------------------------------
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
UNSPLASH_ACCESS_KEY = os.environ.get("UNSPLASH_ACCESS_KEY", "")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

# ---------------------------------------------------------------------------
# Costanti
# ---------------------------------------------------------------------------
FEED_URLS = [
    "https://www.androidauthority.com/feed/",
    "https://www.phonearena.com/feed",
    "https://www.theverge.com/rss/index.xml"
]


GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent"
)
OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
GEMINI_DAILY_LIMIT = 220

SYSTEM_PROMPT_TEMPLATE = """Sei il redattore di PhonePulse (phonepulse.it), un blog tech italiano.
Scrivi una news in italiano partendo da queste informazioni: {title} — {excerpt}.

Regole:
- Tono: diretto, tecnico ma accessibile, prospettiva italiana (prezzi €, garanzia IT)
- Lunghezza corpo: 300–500 parole in markdown
- Il titolo deve contenere la keyword principale ed essere max 60 caratteri
- L'excerpt deve essere autonomo e leggibile fuori contesto (max 155 char)
- Non copiare il testo fonte: rielabora con valore aggiunto
- Rispondi SOLO con il JSON descritto, senza testo aggiuntivo o backtick markdown

Produci esattamente questo JSON:
{{
  "title": "Titolo SEO ottimizzato (max 60 char)",
  "slug": "titolo-seo-ottimizzato",
  "excerpt": "Excerpt descrittivo (max 155 char)",
  "content": "Corpo articolo in markdown (min 300 parole)",
  "seo_title": "Titolo SEO completo",
  "seo_description": "Meta description (max 155 char)",
  "category_id": "DA_CONFIGURARE",
  "tags": ["smartphone", "android"],
  "affiliate_links": {{}}
}}"""


# ---------------------------------------------------------------------------
# Helper: client Supabase (inizializzato una sola volta)
# ---------------------------------------------------------------------------
def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# ---------------------------------------------------------------------------
# FASE 1 — Raccolta RSS in parallelo
# ---------------------------------------------------------------------------
def leggi_feed(url: str) -> list[dict]:
    """Legge un singolo feed RSS e restituisce una lista di item."""
    try:
        parsed = feedparser.parse(url)
        items = []
        for entry in parsed.entries:
            title = getattr(entry, "title", "").strip()
            link = getattr(entry, "link", "").strip()
            # summary ha la precedenza, poi description
            excerpt = getattr(entry, "summary", "") or getattr(entry, "description", "")
            # Rimuovi eventuali tag HTML basilari dall'excerpt
            excerpt = excerpt.strip()
            if title and link:
                items.append({"title": title, "link": link, "excerpt": excerpt, "source": url})
        logger.info(f"Feed {url}: {len(items)} articoli letti")
        return items
    except Exception as e:
        logger.error(f"Errore lettura feed {url}: {e}")
        return []


def raccogli_tutti_i_feed() -> list[dict]:
    """Legge tutti i feed in parallelo e restituisce la lista unificata."""
    tutti = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(leggi_feed, url): url for url in FEED_URLS}
        for future in concurrent.futures.as_completed(futures):
            tutti.extend(future.result())
    logger.info(f"Totale articoli raccolti da tutti i feed: {len(tutti)}")
    return tutti


# ---------------------------------------------------------------------------
# FASE 1 — Deduplicazione hash 48h
# ---------------------------------------------------------------------------
def calcola_hash(title: str) -> str:
    """Calcola MD5 del titolo normalizzato."""
    return hashlib.md5(title.strip().lower().encode("utf-8")).hexdigest()


def hash_esiste(supabase: Client, hash_md5: str) -> bool:
    """Controlla se l'hash è già presente nella tabella news_hashes."""
    result = supabase.table("news_hashes").select("id").eq("hash", hash_md5).execute()
    return len(result.data) > 0


def inserisci_hash(supabase: Client, hash_md5: str, source_url: str):
    """Inserisce un nuovo hash nella tabella news_hashes."""
    supabase.table("news_hashes").insert(
        {"hash": hash_md5, "source_url": source_url}
    ).execute()


def cleanup_hash_vecchi(supabase: Client):
    """Elimina gli hash più vecchi di 30 giorni."""
    try:
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        supabase.table("news_hashes").delete().lt("created_at", cutoff).execute()
        logger.info("Cleanup hash vecchi completato")
    except Exception as e:
        logger.error(f"Errore cleanup hash: {e}")


# ---------------------------------------------------------------------------
# Controllo duplicati pre-LLM: cerca titolo simile nella tabella articles
# ---------------------------------------------------------------------------
def titolo_gia_presente(supabase: Client, title: str) -> bool:
    """
    Restituisce True se un articolo con titolo molto simile esiste già in articles.
    Normalizza il titolo a slug per il confronto, così cattura varianti minori.
    """
    import re
    slug_tentativo = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:80]
    try:
        result = (
            supabase.table("articles")
            .select("id")
            .ilike("slug", f"{slug_tentativo[:30]}%")
            .execute()
        )
        return len(result.data) > 0
    except Exception as e:
        logger.warning(f"Impossibile verificare duplicati pre-LLM: {e}")
        return False


# ---------------------------------------------------------------------------
# FASE 2 — Contatore giornaliero Gemini
# ---------------------------------------------------------------------------
def get_gemini_calls_oggi(supabase: Client) -> int:
    """Restituisce il numero di chiamate Gemini effettuate oggi."""
    oggi = date.today().isoformat()
    result = supabase.table("daily_counters").select("gemini_calls").eq("date", oggi).execute()
    if result.data:
        return result.data[0]["gemini_calls"]
    # Prima chiamata del giorno: crea il record (se fallisce per RLS si parte da 0)
    try:
        supabase.table("daily_counters").insert({"date": oggi, "gemini_calls": 0}).execute()
    except Exception as e:
        logger.warning(f"Impossibile creare record daily_counters: {e}")
    return 0


def incrementa_gemini_calls(supabase: Client):
    """Incrementa di 1 il contatore Gemini per oggi (read + write, nessun upsert)."""
    oggi = date.today().isoformat()
    try:
        result = supabase.table("daily_counters").select("gemini_calls").eq("date", oggi).execute()
        if result.data:
            nuovo_valore = result.data[0]["gemini_calls"] + 1
            supabase.table("daily_counters").update(
                {"gemini_calls": nuovo_valore, "updated_at": datetime.now(timezone.utc).isoformat()}
            ).eq("date", oggi).execute()
    except Exception as e:
        # Non bloccare l'elaborazione dell'articolo se il contatore fallisce
        logger.warning(f"Impossibile aggiornare contatore Gemini: {e}")


# ---------------------------------------------------------------------------
# FASE 2 — Chiamate LLM
# ---------------------------------------------------------------------------
def chiama_gemini(title: str, excerpt: str) -> str | None:
    """
    Chiama Gemini 2.0 Flash con un retry su 429 (attende 15s prima di riprovare).
    Restituisce None in caso di errore.
    """
    prompt = SYSTEM_PROMPT_TEMPLATE.format(title=title, excerpt=excerpt)
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 8192},
    }
    for tentativo in range(2):
        try:
            resp = requests.post(
                f"{GEMINI_ENDPOINT}?key={GEMINI_API_KEY}",
                json=payload,
                timeout=60,
            )
            if resp.status_code == 429 and tentativo == 0:
                logger.warning("Gemini 429, attendo 15s e riprovo...")
                time.sleep(15)
                continue
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            logger.error(f"Errore Gemini: {e}")
            return None
    return None


OPENROUTER_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "google/gemma-3-27b-it:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "openrouter/free",  # router automatico OpenRouter, fallback finale
]


def chiama_openrouter(title: str, excerpt: str) -> str | None:
    """
    Chiama OpenRouter con fallback a cascata sui modelli in OPENROUTER_MODELS.
    Per ogni modello:
      - successo → restituisce subito il testo (esce dal loop)
      - 404 → modello non disponibile, passa al successivo
      - 429 → rate limit, passa al successivo senza attendere
      - altro errore → logga e passa al successivo
    Se tutti i modelli falliscono, restituisce None.
    """
    prompt = SYSTEM_PROMPT_TEMPLATE.format(title=title, excerpt=excerpt)
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://phonepulse.it",
        "X-Title": "PhonePulse",
    }

    for model in OPENROUTER_MODELS:
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 2048,
        }
        try:
            resp = requests.post(
                OPENROUTER_ENDPOINT,
                json=payload,
                headers=headers,
                timeout=90,
            )
            if resp.status_code == 429:
                logger.warning(f"OpenRouter [{model}] 429, provo il prossimo")
                continue
            if resp.status_code == 404:
                logger.warning(f"OpenRouter [{model}] 404 (modello non trovato), provo il prossimo")
                continue
            resp.raise_for_status()
            testo = resp.json()["choices"][0]["message"]["content"]
            if testo:
                logger.info(f"OpenRouter [{model}] OK")
                return testo
            logger.warning(f"OpenRouter [{model}] risposta vuota, provo il prossimo")
        except Exception as e:
            logger.warning(f"OpenRouter [{model}] errore: {e}, provo il prossimo")
            continue

    logger.error("Tutti i modelli OpenRouter hanno fallito — nessun testo generato")
    return None


def genera_bozza(supabase: Client, title: str, excerpt: str) -> dict | None:
    """
    Seleziona il motore LLM corretto, chiama l'API e restituisce il dict JSON.
    Gestisce il dual-engine: Gemini < 220 chiamate/giorno, poi OpenRouter.
    """
    gemini_calls = get_gemini_calls_oggi(supabase)
    testo_risposta = None

    if gemini_calls < GEMINI_DAILY_LIMIT:
        logger.info(f"Uso Gemini (chiamate oggi: {gemini_calls})")
        testo_risposta = chiama_gemini(title, excerpt)
        if testo_risposta:
            incrementa_gemini_calls(supabase)
            time.sleep(4)  # rispetta il limite ~15 RPM di gemini-2.0-flash free
        else:
            # Gemini fallito → prova OpenRouter
            logger.warning("Gemini fallito, fallback su OpenRouter")
            testo_risposta = chiama_openrouter(title, excerpt)
    else:
        logger.info(f"Limite Gemini raggiunto ({gemini_calls}), uso OpenRouter")
        testo_risposta = chiama_openrouter(title, excerpt)

    if not testo_risposta:
        logger.error("Entrambi i motori LLM hanno fallito")
        return None

    # Parsing JSON
    try:
        # Rimuovi eventuali backtick residui
        testo_pulito = testo_risposta.strip().strip("`")
        if testo_pulito.startswith("json"):
            testo_pulito = testo_pulito[4:].strip()
        return json.loads(testo_pulito)
    except json.JSONDecodeError as e:
        logger.error(f"JSON non valido dalla risposta LLM: {e}\nRisposta: {testo_risposta[:200]}")
        return None


# ---------------------------------------------------------------------------
# FASE 3 — Cover image da Unsplash
# ---------------------------------------------------------------------------
def cerca_cover_image(title: str) -> str | None:
    """Cerca su Unsplash una cover image usando le prime 3 keyword del titolo."""
    if not UNSPLASH_ACCESS_KEY:
        return None
    # Prendi le prime 2-3 parole significative (almeno 4 caratteri)
    parole = [p for p in title.split() if len(p) >= 4][:3]
    query = " ".join(parole) if parole else title
    try:
        resp = requests.get(
            "https://api.unsplash.com/search/photos",
            params={"query": query, "orientation": "landscape", "per_page": 1},
            headers={"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("results"):
            url = data["results"][0]["urls"]["regular"]
            logger.info(f"Unsplash cover trovata: {url[:60]}…")
            return url
        logger.warning("Unsplash: nessun risultato per la query")
    except Exception as e:
        logger.warning(f"Unsplash non disponibile: {e}")
    return None


# ---------------------------------------------------------------------------
# FASE 3 — Quality gate
# ---------------------------------------------------------------------------
def supera_quality_gate(articolo: dict, supabase: Client) -> tuple[bool, str]:
    """
    Verifica i criteri di qualità dell'articolo generato.
    Restituisce (True, "") se ok, oppure (False, motivo) se scartato.
    """
    content = articolo.get("content", "")
    excerpt = articolo.get("excerpt", "")
    slug = articolo.get("slug", "")

    # Conteggio parole del corpo
    parole = len(content.split())
    if parole < 300:
        return False, f"content troppo corto ({parole} parole, minimo 300)"

    # Lunghezza excerpt
    if len(excerpt) > 155:
        return False, f"excerpt troppo lungo ({len(excerpt)} char, massimo 155)"

    # Unicità slug
    try:
        result = supabase.table("articles").select("id").eq("slug", slug).execute()
        if result.data:
            return False, f"slug '{slug}' già presente in Supabase"
    except Exception as e:
        logger.warning(f"Impossibile verificare unicità slug: {e}")

    return True, ""


# ---------------------------------------------------------------------------
# Helper: recupera category_id per slug "news"
# ---------------------------------------------------------------------------
def get_category_id_news(supabase: Client) -> str | None:
    """Recupera l'UUID della categoria con slug 'news' da Supabase."""
    try:
        result = supabase.table("categories").select("id").eq("slug", "news").execute()
        if result.data:
            return result.data[0]["id"]
    except Exception as e:
        logger.error(f"Errore recupero category_id: {e}")
    return None


# ---------------------------------------------------------------------------
# FASE 4 — Notifiche Telegram
# ---------------------------------------------------------------------------
def invia_telegram(messaggio: str):
    """Invia un messaggio Telegram al bot configurato."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.warning("Credenziali Telegram non configurate, notifica saltata")
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": messaggio, "parse_mode": "HTML"},
            timeout=10,
        )
    except Exception as e:
        logger.warning(f"Errore notifica Telegram: {e}")


# ---------------------------------------------------------------------------
# Pipeline principale per un singolo articolo
# ---------------------------------------------------------------------------
def processa_articolo(item: dict, supabase: Client, category_id: str | None):    
    """
    Elabora un singolo articolo RSS attraverso tutte le fasi.
    Gestisce gli errori in modo che un fallimento non blocchi gli altri.
    """
    title = item["title"]
    link = item["link"]
    excerpt = item.get("excerpt", "")
    source = item.get("source", "")

    # --- Deduplicazione hash ---
    hash_md5 = calcola_hash(title)
    if hash_esiste(supabase, hash_md5):
        logger.info(f"[SKIP duplicato hash] {title}")
        return

    # --- Generazione bozza ---
    logger.info(f"[LLM] Genero bozza per: {title}")
    articolo = genera_bozza(supabase, title, excerpt)

    if not articolo:
        logger.error(f"[ERRORE LLM] {title}")
        return

    # --- Imposta category_id dinamico ---
    if category_id:
        articolo["category_id"] = category_id
    else:
        logger.warning("category_id 'news' non trovato, uso None")
        articolo["category_id"] = None

    # --- Cover image (usa titolo RSS originale in inglese per query Unsplash migliore) ---
    cover_url = cerca_cover_image(title)
    articolo["cover_image_url"] = cover_url

    # --- Quality gate ---
    ok, motivo = supera_quality_gate(articolo, supabase)
    if not ok:
        logger.warning(f"[SCARTATO] {title} — {motivo}")
        invia_telegram(
            f"⚠️ Articolo scartato dal quality gate\n\n📰 {articolo.get('title', title)}\nMotivo: {motivo}"
        )
        return

    # --- INSERT in Supabase ---
    record = {
        "title": articolo["title"],
        "slug": articolo["slug"],
        "excerpt": articolo["excerpt"],
        "content": articolo["content"],
        "seo_title": articolo.get("seo_title", articolo["title"]),
        "seo_description": articolo.get("seo_description", articolo["excerpt"]),
        "category_id": articolo["category_id"],
        "cover_image_url": articolo.get("cover_image_url"),
        "author": "PhonePulse Bot",
        "is_published": False,
        "needs_review": True,
        "discarded": False,
        "affiliate_links": {},
        "score": None,
    }

    try:
        supabase.table("articles").insert(record).execute()
        # Hash inserito solo dopo INSERT riuscito
        inserisci_hash(supabase, hash_md5, link)
        logger.info(f"[BOZZA] {articolo['title']} (fonte: {source})")
        invia_telegram(
            f"🆕 Nuova bozza pronta per review\n\n"
                f"📰 {articolo['title']}\n\n"
                f"👉 Vai su phonepulse.it/admin/review per approvare"
            )
    except Exception as e:
        logger.error(f"[ERRORE INSERT] {title}: {e}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    logger.info("=== PhonePulse News Automation avviata ===")

    # Inizializza client Supabase
    supabase = get_supabase()

    # Cleanup hash vecchi (operazione di manutenzione)
    cleanup_hash_vecchi(supabase)

    # Recupera category_id per "news" una sola volta
    category_id = get_category_id_news(supabase)
    if not category_id:
        logger.warning("Categoria 'news' non trovata in Supabase — category_id sarà None")

    # Raccoglie tutti gli articoli dai feed RSS
    articoli = raccogli_tutti_i_feed()

    if not articoli:
        logger.warning("Nessun articolo raccolto dai feed")
        return

    # Processa ogni articolo in modo robusto (errori isolati)
    for item in articoli:
        try:
            processa_articolo(item, supabase, category_id)
            time.sleep(5)  # rispetta rate limit Gemini ~12 RPM
        except Exception as e:
            logger.error(f"[ERRORE NON GESTITO] {item.get('title', '???')}: {e}")

    logger.info("=== PhonePulse News Automation completata ===")


if __name__ == "__main__":
    main()
