import { Link } from 'react-router-dom'

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function NewsCard({ article }) {
  const { slug, title, excerpt, cover_image_url, published_at, score, categories } = article

  return (
    <Link
      to={`/articoli/${slug}`}
      className="group flex gap-3 items-start p-3 rounded-xl border border-border bg-white hover:border-gray-300 hover:shadow-sm transition-all duration-200"
    >
      {/* Image — small, not central */}
      <div className="w-20 h-[72px] rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
        {cover_image_url ? (
          <img
            src={cover_image_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-200" />
        )}
      </div>

      {/* Text */}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1 overflow-hidden">
        {categories && (
          <span
            className="text-[10px] font-body font-semibold uppercase tracking-wider"
            style={{ color: categories.color || '#FF5C1A' }}
          >
            {categories.name}
          </span>
        )}
        <h3 className="font-heading text-dark text-[15px] leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        {excerpt && (
          <p className="text-[11px] text-gray-400 font-body line-clamp-2 mt-0.5 leading-relaxed">
            {excerpt}
          </p>
        )}
        <time className="text-[10px] text-gray-300 font-body mt-auto pt-1">
          {formatDate(published_at)}
        </time>
      </div>

      {/* Score */}
      {score != null && (
        <div className="flex-shrink-0 bg-primary text-white text-xs font-body font-bold rounded-full w-8 h-8 flex flex-col items-center justify-center leading-none">
          <span className="text-[11px] font-bold">{score}</span>
        </div>
      )}
    </Link>
  )
}
