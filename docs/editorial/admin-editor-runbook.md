# Editor e ricerca: utilizzo e rilascio

## Scrittura e recupero

Nuovo articolo parte in Visuale; Markdown permette di controllare il formato salvato. HTML legacy resta nel percorso Markdown. Adattare i template al lavoro svolto: un confronto documentale non attesta una prova hardware.

La copia locale è separata per utente/articolo/versione. Dopo un'interruzione scegliere Ripristina, Scarica o Elimina. Una versione server diversa blocca il ripristino. Il browser può eliminare questi dati: usare Salva bozza.

## Foto e revisione

Caricare foto autorizzate con alt, didascalia, credito e licenza. Riordinare dalla galleria e scegliere la copertina. Salvare per registrare l'associazione. Upload inutilizzati possono restare orfani.

Foto private fino alla pubblicazione, preview firmata di cinque minuti con rinnovo. Il documento conserva URL stabili senza token. Il ritiro nega nuove letture pubbliche, ma non revoca copie già scaricate.

Importare la ricerca in Nuovo articolo. Gli estratti sono candidati: aprire le fonti e controllare contesto, data e indipendenza. “Usa passaggio” non approva. Modificare testo o fonti conserva le note e riporta gli esiti a Da verificare. Nuovi articoli richiedono almeno un claim completo e supportato; tutti quelli aggiunti devono essere risolti. Salvare, rileggere, completare i sette controlli e approvare. Pubblicare resta un'azione separata, riferita alla stessa versione.

## Ricerca senza modelli a pagamento

```sh
PYTHONPATH=scripts python3 scripts/editorial_export.py --research-only --manifest manifest.json --output admin-import.json
```

Usa soltanto il manifest del retrieval, senza modello, credenziali CMS o pubblicazione. Nessuna fonte disponibile: nessun import prodotto. I tre probe CI conservano manifest/import nell'artefatto `editorial-research-review-only` per sette giorni. Nessuna approvazione può essere importata.

## Rilascio coordinato

1. Verificare CI della PR #51 e backup secondo la procedura del progetto.
2. Applicare `20261110134623_guided_editor.sql` nell'ambiente previsto insieme al codice frontend/API. Non distribuire solo il frontend. Dati storici mantengono il gate precedente, nuovi articoli richiedono evidenze.
3. Con vera sessione editor creare una bozza di prova, salvare e ricaricare claim/foto, recuperare una copia locale e controllare audit e rifiuto di approvazione senza evidenze.
4. In contesto anonimo verificare 404 per foto in bozza. Verificare pubblicazione e ritiro solo con ambiente/contenuto intenzionalmente pubblicabile.
5. Controllare legacy Markdown/HTML e gate versione tramite Auth/PostgREST. Registrare evidenza prima di chiudere i task Notion.

La route media usa URL Supabase e chiave anon (`SUPABASE_ANON_KEY` oppure `VITE_SUPABASE_ANON_KEY`). Nessuna service-role key in `VITE_*`. Nessuna prova a pagamento prevista.

Rollback: ripristinare il codice conservando dati/schema aggiunti. Mantenere la route media disponibile per le nuove foto già pubblicate; non eliminare bucket o tabelle con contenuti salvati.
