# Tweet Bookshelf

Turn an exported collection of tweets or X bookmarks into a static, searchable bookshelf website. Every tweet becomes a book; primary categories become rooms, and secondary categories become shelves.

The generated site is plain HTML, CSS, JavaScript, and JSON. It has no runtime dependencies, account system, database, or tracking.

## Capture tweets and X Articles with Tampermonkey

This repository includes Danny's modified [Twitter Web Exporter userscript](userscripts/twitter-web-exporter.user.js), version **1.4.3-articles.1**, based on [prinsss/twitter-web-exporter](https://github.com/prinsss/twitter-web-exporter) 1.4.3. It captures the responses X loads while you browse and stores them in your browser's local IndexedDB database.

The bundled version adds X Article support:

- Requests article plain text and rich content through `withArticlePlainText` and `withArticleRichContentState` on supported X GraphQL requests.
- Exports article titles and bodies, with a fallback that converts rich content blocks into readable text with headings, lists, quotes, code, and embedded links.
- Captures article detail responses from `TweetResultByRestId` and enables **Show Full Text** for articles.
- Preserves previously captured longer article bodies when later responses contain less text, and keeps expanded long posts when later responses omit them.

These changes support **X Articles**. Linked articles on external websites are not downloaded. The script still needs X to load the content; installing it does not fill in old captures automatically.

### 1. Install Tampermonkey and the bundled userscript

1. Install [Tampermonkey](https://www.tampermonkey.net/) in Chrome.
2. Open `chrome://extensions`, select **Tampermonkey → Details**, and enable **Allow user scripts**. On older Chrome versions without that toggle, enable **Developer mode** on the extensions page. See [Tampermonkey's permission guide](https://www.tampermonkey.net/faq.php#Q209).
3. Open [userscripts/twitter-web-exporter.user.js](userscripts/twitter-web-exporter.user.js) on GitHub and click **Raw**. Tampermonkey should open an installation page. Check that the version is **1.4.3-articles.1**, then click **Install** or **Update**.
4. If the raw link only displays or downloads JavaScript, open **Tampermonkey → Create a new script**, replace the entire starter template with this file's contents, and save with `⌘/Ctrl + S`. You can also copy the file from a local clone.
5. In the Tampermonkey dashboard, confirm **Twitter Web Exporter** is enabled. If another copy is installed, disable it so only one exporter runs. Allow Tampermonkey site access to `x.com` if prompted.
6. Open X and hard-reload with `⌘ + Shift + R` on macOS or `Ctrl + Shift + R` on Windows/Linux. A floating **Web Exporter** panel should appear on the left.

Use the bundled version for the article changes. Its upstream `@downloadURL` and `@updateURL` entries have been removed; avoid replacing it with the upstream release when updating manually.

### 2. Capture every bookmark

1. Sign in to X and open [Bookmarks](https://x.com/i/bookmarks) or **History → Bookmarks**.
2. Confirm the Web Exporter panel shows a **Bookmarks** counter.
3. Scroll to the bottom repeatedly. X lazy-loads bookmarks in batches, and the userscript can only capture items that X has loaded.
4. Watch the captured count. Continue until it stops increasing and repeated scrolls load no new items. In the panel log, the final requests should report `0 items received`.
5. If the count pauses briefly and later increases, keep going. Temporary pauses are normal; several consecutive zero-result loads are the stronger completion signal.

For large collections, avoid switching to the Likes tab during capture. If X rate-limits the page or stops loading, wait a few minutes, reload, and resume carefully.

### 3. Load full article bodies

The bookmark timeline may return only an article title or preview. For articles whose full text is missing:

1. Keep the **TweetDetail** module enabled in the exporter's module settings.
2. Open the bookmarked post and its X Article in the same browser with the userscript enabled. Wait for the full article to load.
3. Check the exporter's **Show Full Text** action. For `TweetResultByRestId` responses, the runtime log also reports `TweetResult: article text captured` or `absent`; confirm the text is the full body, since a preview can also count as captured text.
4. Repeat for any remaining articles, then export again. The modified script retains the longer article text when you return to Bookmarks.

If you captured bookmarks before installing the modified script, reload Bookmarks and revisit the articles so X makes new requests with the article fields enabled. Deleted, unavailable, or restricted content may still be missing.

### 4. Export JSON

**Recommended for this bookshelf: export the full database.** This preserves the structured article title, body, and original metadata.

1. Open the Web Exporter panel's **Settings** (gear icon).
2. Under **Local Database**, click **Export**.
3. Save the `twitter-web-exporter-<timestamp>.json` file. This is a Dexie database export that can be passed directly to the bookshelf build:

   ```bash
   npm run build -- --input "/absolute/path/to/twitter-web-exporter-<timestamp>.json"
   ```

The database may contain other captured posts or account data. The bookshelf imports only tweet records with `legacy.bookmarked === true` from this format.

For a bookmarks-only table export instead:

1. Click the arrow beside **Bookmarks** in the Web Exporter panel.
2. Verify the table total matches the captured count and select all rows you want to export.
3. Click **Export Data**.
4. Select **JSON** and enable **Include all metadata** to retain the original records alongside the exported columns.
5. Verify **Data length** matches the intended number of bookmarks, click **Start Export**, and save the file.

The modified script places article text in the table export's `full_text` field. The bookshelf reads that text, but use the full database export to preserve separate article titles, bodies, and X Article labels in the site.

Raw images and videos are optional. The data export includes their URLs. Use **Export Media** only when you need an offline archive; large media exports can consume substantial memory and storage.

### 5. Verify the export

Before building, check that:

- the JSON parses successfully;
- the array length equals the Web Exporter captured count, or, for a Dexie export, the number of bookmarked rows in the `tweets` table matches;
- tweet IDs are unique;
- IDs, authors, dates, text, and URLs are present where expected;
- bookmark flags are `true` for the records you intend to import; a full database export can also contain unbookmarked records, which the build skips;
- expected articles contain a full body, not just a preview; in a Dexie export check `article.article_results.result.plain_text` or `article.article_results.result.content_state.blocks` on the tweet record;
- the last loaded page produced no additional bookmark records.

Deleted or unavailable posts cannot be exported because X does not return them to the page.

### Troubleshooting

- **No Web Exporter panel:** check that Tampermonkey and the script are enabled, **Allow user scripts** and site access are granted, and X was hard-reloaded after installation.
- **Articles still contain only a title or preview:** confirm the installed version is **1.4.3-articles.1**, disable duplicate exporters, reload X, and open the full article again with **TweetDetail** enabled. The script can retain only the content X returns.
- **Export contains fewer rows than expected:** the table export uses selected rows. Check **Data length** before downloading, or use the full database export.
- **Bookmark capture stalls:** wait if X is rate-limiting requests, then reload and continue scrolling. Check multiple zero-result loads before considering the capture complete.

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

It also accepts a complete Dexie JSON database exported by Twitter Web Exporter, including the bundled article-enabled version. Only records marked as bookmarks are imported; expanded long posts and available X Article titles and bodies are preserved automatically.

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
userscripts/             Modified Twitter Web Exporter and its upstream license
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

MIT. The bundled [Twitter Web Exporter userscript](userscripts/twitter-web-exporter.user.js) is derived from prin's MIT-licensed project; its original copyright and license are preserved in [userscripts/LICENSE](userscripts/LICENSE). Third-party notices embedded in the userscript are retained.
