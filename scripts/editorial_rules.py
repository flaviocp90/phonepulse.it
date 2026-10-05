"""Pure input checks; these flag risks, they do not certify editorial truth."""

import re
from datetime import datetime
from html.parser import HTMLParser
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def normalize_source_url(url: str) -> str:
    parts = urlsplit(url)
    if parts.scheme != 'https' or not parts.hostname or parts.username or parts.password:
        raise ValueError('Source must be an HTTPS URL without credentials')
    query = [(key, value) for key, value in parse_qsl(parts.query, keep_blank_values=True)
             if not key.lower().startswith('utm_') and key.lower() != 'fbclid']
    return urlunsplit(('https', parts.netloc.lower(), parts.path, urlencode(query), ''))


def is_fresh(source_published_at: str | None, now, max_age_hours: int) -> bool:
    try:
        published = datetime.fromisoformat(source_published_at.replace('Z', '+00:00'))
        if published.tzinfo is None or now.tzinfo is None:
            return False
        return 0 <= (now - published).total_seconds() <= max_age_hours * 3600
    except (AttributeError, TypeError, ValueError):
        return False


class _TextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.hidden += 1

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.hidden = max(0, self.hidden - 1)

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def plain_text(html: str) -> str:
    parser = _TextParser()
    parser.feed(html)
    return ' '.join(' '.join(parser.parts).split())


def promised_list_size(title: str) -> int:
    # ponytail: only leading numeric list promises; broader claims need human review.
    match = re.match(r'^(?:le|i|gli|ecco|top)?\s*(\d+)\s+', title, re.I)
    return int(match[1]) if match else 0


def has_list_items(text: str, size: int) -> bool:
    return len(re.findall(r'^\s*(?:\d+[.)]|[-*]|#{2,3})\s+\S', text, re.M)) >= size


def validate_generated_article(article: object, source_urls: set[str]) -> list[str]:
    if not isinstance(article, dict):
        return ['Expected a JSON object']
    errors = []
    for field in ('title', 'slug', 'excerpt', 'content'):
        if not isinstance(article.get(field), str) or not article[field].strip():
            errors.append(f'{field} must be a non-empty string')
    if errors:
        return errors
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', article['slug']):
        errors.append('Invalid slug')
    if len(article['excerpt']) > 155:
        errors.append('Excerpt exceeds 155 characters')
    urls = article.get('source_urls')
    if not isinstance(urls, list) or not urls:
        errors.append('Sources are required')
        urls = []
    # Check citations in the body as well as the declared sources.
    content = article['content']
    # Accept the simple inline Markdown produced by the prompt. Complex links go to manual review.
    if re.search(r'<[^>]+>|\]\s*\[|^\s*\[[^\]]+\]:', content, re.M):
        errors.append('HTML and reference links require manual review')
    destinations = re.findall(r'\]\(\s*<?([^\s)>]+)', content)
    if not any(url in source_urls for url in destinations):
        errors.append('A known source must be linked in the body')
    body_urls = re.findall(r'https?://[^\s<>"\)]+', content, re.I)
    for url in urls + body_urls + destinations:
        if not isinstance(url, str) or url not in source_urls:
            errors.append('Unknown source URL')
            continue
        try:
            normalize_source_url(url)
        except ValueError:
            errors.append('Invalid source URL')
    text = ' '.join(article[field] for field in ('title', 'excerpt', 'content'))
    if re.search(r'\b(?:ho|abbiamo)\s+(?:testato|provato|misurato)|'
                 r'\b(?:nostr[aeoi]|mia|mio)\s+(?:prova|test|esperienza)|'
                 r'\b(?:nei|durante i)\s+nostri\s+test', text, re.I):
        errors.append('Personal testing claims require manual review')
    size = promised_list_size(article['title'])
    if size and not has_list_items(article['content'], size):
        errors.append('List promise is incomplete')
    return errors
