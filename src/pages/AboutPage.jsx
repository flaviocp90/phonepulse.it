import Header from '../components/Header'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Chi siamo"
        description="PhonePulse: smartphone e app, notizie verificate sulle fonti e guide pratiche. Responsabile editoriale Flavio Coppola."
        canonical="/chi-siamo"
      />
      <Header />

      <main className="flex-1">
        {/* Page header */}
        <section className="bg-dark border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-heading font-bold text-white">Chi siamo</h1>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-3xl mx-auto px-4 py-16">
          <div className="prose-style">
            <p className="text-xl text-gray-600 font-body leading-relaxed mb-8 border-l-4 border-primary/30 pl-5">
              Smartphone e app, notizie verificate sulle fonti e guide pratiche: PhonePulse aiuta a capire le novità e a scegliere con informazioni controllabili.
            </p>

            <h2 className="text-2xl font-heading font-bold text-dark mt-10 mb-4">La nostra missione</h2>
            <p className="text-gray-600 font-body leading-relaxed mb-6">
              Scegliere uno smartphone oggi è complicato. L'offerta è enorme, i prezzi cambiano in continuazione e le specifiche tecniche sono difficili da interpretare. PhonePulse nasce per semplificare questa scelta.
            </p>
            <p className="text-gray-600 font-body leading-relaxed mb-6">
              Il responsabile editoriale è <strong className="text-dark">Flavio Coppola</strong>. Nei nuovi articoli indichiamo autore, formato, fonti e date. I contenuti d’archivio possono avere informazioni incomplete: la loro presenza non certifica un test diretto.
            </p>

            <h2 className="text-2xl font-heading font-bold text-dark mt-10 mb-4">Indipendenza editoriale</h2>
            <p className="text-gray-600 font-body leading-relaxed mb-6">
              I link di affiliazione sono segnalati nell’articolo: un acquisto può generare una commissione per il sito. Le fonti e i limiti del contenuto devono restare espliciti, anche quando sono presenti questi link.
            </p>

            <h2 className="text-2xl font-heading font-bold text-dark mt-10 mb-4">Il nostro metodo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
              {[
                { num: '01', title: 'Fonti verificabili', desc: 'Distinguiamo gli annunci e i dati del produttore dalle osservazioni dirette.' },
                { num: '02', title: 'Prove documentate', desc: 'Una prova diretta deve descrivere dispositivo, versione software, condizioni e limiti. Un voto richiede un metodo documentato.' },
                { num: '03', title: 'Revisione umana', desc: 'L’AI può aiutare a preparare una bozza. Autore e responsabile editoriale verificano il contenuto e decidono la pubblicazione.' },
              ].map(item => (
                <div key={item.num} className="bg-white border border-border rounded-xl p-5">
                  <span className="text-3xl font-heading font-bold text-primary/30">{item.num}</span>
                  <h3 className="text-base font-heading font-bold text-dark mt-2 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 font-body leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <h2 className="text-2xl font-heading font-bold text-dark mt-10 mb-4">Correzioni</h2>
            <p className="text-gray-600 font-body leading-relaxed">
              Per segnalare un errore, scrivi a <a href="mailto:phonepulse.it@gmail.com?subject=CORREZIONE" className="text-primary underline">phonepulse.it@gmail.com</a> indicando articolo e fonti. Gli aggiornamenti sostanziali mostrano una data distinta dalla prima pubblicazione.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
