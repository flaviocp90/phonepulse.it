import Header from '../components/Header'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Informativa privacy" description="Come PhonePulse tratta i dati di navigazione, le richieste email e le preferenze sulle statistiche." canonical="/privacy" />
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full font-body text-gray-600 leading-relaxed [&_h2]:font-body [&_h2]:font-semibold [&_h2]:text-2xl [&_h2]:text-dark [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:mb-4 [&_a]:underline [&_a]:text-action">
        <h1 className="text-4xl font-body font-semibold text-dark mb-4">Informativa privacy</h1>
        <p>Ultimo aggiornamento: <time dateTime="2026-11-16">16 novembre 2026</time>. Questa informativa riguarda il sito PhonePulse e descrive i trattamenti ai sensi degli articoli 12 e 13 del Regolamento (UE) 2016/679 (GDPR).</p>

        <h2>Titolare e contatti</h2>
        <p>Il titolare del trattamento è Flavio Coppola, responsabile di PhonePulse. Per richieste sulla privacy e per esercitare i tuoi diritti puoi scrivere a <a href="mailto:phonepulse.it@gmail.com?subject=Privacy">phonepulse.it@gmail.com</a>.</p>

        <h2>Navigazione e funzionamento del sito</h2>
        <p>Il sito usa Vercel per hosting e distribuzione delle pagine e Supabase per contenuti, immagini e autenticazione della redazione. Quando richiedi una pagina o una risorsa, i servizi ricevono i dati tecnici necessari alla connessione, come indirizzo IP, data e ora, URL richiesto e informazioni sul browser. Servono a consegnare i contenuti, diagnosticare errori e prevenire abusi. La base giuridica è il legittimo interesse a rendere disponibile e proteggere il sito (articolo 6, paragrafo 1, lettera f GDPR).</p>
        <p>Leggere gli articoli non richiede un account. Le credenziali e la sessione Supabase riguardano gli utenti autorizzati alla redazione; le copie di recupero delle bozze sono conservate nel loro browser. I font sono serviti direttamente dal sito.</p>

        <h2>Statistiche facoltative e consenso</h2>
        <p>Google Analytics, Ahrefs Analytics e Vercel Web Analytics si attivano soltanto se selezioni «Accetta statistiche». Rifiutare non impedisce di leggere il sito. La base giuridica è il consenso (articolo 6, paragrafo 1, lettera a GDPR), che puoi revocare in qualsiasi momento con «Preferenze privacy» nel footer. La revoca interrompe i nuovi invii e non modifica la liceità dei trattamenti già effettuati.</p>
        <p>Google Analytics usa identificatori e cookie per misurare visite, pagine consultate, provenienza del traffico e caratteristiche generali del dispositivo. Ahrefs misura l’uso del sito senza cookie secondo la propria documentazione. Vercel produce statistiche aggregate su pagine, provenienza e dispositivo; dichiara di non usare cookie per identificare i visitatori e di eliminare l’identificatore di sessione dopo 24 ore. Non inviamo a questi strumenti il testo delle email o le bozze editoriali come eventi personalizzati.</p>
        <p>La scelta è salvata nel browser nella voce <code>phonepulse:privacy:v1</code>, con esito e data, per un massimo di 180 giorni. Dopo tale periodo viene richiesta una nuova scelta. La conservazione tecnica della preferenza serve a rispettarla, anche in caso di rifiuto. Se cancelli i dati del browser o cambi dispositivo dovrai esprimerla di nuovo. I cookie Google già presenti vengono rimossi dal sito al rifiuto per i nomi <code>_ga</code> e <code>_ga_*</code>; eventuali dati conservati dal fornitore seguono le sue regole di conservazione e i diritti applicabili.</p>
        <p>Dettagli dei fornitori: <a href="https://policies.google.com/technologies/partner-sites?hl=it" rel="noopener noreferrer">Google e siti partner</a>, <a href="https://ahrefs.com/legal/privacy-policy" rel="noopener noreferrer">Ahrefs Analytics</a>, <a href="https://vercel.com/docs/analytics/privacy-policy" rel="noopener noreferrer">Vercel Web Analytics</a>.</p>

        <h2>Se ci scrivi</h2>
        <p>Scrivere alla redazione è facoltativo. Trattiamo il tuo indirizzo email e le informazioni che scegli di inviare per rispondere alla richiesta, valutare una segnalazione o gestire una proposta di collaborazione. La base giuridica è l’esecuzione di misure precontrattuali richieste dall’interessato quando pertinenti (articolo 6, paragrafo 1, lettera b GDPR), oppure il legittimo interesse a gestire la corrispondenza e le segnalazioni (lettera f). La casella email è gestita tramite Gmail di Google. Non usare le comunicazioni per inviare dati sensibili o informazioni non necessarie.</p>

        <h2>Immagini, link esterni e affiliazioni</h2>
        <p>Gli articoli possono caricare immagini da fornitori esterni, compresi Unsplash, Pexels e i siti delle fonti: il loro server riceve i dati tecnici della richiesta per mostrare l’immagine. I collegamenti a Instagram, Telegram, fonti e negozi aprono servizi con proprie informative. Gli eventuali link di affiliazione sono segnalati nell’articolo e possono riconoscere una commissione al sito. Le preferenze espresse qui regolano le statistiche di PhonePulse; non sostituiscono le scelte sui siti esterni.</p>

        <h2>Destinatari e trasferimenti fuori dallo SEE</h2>
        <p>Accedono ai dati il titolare e le persone autorizzate per le rispettive attività, oltre ai fornitori necessari al funzionamento del sito e alla corrispondenza. La banca dati Supabase del sito è nella regione Irlanda. Vercel, Supabase, Google e Ahrefs possono comunque coinvolgere infrastrutture o subfornitori fuori dallo Spazio economico europeo. I trasferimenti devono essere coperti dalle garanzie previste dagli articoli 44 e seguenti GDPR, come decisioni di adeguatezza applicabili o clausole contrattuali standard; puoi chiedere informazioni sulle garanzie relative al trattamento che ti riguarda.</p>
        <p>Riferimenti: <a href="https://vercel.com/legal/privacy-policy" rel="noopener noreferrer">Vercel</a>, <a href="https://supabase.com/privacy" rel="noopener noreferrer">Supabase</a> e <a href="https://supabase.com/legal/dpa" rel="noopener noreferrer">accordo sul trattamento Supabase</a>.</p>

        <h2>Conservazione</h2>
        <p>I dati di corrispondenza sono conservati per il tempo necessario a gestire la richiesta e gli eventuali obblighi o contestazioni collegati; quelli non più necessari vengono eliminati. Per log tecnici e statistiche valgono i tempi del servizio e della configurazione applicabile: il termine di 24 ore di Vercel riguarda l’identificatore di sessione, non tutte le statistiche aggregate. Le preferenze locali hanno il limite di 180 giorni indicato sopra. Le sessioni della redazione durano fino a scadenza o uscita; le copie locali delle bozze possono essere rimosse dalla funzione di recupero o cancellando i dati del browser.</p>

        <h2>I tuoi diritti</h2>
        <p>Nei casi previsti dagli articoli 15–22 GDPR puoi chiedere accesso, rettifica, cancellazione, limitazione e portabilità dei dati, opporti al trattamento basato sul legittimo interesse e revocare il consenso. Scrivi al contatto del titolare: riceverai riscontro entro un mese, salvo le proroghe motivate previste dal GDPR. Può essere necessaria una verifica proporzionata dell’identità.</p>
        <p>Puoi presentare reclamo al <a href="https://www.garanteprivacy.it/" rel="noopener noreferrer">Garante per la protezione dei dati personali</a> o all’autorità competente. PhonePulse non prende decisioni con effetti giuridici su di te basate esclusivamente su trattamenti automatizzati. Questa pagina viene aggiornata quando cambiano i trattamenti del sito.</p>
      </main>
      <Footer />
    </div>
  )
}
