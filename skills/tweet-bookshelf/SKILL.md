---
name: tweet-bookshelf
description: Capture or validate exported X/Twitter bookmarks, categorize every tweet, and build the reusable Tweet Bookshelf static website from JSON. Use for bookmark-to-website workflows based on this repository; not for ordinary X browsing or unrelated website generation.
---

# Tweet Bookshelf

Turn a tweet or bookmark archive into a static visual library where primary categories are rooms, secondary categories are shelves, and individual tweets are books.

## Choose the mode

- If the user already has JSON, start with validation and do not operate their browser.
- If the user asks to capture bookmarks from a live X session, use the installed browser/userscript workflow below.
- If the user only asks to rebuild or restyle an existing bookshelf, preserve its input data and taxonomy unless they request changes.

## Capture from X

Use Twitter Web Exporter through Tampermonkey or Violentmonkey. Browser-extension installation or new permissions require the user's approval at action time.

1. Confirm the userscript is enabled for `x.com`, then hard-reload X.
2. Verify the floating Web Exporter panel is visible before continuing.
3. Open Bookmarks and advance through the timeline until the captured count stops increasing.
4. Require multiple consecutive zero-item loads or an equivalent visible end-of-pagination signal. A single pause is insufficient.
5. Open the Bookmarks table, verify its total, and export JSON with **Include all metadata** enabled.
6. Media export is optional. Recommend it only for a durable offline archive; the JSON already retains media URLs.

Never claim completeness solely because a download exists. X lazy-loads content, so compare the exported row count with the captured total.

## Validate the archive

Check and report:

- valid JSON and a top-level array or `tweets` array;
- total rows and unique tweet IDs;
- duplicate IDs;
- missing IDs, authors, dates, text, or URLs;
- bookmark flags when present;
- whether the row count matches the capture panel;
- limitations such as deleted posts, unavailable posts, or URL-only media.

Preserve the original export. Write normalized or categorized derivatives separately.

## Categorize

Prefer existing `primary_category`, `secondary_category`, and `tags` fields. If absent:

1. Use `config/taxonomy.json` for deterministic first-pass classification.
2. Review ambiguous, link-only, or context-poor posts instead of inventing confident labels.
3. Keep every record exactly once. Put unresolved records in `Uncategorized → Inbox` or an explicit review queue.
4. Validate that categorized count and unique-ID count match the source archive.

## Build

From the Tweet Bookshelf repository root, run:

```bash
npm run build -- --input /absolute/path/to/tweets.json
```

The build must emit `dist/index.html`, `dist/styles.css`, `dist/app.js`, and `dist/data/tweets.json`. Check `dist/build-meta.json` for tweet and category totals.

Preview locally with:

```bash
npm run preview
```

Verify search, category filtering, compact mode, book-detail dialogs, original-post links, mobile layout, keyboard navigation, and the random-book action. Confirm every normalized tweet renders as one book.

## Publish or hand off

Treat the bookmark archive as potentially sensitive browsing-history data. Publish only to the audience the user requested; default to a local or private result when public sharing is not explicit. When handing off, include the repository, generated `dist/`, source JSON location, record totals, validation results, and any unresolved review items.
