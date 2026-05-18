export default function ArticleCard({ article }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '1.1rem 1.25rem',
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ fontSize: '0.72rem', letterSpacing: '0.07em', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>
        {article.source?.toUpperCase() || 'SOURCE UNKNOWN'}
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 500, lineHeight: 1.4, marginBottom: '0.5rem' }}>
        {article.url
          ? <a href={article.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'var(--text)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text)'}
            >{article.headline}</a>
          : article.headline
        }
      </div>
      <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
        {article.summary}
      </div>
      {article.url && (
        <a href={article.url} target="_blank" rel="noreferrer"
          style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none', letterSpacing: '0.04em' }}
        >
          READ MORE →
        </a>
      )}
    </div>
  )
}
