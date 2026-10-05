# PhonePulse — redazione e rilancio

**Data:** 5 ottobre 2026
**Stato:** proposta da valutare; nessuna modifica applicativa autorizzata o eseguita in questo documento.
**Obiettivo:** una piccola redazione assistita dall'AI che aiuta utenti italiani a scegliere e utilizzare smartphone, con contenuti verificabili e un carico sostenibile.

## 1. Evidenze dopo il ripristino di Supabase

Il sito ora carica articoli e categorie. La mappa HTML restituisce **90 articoli, tutti nel gruppo News**; la categoria Recensioni mostra **0 articoli**. I 18 articoli caricati inizialmente dalla home sono News, datati 14–16 aprile 2026. Sono conteggi della UI pubblica, non un censimento del database privato. Le automazioni risultavano disabilitate nel precedente audit; non è stata verificata nuovamente la loro configurazione GitHub dopo il ripristino.

Sono stati letti integralmente sei articoli, scelti per mettere alla prova formati e rischi diversi. Il campione è intenzionale, non casuale: non permette di stimare la percentuale di difetti dell'intero archivio.

| Articolo | Osservazione verificata | Decisione proposta |
| --- | --- | --- |
| [Otto estensioni Chrome](https://www.phonepulse.it/articoli/8-estensioni-chrome-indispensabili-produttivita) | 396 parole, nessuna estensione nominata, nessun link nel corpo. Il testo rivendica prove personali. | Non mantenere pubblicato in questa forma. Ricostruire la lista con otto nomi, link ufficiali, utilità e prove effettive, oppure ritirare il pezzo. |
| [Nothing Phone 4a](https://www.phonepulse.it/articoli/nothing-phone-4a-recensione) | 386 parole, categoria News, SEO/slug da recensione, rivendicazione di test approfondito ma nessun metodo, durata, misurazione o prova documentata. | Accertare se una prova reale esista. Se manca, riscrivere come presentazione basata su fonti e rimuovere affermazioni di esperienza personale. Non cambiare lo slug senza redirect. |
| [Smart gardening](https://www.phonepulse.it/articoli/smart-gardening-2026-must-have) | 376 parole, promessa di migliori strumenti ma nessun prodotto concreto; tema periferico rispetto agli smartphone. | Ritirare o riprogettare fuori dalla linea principale, senza conservare una promessa di selezione non mantenuta. |
| [Samsung Wallet](https://www.phonepulse.it/articoli/samsung-wallet-rischio-blocco-chiavi-digitali) | 379 parole, nessuna fonte linkata; spiegazioni su autenticazione/token e rischi estesi a serrature diverse non documentate nella pagina. | Verificare fonte primaria, versioni, dispositivi e ambito geografico; conservare solo ciò che è supportato. L'assenza di fonti non dimostra che ogni affermazione sia falsa. |
| [Sleep&Arrive](https://www.phonepulse.it/articoli/sleep-arrive-app-android-evita-saltare-fermata) | 366 parole, caso d'uso pertinente; nessun link all'app o alla fonte, affermazioni su precisione GPS e batteria senza risultati di prova. | Buona idea da recuperare: link ufficiale, requisiti, costo verificato, limiti di localizzazione e istruzioni realmente controllate. |
| [Blocco chiamate DNO](https://www.phonepulse.it/articoli/android-blocca-chiamate-dno-phishing) | 357 parole; titolo “addio al phishing”, disponibilità estesa agli utenti italiani senza documentazione nella pagina; il corpo poi ammette limiti. | Titolo proporzionato e verifica di rollout/paesi/versioni. Evitare promesse assolute di sicurezza. |

Nessuno dei sei corpi contiene link a fonti. La byline è nascosta nel renderer pubblico. Non è stato effettuato un fact-check completo di ogni frase o un accertamento di chi abbia scritto i singoli pezzi.

## 2. Verdetto editoriale

La redazione attuale **non regge ancora come sistema autonomo affidabile**. Regge come base per raccolta, prima stesura e revisione. Il problema non è l'uso dell'AI in sé, ma l'assenza di prove, il mancato rispetto delle promesse e una generazione guidata dalla lunghezza anziché dalle informazioni disponibili.

Cause nel flusso esistente:

1. Titolo/excerpt RSS sono usati per espandere una notizia a 300–500 parole: poche informazioni diventano valutazioni e contesto apparentemente autorevoli.
2. Il prompt suggerisce “indiscrezioni” quando mancano informazioni: l'incertezza non deve diventare una fonte inventata.
3. Il gate conta parole e caratteri, senza controllare la risposta alla domanda del lettore.
4. La categoria è sempre News, anche quando titolo e SEO promettono recensioni o liste.
5. Feed generalisti introducono politica, spettacolo e giardinaggio, diluendo il focus.
6. Il job B può pubblicare senza verifica umana; modello e provider della cover vengono usati come surrogati dell'approvazione.
7. “Chi siamo” dichiara prove reali per settimane: tale promessa va sostenuta con prove o resa più precisa. Non basta cambiare il prompt lasciando invariata la presentazione pubblica.

Google invita a documentare autori, metodo ed esperienza, a fornire valore ulteriore rispetto alla riscrittura e a evitare allungamenti per raggiungere un numero di parole. Non è una previsione del ranking del sito. [Indicazioni ufficiali sui contenuti utili](https://developers.google.com/search/docs/fundamentals/creating-helpful-content). Per le recensioni raccomanda evidenze del prodotto provato e del metodo. [Indicazioni ufficiali sulle recensioni](https://developers.google.com/search/docs/specialty/ecommerce/write-high-quality-reviews).

## 3. Tre modelli possibili

| Modello | Vantaggio | Limite | Valutazione |
| --- | --- | --- | --- |
| Aggregatore automatico di brevi notizie attribuite | Poco lavoro, promessa modesta | Poco valore originale; verifiche e manutenzione restano necessarie | Possibile solo cambiando esplicitamente posizionamento e formato; non consigliato come percorso principale. |
| Redazione assistita: news curate + guide originali | Focus, responsabilità, crescita sostenibile | Richiede revisione e qualche sessione di lavoro più lunga | **Raccomandato.** |
| Testata di recensioni con laboratorio e molti dispositivi | Evidenze distintive e contenuti forti | Richiede hardware, competenze, tempo e accesso ai prodotti | Non pianificare finché queste risorse non sono effettivamente disponibili. |

Posizionamento iniziale: **“Smartphone e app: notizie verificate e guide pratiche per scegliere e usarli meglio.”** Recensioni e comparativi entrano nel menu in evidenza quando il catalogo li sostiene; non si popolano automaticamente per riempire categorie.

## 4. Linea editoriale e formati

### Ambito

- Priorità: smartphone Android/iPhone, aggiornamenti utili, app mobile, sicurezza d'uso e decisioni d'acquisto.
- Ammessi: wearable e accessori se legati a un problema del lettore mobile.
- Fuori dal flusso automatico: politica/spettacolo, gadget generici, PC e giardinaggio senza un legame concreto con lo scopo.
- La pertinenza si misura con la domanda: “Che cosa può decidere o fare il lettore dopo averlo letto?”. Se la risposta è assente, il candidato viene scartato prima dell'LLM.

### Contratti dei contenuti

| Formato | Requisiti | Ruolo dell'AI |
| --- | --- | --- |
| Breve/News | Novità, fonte/data, confermato vs rumor, destinatari, limiti e conseguenza pratica | Bozza dai fatti forniti; nessuna esperienza personale. Breve e News condividono la categoria News. |
| Guida | Problema preciso, passi controllati, prerequisiti, versioni e risultati attesi | Organizzazione e revisione linguistica; l'editor verifica i passi. |
| Comparativo | Prodotti identificati, dati confrontabili, criteri e limiti, raccomandazione motivata | Strutturazione di dati verificati; vietato simulare prove. Distinguere confronto documentale e prova diretta. |
| Recensione | Dispositivo/versione, chi l'ha usato, durata, metodo, foto/dati propri e limiti | Sintesi di appunti reali; non inventa il test. Il voto richiede una rubrica esplicita. |
| Offerta | Prodotto, variante, prezzo rilevato e orario, negozio, disponibilità e confronto giustificato | Solo dati verificati; aggiornamento/scadenza breve. Non prevista nel primo pilot. |

Le lunghezze sono orientative: breve 80–220 parole, news 200–500, guide quanto necessario. Non sono requisiti SEO e non sostituiscono la completezza. Se i dati sostengono soltanto due frasi, produrre una breve o non pubblicare. Un titolo che promette N elementi deve avere N elementi concreti, identificabili e verificati.

### Stile

- Aprire con cosa cambia, per chi e cosa è confermato; eliminare introduzioni sul “mondo sempre più digitale”.
- Titoli descrittivi; vietate promesse assolute di protezione, superlativi senza confronti o test, “rivoluzione” usata come riempitivo.
- Inserire il contesto italiano soltanto con evidenza di disponibilità, prezzo, lingua o rollout: non aggiungere automaticamente frasi sulla garanzia.
- Usare date assolute quando sono necessarie. Conservare data dell'evento e della verifica; non vietare tutte le date per simulare evergreen.
- Se una fonte non conferma un dato, ometterlo o dichiarare che non è noto. “Secondo indiscrezioni” richiede una fonte che riporti davvero l'indiscrezione.
- Vietate prove in prima persona in bozze automatiche. Una dichiarazione di prova reale viene inserita soltanto da un editor con metodo e materiali disponibili.
- Link a fonti e autore/revisore reali visibili. Dichiarare assistenza AI nella pagina del metodo e, per i contenuti interessati, nella nota di produzione.

## 5. Processo redazionale proposto

```text
Scouting RSS → filtro pertinenza/freschezza → deduplica URL
    → raccolta fatti e fonti → bozza limitata alle evidenze
    → validazione strutturale → revisione completa + immagine
    → approvazione della versione → pubblicazione
    → aggiornamento pubblico → social selezionati → controllo esiti
```

L'RSS è uno strumento di scouting. Non attribuisce automaticamente affidabilità alla fonte né permette di riscrivere una recensione altrui come esperienza propria. Il pilot evita scraping generalista: usa riepiloghi disponibili, link pubblici e materiali scelti dall'editor. Per affermazioni sensibili — sicurezza, prezzi, disponibilità, prestazioni — serve una fonte primaria o una verifica diretta documentata. Fonti secondarie possono sostenere news attribuite, con limiti espliciti.

I record di fonte conservano URL, titolo, editore, data evento/pubblicazione se nota, data di raccolta e fatti utilizzati. I link prodotti dal modello devono appartenere alle fonti passate al generatore; non sono accettati URL o citazioni inventati. Un secondo LLM può aiutare a segnalare omissioni, ma non certifica la verità e non sostituisce la revisione.

### Checklist obbligatoria dell'editor

1. Titolo e formato corrispondono a ciò che il corpo offre; liste complete, tutorial eseguibili.
2. Le affermazioni verificabili hanno fonti; rumor, valutazioni e fatti sono distinti.
3. Date, versioni, rollout, paese e disponibilità sono controllati dove rilevanti.
4. Nessuna esperienza personale, prova o misura non documentata.
5. La conseguenza pratica per il lettore è concreta; nessun paragrafo aggiunto solo per raggiungere una soglia.
6. Cover pertinente, accessibile e utilizzabile; immagini illustrative etichettate, non presentate come foto di un prodotto provato.
7. Autore/revisore, fonti e data di verifica sono disponibili; anteprima mobile e link controllati.

L'approvazione è un atto umano associato alla versione. Modificare contenuto, titolo, fonti, categoria o cover dopo l'approvazione la revoca; la schedulazione non può usare l'approvazione precedente. Le correzioni di un articolo pubblico passano da un'azione esplicita che ricontrolla e salva la versione, senza ripubblicare automaticamente sui social.

### Freschezza e coda

- Scouting news: candidati entro 48 ore dalla fonte; data ignota richiede verifica manuale.
- Pubblicazione news: entro 72 ore dalla fonte. Oltre tale limite occorre aggiornare i fatti e riapprovare; nessuna vecchia bozza diventa una news corrente.
- Guide: controllo periodico indicativo ogni 90 giorni, prima se cambia il prodotto o software.
- Offerte: dati di prezzo/disponibilità entro 24 ore e indicazione dell'orario; soglie editoriali proposte, non garanzie tecniche.
- Generazione iniziale: massimo cinque bozze per run giornaliero; massimo venti bozze RSS aperte. I record esistenti hanno origine legacy e una coda separata: le 4.359 bozze storiche rilevate il 5 ottobre non saturano il limite del nuovo flusso. A coda RSS piena, non generare altre bozze.
- Job B resta disabilitato fino a gate e transizione unificati; poi può pubblicare soltanto versioni approvate e ancora valide. Nessuno smaltimento automatico dell'arretrato.

## 6. Archivio e fiducia

Revisionare tutti i 90 articoli pubblicamente elencati prima di promuovere il rilancio, partendo da liste incompiute, prove rivendicate, sicurezza, prezzi e indicazioni operative. Scheda per articolo: URL, formato reale, priorità, difetto, fonti, decisione, editor e data.

Decisioni: mantenere, correggere, aggiornare, ritirare o unire. Non cancellare in massa. Conservare export e redirect per contenuti sostituiti; non cambiare date per far apparire nuovo un articolo vecchio. Un ritiro urgente per informazioni potenzialmente dannose può precedere la riscrittura, con decisione esplicita dell'editor. La scelta HTTP di ritiro/redirect va coordinata con il piano pubblico.

Aggiornare “Chi siamo”, home e categorie per descrivere ciò che esiste davvero. Mantenere le promesse di prove reali soltanto dove esiste un metodo verificabile. Non creare autori fittizi.

## 7. Capacità e pilot

La disponibilità dell'utente è stata richiesta ma non era ancora confermata durante la stesura. Assunzione iniziale: circa 30 minuti per giorno lavorativo, pari a 150 minuti/settimana. Tempi da misurare, non promesse di produttività.

| Disponibilità | Calendario iniziale | Budget indicativo |
| --- | --- | --- |
| 30 minuti/giorno lavorativo | Tre news/settimana + una guida ogni due settimane | 45 min revisione news + 60 min/settimana medi per guida + 30 min manutenzione = 135 min. Se servono più verifiche, ridurre le uscite. |
| 1–2 ore/settimana | Una news/settimana + una guida al mese | 15–25 min news, 30–60 min/settimana medi guida, 15 min manutenzione. |
| Quasi nessun tempo | Pubblicazione occasionale; niente news autonome non verificate | Valutare un aggregatore di link/brevi con promessa diversa; nessuna simulazione di una redazione di recensioni. |

La bonifica iniziale è un lavoro separato: 90 articoli × 10–20 minuti = 15–30 ore, potenzialmente di più per riscritture e verifiche. Non entra nel normale budget settimanale e può essere suddivisa per rischio.

Pilot di quattro settimane, senza target di traffico garantito. Misurare tempo effettivo, bozze utili vs generate, fonti e revisioni complete, correzioni, problemi tecnici e ritorni dei lettori. Separare controlli tecnici della pubblicazione da indicatori commerciali.

**Soglie di prosecuzione proposte:** 100% delle nuove pubblicazioni approvate sulla versione corrente e con fonti; zero promesse di liste non mantenute o prove non documentate; nessun duplicato social noto; lavoro entro il budget per almeno tre settimane su quattro. Se il carico sfora o servono molte riscritture, ridurre news e restringere fonti; non compensare aumentando l'automazione di pubblicazione.

## 8. Vincoli tecnici per il piano

- Mantenere React/Vite/Tailwind/Supabase; nessuna migrazione totale di stack.
- Una sola fonte dello stato editoriale: `draft`, `approved`, `published`, `discarded`; migrazione additiva e compatibilità temporanea con i booleani esistenti.
- Versione numerica per concorrenza e approvazione, autore/revisore reale e fonti strutturate.
- Scritture critiche transazionali e autorizzate server-side; chiavi privilegiate mai in `VITE_*`.
- Pubblicazione del sito indipendente dall'esito social; esiti per piattaforma persistenti e retry controllato.
- Nessuna promessa di exactly-once su provider esterni senza idempotenza nativa: timeout ambiguo va a controllo manuale.
- Test isolati e staging; nessun invio reale durante i test automatici.
- Mantenere traccia degli articoli legacy senza approvarli retroattivamente.
- Sitemap, contenuto pubblico e metadati devono riflettere la stessa versione; l'admin non attende sincronamente il deploy per considerare riuscita la scrittura DB.
- Nuove dipendenze solo per una necessità verificata; unittest, Deno.test e node:test prima di altri runner.

## 9. Analisi automatica richiesta dall'utente

Raccolta continua e analisi periodica gestita da ChatGPT, senza esportazioni manuali. Proposta: report settimanale ogni martedì alle 09:00 Europe/Rome e mensile il giorno 5. Usare GA4 per traffico/interazione e Search Console per scoperta organica; metriche di qualità editoriale separate dai volumi di pubblicazione.

Preferire una task cloud di ChatGPT con integrazione autorizzata, dopo prova reale di lettura e consegna. Il collegamento iniziale dell'account Google e l'abilitazione della task sono prerequisiti, non lavoro periodico dell'utente. Al momento della stesura nessun accesso analytics né calendario è stato attivato. Il dettaglio operativo è nel [piano metriche](../plans/2026-10-05-metriche-report-automatici.md).

L'analisi può proporre argomenti e interventi; non approva né pubblica articoli autonomamente. Numeri, intervalli e limiti della misurazione devono accompagnare ogni raccomandazione.
