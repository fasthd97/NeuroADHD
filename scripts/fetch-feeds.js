// scripts/fetch-feeds.js
// Run by GitHub Actions on a schedule.
// Reads src/feeds.json, fetches all sources, writes public/feed.json.
//
// Supported feed types:
//   rss         — standard RSS/Atom feed (default, requires "url")
//   newsapi     — NewsAPI keyword search (requires "query", needs NEWSAPI_KEY secret)
//   guardian    — Guardian API keyword search (requires "query", needs GUARDIAN_KEY secret)
//   hackernews  — Hacker News Algolia search (requires "query", no key needed)

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Parser from 'rss-parser'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const feedsPath = path.join(ROOT, 'src', 'feeds.json')
const outputPath = path.join(ROOT, 'public', 'feed.json')

const NEWSAPI_KEY   = process.env.NEWSAPI_KEY   || ''
const GUARDIAN_KEY  = process.env.GUARDIAN_KEY  || ''
const ARTICLES_PER_TOPIC = 12

const rssParser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'NeuroADHD-Feed-Fetcher/1.0' },
})

function clean(str) {
  if (!str) return ''
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim()
}

// ── RSS ──────────────────────────────────────────────────────────────────────

async function fetchRSS(feedConfig) {
  try {
    const feed = await rssParser.parseURL(feedConfig.url)
    return (feed.items || []).slice(0, 6).map(item => ({
      headline:  clean(item.title),
      source:    feedConfig.name,
      summary:   clean(item.contentSnippet || item.summary || item.description || '').slice(0, 280),
      url:       item.link || '',
      published: item.isoDate || item.pubDate || null,
    })).filter(a => a.headline)
  } catch (err) {
    console.warn(`  ⚠ RSS failed [${feedConfig.name}]: ${err.message}`)
    return []
  }
}

// ── NewsAPI ──────────────────────────────────────────────────────────────────

async function fetchNewsAPI(feedConfig) {
  if (!NEWSAPI_KEY) {
    console.warn('  ⚠ NewsAPI: NEWSAPI_KEY secret not set — skipping')
    return []
  }
  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(feedConfig.query)}&sortBy=publishedAt&pageSize=6&language=en&apiKey=${NEWSAPI_KEY}`
    const res = await fetch(url)
    if (!res.ok) { console.warn(`  ⚠ NewsAPI: ${res.status}`); return [] }
    const data = await res.json()
    return (data.articles || []).map(a => ({
      headline:  clean(a.title || ''),
      source:    a.source?.name || feedConfig.name || 'NewsAPI',
      summary:   clean(a.description || '').slice(0, 280),
      url:       a.url || '',
      published: a.publishedAt || null,
    })).filter(a => a.headline && !a.headline.includes('[Removed]'))
  } catch (err) {
    console.warn(`  ⚠ NewsAPI failed: ${err.message}`)
    return []
  }
}

// ── Guardian ─────────────────────────────────────────────────────────────────

async function fetchGuardian(feedConfig) {
  if (!GUARDIAN_KEY) {
    console.warn('  ⚠ Guardian: GUARDIAN_KEY secret not set — skipping')
    return []
  }
  try {
    const url = `https://content.guardianapis.com/search?q=${encodeURIComponent(feedConfig.query)}&show-fields=trailText&order-by=newest&page-size=6&api-key=${GUARDIAN_KEY}`
    const res = await fetch(url)
    if (!res.ok) { console.warn(`  ⚠ Guardian: ${res.status}`); return [] }
    const data = await res.json()
    return (data.response?.results || []).map(a => ({
      headline:  clean(a.webTitle || ''),
      source:    'The Guardian',
      summary:   clean(a.fields?.trailText || '').slice(0, 280),
      url:       a.webUrl || '',
      published: a.webPublicationDate || null,
    })).filter(a => a.headline)
  } catch (err) {
    console.warn(`  ⚠ Guardian failed: ${err.message}`)
    return []
  }
}

// ── Hacker News (Algolia) ────────────────────────────────────────────────────

async function fetchHackerNews(feedConfig) {
  try {
    const query = feedConfig.query || feedConfig.name
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=6&numericFilters=created_at_i>${Math.floor(Date.now()/1000) - 86400 * 7}`
    const res = await fetch(url)
    if (!res.ok) { console.warn(`  ⚠ HN: ${res.status}`); return [] }
    const data = await res.json()
    return (data.hits || []).map(h => ({
      headline:  clean(h.title || ''),
      source:    h.url ? new URL(h.url).hostname.replace('www.', '') : 'Hacker News',
      summary:   `${h.points || 0} points · ${h.num_comments || 0} comments on Hacker News`,
      url:       h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      published: h.created_at || null,
    })).filter(a => a.headline)
  } catch (err) {
    console.warn(`  ⚠ HN failed: ${err.message}`)
    return []
  }
}

// ── Router ───────────────────────────────────────────────────────────────────

async function fetchOne(feedConfig) {
  const type = feedConfig.type || 'rss'
  switch (type) {
    case 'newsapi':    return fetchNewsAPI(feedConfig)
    case 'guardian':   return fetchGuardian(feedConfig)
    case 'hackernews': return fetchHackerNews(feedConfig)
    case 'rss':
    default:           return fetchRSS(feedConfig)
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('NeuroADHD feed fetcher starting...')
  if (NEWSAPI_KEY)  console.log('  NewsAPI key: found')
  if (GUARDIAN_KEY) console.log('  Guardian key: found')

  if (!fs.existsSync(feedsPath)) {
    console.error('src/feeds.json not found'); process.exit(1)
  }

  const topics = JSON.parse(fs.readFileSync(feedsPath, 'utf8'))
  const output = { generated: new Date().toISOString(), topics: [] }

  for (const topic of topics) {
    console.log(`\nFetching: ${topic.label}`)
    const allArticles = []

    for (const feedConfig of topic.feeds) {
      const type = feedConfig.type || 'rss'
      console.log(`  → [${type}] ${feedConfig.name || feedConfig.query}`)
      const articles = await fetchOne(feedConfig)
      console.log(`     ${articles.length} articles`)
      allArticles.push(...articles)
    }

    const sorted = allArticles
      .filter(a => a.headline)
      .sort((a, b) => {
        if (!a.published && !b.published) return 0
        if (!a.published) return 1
        if (!b.published) return -1
        return new Date(b.published) - new Date(a.published)
      })
      .slice(0, ARTICLES_PER_TOPIC)

    output.topics.push({ id: topic.id, label: topic.label, articles: sorted })
    console.log(`  ✓ ${sorted.length} articles for ${topic.label}`)
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`\n✅ Wrote ${outputPath}`)
  console.log(`   Topics: ${output.topics.length}`)
  console.log(`   Total articles: ${output.topics.reduce((n, t) => n + t.articles.length, 0)}`)
}

main().catch(err => { console.error(err); process.exit(1) })
