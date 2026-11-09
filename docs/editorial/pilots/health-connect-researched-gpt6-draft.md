# PhonePulse — pilota editoriale AI assistito, NON pubblicato

- **Data verifica fonti:** 9 novembre 2026
- **Stato:** bozza completa da revisionare; generata in questa conversazione con GPT-6, **non** da `scripts/editorial_gemini_experiment.py`.
- **Metodo:** consultazione di tre pagine di documentazione ufficiale Samsung/Google e sintesi autonoma con attribuzione. Non sono stati svolti test diretti su dispositivi, benchmark o controlli sui menu di una versione corrente di Samsung Health.
- **Categoria proposta:** Guide Android
- **Titolo SEO:** Samsung Health e Health Connect: guida a passi e sincronizzazione
- **Meta description:** Passi, sonno o allenamenti assenti in Health Connect? Scopri dove controllare permessi, sincronizzazione Samsung Health e origini dei dati su Android.
- **Slug:** samsung-health-health-connect-passi-sincronizzazione-guida
- **Immagine:** non selezionata; niente foto con licenza non verificata.
- **Fonti:** [Samsung Developers FAQ](https://developer.samsung.com/health/health-connect-faq.html), [Android Developers – Get started](https://developer.android.com/health-and-fitness/health-connect/get-started), [Android Developers – Track steps](https://developer.android.com/health-and-fitness/health-connect/features/steps).

---

# Samsung Health e Health Connect: perché mancano i passi e come capire dove si blocca la sincronizzazione

Hai configurato Samsung Health e Health Connect, ma una seconda app continua a mostrare zero passi, sonno assente o allenamenti incompleti? Prima di reinstallare tutto conviene capire una distinzione fondamentale: **Health Connect non è un'app che riceve automaticamente ogni misura da ogni dispositivo**. È un sistema per archiviare e condividere categorie di dati fra applicazioni autorizzate. L'origine della misura, il collegamento con l'app del produttore e il permesso di lettura dell'app di destinazione sono passaggi diversi.

In questa guida analizziamo il percorso tipico dei dati di un Galaxy Watch, i controlli più utili su uno smartphone Android e una novità del 2026 che può spiegare differenze nei conteggi dei passi. Le indicazioni si basano sulla documentazione ufficiale; non promettono una soluzione identica per tutti i modelli e le versioni software.

## 1. Capire il percorso: dallo smartwatch all'app finale

Nel caso di un Galaxy Watch, Samsung documenta un flusso a più tappe:

**Galaxy Watch → Samsung Health sul telefono → Health Connect → applicazione che legge i dati.**

Samsung spiega che i dati dell'orologio vengono trasferiti a Samsung Health sullo smartphone e, se il collegamento è stato autorizzato, possono essere sincronizzati con Health Connect. La stessa documentazione cita, fra le categorie condivisibili, passi, esercizio, frequenza cardiaca e sonno. Non significa che tutte le app collegate mostrino sempre tutte queste metriche: l'app finale deve implementarne la lettura e avere l'autorizzazione corrispondente.

Un dettaglio spesso sottovalutato riguarda i tempi. Samsung precisa che il trasferimento dall'orologio al telefono segue politiche proprie, anche per limitare il consumo della batteria. Non bisogna quindi dare per scontato che ogni schermata si aggiorni nello stesso istante.

**Fonte:** [FAQ Samsung Health e Health Connect](https://developer.samsung.com/health/health-connect-faq.html).

## 2. Primo controllo: i dati esistono già in Samsung Health?

Comincia dall'app Samsung Health, prima di toccare le autorizzazioni di Health Connect. Se i passi o l'allenamento non compaiono nemmeno lì, è prematuro attribuire il problema a Health Connect: il trasferimento dall'orologio, l'account o la sincronizzazione interna di Samsung Health devono essere controllati per primi.

Se invece il dato è correttamente presente in Samsung Health, il passo successivo è verificare la condivisione verso Health Connect. Questo ordine evita di confondere un problema di acquisizione con un problema di autorizzazioni.

Nel caso di dati registrati direttamente dal telefono, la catena può essere diversa. Non tutte le misure provengono necessariamente da uno smartwatch, e alcune funzioni dipendono dalla versione Android e dai componenti di sistema installati.

## 3. Secondo controllo: le autorizzazioni di Samsung Health

La documentazione Samsung raccomanda di utilizzare una versione aggiornata dell'app Samsung Health; se i dati provengono da Galaxy Watch, è opportuno verificare anche la versione installata sull'orologio.

Per la condivisione dei dati, il percorso indicato da Samsung è:

**Samsung Health → Impostazioni → Health Connect → Autorizzazioni app → Samsung Health.**

Verifica che la categoria interessata — per esempio passi o sonno — sia autorizzata. Le etichette possono cambiare secondo versione e lingua del software: prima di pubblicare screenshot o promettere una sequenza esatta di tocchi sarà necessaria una prova su interfaccia corrente.

Samsung aggiunge una nota pratica: se concedi i permessi partendo dalle impostazioni Android, apri successivamente Samsung Health. La FAQ propone anche un controllo della sincronizzazione dall'app Samsung Health tramite le opzioni dell'account Samsung.

Questo non garantisce la soluzione a ogni problema, ma consente di verificare le condizioni di base indicate dal produttore.

**Fonte:** [Samsung Developer – Health Connect FAQ](https://developer.samsung.com/health/health-connect-faq.html).

## 4. Terzo controllo: l'app di destinazione può davvero leggere i passi?

Il fatto che Samsung Health riesca a scrivere i dati su Health Connect non garantisce che un'altra app li visualizzi. Google distingue esplicitamente i permessi di **lettura** e **scrittura** per ciascun tipo di dato: nei suoi esempi per i passi compaiono `READ_STEPS` e `WRITE_STEPS`.

Perciò, quando una seconda applicazione mostra zero passi, controlla separatamente che:

1. la sorgente abbia registrato e condiviso il dato;
2. il dato sia presente in Health Connect;
3. l'app finale abbia ottenuto il permesso di **leggerlo**;
4. l'app finale supporti effettivamente quella metrica e la rappresenti per l'intervallo temporale corretto.

Le autorizzazioni possono essere revocate: Google raccomanda alle app di verificare i permessi concessi anziché considerarli permanenti.

**Fonte:** [Android Developers – Get started with Health Connect](https://developer.android.com/health-and-fitness/health-connect/get-started).

## 5. Dove si trova Health Connect su Android 13 e Android 14+

Anche il modo in cui si accede a Health Connect può confondere. Google documenta una differenza fra le versioni principali di Android:

- **Android 14 e successivi:** Health Connect fa parte del sistema operativo ed è raggiungibile dalle impostazioni, cercando «Health Connect» se il percorso del produttore è diverso.
- **Android 13 e precedenti compatibili:** Health Connect è distribuito come applicazione separata tramite Google Play.

Le impostazioni precise possono variare fra smartphone e personalizzazioni Android. Non è quindi corretto imporre un unico percorso universale per tutti i telefoni Samsung o di altri marchi.

**Fonte:** [Android Developers – Get started](https://developer.android.com/health-and-fitness/health-connect/get-started).

## 6. Cosa è cambiato nel 2026 per i passi rilevati dal telefono

La documentazione Android descrive un comportamento che merita attenzione soprattutto quando due app mostrano conteggi differenti.

Con **Android 14 o superiore** e **SDK Extension 20 o successiva**, Health Connect supporta il conteggio dei passi rilevati direttamente dal telefono. Google specifica che, quando un'app riceve l'autorizzazione `READ_STEPS`, Health Connect può avviare la raccolta dei passi sul dispositivo, se i requisiti tecnici sono soddisfatti.

Un ulteriore cambiamento è arrivato con l'aggiornamento di **giugno 2026**. L'origine dei passi on-device non viene più attribuita genericamente al pacchetto `android`, ma a un nome di pacchetto sintetico specifico del dispositivo, con ambito limitato all'app. Le registrazioni storiche precedenti mantengono la vecchia attribuzione.

Per gli sviluppatori che filtrano i dati per `DataOrigin`, questa differenza è rilevante: un filtro costruito per la sorgente precedente potrebbe non includere le registrazioni nuove. Google precisa che le applicazioni che leggono dati aggregati senza filtrare per origine includono automaticamente i passi on-device.

Per l'utente significa una cosa concreta: **una discrepanza fra applicazioni può dipendere anche da quali sorgenti vengono incluse nel calcolo**, non soltanto da un sensore guasto o da una sincronizzazione interrotta. Prima di trarre conclusioni occorre confrontare periodo, sorgente e metodo di aggregazione.

**Fonte:** [Android Developers – Track steps, aggiornamento giugno 2026](https://developer.android.com/health-and-fitness/health-connect/features/steps).

## 7. Tabella diagnostica: da quale punto partire

| Quello che osservi | Controllo prioritario | Perché |
| --- | --- | --- |
| Passi mancanti in Samsung Health | Trasferimento dal dispositivo, connessione e sincronizzazione Samsung Health | Il dato potrebbe non essere ancora arrivato all'app sorgente |
| Samsung Health ha i passi ma Health Connect no | Permessi di condivisione Samsung Health → Health Connect | Il problema può essere nel passaggio fra le applicazioni |
| Health Connect ha i passi ma l'app finale no | Permesso `READ_STEPS` e integrazione dell'app finale | Leggere è diverso da scrivere |
| Due app mostrano numeri differenti | Intervallo temporale, origini e metodo di conteggio | Potrebbero aggregare record differenti |
| Vedi dati del telefono anche senza smartwatch | Versione Android, SDK Extension e origine dei record | Health Connect può raccogliere passi on-device in condizioni specifiche |

Questa tabella è un percorso di diagnosi derivato dalle documentazioni, **non** il risultato di una campagna di test sui dispositivi.

## 8. Quando una reinstallazione non è il primo passo giusto

La reinstallazione indiscriminata può far perdere tempo e complicare il confronto fra configurazioni. Prima annota quale metrica manca, in quale app la vedi ancora e da quando è comparsa la differenza. Verifica i permessi per la singola categoria, controlla la sincronizzazione nell'app di origine e considera l'eventuale intervallo necessario perché i dati raggiungano il telefono.

Se una sola metrica non compare, non trattare automaticamente tutte le categorie come equivalenti. Passi, sonno e attività fisica sono tipi di dati differenti e richiedono autorizzazioni e implementazioni dedicate.

## Conclusione

Per trovare la causa di una sincronizzazione mancante bisogna individuare **il primo punto in cui il dato scompare**: raccolta sul dispositivo, Samsung Health, Health Connect oppure applicazione finale. Seguire questa sequenza aiuta a evitare interventi casuali e a distinguere i limiti dell'app dalle impostazioni Android.

La documentazione ufficiale fornisce una base solida, ma non sostituisce la verifica dei menu, delle versioni installate e del comportamento reale del telefono specifico.

---

## Mappa delle evidenze — interna alla redazione

| Claim | Fonte primaria | Stato di questo pilota |
| --- | --- | --- |
| c1 — Galaxy Watch trasferisce i dati a Samsung Health, poi a Health Connect | Samsung FAQ | Supporto documentale controllato via consultazione web; non verificato con il retriever Python per blocco robots |
| c2 — Health Connect è integrato a partire da Android 14 | Android Developers Get started | Supporto documentale controllato |
| c3 — `READ_STEPS` e `WRITE_STEPS` sono distinti | Android Developers Get started | Supporto documentale controllato |
| c4 — giugno 2026: nuova attribuzione dei passi on-device | Android Developers Track steps | Supporto documentale controllato |
| c5 — tempi Galaxy Watch → Samsung Health dipendono da politiche specifiche | Samsung FAQ | Supporto documentale controllato via web |

**Dichiarazione di metodo:** la verifica qui riportata è una ricognizione documentale assistita da AI. Non equivale a un registro firmato da un redattore autenticato in PhonePulse e non abilita il gate locale `editorial_review_gate.py`. Le fonti Samsung risultano accessibili tramite consultazione web ma non tramite il retriever del workflow GitHub, che le ha bloccate correttamente per robots.txt.

## Checklist prima di pubblicare

- [x] Articolo originale e non una riscrittura sequenziale di un RSS
- [x] Fonti primarie attribuite nel punto pertinente
- [x] Distinzione fra documentazione e prova sul campo
- [x] Titolo, descrizione e categoria proposti
- [ ] Riesame umano delle affermazioni, dei limiti e delle date
- [ ] Controllo attuale dell'interfaccia Samsung Health e screenshot originali, se inseriti
- [ ] Confronto anti-duplicazione con articoli PhonePulse esistenti
- [ ] Approvazione tramite admin autenticato, test della preview e controllo SEO
- [ ] Verifica diritti e alt text di eventuali immagini

**Mai pubblicare automaticamente questa bozza.**
