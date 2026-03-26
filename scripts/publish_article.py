"""
PhonePulse — Job B: pubblica automaticamente le bozze pronte.
"""
import os
import logging
import subprocess
import time
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
PUBLISH_COUNT = int(os.environ.get("PUBLISH_COUNT", "1"))
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


def update_sitemap(supabase_client):
    try:
        result = (
            supabase_client.table("articles")
            .select("slug, published_at")
            .eq("is_published", True)
            .order("published_at", desc=True)
            .execute()
        )
        articoli = result.data or []

        urls = []

        urls.append(
            "  <url>\n"
            "    <loc>https://phonepulse.it/</loc>\n"
            "    <changefreq>daily</changefreq>\n"
            "    <priority>1.0</priority>\n"
            "  </url>"
        )

        for a in articoli:
            lastmod = ""
            if a.get("published_at"):
                lastmod = f"\n    <lastmod>{a['published_at'][:10]}</lastmod>"
            urls.append(
                f"  <url>\n"
                f"    <loc>https://phonepulse.it/articoli/{a['slug']}</loc>{lastmod}\n"
                f"    <changefreq>weekly</changefreq>\n"
                f"    <priority>0.8</priority>\n"
                f"  </url>"
            )

        categories = [
            ("recensioni", "weekly", "0.6"),
            ("comparativi", "weekly", "0.6"),
            ("guide", "weekly", "0.6"),
            ("news", "daily", "0.7"),
            ("offerte", "daily", "0.6"),
        ]
        for slug, freq, priority in categories:
            urls.append(
                f"  <url>\n"
                f"    <loc>https://phonepulse.it/categoria/{slug}</loc>\n"
                f"    <changefreq>{freq}</changefreq>\n"
                f"    <priority>{priority}</priority>\n"
                f"  </url>"
            )

        urls.append(
            "  <url>\n"
            "    <loc>https://phonepulse.it/chi-siamo</loc>\n"
            "    <changefreq>monthly</changefreq>\n"
            "    <priority>0.3</priority>\n"
            "  </url>"
        )
        urls.append(
            "  <url>\n"
            "    <loc>https://phonepulse.it/contatti</loc>\n"
            "    <changefreq>monthly</changefreq>\n"
            "    <priority>0.3</priority>\n"
            "  </url>"
        )

        xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        xml += "\n".join(urls)
        xml += "\n</urlset>\n"

        sitemap_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "public",
            "sitemap.xml",
        )
        with open(sitemap_path, "w", encoding="utf-8") as f:
            f.write(xml)

        subprocess.run(["git", "config", "user.email", "github-actions@github.com"], check=True)
        subprocess.run(["git", "config", "user.name", "GitHub Actions"], check=True)
        subprocess.run(["git", "add", "public/sitemap.xml"], check=True)
        commit = subprocess.run(
            ["git", "commit", "-m", "chore: aggiorna sitemap.xml con articoli pubblicati [skip ci]"],
            capture_output=True,
            text=True,
        )
        if commit.returncode != 0:
            if "nothing to commit" in commit.stdout + commit.stderr:
                logger.info("Sitemap non modificata, nessun commit necessario.")
                return
            raise Exception(commit.stderr)
        subprocess.run(["git", "push"], check=True)

        logger.info(f"Sitemap aggiornata con {len(articoli)} articoli e pushata.")
    except Exception as e:
        print(f"WARN: sitemap update fallita: {e}")


def main():
    logger.info("=== PhonePulse Job B — Pubblicazione articoli avviata ===")
    logger.info(f"PUBLISH_COUNT={PUBLISH_COUNT}")

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    result = (
        supabase.table("articles")
        .select("id, title, slug")
        .eq("is_published", False)
        .eq("needs_review", True)
        .eq("discarded", False)
        .eq("llm_model", "gemini-3.1-flash-lite-preview")
        .eq("image_source", "google_cse")
        .order("created_at", desc=False)
        .limit(PUBLISH_COUNT)
        .execute()
    )

    if not result.data:
        logger.info("Nessuna bozza disponibile, uscita.")
        return

    pubblicati = []
    for i, articolo in enumerate(result.data):
        if i > 0:
            time.sleep(2)

        articolo_id = articolo["id"]
        title = articolo["title"]
        slug = articolo["slug"]

        now = datetime.now(timezone.utc).isoformat()
        supabase.table("articles").update(
            {"is_published": True, "published_at": now}
        ).eq("id", articolo_id).execute()

        logger.info(f"[PUBBLICATO] {title} → {SITE_URL}/articoli/{slug}")
        pubblicati.append(articolo)

    if not pubblicati:
        logger.info("Nessun articolo pubblicato in questo run.")
        return

    update_sitemap(supabase)

    for articolo in pubblicati:
        invia_telegram(
            f"✅ Articolo pubblicato su PhonePulse!\n\n"
            f"📰 {articolo['title']}\n"
            f"🔗 {SITE_URL}/articoli/{articolo['slug']}"
        )

    logger.info(f"=== Job B completato — {len(pubblicati)} articolo/i pubblicato/i ===")


if __name__ == "__main__":
    main()
