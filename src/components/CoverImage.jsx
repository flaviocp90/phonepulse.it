import { useState } from 'react'

export function imageSrcSet(src) {
  try {
    const url = new URL(src)
    if (url.protocol !== 'https:' || !['images.pexels.com', 'images.unsplash.com'].includes(url.hostname)) return undefined
    return [160, 320, 640, 940].map(width => {
      url.searchParams.set('w', String(width))
      url.searchParams.delete('h')
      return `${url.href} ${width}w`
    }).join(', ')
  } catch { return undefined }
}

export default function CoverImage({ src, alt, className = '', loading = 'lazy', sizes = '(min-width: 768px) 736px, calc(100vw - 32px)' }) {
  const [failedSrc, setFailedSrc] = useState(null)
  if (!src || failedSrc === src) {
    return (
      <div role="img" aria-label={`Copertina non disponibile: ${alt}`} className={`${className} flex items-center justify-center bg-border text-text-muted`}>
        <svg aria-hidden="true" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="m8 8 8 8M16 8l-8 8" />
        </svg>
      </div>
    )
  }
  return <img key={src} src={src} srcSet={imageSrcSet(src)} sizes={sizes} alt={alt} className={className} loading={loading} decoding="async" onError={() => setFailedSrc(src)} />
}
