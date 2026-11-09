# Verifica editoriale dei claim — sperimentazione PhonePulse #47

Questo workflow **non pubblica articoli** e non attribuisce conferme a un modello. È un protocollo locale provvisorio per verificare la provenienza dei claim, in attesa dell'interfaccia editor autenticata (#46).

## 1. Recuperare le fonti (read-only)

```bash
python scripts/editorial_dry_run.py \
  --input docs/editorial/pilots/health-connect-sources.json \
  --output /tmp/phonepulse-manifest.json --fetch
```

La rete è utilizzata soltanto con `--fetch`. Il recupero potrebbe essere negato da robots.txt, DNS o risposte non supportate; non aggirare blocchi. Il manifest conserva metadati, digest e brevi estratti ma non interi articoli. Gli estratti sono **non verificati**.

## 2. Revisionare ogni claim personalmente

Aprire la pagina originale e leggere il passaggio nel suo contesto, controllando data, versione applicabile ed eventuali smentite. Non assumere che un estratto di 110 caratteri provi automaticamente il claim. Scrivere un file JSON separato con:

```json
{
  "manifest_sha256": "SHA256 calcolato dal manifest",
  "reviewer_id": "identificativo-redattore",
  "reviewed_at": "2026-11-09T22:00:00+01:00",
  "decisions": [
    {
      "claim_id": "c1",
      "decision": "approve",
      "candidate_ids": ["s1-e1"],
      "rationale": "Confermo il claim dopo aver letto il documento originale nel contesto della versione citata."
    }
  ]
}
```

Questo è **solo un esempio di formato**, non una revisione effettuata. Per ogni claim servono una decisione e la relativa motivazione. Ammesse: `approve`, `reject`, `needs_research`. Si può creare il digest del manifest così:

```bash
PYTHONPATH=scripts python - <<'PY'
import json
from editorial_review_gate import manifest_fingerprint
with open("/tmp/phonepulse-manifest.json", encoding="utf-8") as f:
    print(manifest_fingerprint(json.load(f)))
PY
```

Un'identità scritta nel JSON **non costituisce autenticazione**: l'admin dovrà attestare il redattore tramite sessione e controllo server. Non inserire questa procedura nei job automatici.

## 3. Compilare il brief verificato

```bash
python scripts/editorial_review_gate.py \
  --manifest /tmp/phonepulse-manifest.json \
  --review /tmp/phonepulse-review.json \
  --output /tmp/phonepulse-review-brief.json
```

Il programma rifiuta un manifest offline, un hash non corrispondente, riferimenti senza fonte recuperata, prove non pertinenti, claim in conflitto e approvazioni mancanti. L'output può soltanto essere un **brief per una futura bozza**, con `publish_allowed=false`.

## Limiti attuali

- La corrispondenza **semantica** fra estratto e affermazione deve essere controllata dalla persona. I controlli Python verificano solo la tracciabilità formale, non la verità.
- Il ledger locale non è firmato o autenticato: non collegarlo ad alcuna pubblicazione; nell'admin servono ruolo editor, JWT, versione, audit e RPC protette.
- Non esistono ancora nel branch: chiamata al modello AI per redigere l'articolo, valutazione della qualità del testo generato, salvataggio bozze Supabase, pubblicazione, scheduling.
- Non inventare dati, esperienze dirette, test, prestazioni, fonti, prezzi o licenze immagini.

**Prima di far uscire una notizia:** controllo della bozza completa, confronto con fonti primarie, autorizzazione editoriale e verifica dell'immagine. La presente procedura non basta da sola.
