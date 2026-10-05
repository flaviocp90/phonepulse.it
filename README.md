# PhonePulse

Sito editoriale italiano su smartphone e app.

**Stack:** React 18 + Vite + Tailwind CSS + Supabase + Vercel

**Sito:** [phonepulse.it](https://phonepulse.it)

## Setup locale

```bash
npm ci
cp .env.local.example .env.local
# Compila le due variabili con URL e chiave anon del progetto previsto
npm run dev
```

Il template contiene soltanto valori vuoti. Non inserire service-role key, token social o credenziali amministrative nelle variabili `VITE_*`: finiscono nel bundle pubblico. `.env.local` è ignorato da Git.

## Verifica locale

```bash
npm run build
npm run preview
```

Non è configurato un comando `npm test`. Verificare manualmente le rotte interessate e il layout mobile. Il build senza ambiente compilato non verifica la connessione Supabase o il funzionamento dell'admin.

I test browser di navigazione usano risposte Supabase fittizie e bloccano analytics/provider esterni. Non richiedono `.env.local` o accesso al database live: la configurazione avvia Vite con URL e chiave di test.

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright richiede Node.js 20 o superiore. Il server usa `127.0.0.1:4173`, che deve essere libero. Per CI in ambiente controllato installare browser e dipendenze di sistema con `npx playwright install --with-deps chromium` prima dei test.

Il parsing Python può essere verificato senza importare o eseguire gli script:

```bash
python3 - <<'PYTHON'
import ast
from pathlib import Path
for path in sorted(Path('scripts').glob('*.py')):
    ast.parse(path.read_text(), filename=str(path))
    print(f'OK {path}')
PYTHON
```

## Operazioni e rilancio

[Baseline e runbook](docs/operations.md) contiene workflow, accessi, inventario inferito dal codice e prerequisiti per backup e staging. [Registro archivio](docs/editorial/archive-review.csv) conserva sei decisioni proposte, ancora da assegnare e applicare.

Gli script in `scripts/` possono scrivere nel database, pubblicare e inviare notifiche. Non eseguirli per una verifica di sintassi. Non riattivare Job B per smaltire l'arretrato: prima servono schema reale, backup ripristinato in isolamento e gate editoriali del [piano di rilancio](docs/piano-rilancio-2026-10-05.md).
