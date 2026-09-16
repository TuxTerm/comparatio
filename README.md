# PricePulse — Firecrawl E-Commerce Price Scraper & Best-Price Suggestor

A **SvelteKit** web app that scrapes leading buy-and-sell marketplaces
(eBay, Amazon, Walmart, Etsy, Newegg) using **Firecrawl's LLM structured
extraction**, analyzes the listings, and surfaces the **best value deal** for
any product you search for — complete with a live activity log, an interactive
SVG price-distribution chart, and a **CSV export** button.

## Features

- 🔍 **Search any product** — one input, multiple marketplaces.
- 🤖 **Firecrawl structured extraction** — server-side LLM scrape with a strict
  JSON schema (title, price, currency, URL, image, rating, condition, shipping).
- 🧠 **"Smart best-price" ranking** — filters accessory spam (`case`, `cable`,
  `stand`, …), scores listings by title relevance + condition + rating, and
  picks the **Best Value Deal**.
- 🛡️ **Key management** — add your `FIRECRAWL_API_KEY` to `.env` (server-side)
  or paste a key on demand in the UI. Without a key it runs in **Mock Mode** so
  you can try it instantly.
- 💾 **CSV export** — RFC 4180-compliant download of the filtered results.
- 📊 **Native Svelte SVG charts** — no heavy chart libraries, just lightweight
  components with hover detail.
- 🖥️ **Terminal-style activity log** that live-updates as each store is scraped.

## Demo (Mock Mode)

No Firecrawl key? No problem. The app falls back to a deterministic demo dataset
that still exercises the full pipeline (filtering → stats → best-deal ranking →
chart → CSV).

## Getting Started

```bash
cd ebay-scraper
npm install
npm run dev
```

Then open <http://localhost:5173>.

### Firecrawl API key

```bash
cp .env.example .env
# edit .env and set:
FIRECRAWL_API_KEY=fc-your-api-key-here
```

You can also paste a key inside the collapsible **Firecrawl API Key** panel on
the page (it is sent only to this app's `/api/scrape` endpoint for that request).

## How it works

1. You type a product (e.g. `iPhone 15 Pro`) and pick stores.
2. The frontend calls `POST /api/scrape` with `{ query, stores, mode, apiKey }`.
3. The server builds each store's search URL and calls
   `app.scrape(url, { formats: [{ type: 'json', prompt, schema }] })`.
4. Firecrawl's LLM returns a clean `products[]` array matching our schema.
5. The server **normalizes**, **filters** (relevance + accessory spam),
   **deduplicates**, then computes statistics:
   - `bestDeal` (highest title-score-weighted value)
   - `cheapest`, `mostExpensive`, `avg`, `median`, `min`, `max`, `q1`, `q3`
6. The dashboard renders the Best Deal card, stats grid, price-distribution
   chart, and the sortable/filterable listing grid. **Export CSV** serializes
   the current filtered set.

## Project structure

```
src/
├── lib/
│   ├── analysis.js      # normalize/filter/rank + insights + extraction schema
│   ├── mockData.js      # deterministic offline demo generator
│   ├── csv.js           # RFC 4180 CSV serialization + download helper
│   ├── config.js        # store meta + search-URL builders
│   └── components/      # SearchForm, KeyPanel, ActivityLog, StatsPanel, PriceChart, ProductGrid
└── routes/
    └── api/scrape/+server.js   # POST: Firecrawl scrape or mock; GET: store list
```

## Scripts

| Command        | Description                       |
| -------------- | --------------------------------- |
| `npm run dev`  | Start Vite dev server             |
| `npm run build`| Production build                  |
| `npm run preview` | Preview the production build  |
| `npm run check`| Run `svelte-check` type checking  |

## Notes

- Firecrawl's **structured extraction** endpoint is the LLM-driven `json`
  format inside `scrape()`. The extraction schema and instruction prompt live in
  `src/lib/analysis.js` (`EXTRACTION_SCHEMA`, `EXTRACTION_PROMPT`).
- Anti-bot walls on some marketplaces may occasionally block Firecrawl. The
  app will surface the error and you can re-run or switch stores.