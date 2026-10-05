"""
PhonePulse — Job B: pubblica soltanto versioni approvate dalla redazione.
"""
import os
import logging
import subprocess
import argparse
import requests
from datetime import datetime, timezone
from supabase import create_client
from editorial_rules import is_fresh

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
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
        logger.warning("Telegram notification failed (%s)", type(e).__name__)


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
            else:
                raise RuntimeError("Sitemap commit failed")
        subprocess.run(["git", "push"], check=True)

        logger.info(f"Sitemap aggiornata con {len(articoli)} articoli e pushata.")
        return True
    except Exception as e:
        logger.warning("Sitemap distribution failed (%s)", type(e).__name__)
        return False


def candidate_reason(article: dict, now) -> str | None:
    if article.get('status') != 'approved' or article.get('origin') == 'legacy':
        return 'ineligible'
    if article.get('approved_version') != article.get('version'):
        return 'ineligible'
    if article.get('content_format') not in ('news', 'guide', 'comparison', 'review'):
        return 'ineligible'
    sources = article.get('sources')
    if not isinstance(sources, list) or not sources or not isinstance(sources[0], dict):
        return 'ineligible'
    if article['content_format'] == 'news' and not is_fresh(sources[0].get('published_at'), now, 72):
        return 'expired'
    return None


def run_publication(supabase, dry_run=False, publish_count=1) -> dict:
    if not isinstance(publish_count, int) or publish_count < 1:
        raise ValueError('PUBLISH_COUNT must be a positive integer')
    summary = {'candidates': [], 'published': 0, 'unchanged': 0,
               'expired': 0, 'ineligible': 0, 'conflicts': 0, 'failed': 0}
    candidates = []
    offset = 0
    while len(candidates) < publish_count:
        rows = (supabase.table('articles')
                .select('id,title,slug,status,origin,version,approved_version,content_format,sources')
                .eq('status', 'approved').order('approved_at').order('id')
                .range(offset, offset + 99).execute().data)
        if rows is None:
            raise RuntimeError('Approved queue unavailable')
        for article in rows:
            reason = candidate_reason(article, datetime.now(timezone.utc))
            if reason:
                summary[reason] += 1
                continue
            candidates.append(article)
            if len(candidates) == publish_count:
                break
        if len(rows) < 100:
            break
        offset += 100
    summary['candidates'] = [article['id'] for article in candidates]
    if dry_run:
        logger.info('Dry-run: %s', summary)
        return summary
    for article in candidates:
        try:
            outcome = supabase.rpc('publish_article', {
                'p_id': article['id'], 'p_expected_version': article['version']}).execute().data
            if (not isinstance(outcome, dict) or outcome.get('id') != article['id']
                    or outcome.get('status') != 'published'
                    or outcome.get('version') != article['version']
                    or not isinstance(outcome.get('changed'), bool)):
                raise RuntimeError('Invalid publish RPC response')
        except Exception as error:
            code = getattr(error, 'code', None)
            if code in ('40001', '23514'):
                summary['conflicts'] += 1
            else:
                summary['failed'] += 1
            logger.warning('Publish id=%s code=%s failed (%s)', article['id'], code, type(error).__name__)
            continue
        if outcome['changed']:
            summary['published'] += 1
            invia_telegram('Articolo pubblicato: ' + article['title'] +
                           '\n' + SITE_URL + '/articoli/' + article['slug'])
        else:
            summary['unchanged'] += 1
    # Until U5 is deployed, retain git-based sitemap and recover failed distribution even with no new articles.
    distributed = update_sitemap(supabase)
    logger.info('Publication results: %s; distribution=%s', summary, distributed)
    if summary['failed']:
        raise RuntimeError('Publication RPC failures; check logged IDs before retry')
    if not distributed:
        raise RuntimeError('Sitemap distribution failed; DB publication remains committed')
    return summary


def main():
    parser = argparse.ArgumentParser(description='Publish approved current article versions')
    parser.add_argument('--dry-run', action='store_true', help='Read candidates without any effects')
    args = parser.parse_args()
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError('SUPABASE_URL and SUPABASE_SERVICE_KEY are required')
    count = int(os.environ.get('PUBLISH_COUNT', '1'))
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    run_publication(supabase, dry_run=args.dry_run, publish_count=count)


if __name__ == '__main__':
    main()
