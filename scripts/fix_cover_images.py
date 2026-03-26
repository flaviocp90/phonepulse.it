"""
PhonePulse — Fix Cover Images
Cerca e assegna la cover image agli articoli in attesa di review che ne sono privi.
Eseguito manualmente tramite GitHub Actions (workflow_dispatch).
"""

import os
import json
import logging
import time
from datetime import date

import requests
from supabase import create_client, Client

# Riutilizza la pipeline cover image da news_automation
from news_automation import (
    cerca_cover_image,
    GEMINI_API_KEY,
    GEMINI_BASE_URL,
    GEMINI_MODELS,
    OPENROUTER_API_KEY,
    OPENROUTER_ENDPOINT,
    OPENROUTER_MODELS,
)

# ---------------------------------------------------------------------------
# Logging
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

# ---------------------------------------------------------------------------
# Prompt per generare image_query da titolo + excerpt
# ---------------------------------------------------------------------------
IMAGE_QUERY_PROMPT = """Sei un assistente per un blog tech italiano.
Dato il titolo e l'excerpt di un articolo, genera una image_query: 3-5 parole chiave in inglese
che descrivono il soggetto visivo principale, ottimizzate per la ricerca di immagini fotografiche.

Esempi:
- Articolo su Samsung Galaxy S25 Ultra → "samsung galaxy s25 ultra smartphone"
- Articolo su iOS 18 update → "iphone ios software update screen"
- Articolo su cuffie Sony WH-1000XM6 → "sony headphones wireless noise cancelling"

Titolo: {title}
Excerpt: {excerpt}

Rispondi SOLO con la image_query, senza testo aggiuntivo, virgolette o punteggiatura finale."""


def genera_image_query_gemini(title: str, excerpt: str) -> str | None:
    """Chiama Gemini per generare una image_query contestuale."""
    prompt = IMAGE_QUERY_PROMPT.format(title=title, excerpt=excerpt[:300])
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 50},
    }
    for model in GEMINI_MODELS:
        endpoint = f"{GEMINI_BASE_URL}{model}:generateContent"
        try:
            resp = requests.post(
                f"{endpoint}?key={GEMINI_API_KEY}",
                json=payload,
                timeout=30,
            )
            if resp.status_code in (404, 429):
                continue
            resp.raise_for_status()
            testo = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            if testo:
                logger.info(f"Gemini image_query generata: '{testo}'")
                return testo
        except Exception as e:
            logger.warning(f"Gemini image_query fallito ({model}): {e}")
    return None


def genera_image_query_openrouter(title: str, excerpt: str) -> str | None:
    """Chiama OpenRouter per generare una image_query (fallback Gemini)."""
    prompt = IMAGE_QUERY_PROMPT.format(title=title, excerpt=excerpt[:300])
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://phonepulse.it",
        "X-Title": "PhonePulse",
    }
    for model in OPENROUTER_MODELS[:3]:  # usa solo i primi 3, evita il router automatico
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 50,
        }
        try:
            resp = requests.post(OPENROUTER_ENDPOINT, json=payload, headers=headers, timeout=30)
            if resp.status_code in (404, 429):
                continue
            resp.raise_for_status()
            testo = resp.json()["choices"][0]["message"]["content"].strip()
            if testo:
                logger.info(f"OpenRouter image_query generata [{model}]: '{testo}'")
                return testo
        except Exception as e:
            logger.warning(f"OpenRouter image_query fallito [{model}]: {e}")
    return None


def genera_image_query(title: str, excerpt: str) -> str:
    """
    Genera una image_query per l'articolo usando LLM.
    Fallback sul titolo originale se tutti i provider falliscono.
    """
    if GEMINI_API_KEY:
        query = genera_image_query_gemini(title, excerpt)
        if query:
            time.sleep(2)  # rispetta rate limit Gemini
            return query

    if OPENROUTER_API_KEY:
        query = genera_image_query_openrouter(title, excerpt)
        if query:
            return query

    logger.warning(f"LLM non disponibile per image_query, uso titolo come fallback: '{title}'")
    return title


# ---------------------------------------------------------------------------
# Logica principale
# ---------------------------------------------------------------------------
def fetch_articoli_senza_cover(supabase: Client) -> list[dict]:
    """
    Recupera gli articoli in attesa di review che non hanno cover_image_url.
    Filtra: needs_review=True, is_published=False, discarded=False, cover_image_url IS NULL.
    """
    try:
        result = (
            supabase.table("articles")
            .select("id, title, excerpt, cover_image_url")
            .eq("needs_review", True)
            .eq("is_published", False)
            .eq("discarded", False)
            .is_("cover_image_url", "null")
            .execute()
        )
        logger.info(f"Articoli senza cover trovati: {len(result.data)}")
        return result.data
    except Exception as e:
        logger.error(f"Errore fetch articoli: {e}")
        return []


def aggiorna_cover(supabase: Client, article_id: str, cover_url: str, image_source: str | None = None):
    """Aggiorna cover_image_url (e image_source) per l'articolo specificato."""
    try:
        payload = {"cover_image_url": cover_url}
        if image_source:
            payload["image_source"] = image_source
        supabase.table("articles").update(payload).eq("id", article_id).execute()
        logger.info(f"[AGGIORNATO] id={article_id} → {cover_url[:60]}…")
    except Exception as e:
        logger.error(f"[ERRORE UPDATE] id={article_id}: {e}")


def main():
    logger.info("=== Fix Cover Images avviato ===")

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    articoli = fetch_articoli_senza_cover(supabase)

    if not articoli:
        logger.info("Nessun articolo da processare. Uscita.")
        return

    aggiornati = 0
    falliti = 0

    for art in articoli:
        article_id = art["id"]
        title = art.get("title", "")
        excerpt = art.get("excerpt", "")

        logger.info(f"[PROCESSO] {title}")

        try:
            image_query = genera_image_query(title, excerpt)
            cover_url, image_source = cerca_cover_image(image_query, title, supabase)

            if cover_url:
                aggiorna_cover(supabase, article_id, cover_url, image_source)
                aggiornati += 1
            else:
                logger.warning(f"[NESSUNA COVER] {title} — tutti i provider hanno fallito")
                falliti += 1

            time.sleep(3)  # evita burst sulle API
        except Exception as e:
            logger.error(f"[ERRORE NON GESTITO] {title}: {e}")
            falliti += 1

    logger.info(f"=== Fix Cover Images completato — aggiornati: {aggiornati}, falliti: {falliti} ===")


if __name__ == "__main__":
    main()
