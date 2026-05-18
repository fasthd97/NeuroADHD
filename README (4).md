# NeuroADHD — Daily Digest

A personal news digest that pulls from RSS feeds, NewsAPI, The Guardian, and Hacker News — all fetched automatically by a GitHub Action. No API calls to browse. Zero cost to read.

Live demo: [fasthd97.github.io/NeuroADHD](https://fasthd97.github.io/NeuroADHD)

---

## How it works

```
src/feeds.json          ← your topics + sources (RSS, NewsAPI, Guardian, HN)
       ↓ (GitHub Action, runs on schedule)
public/feed.json        ← fetched articles (auto-generated)
       ↓
GitHub Pages frontend   ← reads feed.json, zero API calls to browse
```

---

## Setup (under 15 minutes)

### 1. Fork this repo

### 2. Enable GitHub Pages

**Settings → Pages → Source → GitHub Actions**

### 3. Get API keys (optional but recommended)

| Key | What it unlocks | Where to get it |
|---|---|---|
| `NEWSAPI_KEY` | Search 150k+ sources by keyword | [newsapi.org](https://newsapi.org) — free |
| `GUARDIAN_KEY` | Full-text Guardian article search | [open-platform.theguardian.com](https://open-platform.theguardian.com) — free |

HackerNews requires no key. RSS feeds require no key.

### 4. Add secrets to your repo

**Settings → Secrets and variables → Actions → New repository secret**

Add `NEWSAPI_KEY` and/or `GUARDIAN_KEY` with your keys.

### 5. Trigger the first fetch

**Actions → Fetch RSS Feeds → Run workflow**

After this it runs automatically on schedule.

### 6. Visit your site

`https://YOUR_USERNAME.github.io/NeuroADHD`

---

## Customizing topics and sources

Click **⚙ Settings** in the app. Each source has a type:

| Type | What it does | Requires |
|---|---|---|
| `rss` | Fetches a standard RSS/Atom feed | A URL |
| `newsapi` | Searches 150k+ sources by keyword | `NEWSAPI_KEY` secret |
| `guardian` | Searches Guardian by keyword, returns full text | `GUARDIAN_KEY` secret |
| `hackernews` | Searches HN via Algolia, surfaces any domain | Nothing |

When you save, the app downloads a new `feeds.json` — commit it to `src/feeds.json` in your repo and push. The next Action run picks it up.

### Finding RSS feed URLs

Click **✦ Find feeds** next to any topic. Uses Claude (~$0.01 per topic) to suggest RSS URLs. Optional — you can also add feeds manually.

---

## Changing the fetch schedule

**Settings → Schedule** — pick a preset (every 2/4/6/12hrs or daily) and download the updated `fetch.yml`. Commit it to `.github/workflows/fetch.yml`.

Manual trigger anytime: **GitHub → Actions → Fetch RSS Feeds → Run workflow**

---

## Running locally

```bash
npm install
npm run dev          # frontend at localhost:5173
npm run fetch        # run the RSS fetcher (writes public/feed.json)
```

For local fetch with API keys:
```bash
NEWSAPI_KEY=your_key GUARDIAN_KEY=your_key npm run fetch
```

---

## Roadmap

### Phase 2 — Source trust ratings
AllSides / Media Bias/Fact Check ratings shown alongside articles so you can see the political lean or reliability of what you're reading.

### Phase 2 — RSS source browser
Search and preview feeds before adding them, rather than pasting URLs manually.

### TODO — Subscriber RSS feeds (needs investigation)
Medium and Wired offer paid subscriptions. Some publications expose a private subscriber RSS URL that unlocks full text (tied to your account in settings). If either Medium or Wired offer this, they would work with the existing RSS fetcher at no extra cost.

**To check:** Log into Medium → Settings → RSS. Log into Wired → Account settings. Look for a "private RSS feed" or "subscriber feed" link. If found, add it as a `type: rss` source — it should just work.

---

## Stack

- React + Vite
- `rss-parser` for RSS/Atom feeds
- NewsAPI, Guardian API, HN Algolia — fetched in GitHub Actions
- GitHub Actions for scheduled fetch + deploy
- GitHub Pages for static hosting

No backend. No database. No ongoing costs beyond optional API keys.

## License

MIT
