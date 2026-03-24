import { Link } from 'react-router-dom'

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function ArticleCard({ article, featured = false }) {
  const { slug, title, cover_image_url, published_at, score, categories } = article

  return (
    <Link
      to={`/articoli/${slug}`}
      className="group relative flex flex-col aspect-[3/4] rounded-xl overflow-hidden bg-dark"
    >
      {/* Image */}
      {cover_image_url ? (
        <img
          src={cover_image_url}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] group-hover:brightness-110 transition-all duration-500"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-dark" />
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
        }}
      />

      {/* Score badge */}
      {score != null && (
        <div className="absolute top-3 right-3 bg-primary text-white text-xs font-body font-bold rounded-full w-10 h-10 flex flex-col items-center justify-center shadow-lg leading-none z-10">
          <span className="text-sm font-bold">{score}</span>
          <span className="text-[9px] opacity-80 font-medium">/100</span>
        </div>
      )}

      {/* Text anchored to bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-1.5 z-10">
        {categories && (
          <span
            className="inline-block text-[10px] font-body font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit"
            style={{
              backgroundColor: categories.color ? `${categories.color}30` : '#FF5C1A30',
              color: categories.color || '#FF5C1A',
            }}
          >
            {categories.name}
          </span>
        )}
        <h3 className={`font-heading text-white leading-tight ${featured ? 'text-4xl' : 'text-2xl'}`}>
          {title}
        </h3>
        <time className="text-xs text-white/50 font-body">{formatDate(published_at)}</time>
      </div>
    </Link>
  )
}
