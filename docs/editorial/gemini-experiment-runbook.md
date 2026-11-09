# Esperimento Gemini — writer PhonePulse #47

Questo è un **esperimento isolato di una sola richiesta** per verificare la qualità delle bozze. Nessun sistema di produzione, job editoriale, account Supabase o servizio di pubblicazione viene richiamato.

## Prerequisiti

1. Una verifica editoriale reale della provenienza e delle affermazioni, registrata secondo [review-gate-runbook.md](review-gate-runbook.md). Non utilizzare un file di test con `reviewer_id` inventato per far risultare le fonti approvate.
2. Un file di brief derivato da `compile_reviewed_brief` che riporti `output_status=review_only`, `publish_allowed=false`, riferimenti ai claim e digest del manifest.
3. `GEMINI_API_KEY` disponibile **solo sul computer privato dell'operatore** o in un ambiente segreto esplicitamente autorizzato. Mai mettere la chiave nel repository, in GitHub Actions su `pull_request`, negli artifact o nei log.
4. Verificare preventivamente la quota e gli eventuali costi del provider: lo script effettua un'unica chiamata, senza retry, a `gemini-3.5-flash-lite`, con massimo 2.048 token di output. **Una richiesta può consumare quota e generare costi** a seconda del piano; lo script non può garantire spesa zero.

## Prima di un eventuale test live

```bash
# Nessuna richiesta esterna senza --execute
python scripts/editorial_gemini_experiment.py \
  --brief /percorso/privato/phonepulse-review-brief.json \
  --output /percorso/privato/phonepulse-draft-experiment.json

# SOLO dopo controllo evidenze e consenso a uso della quota/API:
GEMINI_API_KEY="..." python scripts/editorial_gemini_experiment.py \
  --brief /percorso/privato/phonepulse-review-brief.json \
  --output /percorso/privato/phonepulse-draft-experiment.json \
  --execute
```

Non copiare il comando con la chiave in chiaro nella cronologia della shell: impostarla tramite gestore segreti o variabile caricata in modo privato.

## Esiti

- `skip`: evidenze insufficienti; nessun articolo.
- `review_draft`: bozza con riferimenti `[cN]`, metadati di test e `publish_allowed=false`.
- Errore: provider/JSON/citazioni non conformi; nessuna pubblicazione o aggiornamento CMS.

La validazione dei riferimenti **non dimostra** che il testo del modello sia corretto, originale o legalmente riutilizzabile. Servono revisione riga per riga, controllo delle affermazioni, aggiornamento delle fonti e verifica immagini/licenze. Il file di approvazione locale non autentica l'identità del revisore: la connessione con l'admin #46 richiederà server-side Auth/RPC e audit.

**Stato 9 novembre 2026:** modulo provider e test con risposte HTTP simulate implementati. Nessuna chiamata Gemini reale è stata ancora effettuata attraverso questo nuovo modulo.
