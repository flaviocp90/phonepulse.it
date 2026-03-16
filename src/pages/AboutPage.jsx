import Header from '../components/Header'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Chi siamo"
        description="PhonePulse è un progetto editoriale italiano dedicato alle recensioni e guide smartphone. Onestà, approfondimento e indipendenza."
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
              PhonePulse è un progetto editoriale italiano dedicato al mondo degli smartphone. Niente clickbait, niente pressioni pubblicitarie: solo analisi serie.
            </p>

            <h2 className="text-2xl font-heading font-bold text-dark mt-10 mb-4">La nostra missione</h2>
            <p className="text-gray-600 font-body leading-relaxed mb-6">
              Scegliere uno smartphone oggi è complicato. L'offerta è enorme, i prezzi cambiano in continuazione e le specifiche tecniche sono difficili da interpretare. PhonePulse nasce per semplificare questa scelta.
            </p>
            <p className="text-gray-600 font-body leading-relaxed mb-6">
              Ogni recensione è il risultato di un utilizzo reale e prolungato del dispositivo. Ogni comparativo mette a confronto prodotti sullo stesso piano. Ogni guida è scritta per chi non vuole perdere tempo.
            </p>

            <h2 className="text-2xl font-heading font-bold text-dark mt-10 mb-4">Indipendenza editoriale</h2>
            <p className="text-gray-600 font-body leading-relaxed mb-6">
              I giudizi espressi su PhonePulse sono indipendenti. I link di affiliazione presenti in alcuni articoli non influenzano mai le valutazioni: un prodotto ottiene il voto che si merita, indipendentemente da chi lo vende o quanto costa.
            </p>

            <h2 className="text-2xl font-heading font-bold text-dark mt-10 mb-4">Il nostro metodo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
              {[
                { num: '01', title: 'Utilizzo reale', desc: 'Usiamo i dispositivi per settimane, non per ore.' },
                { num: '02', title: 'Voto numerico', desc: 'Ogni prodotto riceve un voto da 0 a 100, spiegato nel dettaglio.' },
                { num: '03', title: 'Aggiornamenti', desc: 'Le recensioni vengono aggiornate dopo aggiornamenti software importanti.' },
              ].map(item => (
                <div key={item.num} className="bg-white border border-border rounded-xl p-5">
                  <span className="text-3xl font-heading font-bold text-primary/30">{item.num}</span>
                  <h3 className="text-base font-heading font-bold text-dark mt-2 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 font-body leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
