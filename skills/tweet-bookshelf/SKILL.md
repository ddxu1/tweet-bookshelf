---
name: tweet-bookshelf
description: Capture or validate X/Twitter bookmarks and full X Articles with the bundled article-enabled exporter, categorize the archive, and build the Tweet Bookshelf static website from JSON. Use for this repository's bookmark-to-bookshelf workflows, not ordinary X browsing or unrelated website generation.
---

# Tweet Bookshelf

Turn a tweet or bookmark archive, including X Articles, into a static visual library where primary categories are rooms, secondary categories are shelves, and individual posts are books.

## Repository and scraper

Work from a clone of [ddxu1/tweet-bookshelf](https://github.com/ddxu1/tweet-bookshelf). Paths below are relative to the repository root, even when this skill is installed separately in a personal skills directory. Locate the clone before running builds; the skill folder alone does not contain the generator or scraper.

Use `userscripts/twitter-web-exporter.user.js`, Danny's modified Twitter Web Exporter **1.4.3-articles.1**. It requests article plain text and rich content, exports article text, and preserves previously captured longer article bodies. Its upstream update URLs have been removed; keep the bundled version when article capture is needed. The script's upstream license is in `userscripts/LICENSE`.

Read the repository's `README.md` capture guide for Tampermonkey installation and troubleshooting; the same guide is [available online](https://github.com/ddxu1/tweet-bookshelf#capture-tweets-and-x-articles-with-tampermonkey). This supports X Articles; it does not download linked articles from external websites.

## Choose the mode

- If the user already has JSON, start with validation and do not operate their browser.
- If the user asks to capture bookmarks from a live X session, use the installed browser/userscript workflow below.
- If the user only asks to rebuild or restyle an existing bookshelf, preserve its input data and taxonomy unless they request changes.

## Capture from X

Use the bundled userscript through Tampermonkey. Reuse an existing installation and authorization. Install extensions or grant new browser permissions only within the user's authorized scope.

1. Confirm version **1.4.3-articles.1** is enabled for `x.com`, disable duplicate exporters, and hard-reload X. If it does not run, follow the README's **Allow user scripts** and site-access instructions.
2. Verify the floating Web Exporter panel is visible before continuing.
3. Open Bookmarks and advance through the timeline until the captured count stops increasing.
4. Require multiple consecutive zero-item loads or an equivalent visible end-of-pagination signal. A single pause is insufficient.
5. Load missing article bodies as described below before exporting.

Never claim completeness solely because a download exists. X lazy-loads content, so compare the exported row count with the captured total.

### Capture full X Articles

The bookmark timeline can return only a title or preview. Keep the **TweetDetail** module enabled, open the bookmarked post and its full X Article with the script running, and wait for the body to load. Check **Show Full Text** in the exporter's table. A `TweetResult: article text captured` log can also mean only a preview was returned; inspect the actual body before claiming it is complete.

Revisit articles captured before installing the modified script so X makes new requests. The script preserves longer article bodies when later responses contain less text, but cannot recover content X does not return. Report unavailable or incomplete bodies without inventing text.

### Export

Prefer **Settings → Local Database → Export** for a `twitter-web-exporter-<timestamp>.json` Dexie database. This preserves structured article titles, bodies, and original metadata. It can include other captured posts and account data; the build imports only rows in the `tweets` table with `legacy.bookmarked === true`.

For a bookmarks-only table export, select the intended rows, choose **Export Data → JSON**, and enable **Include all metadata**. Verify **Data length** matches the intended count. Article text is exported into `full_text`, while the raw record is nested under `metadata`. The current builder reads `full_text` but does not unwrap that metadata; prefer Dexie when separate article titles, bodies, and X Article labels matter.

Media export is optional for an offline archive; the JSON already retains media URLs.

## Validate the archive

Accept a top-level array, an object with a `tweets` array, or a Dexie export with `formatName: "dexie"` and a `tweets` table at `data.data[].rows`. For Dexie, select the table by `tableName === "tweets"` and filter on `legacy.bookmarked === true` before comparing import totals. Do not compare the entire database size with the Bookmarks counter.

Check and report for the records being imported:

- total rows and unique tweet IDs;
- duplicate IDs;
- missing IDs, authors, dates, text, or URLs;
- bookmark flags when present;
- whether the row count matches the capture panel;
- full article bodies under `article.article_results.result.plain_text` or `content_state.blocks`, distinguishing a body from `preview_text`; normalized inputs can use `article_title`, `article_preview`, and `article_text`;
- expanded long-post text under `note_tweet.note_tweet_results.result.text`;
- limitations such as deleted posts, unavailable posts, or URL-only media.

Preserve the original export. Write normalized or categorized derivatives separately.

## Categorize

Prefer existing `primary_category`, `secondary_category`, and `tags` fields. If absent:

1. Use `config/taxonomy.json` for deterministic first-pass classification.
2. Review ambiguous, link-only, or context-poor posts instead of inventing confident labels.
3. Keep every record exactly once. Put unresolved records in `Uncategorized → Inbox` or an explicit review queue.
4. Validate that categorized count and unique-ID count match the source archive.

For a Dexie source, compare against its eligible bookmarked records. When rebuilding from a richer export, `--categories-from /absolute/path/to/categorized-tweets.json` can reuse categories and tags by tweet ID; explicit fields on the new input take precedence. Do not discard article bodies while preparing categorized derivatives.

## Build

Requires Node.js 18 or newer. From the Tweet Bookshelf repository root, run with the user's archive explicitly; omitting `--input` builds the synthetic sample:

```bash
npm run build -- --input /absolute/path/to/tweets.json
```

The build must emit `dist/index.html`, `dist/styles.css`, `dist/app.js`, and `dist/data/tweets.json`. Check `dist/build-meta.json` for tweet and category totals, and compare the generated count with unique eligible input IDs. Use `--taxonomy` for alternate classification rules and `--output` for a separate output directory. The generator replaces its output directory; use a temporary output for verification when an existing build needs to be preserved.

For structured articles, verify `content_type: "article"`, `article_title`, and the full `article_text` survive normalization. For expanded long posts, verify the normalized text is not truncated.

Preview locally with:

```bash
npm run preview
```

Verify search, category filtering, compact mode, book-detail dialogs, original-post links, mobile layout, keyboard navigation, and the random-book action. Confirm every normalized post renders as one book, shelves are newest first, and book sizes reflect bookmark counts. For X Articles, check the title, full body, X Article label, and search matching text from the body.

## Publish or hand off

Treat the bookmark archive as potentially sensitive browsing-history data. Publish only to the audience the user requested; default to a local or private result when public sharing is not explicit. When handing off, include the repository, generated `dist/`, source JSON location, record totals, validation results, and any unresolved review items.
