# Pilot editoriale — preparazione

Stato: non avviato. Data di partenza, responsabile e tempo disponibile devono
essere confermati. Nessuna delle proposte nel registro archivio è una decisione
approvata; nessun contenuto è stato corretto o ritirato da questa preparazione.

## Prima settimana, condizioni di avvio

- Backup durevole e staging PG17/Auth/PostgREST verificati; ruolo editor reale.
- Task2–6 rilasciati insieme; A sotto controllo, B manuale e mai usato per
  smaltire l'archivio. CI locale non dimostra una migrazione live riuscita.
- Autore, fonti e metodo leggibili sulle pagine pubbliche (U2), promesse home e
  Chi siamo allineate a ciò che la redazione documenta effettivamente.
- Primo lotto dei sei casi in [archive-review.csv](archive-review.csv): leggere
  la versione corrente, registrare fonti e scegliere per ciascun URL una
  decisione motivata prima di qualsiasi scrittura.
- Un canale di distribuzione verificato. I social richiedono HTML pubblico della
  versione approvata (U4) e readiness; Instagram può restare spento.
- Monitor indipendente e consegna allerta provati, destinatario autorizzato;
  report cloud metriche verificato prima di considerarlo un servizio attivo.

## Calendario da scegliere

| Disponibilità confermata | Uscite iniziali | Limite operativo |
| --- | --- | --- |
| Circa135 min/settimana | Tre news/settimana, una guida ogni due settimane | Budget medio della spec; diminuire se le verifiche richiedono più tempo |
| 1–2 ore/settimana | Una news/settimana, una guida al mese | Preferire fonti e argomenti che possono essere verificati nel tempo disponibile |
| Occasionale | Pubblicazioni singole quando realmente revisionate | Nessuna news autonoma o calendario non sostenuto |

Le quote sono ipotesi di partenza, non obblighi di produzione. Guide con passi
controllati; news entro72h dalla fonte, approvazione sulla versione corrente.
La bonifica iniziale è lavoro separato, non tempo da nascondere nel budget.

## Registro delle quattro settimane

Riempire soltanto misure effettive. Campi vuoti significano non misurato, mai zero.
Le settimane vengono datate all'avvio; non dedurre minuti da timestamp DB.

| Settimana | Intervallo | Minuti effettivi | Bozze generate/utili | Pubblicazioni approvate sulla versione/fonti complete | Scarti | Correzioni | Errori pubblicazione/social | Coda RSS aperta | Decisione e motivo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | | | |
| 2 | | | | | | | | | |
| 3 | | | | | | | | | |
| 4 | | | | | | | | | |

Conservare gli ID/versioni verificati nell'admin, distinguere failed da unknown
social e controllare il canale per gli esiti ambigui. Zero candidati/coda piena
è un run tecnico riuscito, non una bozza prodotta o una pubblicazione utile.

Ogni review settimanale verifica: fonti e approvazione corrente nel100% delle
nuove pubblicazioni; nessuna lista promessa incompleta o prova non documentata;
nessun duplicato social noto; carico entro il budget per almeno tre settimane
su quattro. Se la coda cresce o i pezzi richiedono ricostruzioni, ridurre
candidati/uscite e correggere scouting/prompt prima di aumentare l'automazione.

[Report metriche](../analytics-report-prompt.md) e
[piano metriche](../superpowers/plans/2026-10-05-metriche-report-automatici.md):
riportare intervallo, fonte e limiti dei dati. GA4/GSC quando collegati; eventi
Vercel indisponibili con gli accessi attuali non diventano zero. Traffico e
scoperta aiutano a scegliere priorità, non approvano contenuti né provano qualità.

Alla fine scegliere prosecuzione, riduzione o cambio di formato e annotarne le
ragioni. Finché non ci sono quattro settimane effettive, Task9 non è completato.
