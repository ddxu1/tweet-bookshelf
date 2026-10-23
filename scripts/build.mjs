import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const inputPath = path.resolve(process.cwd(), valueAfter('--input', path.join(root, 'data/sample-tweets.json')));
const outputPath = path.resolve(process.cwd(), valueAfter('--output', path.join(root, 'dist')));
const taxonomyPath = path.resolve(process.cwd(), valueAfter('--taxonomy', path.join(root, 'config/taxonomy.json')));
const categoriesFromValue = valueAfter('--categories-from', '');
const categoriesFromPath = categoriesFromValue ? path.resolve(process.cwd(), categoriesFromValue) : '';

if (!fs.existsSync(inputPath)) throw new Error(`Input JSON not found: ${inputPath}`);
const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const dexieTables = raw?.formatName === 'dexie' ? raw?.data?.data : null;
const dexieTweets = Array.isArray(dexieTables)
  ? dexieTables.find((table) => table.tableName === 'tweets')?.rows
  : null;
const input = Array.isArray(raw)
  ? raw
  : Array.isArray(raw.tweets)
    ? raw.tweets
    : Array.isArray(dexieTweets)
      ? dexieTweets.filter((tweet) => tweet.legacy?.bookmarked === true)
      : null;
if (!Array.isArray(input)) throw new Error('Input must be a tweet array, an object with a tweets array, or a Twitter Web Exporter Dexie export.');
const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));
const categorySource = categoriesFromPath && fs.existsSync(categoriesFromPath)
  ? JSON.parse(fs.readFileSync(categoriesFromPath, 'utf8'))
  : [];
const categoryOverlay = new Map((Array.isArray(categorySource) ? categorySource : categorySource.tweets || [])
  .map((tweet) => [String(tweet.id), tweet]));

function clean(value = '') {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function cleanMultiline(value = '') {
  return String(value ?? '').replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function articleData(tweet) {
  const result = tweet.article?.article_results?.result;
  if (!result) return {
    title: clean(tweet.article_title),
    preview: cleanMultiline(tweet.article_preview),
    text: cleanMultiline(tweet.article_text)
  };
  const blockText = (result.content_state?.blocks || [])
    .map((block) => cleanMultiline(block.text))
    .filter(Boolean)
    .join('\n\n');
  return {
    title: clean(result.title),
    preview: cleanMultiline(result.preview_text),
    text: cleanMultiline(result.plain_text || blockText)
  };
}

function dateValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  return clean(value);
}

function autoCategory(text) {
  const haystack = text.toLowerCase();
  let best = { score: 0, primary: taxonomy.fallback[0], secondary: taxonomy.fallback[1] };
  for (const category of taxonomy.categories) {
    for (const shelf of category.shelves) {
      const score = shelf.keywords.reduce((total, keyword) => total + (haystack.includes(keyword.toLowerCase()) ? 1 : 0), 0);
      if (score > best.score) best = { score, primary: category.primary, secondary: shelf.name };
    }
  }
  return best;
}

function normalize(tweet, index) {
  const legacy = tweet.legacy || {};
  const article = articleData(tweet);
  const noteText = cleanMultiline(tweet.note_tweet?.note_tweet_results?.result?.text);
  const directText = cleanMultiline(tweet.text ?? tweet.full_text ?? tweet.content ?? '');
  const articleLead = article.title ? `${article.title}\n\n${article.preview || article.text.slice(0, 600)}` : '';
  const text = cleanMultiline(directText || articleLead || noteText || legacy.full_text || '');
  const nestedUser = tweet.core?.user_results?.result;
  const nestedAuthor = nestedUser?.core?.screen_name;
  const nestedName = nestedUser?.core?.name;
  const inferred = autoCategory(`${text} ${article.text.slice(0, 3000)} ${nestedName ?? tweet.name ?? ''} ${nestedAuthor ?? tweet.screen_name ?? tweet.author ?? ''}`);
  const authorRaw = clean(tweet.author ?? tweet.screen_name ?? tweet.username ?? nestedAuthor ?? 'unknown');
  const author = authorRaw.startsWith('@') ? authorRaw : `@${authorRaw}`;
  const id = clean(tweet.id ?? tweet.tweet_id ?? tweet.rest_id ?? legacy.id_str ?? index);
  const overlay = categoryOverlay.get(id);
  const overlayIsObsolete = article.title && /unclear|link-only/i.test(`${overlay?.primary_category || ''} ${overlay?.secondary_category || ''}`);
  const catalog = overlayIsObsolete ? null : overlay;
  const tagValue = tweet.tags ?? catalog?.tags ?? [];
  const tags = Array.isArray(tagValue)
    ? tagValue.map(clean).filter(Boolean)
    : clean(tagValue).split(/[;,]/).map(clean).filter(Boolean);
  const createdSource = tweet.created_at ?? tweet.date ?? legacy.created_at ?? tweet.twe_private_fields?.created_at ?? '';
  return {
    id,
    created_at: dateValue(createdSource),
    author,
    name: clean(tweet.name ?? tweet.display_name ?? nestedName ?? author.replace(/^@/, '')),
    url: clean(tweet.url ?? tweet.link ?? `https://x.com/i/status/${id}`),
    primary_category: clean(tweet.primary_category ?? tweet.category ?? catalog?.primary_category ?? inferred.primary),
    secondary_category: clean(tweet.secondary_category ?? tweet.shelf ?? catalog?.secondary_category ?? inferred.secondary),
    tags,
    text,
    content_type: article.title ? 'article' : tweet.content_type || (noteText ? 'long_post' : 'tweet'),
    article_title: article.title,
    article_preview: article.preview,
    article_text: article.text,
    media: Array.isArray(tweet.media) ? tweet.media : [],
    profile_image_url: clean(tweet.profile_image_url ?? nestedUser?.avatar?.image_url ?? ''),
    bookmark_count: Number(tweet.bookmark_count ?? tweet.bookmarks ?? tweet.saves ?? legacy.bookmark_count ?? 0) || 0,
    favorite_count: Number(tweet.favorite_count ?? tweet.likes ?? legacy.favorite_count ?? 0) || 0,
    retweet_count: Number(tweet.retweet_count ?? tweet.reposts ?? legacy.retweet_count ?? 0) || 0,
    views_count: Number(tweet.views_count ?? tweet.views?.count ?? tweet.views ?? 0) || 0
  };
}

const normalized = input.map(normalize).filter((tweet) => tweet.id || tweet.text || tweet.article_title);
const unique = [...new Map(normalized.map((tweet) => [tweet.id || tweet.url, tweet])).values()];

fs.rmSync(outputPath, { recursive: true, force: true });
fs.mkdirSync(path.join(outputPath, 'data'), { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js']) {
  fs.copyFileSync(path.join(root, 'src', file), path.join(outputPath, file));
}
fs.cpSync(path.join(root, 'src', 'fonts'), path.join(outputPath, 'fonts'), { recursive: true });
fs.writeFileSync(path.join(outputPath, 'data', 'tweets.json'), `${JSON.stringify(unique, null, 2)}\n`);
fs.writeFileSync(path.join(outputPath, 'build-meta.json'), `${JSON.stringify({
  generated_at: new Date().toISOString(),
  input: path.basename(inputPath),
  tweets: unique.length,
  categories: new Set(unique.map((tweet) => tweet.primary_category)).size
}, null, 2)}\n`);

console.log(`Built ${unique.length} books across ${new Set(unique.map((tweet) => tweet.primary_category)).size} categories.`);
console.log(`Output: ${outputPath}`);
