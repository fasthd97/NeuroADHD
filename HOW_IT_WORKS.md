# How NeuroADHD Works

A technical deep-dive into the architecture and design decisions behind NeuroADHD.

---

## The Problem It Solves

Most news aggregators either:
- Call an API every time you open the page (slow, costs money, requires a key to browse)
- Lock you into their algorithm and feed you engagement bait
- Require a backend server to run

NeuroADHD is designed around a different model: **fetch on a schedule, serve statically**. No API calls to browse. No server. No algorithm. Just your sources, your topics, updated automatically.

---

## Architecture Overview

```
src/feeds.json
    │
    │  (GitHub Action runs every 4 hours)
    ▼
scripts/fetch-feeds.js
    │   ├── RSS feeds via rss-parser
    │   ├── NewsAPI keyword search
    │   ├── Guardian API full-text search
    │   └── Hacker News via Algolia
    │
    ▼
public/feed.json  (generated, never committed to repo)
    │
    ▼
npm run build  (Vite bundles React frontend + feed.json)
    │
    ▼
GitHub Pages  (static site, zero server costs)
```

The key architectural decision: **the Action never commits back to the repo**. It does all its work on a temporary runner, bakes the articles into the built site, uploads that directly to GitHub Pages, and disappears. Your repo only ever changes when you push code.

This means:
- No merge conflicts for contributors
- No repo history polluted with data commits
- Clean separation between source code and generated content

---

## Source Types

### RSS (`type: "rss"`)
Standard RSS/Atom feed parsing via `rss-parser`. Almost every major publication maintains one. Requires a URL. No API key needed.

```json
{ "type": "rss", "url": "https://techcrunch.com/feed/", "name": "TechCrunch" }
```

### NewsAPI (`type: "newsapi"`)
Keyword search across 150,000+ news sources. Returns headlines and summaries. Requires a free API key from newsapi.org stored as a GitHub Actions secret (`NEWSAPI_KEY`). Silently skips if key is not set — nothing breaks.

```json
{ "type": "newsapi", "query": "artificial intelligence OR machine learning", "name": "NewsAPI" }
```

### Guardian (`type: "guardian"`)
Full-text search of Guardian articles via their open API. Returns complete article text, not just summaries. Free API key from open-platform.theguardian.com stored as `GUARDIAN_KEY`. Also silently skips if not set.

```json
{ "type": "guardian", "query": "archaeology discovery ancient", "name": "Guardian" }
```

### Hacker News (`type: "hackernews"`)
Search HN stories via the Algolia API. No key required. Surfaces articles from any domain that the HN community has upvoted — including paywalled sites, niche blogs, and academic papers. Acts as a quality filter: if it matters to the tech/science community, it surfaces here.

```json
{ "type": "hackernews", "query": "AI machine learning LLM", "name": "Hacker News" }
```

---

## The Fetch Script (`scripts/fetch-feeds.js`)

Reads `src/feeds.json`, loops through every topic and every source, fetches articles, normalizes them into a consistent shape, sorts by date, and writes `public/feed.json`.

**Article shape (normalized from all sources):**
```json
{
  "headline": "Article title",
  "source": "Publication name",
  "summary": "1-2 sentence description",
  "url": "https://direct-link-to-article",
  "published": "2026-05-20T09:00:00Z"
}
```

**Per topic:** takes the 12 most recent articles across all sources, sorted by date descending.

**Failure handling:** each source fetch is wrapped in try/catch. If a feed is down, rate-limited, or returns bad data, it logs a warning and continues. One broken source never stops the whole fetch.

---

## The GitHub Action (`.github/workflows/fetch.yml`)

Runs on:
- **Schedule** — cron expression, default every 4 hours
- **Manual trigger** — "Run workflow" button in GitHub Actions UI

Steps:
1. Checkout repo
2. Install Node dependencies
3. Run fetch script (with API keys from secrets)
4. Build the React frontend with Vite
5. Upload `dist/` as a Pages artifact
6. Deploy to GitHub Pages

Permissions: `contents: read` only — the Action cannot write to your repo. This is intentional.

---

## The Frontend (`src/`)

React + Vite single page app. On load it fetches `feed.json` from the same static server — one file read, instant, no external API calls.

**Component structure:**
```
App.jsx           — topic state, settings visibility
├── Feed.jsx      — tabs, article list, reload button
│   └── ArticleCard.jsx  — individual article display
└── Settings.jsx  — topic editor, source editor, schedule picker
```

**Settings panel does two things:**
1. **Topics & Feeds** — add/remove topics, add sources per topic with type dropdown (RSS/NewsAPI/Guardian/HN). When saved, downloads a new `feeds.json` for you to commit.
2. **Schedule** — radio buttons for fetch frequency (2/4/6/12hr, daily). Downloads an updated `fetch.yml` to commit.

**Find Feeds (✦)** — optional Claude API integration. Enter an Anthropic API key, click Find, Claude searches for RSS URLs for that topic (~$0.01 per call). Key stored in localStorage, only used for this feature.

---

## Data Flow for a New User

1. Fork repo
2. Enable GitHub Pages (Settings → Pages → Source → GitHub Actions)
3. Optionally add `NEWSAPI_KEY` and `GUARDIAN_KEY` as repo secrets
4. Trigger the Action manually (Actions → Fetch RSS Feeds → Run workflow)
5. Action fetches, builds, deploys — site is live
6. Every 4 hours after that: automatic

---

## Customization Flow

1. Open the live site → ⚙ Settings → edit topics/sources
2. Click Save → browser downloads new `feeds.json`
3. Replace `src/feeds.json` in local repo
4. `git add src/feeds.json && git commit -m "update feeds" && git push`
5. Action triggers automatically on push → site rebuilds with new sources

---

## Cost

| Thing | Cost |
|---|---|
| GitHub Actions (fetch + deploy) | Free (2,000 min/month included) |
| GitHub Pages hosting | Free |
| RSS feeds | Free |
| Hacker News API | Free |
| NewsAPI | Free tier (100 req/day) |
| Guardian API | Free |
| Find Feeds (Claude) | ~$0.01 per topic, pay-per-use |

A standard setup running every 4 hours uses roughly 180 Action minutes/month — well within the free tier.

---

## Known Limitations

- **Paywalled articles** — RSS and APIs return headlines/summaries only for paywalled content. Full text requires a subscriber RSS URL from the publication (Medium and Wired may offer these — check account settings).
- **Rate limiting** — some sources (NASA, SpaceNews) rate-limit aggressive fetching. The 4-hour schedule avoids most issues; the fetch script handles 429s gracefully.
- **RSS URL rot** — feed URLs change occasionally. If a source stops returning articles, check the Action logs for warnings and update the URL in Settings.
- **NewsAPI free tier** — 100 requests/day. With 9 topics each making 1 NewsAPI call, a fetch uses 9 requests. Running every 4 hours = 54 requests/day, within the free limit.

---

## Roadmap

- **Source trust ratings** — AllSides / Media Bias/Fact Check ratings shown alongside articles
- **RSS source browser** — search and preview feeds before adding
- **Subscriber RSS** — investigate whether Medium/Wired expose subscriber feed URLs that unlock full text

---

## Stack

- **React 18** + **Vite 5** — frontend
- **rss-parser 3.13** — RSS/Atom parsing
- **NewsAPI, Guardian API, HN Algolia** — additional sources
- **GitHub Actions** — scheduled fetch + CI/CD
- **GitHub Pages** — static hosting

No backend. No database. No Docker. No server to maintain.
