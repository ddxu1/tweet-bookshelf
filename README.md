# Tweet Bookshelf

Turn an exported collection of tweets or X bookmarks into a static, searchable bookshelf website. Every tweet becomes a book; primary categories become rooms, and secondary categories become shelves.

The generated site is plain HTML, CSS, JavaScript, and JSON. It has no runtime dependencies, account system, database, or tracking.

## Capture your X bookmarks with Tampermonkey

This project accepts any compatible tweet JSON, but the easiest way to export a complete X bookmark collection is [Twitter Web Exporter](https://github.com/prinsss/twitter-web-exporter). It runs locally in the browser and observes the same responses X loads while you browse.

### 1. Install the userscript

1. Install [Tampermonkey](https://www.tampermonkey.net/) in Chrome.
2. Open `chrome://extensions`, select **Tampermonkey → Details**, and enable **Allow user scripts** if Chrome shows that option.
3. Install the latest [Twitter Web Exporter userscript](https://github.com/prinsss/twitter-web-exporter/releases/latest/download/twitter-web-exporter.user.js).
4. Confirm the script is enabled in the Tampermonkey dashboard and is allowed to run on `x.com`.
5. Open X and hard-reload the page. A floating **Web Exporter** panel should appear on the left.

Browser-extension installation and permission prompts should be completed or explicitly approved by the person using the browser. Do not install an unreviewed copy of the script from an unrelated mirror.

### 2. Capture every bookmark

1. Sign in to X and open [Bookmarks](https://x.com/i/bookmarks) or **History → Bookmarks**.
2. Confirm the Web Exporter panel shows a **Bookmarks** counter.
3. Scroll to the bottom repeatedly. X lazy-loads bookmarks in batches, and the userscript can only capture items that X has loaded.
4. Watch the captured count. Continue until it stops increasing and repeated scrolls load no new items. In the panel log, the final requests should report `0 items received`.
5. If the count pauses briefly and later increases, keep going. Temporary pauses are normal; several consecutive zero-result loads are the stronger completion signal.

For large collections, avoid switching to the Likes tab during capture. If X rate-limits the page or stops loading, wait a few minutes, reload, and resume carefully.

### 3. Export JSON

1. Click the arrow beside **Bookmarks** in the Web Exporter panel.
2. Verify the table total matches the captured count.
3. Click **Export Data**.
4. Select **JSON** and enable **Include all metadata** for the most complete archive.
5. Click **Start Export** and save the downloaded file.

Raw images and videos are optional. The data export includes their URLs. Use **Export Media** only when you need an offline archive; large media exports can consume substantial memory and storage.

### 4. Verify the export

Before building, check that:

- the JSON parses successfully;
- the array length equals the Web Exporter captured count;
- tweet IDs are unique;
- IDs, authors, dates, text, and URLs are present where expected;
- all available bookmark flags are `true`;
- the last loaded page produced no additional bookmark records.

Deleted or unavailable posts cannot be exported because X does not return them to the page.

## Quick start

Requirements: Node.js 18 or newer.

```bash
npm run build
npm run preview
```

Open `http://127.0.0.1:4173`.

The default build uses a small synthetic archive from `data/sample-tweets.json`. Your own exports are intentionally ignored by Git.

## Build from another JSON file

```bash
npm run build -- --input /absolute/path/to/tweets.json
```

Choose a different output folder or taxonomy configuration:

```bash
npm run build -- \
  --input /absolute/path/to/tweets.json \
  --output /absolute/path/to/site \
  --taxonomy /absolute/path/to/taxonomy.json
```

## Accepted input

The generator accepts either a top-level JSON array or an object with a `tweets` array.

It also accepts a complete Dexie JSON database exported by recent versions of Twitter Web Exporter. Only records marked as bookmarks are imported; expanded long posts and X Articles are preserved automatically.

It directly supports the raw shape produced by Twitter Web Exporter:

```json
[
  {
    "id": "123",
    "created_at": "2026-10-23 10:00:00 -07:00",
    "full_text": "A saved post",
    "screen_name": "author",
    "name": "Author Name",
    "bookmark_count": 1234,
    "url": "https://twitter.com/author/status/123"
  }
]
```

For precise shelf placement, include the optional taxonomy fields:

```json
[
  {
    "id": "123",
    "text": "A saved post",
    "author": "@author",
    "name": "Author Name",
    "url": "https://x.com/author/status/123",
    "primary_category": "AI & ML Research",
    "secondary_category": "Inference, Scaling & Compute",
    "tags": ["inference", "compute"]
  }
]
```

If categories are absent, `config/taxonomy.json` performs deterministic keyword classification. Posts that match nothing go to **Uncategorized → Inbox**. Edit the taxonomy file to reuse the generator for another archive or subject area.

## Project structure

```text
config/taxonomy.json     Auto-categorization rules
data/sample-tweets.json  Synthetic, publishable example input
scripts/build.mjs        JSON normalizer and static-site generator
scripts/serve.mjs        Dependency-free local preview server
src/                     Website source
dist/                    Generated static website
```

## Features

- One interactive book per tweet
- Rooms for primary categories and shelves for subcategories
- Newest-first chronological ordering within every shelf
- Book sizes based on each tweet's bookmark count, with visible save totals
- Full X Article titles and bodies from current Twitter Web Exporter Dexie exports
- Full-text search and category filtering
- Spacious and compact shelf modes
- Keyboard shortcut: `⌘/Ctrl + K` focuses search
- Accessible buttons and modal book details
- Random-book discovery
- Responsive mobile layout
- Deterministic colors and book sizes

## Deploy

Upload the contents of `dist/` to any static host, including GitHub Pages, Cloudflare Pages, Netlify, or Vercel. Re-run the build whenever the input JSON changes.

## Agent skill

The repository includes a reusable Codex skill at `skills/tweet-bookshelf` for agents that need to capture, validate, categorize, build, or publish a bookshelf.

Install it into your personal Codex skills directory:

```bash
cp -R skills/tweet-bookshelf ~/.codex/skills/tweet-bookshelf
```

Then invoke it with a request such as:

```text
Use $tweet-bookshelf to turn my X bookmark export into a categorized bookshelf site.
```

## Privacy

Your bookmark collection can reveal personal interests. JSON files under `data/` and generated `dist/` output are ignored by default, except for the synthetic sample. Keep real exports outside the repository and pass their absolute path with `--input`.

## License

MIT
