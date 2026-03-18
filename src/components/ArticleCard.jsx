import { Link } from 'react-router-dom'

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function ImagePlaceholder() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
      <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function ArticleCard({ article }) {
  const { slug, title, excerpt, cover_image_url, published_at, score, categories } = article

  return (
    <Link
      to={`/articoli/${slug}`}
      className="group flex flex-col bg-white border border-border rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
    >
      {/* Cover */}
      <div className="aspect-[16/9] bg-gray-100 overflow-hidden relative">
        {cover_image_url ? (
          <img
            src={cover_image_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <ImagePlaceholder />
        )}

        {/* Score badge */}
        {score != null && (
          <div className="absolute top-3 right-3 bg-primary text-white text-xs font-body font-bold rounded-full w-10 h-10 flex flex-col items-center justify-center shadow-lg leading-none">
            <span className="text-sm font-bold">{score}</span>
            <span className="text-[9px] opacity-80 font-medium">/100</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2.5">
        {categories && (
          <span
            className="inline-block text-xs font-body font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full w-fit"
            style={{
              backgroundColor: categories.color ? `${categories.color}18` : '#FF5C1A18',
              color: categories.color || '#FF5C1A',
            }}
          >
            {categories.name}
          </span>
        )}

        <h3 className="text-base font-heading font-bold text-dark leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h3>

        {excerpt && (
          <p className="text-sm text-gray-500 font-body leading-relaxed line-clamp-2 flex-1">
            {excerpt}
          </p>
        )}

        <time className="text-xs text-gray-500 font-body mt-auto pt-1">{formatDate(published_at)}</time>
      </div>
    </Link>
  )
}
