import { useState, useEffect } from 'react'
import './Noticias.css'

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

function NewsCard({ item, featured }) {
  const [imgError, setImgError] = useState(false)
  const ago = timeAgo(item.publishedAt)

  if (featured) {
    return (
      <a
        className="nw-featured"
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        {item.imageUrl && !imgError ? (
          <img
            className="nw-featured-img"
            src={item.imageUrl}
            alt=""
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="nw-featured-img nw-img-ph" />
        )}
        <div className="nw-featured-body">
          <span className="nw-badge">{item.source}</span>
          <p className="nw-featured-title">{item.title}</p>
          {item.description && (
            <p className="nw-featured-desc">{item.description}</p>
          )}
          <span className="nw-time">{ago}</span>
        </div>
      </a>
    )
  }

  return (
    <a
      className="nw-card"
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="nw-card-text">
        <p className="nw-card-title">{item.title}</p>
        <div className="nw-card-meta">
          <span className="nw-source">{item.source}</span>
          <span className="nw-dot">·</span>
          <span className="nw-time">{ago}</span>
        </div>
      </div>
      {item.imageUrl && !imgError ? (
        <img
          className="nw-thumb"
          src={item.imageUrl}
          alt=""
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="nw-thumb nw-img-ph" />
      )}
    </a>
  )
}

export default function Noticias() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/news.json`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const updatedAgo = data?.updatedAt ? timeAgo(data.updatedAt) : null

  if (loading) {
    return (
      <div className="nw-wrap">
        <div className="nw-loading">Cargando noticias…</div>
      </div>
    )
  }

  const items = data?.items ?? []

  if (!items.length) {
    return (
      <div className="nw-wrap">
        <div className="nw-header">
          <div className="nw-title">Noticias</div>
          <div className="nw-sub">Sin noticias disponibles</div>
        </div>
      </div>
    )
  }

  const [featured, ...rest] = items

  return (
    <div className="nw-wrap">
      <div className="nw-header">
        <div className="nw-title">Noticias</div>
        {updatedAgo && (
          <div className="nw-sub">Actualizado {updatedAgo} · La Nación Deportes</div>
        )}
      </div>

      <NewsCard item={featured} featured />

      <div className="nw-list">
        {rest.map((item, i) => (
          <NewsCard key={i} item={item} />
        ))}
      </div>
    </div>
  )
}
