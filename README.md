# NeuroADHD

> A personal daily news digest built for brains that need the good stuff without the noise.

**[Live demo →](https://fasthd97.github.io/NeuroADHD)**

---

Doom-scrolling is a terrible way to stay informed. NeuroADHD is a focused, tab-based news reader that pulls from sources you actually care about — RSS feeds, The Guardian, NewsAPI, and Hacker News — fetched automatically on a schedule and served as a fast static page. No algorithm. No engagement bait. No API calls to browse.

Fork it, swap in your own topics, and have your own version live in under 15 minutes.

![Topics: Tech & AI, Science, Politics, RPGs, Motorcycles, Archaeology, Space, Climate, Hacking]

---

## How it works

```
src/feeds.json          ← your topics + sources (you edit this)
       ↓
  GitHub Action         ← runs on a schedule, fetches everything
       ↓
public/feed.json        ← static file of fetched articles
       ↓
  GitHub Pages          ← serves the frontend, reads feed.json
```

**No backend. No database. No server costs.** The only thing that runs is a scheduled GitHub Action.

---

## Default topics

| Tab | Sources |
|---|---|
| Tech & AI | TechCrunch, Wired, Guardian, NewsAPI, Hacker News |
| Science | Science Daily, New Scientist, Guardian, NewsAPI |
| Politics | BBC World, NY Times, Guardian, NewsAPI |
| RPGs | Polygon, Rock Paper Shotgun, NewsAPI, HN |
| Motorcycles | RideApart, Motorcycle Daily, NewsAPI |
| Archaeology | Archaeology Magazine, World Archaeology, Ancient Origins, Guardian |
| Space | SpaceNews, NASA, Guardian, HN |
| Climate | Inside Climate News, Guardian Climate, NewsAPI |
| Hacking & Security | 2600, Krebs on Security, The Hacker News, HN |

All topics and sources are fully customizable from the in-app settings panel — no code editing needed.

---

## Get your own in 15 minutes

### 1. Fork this repo

### 2. Enable GitHub Pages

**Settings → Pages → Source → GitHub Actions**

### 3. Add API keys (optional — more sources, better results)

Both are free tiers, no credit card needed.

| Secret name | What it unlocks | Sign up |
|---|---|---|
| `NEWSAPI_KEY` | Keyword search across 150,000+ sources | [newsapi.org](https://newsapi.org) |
| `GUARDIAN_KEY` | Full-text Guardian article search | [open-platform.theguardian.com](https://open-platform.theguardian.com) |

Add them at **Settings → Secrets and variables → Actions → New repository secret**

HackerNews and RSS feeds need no key and work out of the box.

### 4. Run the first fetch

**Actions → Fetch RSS Feeds → Run workflow**

### 5. Visit your site

`https://YOUR_USERNAME.github.io/NeuroADHD`

---

## Customizing your topics

Click **⚙ Settings** in the app. You can:

- Add or remove topics (tabs)
- Add sources per topic — supports **RSS**, **NewsAPI**, **Guardian**, and **Hacker News** search
- Use **✦ Find feeds** to have Claude suggest RSS URLs for a topic (~$0.01, needs your Anthropic API key)

When you save, the app downloads a new `feeds.json`. Commit it to `src/feeds.json` and push — the next Action run picks it up automatically.

### Change the fetch schedule

**Settings → Schedule** — choose every 2, 4, 6, 12 hours, or daily. Downloads an updated workflow file to commit.

Manual trigger anytime: **GitHub → Actions → Fetch RSS Feeds → Run workflow**

---

## Running locally

```bash
npm install
npm run dev          # frontend at localhost:5173

# Run the fetcher locally (writes public/feed.json)
npm run fetch

# With API keys
NEWSAPI_KEY=your_key GUARDIAN_KEY=your_key npm run fetch
```

---

## Roadmap

- [ ] **Source trust ratings** — AllSides / Media Bias/Fact Check ratings alongside articles
- [ ] **RSS source browser** — search and preview feeds before adding
- [ ] **Subscriber feeds** — Medium and Wired offer paid subscriptions; investigating whether subscriber RSS URLs unlock full text (if so, drop the URL in as a standard RSS feed — it should just work)

---

## Stack

- **React + Vite** — frontend
- **rss-parser** — RSS/Atom feed fetching
- **NewsAPI, Guardian API, HN Algolia** — fetched server-side in GitHub Actions
- **GitHub Actions** — scheduled fetch + deploy pipeline
- **GitHub Pages** — free static hosting

---

## Why "NeuroADHD"?

Built as a vibe-coding project to practice shipping real software with AI as a reasoning partner. The name reflects the intended use: a focused, low-friction way to stay informed without getting sucked into infinite scroll. Good for anyone who wants signal without noise, but especially for brains that need a little help filtering.

---

MIT License
