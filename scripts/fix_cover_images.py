"""
PhonePulse — Fix Cover Images
Cerca e assegna la cover image agli articoli in attesa di review che ne sono privi.
Eseguito manualmente tramite GitHub Actions (workflow_dispatch).
"""

import logging
import time
from datetime import datetime, timezone
from supabase import Client
from news_automation import cerca_cover_image, get_supabase
from automation_runs import run_tracked

logger = logging.getLogger(__name__)


def fetch_articoli_senza_cover(supabase: Client) -> list[dict]:
    """
    Recupera gli articoli in attesa di review che non hanno cover_image_url.
    Filtra status=draft e cover_image_url IS NULL, al massimo venti record.
    """
    result = (supabase.table('articles').select('id, title, version')
              .eq('status', 'draft').is_('cover_image_url', 'null').limit(20).execute())
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
            cover_url, image_source = cerca_cover_image('', title, supabase)

            if cover_url:
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

    if counts['failed'] and not counts['updated']:
        raise RuntimeError("No cover could be updated")
    return 'completed'


def main():
    run_tracked(get_supabase(), 'cover_repair', run_cover_repair)


if __name__ == "__main__":
    main()
