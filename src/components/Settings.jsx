import { useState } from 'react'

const SCHEDULES = [
  { label: 'Every 2 hours',  cron: '0 */2 * * *' },
  { label: 'Every 4 hours',  cron: '0 */4 * * *' },
  { label: 'Every 6 hours',  cron: '0 */6 * * *' },
  { label: 'Every 12 hours', cron: '0 */12 * * *' },
  { label: 'Once daily (6am UTC)', cron: '0 6 * * *' },
]

const btn = (extra = {}) => ({
  padding: '0.45rem 0.875rem', borderRadius: 'var(--radius-sm)',
  fontSize: '0.82rem', fontFamily: 'var(--font-body)', cursor: 'pointer',
  border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface2)',
  ...extra,
})

const input = {
  display: 'block', width: '100%', marginTop: '0.3rem',
  padding: '0.5rem 0.75rem', background: 'var(--surface)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
  color: 'var(--text)', fontSize: '0.88rem', outline: 'none',
  fontFamily: 'var(--font-body)',
}

const label = { fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }

function generateWorkflowYaml(cron) {
  return `name: Fetch RSS Feeds

on:
  schedule:
    - cron: '${cron}'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm install
      - name: Fetch RSS feeds
        run: npm run fetch
      - name: Commit updated feed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add public/feed.json
          git diff --staged --quiet || git commit -m "chore: update feed $(date -u +%Y-%m-%dT%H:%M:%SZ)"
          git push
`
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function Settings({ topics, onSave, onClose }) {
  const [tab, setTab] = useState('topics')
  const [localTopics, setLocalTopics] = useState(topics.map(t => ({ ...t, feeds: t.feeds ? [...t.feeds] : [] })))
  const [editingTopic, setEditingTopic] = useState(null)
  const [editingFeed, setEditingFeed] = useState(null)
  const [selectedCron, setSelectedCron] = useState('0 */4 * * *')
  const [showFindFeeds, setShowFindFeeds] = useState(false)
  const [findTarget, setFindTarget] = useState(null)
  const [apiKey, setApiKey] = useState(localStorage.getItem('neuroadhd_apikey') || '')
  const [finding, setFinding] = useState(false)
  const [findResults, setFindResults] = useState(null)
  const [findError, setFindError] = useState('')

  // Topic management
  function updateTopic(id, field, val) {
    setLocalTopics(prev => prev.map(t => t.id === id ? { ...t, [field]: val } : t))
  }
  function addTopic() {
    const id = 'topic_' + Date.now()
    const t = { id, label: 'New Topic', feeds: [] }
    setLocalTopics(prev => [...prev, t])
    setEditingTopic(id)
  }
  function removeTopic(id) {
    setLocalTopics(prev => prev.filter(t => t.id !== id))
    if (editingTopic === id) setEditingTopic(null)
  }

  // Feed management
  function addFeed(topicId) {
    const feedId = 'feed_' + Date.now()
    setLocalTopics(prev => prev.map(t => t.id === topicId
      ? { ...t, feeds: [...t.feeds, { id: feedId, url: '', name: '' }] }
      : t))
    setEditingFeed(feedId)
  }
  function updateFeed(topicId, feedId, field, val) {
    setLocalTopics(prev => prev.map(t => t.id === topicId
      ? { ...t, feeds: t.feeds.map(f => (f.id || f.url) === feedId ? { ...f, [field]: val } : f) }
      : t))
  }
  function removeFeed(topicId, feedId) {
    setLocalTopics(prev => prev.map(t => t.id === topicId
      ? { ...t, feeds: t.feeds.filter(f => (f.id || f.url) !== feedId) }
      : t))
  }

  function saveTopics() {
    onSave(localTopics)
    onClose()
  }

  // Schedule
  function downloadSchedule() {
    downloadFile('fetch.yml', generateWorkflowYaml(selectedCron))
  }

  // Find feeds via Claude
  async function findFeeds(topic) {
    if (!apiKey.trim()) { setFindError('Enter your Anthropic API key above first.'); return }
    setFinding(true)
    setFindError('')
    setFindResults(null)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey.trim(), 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          system: `Return ONLY a JSON array of RSS feeds for the given topic. No markdown, no explanation.
Each item: { "name": "Publication Name", "url": "https://rss-url-here" }
Return 4-5 real, working RSS feed URLs from reputable sources. Verify the URL is a real RSS endpoint.`,
          messages: [{ role: 'user', content: `Find RSS feeds for topic: "${topic.label}"` }],
        }),
      })
      if (res.status === 401) { setFindError('API key rejected.'); setFinding(false); return }
      const data = await res.json()
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
      const match = text.match(/\[[\s\S]*\]/)
      if (!match) { setFindError('Unexpected response — try again.'); setFinding(false); return }
      setFindResults(JSON.parse(match[0]))
    } catch (e) {
      setFindError('Error: ' + e.message)
    }
    setFinding(false)
  }

  function addFoundFeeds(topicId, feeds) {
    setLocalTopics(prev => prev.map(t => {
      if (t.id !== topicId) return t
      const existing = new Set(t.feeds.map(f => f.url))
      const newFeeds = feeds.filter(f => !existing.has(f.url))
      return { ...t, feeds: [...t.feeds, ...newFeeds] }
    }))
    setFindResults(null)
    setShowFindFeeds(false)
    setFindTarget(null)
  }

  const tabBtnStyle = (t) => ({
    ...btn(), borderColor: tab === t ? 'var(--accent)' : 'var(--border)',
    color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
    background: tab === t ? 'var(--accent-dim)' : 'transparent',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '100%', maxWidth: '600px', padding: '1.75rem' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800 }}>Settings</h2>
          <button onClick={onClose} style={btn({ padding: '0.35rem 0.7rem' })}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '1.5rem' }}>
          <button onClick={() => setTab('topics')} style={tabBtnStyle('topics')}>Topics & Feeds</button>
          <button onClick={() => setTab('schedule')} style={tabBtnStyle('schedule')}>Schedule</button>
        </div>

        {tab === 'topics' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
              {localTopics.map(t => {
                const isOpen = editingTopic === t.id
                return (
                  <div key={t.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontWeight: 500, fontSize: '0.92rem' }}>{t.label || 'Untitled'}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '0.5rem' }}>{t.feeds?.length || 0} feeds</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setEditingTopic(isOpen ? null : t.id)} style={{ ...btn(), fontSize: '0.78rem', color: 'var(--accent)', borderColor: 'var(--accent-dim)' }}>
                          {isOpen ? 'Done' : 'Edit'}
                        </button>
                        <button onClick={() => removeTopic(t.id)} style={{ ...btn(), color: 'var(--danger)', borderColor: 'var(--danger-dim)' }}>✕</button>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <span style={label}>TAB LABEL</span>
                          <input value={t.label} onChange={e => updateTopic(t.id, 'label', e.target.value)} style={input} />
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={label}>SOURCES</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => { setFindTarget(t); setShowFindFeeds(true); setFindResults(null); setFindError('') }}
                                style={{ ...btn({ fontSize: '0.75rem' }), color: 'var(--accent)', borderColor: 'var(--accent-dim)' }}>
                                ✦ Find feeds
                              </button>
                              <button onClick={() => addFeed(t.id)} style={{ ...btn({ fontSize: '0.75rem' }) }}>+ Add manually</button>
                            </div>
                          </div>
                          {t.feeds?.map(f => {
                            const fid = f.id || f.url || f.query || String(Math.random())
                            const type = f.type || 'rss'
                            const needsQuery = type === 'newsapi' || type === 'guardian' || type === 'hackernews'
                            const typeColors = { rss: 'var(--text-dim)', newsapi: '#4a9eff', guardian: '#005689', hackernews: '#ff6600' }
                            return (
                              <div key={fid} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <select value={type} onChange={e => updateFeed(t.id, fid, 'type', e.target.value)}
                                      style={{ ...input, marginTop: 0, width: 'auto', color: typeColors[type] || 'var(--text)', fontSize: '0.78rem', padding: '0.4rem 0.5rem', cursor: 'pointer' }}>
                                      <option value="rss">RSS</option>
                                      <option value="newsapi">NewsAPI</option>
                                      <option value="guardian">Guardian</option>
                                      <option value="hackernews">Hacker News</option>
                                    </select>
                                    <input placeholder="Name" value={f.name || ''} onChange={e => updateFeed(t.id, fid, 'name', e.target.value)}
                                      style={{ ...input, marginTop: 0, flex: 1 }} />
                                  </div>
                                  {needsQuery
                                    ? <input placeholder="Search query (e.g. artificial intelligence)" value={f.query || ''}
                                        onChange={e => updateFeed(t.id, fid, 'query', e.target.value)}
                                        style={{ ...input, marginTop: 0 }} />
                                    : <input placeholder="RSS URL" value={f.url || ''}
                                        onChange={e => updateFeed(t.id, fid, 'url', e.target.value)}
                                        style={{ ...input, marginTop: 0, fontFamily: 'monospace', fontSize: '0.8rem' }} />
                                  }
                                </div>
                                <button onClick={() => removeFeed(t.id, fid)} style={{ ...btn(), color: 'var(--danger)', borderColor: 'var(--danger-dim)', marginTop: '2px' }}>✕</button>
                              </div>
                            )
                          })}
                          {(!t.feeds || t.feeds.length === 0) && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>No feeds yet — add manually or use Find feeds</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <button onClick={addTopic} style={{ ...btn({ width: '100%', textAlign: 'center', marginBottom: '1.25rem', borderStyle: 'dashed' }) }}>
              + Add topic
            </button>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button onClick={onClose} style={btn()}>Cancel</button>
              <button onClick={saveTopics} style={{ ...btn({ background: 'var(--accent)', color: '#0f0f0f', borderColor: 'var(--accent)', fontWeight: 500 }) }}>
                Save &amp; download feeds.json
              </button>
            </div>
          </>
        )}

        {tab === 'schedule' && (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              The GitHub Action fetches your RSS feeds automatically on this schedule. After choosing, download the updated workflow file and commit it to <code style={{ fontFamily: 'monospace', fontSize: '0.82rem', background: 'var(--surface2)', padding: '1px 5px', borderRadius: '3px' }}>.github/workflows/fetch.yml</code> in your repo.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
              {SCHEDULES.map(s => (
                <label key={s.cron} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1rem', background: selectedCron === s.cron ? 'var(--accent-dim)' : 'var(--surface2)', border: `1px solid ${selectedCron === s.cron ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  <input type="radio" name="schedule" value={s.cron} checked={selectedCron === s.cron} onChange={() => setSelectedCron(s.cron)} style={{ accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: '0.9rem', color: selectedCron === s.cron ? 'var(--accent)' : 'var(--text)' }}>{s.label}</span>
                  <code style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{s.cron}</code>
                </label>
              ))}
            </div>
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>Manual trigger</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                Your repo already has a manual trigger button. Go to <strong style={{ color: 'var(--text-muted)' }}>GitHub → Actions → Fetch RSS Feeds → Run workflow</strong> any time you want to force a fresh fetch.
              </p>
            </div>
            <button onClick={downloadSchedule} style={{ ...btn({ background: 'var(--accent)', color: '#0f0f0f', borderColor: 'var(--accent)', fontWeight: 500 }) }}>
              ↓ Download fetch.yml
            </button>
          </>
        )}

        {/* Find feeds modal */}
        {showFindFeeds && findTarget && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '100%', maxWidth: '480px', padding: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                Find feeds — {findTarget.label}
              </h3>
              <div style={{ background: 'rgba(255,200,0,0.08)', border: '1px solid rgba(255,200,0,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#c8a020', lineHeight: 1.6 }}>
                ⚠ This makes one API call to Claude (~$0.01). You pay for this with your own Anthropic key. It is only called when you click Find.
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <span style={label}>ANTHROPIC API KEY (optional — only for this feature)</span>
                <input type="password" value={apiKey} onChange={e => { setApiKey(e.target.value); localStorage.setItem('neuroadhd_apikey', e.target.value) }}
                  placeholder="sk-ant-..." style={{ ...input, fontFamily: 'monospace' }} />
              </div>
              {findError && <p style={{ fontSize: '0.82rem', color: 'var(--danger)', marginBottom: '0.75rem' }}>{findError}</p>}
              {findResults ? (
                <>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Found {findResults.length} feeds — select which to add:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
                    {findResults.map((f, i) => (
                      <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.875rem' }}>
                        <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{f.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{f.url}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setFindResults(null) }} style={btn()}>Try again</button>
                    <button onClick={() => addFoundFeeds(findTarget.id, findResults)}
                      style={{ ...btn({ background: 'var(--accent)', color: '#0f0f0f', borderColor: 'var(--accent)', fontWeight: 500 }) }}>
                      Add all to {findTarget.label}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setShowFindFeeds(false); setFindTarget(null) }} style={btn()}>Cancel</button>
                  <button onClick={() => findFeeds(findTarget)} disabled={finding}
                    style={{ ...btn({ background: 'var(--accent)', color: '#0f0f0f', borderColor: 'var(--accent)', fontWeight: 500, opacity: finding ? 0.6 : 1 }) }}>
                    {finding ? 'Asking Claude…' : 'Find feeds (~$0.01)'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
