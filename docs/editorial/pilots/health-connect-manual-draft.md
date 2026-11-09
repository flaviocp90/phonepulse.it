# Bozza pilota manuale — Health Connect e Samsung Health

> **Stato: SOLO REVISIONE.** Questa è una prova editoriale documentale preparata leggendo fonti ufficiali, non l'output automatico del nuovo retriever e non è un test diretto su dispositivi. Non pubblicata nel CMS.
>
> Data ricognizione: 9 novembre 2026. Fonti ufficiali consultate: Samsung Developer, Android Developers. UI e funzionamento in scenari reali non collaudati.

**Titolo SEO proposto:** Samsung Health e Health Connect: come verificare passi, sonno e sincronizzazione

**Descrizione SEO proposta:** Samsung Health non sincronizza passi o sonno con Health Connect? Come controllare il flusso dei dati, i permessi e i limiti delle app Android.

**Slug proposto:** samsung-health-health-connect-passi-sonno-sincronizzazione

**Categoria:** Guide Android · **Tag candidati:** Samsung Health, Health Connect, Galaxy Watch, Android, sincronizzazione dati

# Samsung Health e Health Connect: cosa controllare se mancano passi, sonno o allenamenti

Quando installiamo un'app per il fitness, spesso ci aspettiamo che i dati di uno smartwatch compaiano automaticamente anche nelle altre applicazioni. In pratica ci sono più passaggi, ognuno dei quali può introdurre un problema: la raccolta delle misure, la sincronizzazione con l'app del produttore, la condivisione tramite Health Connect e la lettura da parte dell'app che vogliamo utilizzare.

Non serve necessariamente cambiare dispositivo o reinstallare tutto. Prima conviene capire **dove si interrompe il percorso dei dati**.

## Il percorso dei dati: Galaxy Watch, Samsung Health e Health Connect

Secondo la documentazione Samsung, le misurazioni di un Galaxy Watch raggiungono prima Samsung Health sullo smartphone; da lì possono essere sincronizzate con Health Connect, a patto che la condivisione sia configurata e autorizzata. Health Connect **non legge direttamente il Galaxy Watch** come se fosse un'app installata sull'orologio: il collegamento passa per il telefono.

Samsung indica fra i dati sincronizzabili attività, passi, allenamenti, frequenza cardiaca e sonno. Questo non significa però che tutte le applicazioni collegate visualizzino necessariamente ogni metrica: oltre alla presenza del dato nel sistema, conta che l'app di destinazione lo legga e lo presenti.

