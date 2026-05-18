import { useState, useEffect } from 'react'
import ArticleCard from './ArticleCard.jsx'

const BASE = import.meta.env.BASE_URL

export default function Feed({ onOpenSettings }) {
  const [topics, setTopics] = useState([])
  const [activeTab, setActiveTab] = useState('')
  const [generated, setGenerated] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadFeed() }, [])

  async function loadFeed() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BASE}feed.json?t=${Date.now()}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setTopics(data.topics || [])
      setGenerated(data.generated || null)
      if (data.topics?.length) setActiveTab(data.topics[0].id)
    } catch {
      setError('Could not load feed.json — make sure the GitHub Action has run at least once.')
    }
    setLoading(false)
  }

  const tabStyle = (id) => ({
    padding: '0.4rem 0.875rem',
    borderRadius: '20px',
    border: '1px solid',
    borderColor: activeTab === id ? 'var(--accent)' : 'transparent',
    background: activeTab === id ? 'var(--accent-dim)' : 'transparent',
    color: activeTab === id ? 'var(--accent)' : 'var(--text-muted)',
    fontSize: '0.82rem',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  })

  const activeTopic = topics.find(t => t.id === activeTab)

  return (
    <div style={{ paddingTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
            Neuro<span style={{ color: 'var(--accent)' }}>ADHD</span>
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
            {generated
              ? `Updated ${new Date(generated).toLocaleString()}`
              : 'Run the GitHub Action to fetch articles'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button onClick={onOpenSettings}
            style={{ padding: '0.5rem 0.875rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'none', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
            ⚙ Settings
          </button>
          <button onClick={loadFeed}
            style={{ padding: '0.5rem 0.875rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', fontSize: '0.82rem', background: 'var(--accent-dim)', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
            ↻ Reload
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem', padding: '2rem 0' }}>Loading feed…</div>
      ) : error ? (
        <div style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '1rem 1.25rem', fontSize: '0.88rem', color: 'var(--danger)', marginBottom: '1rem' }}>
          {error}
        </div>
      ) : topics.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {topics.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(activeTopic?.articles || []).map((a, i) => <ArticleCard key={i} article={a} />)}
          </div>
        </>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '2.5rem', textAlign: 'center', color: 'var(--text-dim)' }}>
      <p style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>No articles yet</p>
      <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
        Go to your GitHub repo → <strong style={{ color: 'var(--text-muted)' }}>Actions → Fetch RSS Feeds → Run workflow</strong> to trigger the first fetch.
      </p>
    </div>
  )
}
