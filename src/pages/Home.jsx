export default function Home() {
  return (
    <main className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border bg-dark">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-primary text-2xl font-heading font-bold tracking-tight">PHONE</span>
          <span className="text-white text-2xl font-heading font-bold tracking-tight">PULSE</span>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-heading font-bold text-dark mb-4">
          Recensioni e guide smartphone<br />
          <span className="text-primary">per scegliere bene.</span>
        </h1>
        <p className="text-lg text-gray-500 mt-6">
          Presto online — stiamo costruendo qualcosa di bello.
        </p>
      </section>
    </main>
  )
}
