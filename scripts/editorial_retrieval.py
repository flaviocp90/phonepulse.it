"""Conservative HTTPS retrieval for PhonePulse editorial research.

Not connected to the legacy RSS generator. Network operations are explicit:
no database writes, no model calls, no publication.
"""
from __future__ import annotations

from dataclasses import dataclass
from html.parser import HTMLParser
from ipaddress import ip_address
import http.client
import re
import socket
import ssl
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser

from editorial_evidence import EvidenceError, canonical_public_url

USER_AGENT = "PhonePulseResearch/0.1 (+https://www.phonepulse.it/contatti)"
MAX_HTML_BYTES = 512 * 1024
MAX_ROBOTS_BYTES = 64 * 1024
MAX_REDIRECTS = 3
MAX_TEXT_CHARS = 16000
TIMEOUT_SECONDS = 8


class RetrievalError(EvidenceError):
    pass


@dataclass(frozen=True)
class RetrievedDocument:
    requested_url: str
    final_url: str
    text: str
    title: str
    redirects: tuple[str, ...]


class _DocumentParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.title_parts: list[str] = []
        self.hidden = 0
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "svg", "noscript", "template", "nav", "footer"):
            self.hidden += 1
        if tag == "title" and not self.hidden:
            self.in_title = True
        if tag in ("p", "div", "section", "article", "li", "h1", "h2", "h3", "br"):
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style", "svg", "noscript", "template", "nav", "footer"):
            self.hidden = max(0, self.hidden - 1)
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.hidden:
            return
        if self.in_title:
            self.title_parts.append(data)
        else:
            self.parts.append(data)


def _resolve_public_ips(host: str) -> tuple[str, ...]:
    try:
        records = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except (OSError, socket.gaierror) as exc:
        raise RetrievalError("DNS resolution failed") from exc
    ips = sorted({row[4][0] for row in records})
    if not ips:
        raise RetrievalError("Host has no addresses")
    for raw in ips:
        try:
            addr = ip_address(raw)
        except ValueError as exc:
            raise RetrievalError("Malformed resolved IP") from exc
        if not addr.is_global:
            raise RetrievalError("DNS resolved to non-public address")
    return tuple(ips)


class _PinnedTLS(http.client.HTTPSConnection):
    def __init__(self, hostname: str, pinned_ip: str):
        super().__init__(hostname, 443, timeout=TIMEOUT_SECONDS,
                         context=ssl.create_default_context())
        self.pinned_ip = pinned_ip

    def connect(self):
        # TLS certificate and SNI remain bound to the original hostname.
        raw = socket.create_connection((self.pinned_ip, 443), self.timeout)
        try:
            self.sock = self._context.wrap_socket(raw, server_hostname=self.host)
        except Exception:
            raw.close()
            raise


def _request_once(url: str, *, max_bytes: int) -> tuple[int, dict[str, str], bytes]:
    parsed = urlsplit(canonical_public_url(url))
    # DNS must be checked for every request, including robots and redirect hops.
    addresses = _resolve_public_ips(parsed.hostname)
    conn = _PinnedTLS(parsed.hostname, addresses[0])
    path = parsed.path or "/"
    if parsed.query:
        path += "?" + parsed.query
    try:
        conn.request("GET", path, headers={
            "Host": parsed.hostname,
            "User-Agent": USER_AGENT,
            "Accept": "text/html,text/plain;q=0.8",
            "Accept-Encoding": "identity",
            "Connection": "close",
        })
        result = conn.getresponse()
        headers = {key.lower(): value for key, value in result.getheaders()}
        encoding = headers.get("content-encoding", "identity").lower()
        if encoding not in ("identity", ""):
            raise RetrievalError("Compressed responses are not accepted")
        declared = headers.get("content-length")
        if declared:
            try:
                if int(declared) > max_bytes:
                    raise RetrievalError("Response exceeds size limit")
            except ValueError as exc:
                raise RetrievalError("Invalid content length") from exc
        data = result.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise RetrievalError("Response exceeds size limit")
        return result.status, headers, data
    except (OSError, ssl.SSLError, http.client.HTTPException) as exc:
        raise RetrievalError("HTTPS connection failed") from exc
    finally:
        conn.close()


def _robots_allowed(url: str) -> bool:
    parsed = urlsplit(url)
    robots_url = f"https://{parsed.hostname}/robots.txt"
    status, headers, data = _request_once(robots_url, max_bytes=MAX_ROBOTS_BYTES)
    if status in (404, 410):
        return True
    # Fail closed on blocked/unknown/redirected robots responses.
    if status != 200 or not headers.get("content-type", "").lower().startswith("text/plain"):
        return False
    parser = RobotFileParser()
    parser.parse(data.decode("utf-8", errors="replace").splitlines())
    return parser.can_fetch(USER_AGENT, url)


def fetch_document(url: str) -> RetrievedDocument:
    """Retrieve permitted HTML with bounded redirects and network reads.

    Follows robots.txt, but this does NOT establish copyright/ToS permission
    to republish the text. Evidence must still be checked by an editor.
    """
    requested = canonical_public_url(url)
    current = requested
    visited = set()
    redirects = []
    for hop in range(MAX_REDIRECTS + 1):
        if current in visited:
            raise RetrievalError("Redirect loop")
        visited.add(current)
        if not _robots_allowed(current):
            raise RetrievalError("robots.txt disallows retrieval or is unavailable")
        status, headers, body = _request_once(current, max_bytes=MAX_HTML_BYTES)
        if status in (301, 302, 303, 307, 308):
            if hop == MAX_REDIRECTS:
                raise RetrievalError("Too many redirects")
            target = headers.get("location")
            if not target:
                raise RetrievalError("Redirect without Location")
            new_url = canonical_public_url(urljoin(current, target))
            # The next hop receives its own DNS validation and robots check.
            redirects.append(new_url)
            current = new_url
            continue
        if status != 200:
            raise RetrievalError(f"HTTP status {status}")
        kind = headers.get("content-type", "").lower().split(";", 1)[0].strip()
        if kind not in ("text/html", "application/xhtml+xml"):
            raise RetrievalError("Source is not HTML")
        html = body.decode("utf-8", errors="replace")
        parser = _DocumentParser()
        parser.feed(html)
        text = re.sub(r"\s+", " ", " ".join(parser.parts)).strip()
        title = re.sub(r"\s+", " ", " ".join(parser.title_parts)).strip()
        if len(text) < 100:
            raise RetrievalError("Insufficient extracted text")
        return RetrievedDocument(requested, current, text[:MAX_TEXT_CHARS],
                                 title[:250], tuple(redirects))
    raise RetrievalError("Too many redirects")
