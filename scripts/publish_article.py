"""
PhonePulse — Job B: pubblica automaticamente la bozza più vecchia pronta.
"""
import os
import logging
import requests
from datetime import datetime, timezone
from supabase import create_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
SITE_URL = "https://phonepulse.it"


def invia_telegram(messaggio: str):
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


def main():
    logger.info("=== PhonePulse Job B — Pubblicazione articolo avviata ===")

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Prendi la bozza più vecchia pronta
    result = (
        supabase.table("articles")
        .select("id, title, slug")
        .eq("is_published", False)
        .eq("needs_review", True)
        .eq("discarded", False)
        .order("created_at", desc=False)
        .limit(1)
        .execute()
    )

    if not result.data:
        logger.info("Nessuna bozza disponibile, uscita.")
        return

    articolo = result.data[0]
    articolo_id = articolo["id"]
    title = articolo["title"]
    slug = articolo["slug"]

    # Pubblica
    now = datetime.now(timezone.utc).isoformat()
    supabase.table("articles").update(
        {"is_published": True, "published_at": now}
    ).eq("id", articolo_id).execute()

    logger.info(f"[PUBBLICATO] {title} → {SITE_URL}/articoli/{slug}")

    invia_telegram(
        f"✅ Articolo pubblicato su PhonePulse!\n\n"
        f"📰 {title}\n"
        f"🔗 {SITE_URL}/articoli/{slug}"
    )

    logger.info("=== Job B completato ===")


if __name__ == "__main__":
    main()
