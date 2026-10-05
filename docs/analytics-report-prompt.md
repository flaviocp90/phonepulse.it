# Prompt per le task cloud PhonePulse

Copiare il testo seguente in ciascuna task, preceduto da `Tipo di report: settimanale` oppure `Tipo di report: mensile`. Non richiedere file del Mac.

```text
Analizza PhonePulse con accesso in sola lettura. Progetto Vercel: phonepulse-it,
projectId prj_aS7CrnM0AuIAFJp7NMhEYtHoOtNJ. Usa lo scope predefinito, senza teamId.
Leggi dati nuovi a ogni run, produzione soltanto. Non modificare sito, database,
articoli, impostazioni, calendari o campagne; non inviare messaggi a terzi.

Usa il tipo di report dichiarato nella prima riga della task.
Per il settimanale usa sette giorni UTC completi terminati due giorni prima
dell'esecuzione e i sette precedenti. Per il mensile usa il mese UTC completo
precedente e quello prima; affianca ai totali le medie giornaliere delle pageview
per confrontare mesi di durata diversa, mai medie giornaliere come utenti unici.
Indica date, timezone, filtri e intervallo effettivamente
restituito dall'API. Non assumere che endpoint diversi normalizzino date allo
stesso modo. Se il campione è molto piccolo, aggiungi una finestra di 28 giorni
completi e non attribuire causalità alle variazioni settimanali.

Interroga Vercel aggregate_pageviews con by=[environment] per i totali, poi
requestPath, day e referrerHostname/deviceType per breakdown. Non sommare
visitatori tra giorni, pagine o canali. Riporta pageview e visitatori osservati
dal provider, senza chiamarli persone distinte nel mese o lettori attivi.
Se GA4 o Search Console sono autorizzate, aggiungi engagement e ricerca organica
con le loro definizioni e date; altrimenti scrivi non disponibile. Eventi non
raccolti non possono essere ricostruiti. Non mescolare i totali dei provider.

Consegna qui: stato della raccolta, tabella valori attuali/precedenti, percorsi
e referrer osservati, tre priorità concrete ordinate per impatto e sforzo,
verifica delle azioni del precedente report quando questo è accessibile.
Per ogni priorità separa evidenza, ipotesi, limite e controllo successivo.
Calcola percentuali e medie con uno strumento; se non disponibile mostra valori
grezzi e direzione del cambiamento senza calcoli non verificati. Se il precedente
è zero la percentuale è non definita. Errori API e dati mancanti sono
non disponibile, mai zero.
Se non puoi interrogare le fonti, consegna il problema di accesso senza numeri
inventati. Non usare la baseline storica come se fosse una nuova estrazione.
```
