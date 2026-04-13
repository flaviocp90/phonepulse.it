import { useEffect, useState, useCallback } from "react";

const CATEGORY_ICONS = {
  recensioni: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="w-6 h-6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  comparativi: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="w-6 h-6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  guide: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="w-6 h-6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  news: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="w-6 h-6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  offerte: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="w-6 h-6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
};
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import NewsCard from "../components/NewsCard";
import SEO from "../components/SEO";
import { OrganizationSchema } from "../components/SchemaMarkup";

const PAGE_SIZE = 18;

function NewsCardSkeleton() {
  return (
    <div className="flex gap-3 items-start p-3 rounded-xl border border-border animate-pulse">
      <div className="w-20 h-[72px] rounded-lg bg-gray-200 flex-shrink-0" />
      <div className="flex flex-col gap-2 flex-1">
        <div className="h-2.5 bg-gray-200 rounded w-16" />
        <div className="h-4 bg-gray-200 rounded w-4/5" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-2 bg-gray-100 rounded w-20 mt-1" />
      </div>
    </div>
  );
}

export default function Home() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(null);

  const fetchArticles = useCallback(async (from, append = false) => {
    try {
      const { data, error: artErr } = await supabase
        .from("articles")
        .select(
          "id, slug, title, excerpt, cover_image_url, published_at, score, categories(id, name, slug, color)",
        )
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (artErr) throw artErr;

      const fetched = data || [];
      setArticles((prev) => (append ? [...prev, ...fetched] : fetched));
      setHasMore(fetched.length === PAGE_SIZE);
      setOffset(from + fetched.length);
    } catch (err) {
      setError("Impossibile caricare i contenuti. Riprova più tardi.");
      console.error(err);
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [, categoriesRes] = await Promise.all([
          fetchArticles(0, false),
          supabase
            .from("categories")
            .select("id, name, slug, description, color")
            .order("name"),
        ]);

        if (categoriesRes.error) throw categoriesRes.error;
        setCategories(categoriesRes.data || []);
      } catch (err) {
        setError("Impossibile caricare i contenuti. Riprova più tardi.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [fetchArticles]);

  async function loadMore() {
    setLoadingMore(true);
    await fetchArticles(offset, true);
    setLoadingMore(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO />
      <OrganizationSchema />
      <Header />

      <main className="flex-1">
        {/* Hero — reduced visual weight */}
        <section className="hero-section bg-dark">
          <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
            <div className="max-w-4xl">
              <h1 className="text-5xl md:text-[80px] font-heading text-white leading-none mb-3 uppercase">
                Recensioni e guide smartphone
                <br />
                <span className="text-primary">per scegliere bene.</span>
              </h1>
              <p className="text-white/50 text-sm font-body leading-relaxed mb-6 max-w-md">
                Analisi approfondite, comparativi onesti e guide pratiche per
                trovare il telefono giusto.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/categoria/recensioni"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-body font-semibold px-5 py-2.5 rounded-full transition-colors"
                >
                  Esplora le recensioni
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  to="/categoria/guide"
                  className="inline-flex items-center gap-2 border border-white/20 hover:border-white/40 text-white text-sm font-body font-semibold px-5 py-2.5 rounded-full transition-colors"
                >
                  Guide all'acquisto
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Articles grid — compact news cards */}
        <section className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-3xl font-heading text-dark uppercase">
              Ultimi articoli
            </h2>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm font-body mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 18 }).map((_, i) => (
                <NewsCardSkeleton key={i} />
              ))}
            </div>
          ) : articles.length === 0 && !error ? (
            <p className="text-gray-400 font-body text-center py-16">
              Nessun articolo pubblicato ancora.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {articles.map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 border border-border text-dark text-sm font-body font-semibold px-6 py-2.5 rounded-full hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Caricamento...
                      </>
                    ) : (
                      "Carica altro"
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="bg-dark">
            <div className="max-w-6xl mx-auto px-4 py-12">
              <h2 className="text-3xl font-heading text-white uppercase mb-6">
                Esplora per categoria
              </h2>
              <div className="flex flex-wrap justify-center gap-3">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/categoria/${cat.slug}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors"
                  >
                    <span style={{ color: cat.color || "#FF5C1A" }}>
                      {CATEGORY_ICONS[cat.slug] || (
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: cat.color || "#FF5C1A" }}
                        />
                      )}
                    </span>
                    <span className="text-sm font-body uppercase tracking-widest">
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
