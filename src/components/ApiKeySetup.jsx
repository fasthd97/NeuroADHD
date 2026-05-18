import { useState } from 'react'

export default function ApiKeySetup({ onSave }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = key.trim()
    if (!trimmed.startsWith('sk-ant-')) {
      setError('That doesn\'t look like an Anthropic API key — it should start with sk-ant-')
      return
    }
    setTesting(true)
    setError('')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': trimmed, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 10, messages: [{ role: 'user', content: 'hi' }] })
      })
      if (res.status === 401) { setError('Key rejected — double-check it in your Anthropic Console.'); setTesting(false); return }
      if (!res.ok) { setError(`API returned ${res.status} — try again.`); setTesting(false); return }
      localStorage.setItem('neuroadhd_apikey', trimmed)
      onSave(trimmed)
    } catch {
      setError('Network error — check your connection and try again.')
      setTesting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '4rem' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Neuro<span style={{ color: 'var(--accent)' }}>ADHD</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.75rem', maxWidth: '420px' }}>
          Your personal daily digest. Drop in your Anthropic API key to get started — it stays in your browser and is never sent anywhere except Anthropic.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: '480px' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          ANTHROPIC API KEY
        </label>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="sk-ant-api03-..."
          autoComplete="off"
          style={{
            width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: '0.9rem', marginBottom: '0.75rem',
            outline: 'none', fontFamily: 'monospace'
          }}
        />
        {error && (
          <p style={{ fontSize: '0.85rem', color: 'var(--danger)', background: 'var(--danger-dim)', padding: '0.6rem 0.875rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!key.trim() || testing}
          style={{
            padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)',
            background: 'var(--accent)', color: '#0f0f0f',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem',
            opacity: (!key.trim() || testing) ? 0.5 : 1,
            cursor: (!key.trim() || testing) ? 'not-allowed' : 'pointer',
            letterSpacing: '0.02em'
          }}
        >
          {testing ? 'Verifying...' : 'Get Started →'}
        </button>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '1rem' }}>
          Get a key at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>console.anthropic.com</a>. Each fetch costs roughly $0.01–0.05 depending on results.
        </p>
      </form>
    </div>
  )
}
