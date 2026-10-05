import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { supabase } from "../lib/supabase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { publicEditorial } from "../lib/publicEditorial";
import { ArticleSchema, BreadcrumbSchema } from "../components/SchemaMarkup";

marked.setOptions({ breaks: true, gfm: true });

function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
}

function ArticleSkeleton() {
  return (
    <div className="animate-pulse max-w-3xl mx-auto px-4 py-12">
      <div className="h-4 bg-gray-200 rounded w-24 mb-5" />
      <div className="h-10 bg-gray-200 rounded w-4/5 mb-3" />
      <div className="h-10 bg-gray-200 rounded w-2/3 mb-6" />
      <div className="h-4 bg-gray-100 rounded w-40 mb-8" />
      <div className="aspect-[16/9] bg-gray-200 rounded-xl mb-8" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`h-4 bg-gray-100 rounded ${i % 3 === 2 ? "w-3/4" : "w-full"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function ArticlePage() {
  const { slug } = useParams();
  const [loadedArticle, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedResult, setRelated] = useState(null);

  const article = loadedArticle?.slug === slug ? loadedArticle : null;
  const editorial = article ? publicEditorial(article) : null;
  const related = relatedResult?.slug === slug ? relatedResult.items : [];

  useEffect(() => {
    if (!article?.category_id) return;
    let active = true;
    supabase.from("articles").select("id, slug, title")
      .eq("is_published", true).eq("category_id", article.category_id).neq("id", article.id)
      .order("published_at", { ascending: false }).limit(3)
      .then(({ data, error }) => {
        if (active && !error) setRelated({ slug: article.slug, items: Array.isArray(data) ? data : [] });
      }).catch(() => {}); // Suggestions failing must not hide the article.
    return () => { active = false; };
  }, [article]);

  useEffect(() => {
    let active = true;
    async function fetchArticle() {
      setArticle(null);
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("articles")
          .select(
            "*, categories(id, name, slug, color), article_tags(tags(id, name, slug))",
          )
          .eq("slug", slug)
          .eq("is_published", true)
          .maybeSingle();

        if (!active) return;
        if (err) throw err;
        setArticle(data);
        if (!data) setError("Articolo non trovato o non più disponibile.");
      } catch (err) {
        if (!active) return;
        setError("Impossibile caricare l’articolo. Riprova più tardi.");
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchArticle();
    return () => { active = false; };
  }, [slug]);

  return (
    <div className="min-h-screen flex flex-col">
      {!article && <SEO title="Articolo" />}
      {article && (
        <>
          <SEO
            title={article.seo_title || article.title}
            description={article.seo_description || article.excerpt}
            image={article.cover_image_url}
            canonical={`/articoli/${article.slug}`}
            type="article"
          />
          <ArticleSchema article={article} />
          <BreadcrumbSchema
            items={[
              { name: 'Home', url: 'https://phonepulse.it/' },
              {
                name: article.categories?.name || 'Articoli',
                url: `https://phonepulse.it/categoria/${article.categories?.slug || 'news'}`,
              },
              { name: article.title, url: `https://phonepulse.it/articoli/${article.slug}` },
            ]}
          />
        </>
      )}
      <Header />

      <main className="flex-1">
        {loading && <ArticleSkeleton />}

        {!loading && error && (
          <div className="max-w-3xl mx-auto px-4 py-20 text-center">
            <p className="text-gray-500 font-body mb-6">{error}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-primary font-body font-medium hover:underline"
            >
              ← Torna alla home
            </Link>
          </div>
        )}

        {!loading && !error && article && (
          <article className="max-w-3xl mx-auto px-4 py-12">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-gray-400 font-body mb-6">
              <Link to="/" className="hover:text-gray-600 transition-colors">
                Home
              </Link>
              <span className="text-gray-400">&rsaquo;</span>
              {article.categories && (
                <>
                  <Link
                    to={`/categoria/${article.categories.slug}`}
                    className="hover:text-gray-600 transition-colors"
                  >
                    {article.categories.name}
                  </Link>
                  <span className="text-gray-400">&rsaquo;</span>
                </>
              )}
              <span className="text-gray-500 line-clamp-1">
                {article.title}
              </span>
            </nav>

            {/* Category */}
            <div className="flex items-center gap-3 mb-4">
              {article.categories && (
                <Link
                  to={`/categoria/${article.categories.slug}`}
                  className="inline-block text-xs font-body font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: article.categories.color
                      ? `${article.categories.color}18`
                      : "#FF5C1A18",
                    color: article.categories.color || "#FF5C1A",
                  }}
                >
                  {article.categories.name}
                </Link>
              )}

            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-heading text-dark leading-none mb-4 uppercase">
              {article.title}
            </h1>

            {/* Excerpt */}
            {article.excerpt && (
              <p className="text-lg text-[#6B6560] font-body italic leading-relaxed mb-6 border-l-[5px] border-primary/40 pl-4">
                {article.excerpt}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 font-body mb-8 pb-8 border-b border-border">
              {editorial.format && <span>Formato: {editorial.format}</span>}
              {editorial.author && <span>Di <strong className="text-gray-700">{editorial.author}</strong></span>}
              {editorial.publishedAt && <span>Pubblicato: <time dateTime={editorial.publishedAt}>{formatDate(editorial.publishedAt)}</time></span>}
              {editorial.updatedAt && <span>Aggiornato: <time dateTime={editorial.updatedAt}>{formatDate(editorial.updatedAt)}</time></span>}
            </div>

            {article.origin === 'legacy' && (
              <aside className="mb-8 border-l-4 border-border pl-4 text-sm text-gray-600 font-body">
                <strong>Articolo d’archivio</strong>. Le informazioni di produzione non documentate non attestano prove dirette del dispositivo.
              </aside>
            )}
            {article.origin === 'rss' && (
              <aside className="mb-8 border-l-4 border-primary/30 pl-4 text-sm text-gray-600 font-body">
                Bozza preparata con assistenza AI a partire dalle fonti. La verifica e le scelte di pubblicazione sono responsabilità dell’autore indicato.
              </aside>
            )}

            {/* Cover image */}
            {article.cover_image_url && (
              <div className="mb-10 rounded-2xl overflow-hidden border border-border">
                <img
                  src={article.cover_image_url}
                  alt={article.title}
                  className="w-full object-cover"
                />
              </div>
            )}

            {/* Content */}
            {article.content && (
              <div
                className="article-content"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(marked.parse(article.content)),
                }}
              />
            )}

            {editorial.sources.length > 0 && (
              <section aria-labelledby="article-sources" className="mt-10 pt-8 border-t border-border font-body">
                <h2 id="article-sources" className="text-2xl font-heading text-dark mb-4">Fonti</h2>
                <ul className="space-y-4 text-sm break-words">
                  {editorial.sources.map((source, index) => (
                    <li key={index}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-dark underline underline-offset-4">{source.title}</a>
                      <p className="text-gray-600 mt-1">
                        {source.publisher}
                        {source.retrievedAt && <span>{source.publisher ? ' · ' : ''}Consultata: <time dateTime={source.retrievedAt}>{formatDate(source.retrievedAt)}</time></span>}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Tags */}
            {article.article_tags && article.article_tags.length > 0 && (
              <div className="mt-10 pt-8 border-t border-border">
                <div className="flex flex-wrap gap-2">
                  {article.article_tags.map(({ tags: tag }) =>
                    tag ? (
                      <span
                        key={tag.id}
                        className="text-xs font-body font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full"
                      >
                        #{tag.name}
                      </span>
                    ) : null,
                  )}
                </div>
              </div>
            )}

            {/* Affiliate links */}
            {article.affiliate_links &&
              Array.isArray(article.affiliate_links) &&
              article.affiliate_links.length > 0 && (
                <div className="mt-10 p-6 bg-primary/5 border border-primary/20 rounded-2xl">
                  <h3 className="text-sm font-body font-semibold text-primary uppercase tracking-wide mb-4">
                    Dove acquistare
                  </h3>
                  <div className="flex flex-col gap-3">
                    {article.affiliate_links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url || link}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="inline-flex items-center justify-between gap-3 bg-white border border-border px-4 py-2.5 rounded-xl hover:border-primary/60 hover:shadow-md transition-all duration-200 group"
                      >
                        <span className="text-sm font-body font-medium text-dark group-hover:text-primary transition-colors">
                          {link.label || link.url || link}
                        </span>
                        <svg
                          className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors shrink-0"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M4 10h12M10 4l6 6-6 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </a>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 font-body mt-3">
                    * I link sopra possono contenere codici di affiliazione. Non
                    influenzano la valutazione.
                  </p>
                </div>
              )}

            {/* Back link */}
            <div className="mt-12 pt-8 border-t border-border">
              {related.length > 0 && (
                <section aria-labelledby="related-articles" className="mb-8">
                  <h2 id="related-articles" className="text-2xl font-heading text-dark mb-4">Altri articoli in questa categoria</h2>
                  <ul className="space-y-3 font-body text-sm">
                    {related.map(item => <li key={item.id}><Link to={`/articoli/${item.slug}`} className="text-dark underline underline-offset-4">{item.title}</Link></li>)}
                  </ul>
                </section>
              )}
              <Link
                to={article.categories ? `/categoria/${article.categories.slug}` : "/"}
                className="inline-flex items-center gap-2 text-sm text-gray-500 font-body hover:text-primary transition-colors"
              >
                ← {article.categories ? `Torna a ${article.categories.name}` : "Torna alla home"}
              </Link>
            </div>
          </article>
        )}
      </main>

      <Footer />
    </div>
  );
}
