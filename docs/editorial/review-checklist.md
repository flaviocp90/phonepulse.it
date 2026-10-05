# Revisione umana di una versione

Aprire **Review bozze → Apri revisione**. La coda RSS/manuale è distinta dall’archivio legacy; gli articoli legacy non sono approvati retroattivamente. Formato editoriale (News, Guida, Comparativo, Recensione) e categoria sono due campi diversi.

1. Leggere tutto il contenuto e l’anteprima sanificata: titolo e formato mantengono le promesse, le liste sono complete e i passi eseguibili.
2. Verificare le affermazioni nelle fonti: separare fatti, rumor e valutazioni. La prima fonte è principale. Nuovi link HTTPS; un HTTP storico viene conservato finché non è sostituito.
3. Controllare date, versioni, rollout e disponibilità. Registrare pubblicazione della fonte soltanto se nota; registrare la consultazione effettiva, senza copiarla dalla pubblicazione o inventare un controllo automatico. Gli input mostrano il fuso locale del browser e salvano ISO con timezone. La nuova News richiede la fonte principale nota, non futura ed entro 72 ore, ricontrollata anche alla pubblicazione.
4. Documentare chi ha provato cosa, per quanto tempo e con quali evidenze, oppure assicurarsi che il testo non rivendichi esperienza personale. Nessun test simulato dall’AI.
5. Controllare il valore concreto per il lettore; eliminare riempitivi e promesse assolute.
6. Controllare pertinenza, accessibilità e diritti della cover. Il caricamento della miniatura non dimostra il diritto d’uso; un errore di caricamento resta visibile.
7. Controllare autore, fonti, metadata, link e anteprima mobile. Il revisore è l’identità Auth reale, salvata dal server; non inserire un revisore fittizio.

Spuntare tutte e sette le attestazioni native. Sono una dichiarazione umana, non un fact-check automatico. **Salva bozza** registra contenuto e tag in un’unica transazione RPC; dopo ogni modifica o salvataggio la checklist va ripetuta. **Approva** vale solo per la versione salvata e invariata. **Pubblica** è una seconda azione esplicita. Cambiare una versione approvata e salvarla la riporta a Bozza.

Un conflitto o errore lascia il testo locale intatto. **Ricarica versione server** è esplicito e chiede conferma se comporta perdita di modifiche; non sovrascrivere il testo prima di copiarlo o riconciliarlo. Se la scrittura è confermata ma i metadata non sono disponibili, l’UI mantiene il successo e invita a ricaricare per verificarli.

Per un articolo pubblico usare **Salva correzione pubblicata**, con checklist completa. La correzione conserva lo stato e la pubblicazione originaria; una fonte storica è ammessa. Anche una verifica senza cambiamenti può essere registrata senza incrementare la versione. **Ritira** è separato e confermato: passa a Scartato senza cancellare contenuto o data. **Recupera come bozza** revoca l’approvazione; una News storica recuperata necessita fatti e fonte attuali per una nuova approvazione/pubblicazione. Non falsificare la data storica.

Le liste usano count e pagine server da dieci righe, con ordine stabile. “— / indisponibile” è un errore o un conteggio sconosciuto, non zero. La distribuzione social è fuori da questa fase: nessun invio dalla coda o dalle correzioni.

L’editor avvisa alla chiusura/ricaricamento della scheda e per i link interni dell’app nella stessa scheda. Il router BrowserRouter attuale non consente un blocco affidabile di Indietro/Avanti o navigazioni programmatiche senza cambiarne configurazione: salvare prima di usarle. Questo limite non altera la concorrenza server o la conservazione del testo in caso di errore RPC.

I link affiliate legacy possono essere un oggetto JSON: il controllo ne mostra il contenuto completo. Lasciandolo invariato, il salvataggio lo conserva senza conversione automatica. Per sostituirlo esplicitamente o per un nuovo articolo usare un array JSON (per esempio `[]` se vuoto); JSON object nuovo/modificato viene rifiutato. Non svuotare un valore legacy soltanto per poter salvare il resto dell’articolo.


## Primo lotto dell'archivio e pilot

Nel [registro](archive-review.csv) `proposal` riporta l'ipotesi dell'audit;
`decision` vuota significa che nessuna modifica è autorizzata per quell'URL.
Per ogni caso leggere la versione corrente e completare fonti consultate,
motivazione, responsabile e data effettiva. Registrare versione e data di
pubblicazione originaria prima della modifica. Scelte: mantenere, correggere,
aggiornare, ritirare, unire. Nessuna scelta automatica per keyword.

Una correzione pubblica significativa richiede nota datata; conservare URL e
pubblicazione originaria. Se si unisce un contenuto o cambia URL, registrare il
redirect e verificarlo prima del cambiamento. Non far sembrare nuova una news
storica cambiando soltanto la data. Il [pilot](pilot.md) resta da avviare e
raccoglie tempi reali, qualità del flusso e decisioni settimanali.
