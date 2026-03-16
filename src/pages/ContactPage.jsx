import Header from '../components/Header'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Contatti"
        description="Contatta la redazione di PhonePulse per collaborazioni, segnalazioni o informazioni."
        canonical="/contatti"
      />
      <Header />

      <main className="flex-1">
        {/* Page header */}
        <section className="bg-dark border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-heading font-bold text-white">Contatti</h1>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-3xl mx-auto px-4 py-16">
          <p className="text-lg text-gray-600 font-body leading-relaxed mb-10">
            Hai una domanda, vuoi segnalare un errore o proporre una collaborazione? Scrivici.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border border-border rounded-2xl p-6">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-primary" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 5l7 7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-base font-heading font-bold text-dark mb-1">Email</h3>
              <p className="text-sm text-gray-500 font-body mb-3">Per qualsiasi comunicazione.</p>
              <a
                href="mailto:phonepulse.it@gmail.com"
                className="text-primary font-body font-medium text-sm hover:underline"
              >
                phonepulse.it@gmail.com
              </a>
            </div>

            <div className="bg-white border border-border rounded-2xl p-6">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-primary" viewBox="0 0 20 20" fill="none">
                  <path d="M10 18s7-5 7-10a7 7 0 10-14 0c0 5 7 10 7 10z" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="10" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <h3 className="text-base font-heading font-bold text-dark mb-1">Collaborazioni</h3>
              <p className="text-sm text-gray-500 font-body mb-3">
                Sei un brand, un'agenzia o un creator? Raccontaci il tuo progetto.
              </p>
              <a
                href="mailto:phonepulse.it@gmail.com?subject=Collaborazione"
                className="text-primary font-body font-medium text-sm hover:underline"
              >
                Scrivici
              </a>
            </div>
          </div>

          <div className="mt-10 bg-primary/5 border border-primary/20 rounded-2xl p-6">
            <p className="text-sm text-gray-600 font-body leading-relaxed">
              <strong className="text-dark">Tempo di risposta:</strong> cerchiamo di rispondere a tutte le email entro 48 ore lavorative.
              Per segnalazioni urgenti relative a errori o contenuti inesatti, indica "CORREZIONE" nell'oggetto.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