Fonte: [Samsung Developer — Health Connect FAQ](https://developer.samsung.com/health/health-connect-faq.html).

## Primo controllo: le autorizzazioni di Samsung Health

Il primo punto da controllare non è l'orologio, ma il collegamento fra Samsung Health e Health Connect.

Samsung suggerisce di aggiornare Samsung Health e, se si utilizza un Galaxy Watch, anche la relativa app sull'orologio. Dall'app Samsung Health indica poi il percorso **Impostazioni → Health Connect → Autorizzazioni app → Samsung Health**. Le diciture possono variare in base alla versione e alla lingua dell'interfaccia: prima della pubblicazione occorre verificare il percorso corrente su un dispositivo reale.

Se le autorizzazioni sono state concesse passando dalle impostazioni Android, la documentazione Samsung consiglia anche di aprire Samsung Health dopo averle abilitate. Come ulteriore controllo, Samsung suggerisce di utilizzare la sincronizzazione con l'account Samsung dall'app.

Un errore frequente nella diagnosi è trattare la parola «sincronizzazione» come un unico interruttore: bisogna distinguere l'arrivo dei dati in Samsung Health dalla loro successiva disponibilità in Health Connect.

Fonte: [Samsung Developer — Health Connect FAQ](https://developer.samsung.com/health/health-connect-faq.html).

## Secondo controllo: permessi di lettura e scrittura dei passi

La documentazione tecnica Android distingue esplicitamente i permessi `READ_STEPS` e `WRITE_STEPS`: un'app che scrive i passi non è automaticamente equivalente a una che è autorizzata a leggerli. L'utente può inoltre revocare i permessi.

Per diagnosticare un dato mancante, controlliamo **due lati diversi**: la sorgente che dovrebbe registrare e condividere i passi e l'app che dovrebbe leggerli. Se Health Connect contiene registrazioni ma l'app di destinazione non le mostra, il guasto potrebbe trovarsi nell'integrazione o nella rappresentazione di quell'app, non nell'orologio.

La disponibilità di singole funzioni dipende anche da Android, dalle estensioni di sistema e dall'app utilizzata. Non tutte le combinazioni supportano le stesse modalità di raccolta.

Fonte: [Android Developers — Track steps](https://developer.android.com/health-and-fitness/health-connect/features/steps).

## Una novità da conoscere nel 2026: i passi rilevati dal telefono

Google documenta anche un caso che rende la diagnosi meno intuitiva. Su **Android 14 o superiore**, con **SDK Extension 20 o superiore** e almeno un'app autorizzata a leggere i passi, Health Connect può raccogliere direttamente i passi rilevati dal telefono. Dall'aggiornamento di giugno 2026 questa sorgente viene identificata in modo diverso rispetto alle vecchie registrazioni, tramite un identificatore specifico del dispositivo e dell'app.

Per chi sviluppa un'app che filtra i passi in base alla sorgente, ciò può influire su quali registrazioni vengono incluse. Per chi usa semplicemente un'app di fitness, è un promemoria importante: **non tutti i passi devono necessariamente arrivare dall'orologio**, e una differenza fra due schermate non dimostra da sola che uno dei dispositivi misuri male.

Questo dettaglio richiede cautela: le condizioni tecniche per il conteggio nativo non equivalgono a dire che qualsiasi telefono Android registri passi in Health Connect in tutte le circostanze.

Fonte: [Android Developers — Track steps, on-device step counting e aggiornamento giugno 2026](https://developer.android.com/health-and-fitness/health-connect/features/steps).

## Come individuare il punto che non funziona

| Sintomo | Primo controllo utile | Cosa non concludere troppo presto |
| --- | --- | --- |
| I passi del Galaxy Watch non compaiono in Samsung Health | Collegamento orologio–telefono, stato aggiornamenti e sincronizzazione Samsung Health | Che Health Connect sia responsabile |
| Samsung Health mostra i dati, Health Connect no | Permessi di Samsung Health per le categorie interessate e avvio dell'app dopo la concessione | Che tutte le categorie abbiano automaticamente gli stessi permessi |
| Health Connect mostra passi ma l'app finale no | Autorizzazione di lettura dell'app finale e sua capacità di visualizzare i dati | Che il sensore abbia smesso di funzionare |
| I conteggi non coincidono fra app | Sorgenti, intervallo di tempo e modalità di aggregazione | Che le due app stiano sommando esattamente gli stessi record |

Questa tabella è uno **schema diagnostico ragionato** a partire dalla documentazione, non una certificazione di comportamento su ogni versione di Samsung Health.

## In sintesi

Conviene verificare il percorso dei dati un passaggio alla volta: **dispositivo → Samsung Health → Health Connect → app di destinazione**. I controlli iniziali sono la presenza effettiva delle misurazioni, le autorizzazioni per ciascun tipo di dato e l'eventuale sincronizzazione dell'app del produttore.

Se il problema riguarda una sola metrica, non presumiamo che tutti i dati si muovano nello stesso modo. Senza conoscere dispositivo, versione Android, app e permessi concessi, nessuna guida può garantire una risoluzione universale.

## Checklist editoriale prima della pubblicazione

- [x] Fonti originali Samsung/Google effettivamente consultate e attribuite.
- [x] Tre gruppi di affermazioni documentali con fonti primarie.
- [x] Test diretto NON dichiarato; nessun benchmark, dato personale o fotografia attribuita alla redazione.
- [ ] Convalidare percorsi dei menu su Samsung Health attuale.
- [ ] Convalidare le condizioni di SDK Extension 20 su dispositivo reale oppure mantenere qualificazione esplicita.
- [ ] Revisione linguistica e SEO finale, verifica anti-duplicazione e aggiornamento fonti.
- [ ] Screenshot originali/immagini con licenza e alt text, se necessari.
- [ ] Approvazione editoriale prima dell'inserimento e della pubblicazione in CMS.

## Nota sulla pipeline tecnica

Questo file è un **pilot manuale** con ricerca tramite consultazione di pagine ufficiali; NON costituisce un dry-run HTTP eseguito dal modulo Python su server CI. I test automatici simulano tre condizioni: contenuto sufficientemente documentato, conflitto di evidenze e insufficienza. Il comando `scripts/editorial_dry_run.py` produce soltanto un manifest di provenienza e NON autorizza mai la pubblicazione.
