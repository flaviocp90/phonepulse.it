import { useEffect, useState, useCallback } from "react";

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
          "id, slug, title, excerpt, cover_image_url, published_at, categories(id, name, slug, color)",
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
        await fetchArticles(0, false);
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
                Smartphone e app
                <br />
                <span className="text-primary">news e guide pratiche.</span>
              </h1>
              <p className="text-white/50 text-sm font-body leading-relaxed mb-6 max-w-md">
                Il nostro metodo: notizie verificate sulle fonti e guide per usare
                meglio smartphone e app.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/categoria/news"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-body font-semibold px-5 py-2.5 rounded-full transition-colors"
                >
                  Leggi le news
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

      </main>

      <Footer />
    </div>
  );
}
