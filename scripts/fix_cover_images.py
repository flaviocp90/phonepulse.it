"""
PhonePulse — Fix Cover Images
Cerca e assegna la cover image agli articoli in attesa di review che ne sono privi.
Eseguito manualmente tramite GitHub Actions (workflow_dispatch).
"""

import logging
import time
from datetime import datetime, timezone
from supabase import Client
from news_automation import EDITORIAL_COVER_URL, cerca_cover_image, get_supabase
from automation_runs import run_tracked

logger = logging.getLogger(__name__)


def fetch_articoli_senza_cover(supabase: Client) -> list[dict]:
    result = (supabase.table('articles').select('id, title, version, sources, cover_image_url')
              .eq('status', 'draft').eq('origin', 'rss')
              .or_(f'cover_image_url.is.null,cover_image_url.eq.{EDITORIAL_COVER_URL}')
              .order('created_at', desc=True).limit(20).execute())
    return result.data


def aggiorna_cover(supabase: Client, article_id: str, cover_url: str,
                  image_source: str | None = None, expected_version: int | None = None) -> bool:
    payload = {'cover_image_url': cover_url, 'image_source': image_source}
    if expected_version is not None:
        payload['version'] = expected_version + 1
    payload['content_updated_at'] = datetime.now(timezone.utc).isoformat()
    query = supabase.table('articles').update(payload).eq('id', article_id).eq('status', 'draft')
    if expected_version is not None:
        query = query.eq('version', expected_version)
    result = query.execute()
    return bool(result.data and result.data[0]['id'] == article_id)


def run_cover_repair(supabase, counts):
    articoli = fetch_articoli_senza_cover(supabase)

    if not articoli:
        logger.info("Nessun articolo da processare. Uscita.")
        return 'no_candidates'

    counts.update(updated=0, failed=0)

    for art in articoli:
        article_id = art["id"]
        title = art.get("title", "")

        logger.info(f"[PROCESSO] {title}")

        try:
            sources = art.get('sources') or []
            query = (sources[0].get('title') if sources else None) or title
            cover = cerca_cover_image(query)

            if cover:
                cover_url, image_source = cover
                if aggiorna_cover(supabase, article_id, cover_url, image_source, art['version']):
                    counts['updated'] += 1
                else:
                    counts['failed'] += 1
            else:
                logger.warning(f"[NESSUNA COVER] {title} — tutti i provider hanno fallito")
                counts['failed'] += 1

            time.sleep(3)  # evita burst sulle API
        except Exception as e:
            logger.error("Cover repair failed (%s)", type(e).__name__)
            raise

    return 'completed' if counts['updated'] else 'no_candidates'


def main():
    run_tracked(get_supabase(), 'cover_repair', run_cover_repair)


if __name__ == "__main__":
    main()
