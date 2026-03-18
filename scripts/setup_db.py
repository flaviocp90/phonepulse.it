"""
PhonePulse — setup_db.py
Crea le tabelle news_hashes e daily_counters su Supabase.

Richiede:
  SUPABASE_MANAGEMENT_KEY  — token management API da app.supabase.com/account/tokens
  SUPABASE_PROJECT_REF     — ID progetto (default: rwvtvzdabdgtglsablcw)

Uso:
  SUPABASE_MANAGEMENT_KEY=sbp_xxx python scripts/setup_db.py

Questo script è usa-e-getta: eliminarlo dopo l'esecuzione.
"""
import os
import sys
import requests

PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "rwvtvzdabdgtglsablcw")
MANAGEMENT_KEY = os.environ.get("SUPABASE_MANAGEMENT_KEY", "")

if not MANAGEMENT_KEY:
    print("ERRORE: variabile SUPABASE_MANAGEMENT_KEY mancante.")
    print("Genera un token su: https://app.supabase.com/account/tokens")
    sys.exit(1)

ENDPOINT = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
HEADERS = {
    "Authorization": f"Bearer {MANAGEMENT_KEY}",
    "Content-Type": "application/json",
}

STATEMENTS = [
    (
        "news_hashes — CREATE TABLE",
        """
        CREATE TABLE IF NOT EXISTS news_hashes (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          hash text UNIQUE NOT NULL,
          source_url text,
          created_at timestamptz DEFAULT now()
        );
        """,
    ),
    (
        "news_hashes — INDEX hash",
        "CREATE INDEX IF NOT EXISTS idx_news_hashes_hash ON news_hashes(hash);",
    ),
    (
        "news_hashes — INDEX created_at",
        "CREATE INDEX IF NOT EXISTS idx_news_hashes_created_at ON news_hashes(created_at);",
    ),
    (
        "news_hashes — RLS",
        "ALTER TABLE news_hashes ENABLE ROW LEVEL SECURITY;",
    ),
    (
        "news_hashes — POLICY",
        """
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename='news_hashes' AND policyname='Service role full access'
          ) THEN
            CREATE POLICY "Service role full access" ON news_hashes
              FOR ALL USING (auth.role() = 'service_role');
          END IF;
        END $$;
        """,
    ),
    (
        "daily_counters — CREATE TABLE",
        """
        CREATE TABLE IF NOT EXISTS daily_counters (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          date date UNIQUE NOT NULL,
          gemini_calls int DEFAULT 0,
          updated_at timestamptz DEFAULT now()
        );
        """,
    ),
    (
        "daily_counters — INDEX date",
        "CREATE INDEX IF NOT EXISTS idx_daily_counters_date ON daily_counters(date);",
    ),
    (
        "daily_counters — RLS",
        "ALTER TABLE daily_counters ENABLE ROW LEVEL SECURITY;",
    ),
    (
        "daily_counters — POLICY",
        """
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename='daily_counters' AND policyname='Service role full access'
          ) THEN
            CREATE POLICY "Service role full access" ON daily_counters
              FOR ALL USING (auth.role() = 'service_role');
          END IF;
        END $$;
        """,
    ),
]

VERIFY_SQL = """
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('news_hashes', 'daily_counters')
ORDER BY table_name;
"""


def run_sql(label, sql):
    response = requests.post(ENDPOINT, headers=HEADERS, json={"query": sql.strip()}, timeout=30)
    if response.status_code == 200:
        print(f"  ✓ {label}")
    else:
        print(f"  ✗ {label} — HTTP {response.status_code}: {response.text[:200]}")
        return False
    return True


def main():
    print(f"=== setup_db.py — progetto: {PROJECT_REF} ===\n")

    all_ok = True
    for label, sql in STATEMENTS:
        ok = run_sql(label, sql)
        if not ok:
            all_ok = False

    print("\n--- Verifica tabelle ---")
    response = requests.post(ENDPOINT, headers=HEADERS, json={"query": VERIFY_SQL.strip()}, timeout=30)
    if response.status_code == 200:
        rows = response.json()
        found = [r.get("table_name") for r in rows]
        for t in ["news_hashes", "daily_counters"]:
            status = "✓ presente" if t in found else "✗ MANCANTE"
            print(f"  {t}: {status}")
    else:
        print(f"  Verifica fallita: {response.text[:200]}")

    if all_ok:
        print("\nSetup completato. Puoi eliminare questo script.")
    else:
        print("\nAlcune operazioni sono fallite. Controlla gli errori sopra.")
        sys.exit(1)


if __name__ == "__main__":
    main()
