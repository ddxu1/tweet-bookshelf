const state = { tweets: [], query: '', category: 'all', compact: false, previewedId: null, saveRanks: new Map() };
const touchMode = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const palette = ['#8f4d43','#b18a4d','#3e6960','#6f547c','#35627b','#8d6a3b','#516f44','#915e6c','#4f658a','#7b4b35'];
const elements = {
  library: document.querySelector('#library'), loading: document.querySelector('#loading-card'), empty: document.querySelector('#empty-state'),
  search: document.querySelector('#search'), filter: document.querySelector('#category-filter'), count: document.querySelector('#book-count'),
  toggle: document.querySelector('#view-toggle'), clear: document.querySelector('#clear-search'), random: document.querySelector('#random-book'),
  dialog: document.querySelector('#book-dialog'), dialogTitle: document.querySelector('#dialog-title'), dialogCategory: document.querySelector('#dialog-category'),
  dialogAuthor: document.querySelector('#dialog-author'), dialogText: document.querySelector('#dialog-text'), dialogTags: document.querySelector('#dialog-tags'),
  dialogLink: document.querySelector('#dialog-link'), detailCover: document.querySelector('#detail-cover'), copy: document.querySelector('#copy-link'),
  preview: document.querySelector('#book-preview'), previewCategory: document.querySelector('#preview-category'),
  previewText: document.querySelector('#preview-text'), previewAuthor: document.querySelector('#preview-author'),
  previewTags: document.querySelector('#preview-tags'), previewHint: document.querySelector('#preview-hint')
};

const hash = (value) => [...String(value)].reduce((total, char) => ((total << 5) - total) + char.charCodeAt(0), 0);
const colorFor = (value) => palette[Math.abs(hash(value)) % palette.length];
const escapeText = (value = '') => String(value).replace(/[<>]/g, '');
const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const formatCount = (value) => compactNumber.format(Number(value) || 0);
const tweetTime = (value = '') => {
  const normalized = String(value).replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T').replace(/ ([+-]\d{2}:\d{2})$/, '$1');
  return Date.parse(normalized) || 0;
};
const bookTitle = (tweet) => {
  if (tweet.article_title) return tweet.article_title;
  const words = tweet.text.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  return words.slice(0, 12).join(' ') || `Saved link from ${tweet.author}`;
};

function showPreview(tweet, book) {
  const text = (tweet.article_preview || tweet.text).replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  elements.previewCategory.textContent = `${tweet.primary_category} · ${tweet.secondary_category}`;
  elements.previewText.textContent = text || `A saved link from ${tweet.name || tweet.author}.`;
  elements.previewAuthor.textContent = `${tweet.name} ${tweet.author}${tweet.created_at ? ` · ${tweet.created_at.slice(0, 10)}` : ''} · ${formatCount(tweet.bookmark_count)} saves`;
  elements.previewTags.replaceChildren(...(tweet.tags || []).slice(0, 3).map((tag) => {
    const span = document.createElement('span'); span.textContent = tag; return span;
  }));
  elements.previewHint.textContent = touchMode ? 'Tap this book again to open it' : 'Click to open the full book';
  elements.preview.hidden = false;
  elements.preview.classList.toggle('touch-preview', touchMode || window.innerWidth < 700);
  if (!elements.preview.classList.contains('touch-preview')) {
    const bookRect = book.getBoundingClientRect();
    const previewRect = elements.preview.getBoundingClientRect();
    const gap = 14;
    const left = bookRect.right + gap + previewRect.width <= window.innerWidth - 12
      ? bookRect.right + gap
      : bookRect.left - previewRect.width - gap;
    const top = Math.min(Math.max(bookRect.top - 18, 12), window.innerHeight - previewRect.height - 12);
    elements.preview.style.left = `${Math.max(12, left)}px`;
    elements.preview.style.top = `${top}px`;
  }
}

function hidePreview() {
  elements.preview.hidden = true;
  elements.preview.classList.remove('touch-preview');
  elements.preview.style.removeProperty('left');
  elements.preview.style.removeProperty('top');
  state.previewedId = null;
}

function groupTweets(tweets) {
  const rooms = tweets.reduce((groups, tweet) => {
    const room = tweet.primary_category || 'Uncategorized';
    const shelf = tweet.secondary_category || 'Inbox';
    groups[room] ??= {};
    groups[room][shelf] ??= [];
    groups[room][shelf].push(tweet);
    return groups;
  }, {});
  Object.values(rooms).forEach((shelves) => {
    Object.values(shelves).forEach((shelf) => shelf.sort((a, b) => tweetTime(b.created_at) - tweetTime(a.created_at)));
  });
  return rooms;
}

function filteredTweets() {
  const query = state.query.toLowerCase();
  return state.tweets.filter((tweet) => {
    const inCategory = state.category === 'all' || tweet.primary_category === state.category;
    const haystack = [tweet.text, tweet.article_title, tweet.article_text, tweet.author, tweet.name, tweet.primary_category, tweet.secondary_category, ...(tweet.tags || [])].join(' ').toLowerCase();
    return inCategory && (!query || haystack.includes(query));
  });
}

function makeBook(tweet, index) {
  const button = document.createElement('button');
  const title = bookTitle(tweet);
  const rank = state.saveRanks.get(tweet.id) ?? 0;
  const size = rank >= .9 ? 'book-hero' : rank >= .65 ? 'book-large' : rank >= .3 ? 'book-medium' : 'book-small';
  button.type = 'button';
  button.className = `book ${size}`;
  button.style.setProperty('--book-color', colorFor(tweet.primary_category));
  button.style.transform = `rotate(${[-1.5,-.7,0,.4,1][index % 5]}deg)`;
  button.setAttribute('aria-label', `${title}, by ${tweet.author}, ${Number(tweet.bookmark_count || 0).toLocaleString()} saves`);
  button.setAttribute('aria-describedby', 'book-preview');
  button.title = `${title}\n${tweet.author} · ${Number(tweet.bookmark_count || 0).toLocaleString()} saves`;
  const spine = document.createElement('span');
  spine.className = 'book-title';
  spine.textContent = title;
  const saves = document.createElement('span');
  saves.className = 'book-saves';
  saves.setAttribute('aria-hidden', 'true');
  saves.textContent = `◆ ${formatCount(tweet.bookmark_count)}`;
  button.append(spine, saves);
  if (!touchMode) {
    button.addEventListener('pointerenter', () => showPreview(tweet, button));
    button.addEventListener('pointerleave', hidePreview);
    button.addEventListener('focus', () => showPreview(tweet, button));
    button.addEventListener('blur', hidePreview);
  }
  button.addEventListener('click', () => {
    if (touchMode && state.previewedId !== tweet.id) {
      state.previewedId = tweet.id;
      showPreview(tweet, button);
      return;
    }
    openBook(tweet);
  });
  return button;
}

function render() {
  hidePreview();
  const tweets = filteredTweets();
  const rooms = groupTweets(tweets);
  elements.library.replaceChildren();
  elements.library.classList.toggle('compact', state.compact);
  elements.empty.hidden = tweets.length > 0;
  elements.library.hidden = tweets.length === 0;
  elements.count.textContent = tweets.length.toLocaleString();

  Object.entries(rooms).forEach(([roomName, shelves], roomIndex) => {
    const room = document.querySelector('#room-template').content.firstElementChild.cloneNode(true);
    room.querySelector('.room-number').textContent = `Room ${String(roomIndex + 1).padStart(2, '0')}`;
    room.querySelector('h2').textContent = roomName;
    const roomTotal = Object.values(shelves).reduce((sum, shelf) => sum + shelf.length, 0);
    room.querySelector('.room-count').textContent = `${roomTotal} ${roomTotal === 1 ? 'book' : 'books'}`;
    const shelfContainer = room.querySelector('.shelves');

    Object.entries(shelves).forEach(([shelfName, shelfTweets]) => {
      const shelf = document.querySelector('#shelf-template').content.firstElementChild.cloneNode(true);
      shelf.querySelector('h3').textContent = shelfName;
      shelf.querySelector('.shelf-heading span').textContent = `${shelfTweets.length} ${shelfTweets.length === 1 ? 'volume' : 'volumes'} · newest first`;
      const books = shelf.querySelector('.books');
      shelfTweets.forEach((tweet, index) => books.append(makeBook(tweet, index)));
      shelfContainer.append(shelf);
    });
    elements.library.append(room);
  });
}

function openBook(tweet) {
  hidePreview();
  const title = bookTitle(tweet);
  elements.dialogTitle.textContent = title;
  elements.dialogCategory.textContent = `${tweet.primary_category} · ${tweet.secondary_category}${tweet.content_type === 'article' ? ' · X Article' : ''}`;
  elements.dialogAuthor.textContent = `${tweet.name} ${tweet.author}${tweet.created_at ? ` · ${tweet.created_at.slice(0, 10)}` : ''}`;
  elements.dialogText.textContent = tweet.article_text || tweet.text || 'This saved post contains media or a link without exported text.';
  elements.dialogTags.replaceChildren(...(tweet.tags || []).map((tag) => {
    const span = document.createElement('span'); span.textContent = tag; return span;
  }));
  elements.dialogLink.href = tweet.url;
  elements.detailCover.style.background = colorFor(tweet.primary_category);
  elements.detailCover.querySelector('span').textContent = tweet.primary_category;
  elements.copy.dataset.url = tweet.url;
  elements.copy.textContent = 'Copy link';
  elements.dialog.showModal();
}

function updateFilterOptions() {
  const categories = [...new Set(state.tweets.map((tweet) => tweet.primary_category))].sort();
  for (const category of categories) {
    const option = document.createElement('option'); option.value = category; option.textContent = category; elements.filter.append(option);
  }
}

elements.search.addEventListener('input', (event) => { state.query = event.target.value; render(); });
elements.filter.addEventListener('change', (event) => { state.category = event.target.value; render(); });
elements.toggle.addEventListener('click', () => {
  state.compact = !state.compact; elements.toggle.setAttribute('aria-pressed', String(state.compact)); render();
});
elements.clear.addEventListener('click', () => { state.query = ''; state.category = 'all'; elements.search.value = ''; elements.filter.value = 'all'; render(); });
elements.random.addEventListener('click', (event) => { event.preventDefault(); const books = filteredTweets(); if (books.length) openBook(books[Math.floor(Math.random() * books.length)]); });
elements.dialog.querySelector('.dialog-close').addEventListener('click', () => elements.dialog.close());
elements.dialog.addEventListener('click', (event) => { if (event.target === elements.dialog) elements.dialog.close(); });
elements.copy.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(elements.copy.dataset.url); elements.copy.textContent = 'Copied'; }
  catch { elements.copy.textContent = 'Copy failed'; }
});
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); elements.search.focus(); }
});
document.addEventListener('pointerdown', (event) => {
  if (touchMode && !event.target.closest('.book')) hidePreview();
});
window.addEventListener('scroll', () => { if (!touchMode) hidePreview(); }, { passive: true });

try {
  const response = await fetch('./data/tweets.json');
  if (!response.ok) throw new Error(`Could not load the archive (${response.status})`);
  state.tweets = await response.json();
  [...state.tweets]
    .sort((a, b) => Number(a.bookmark_count || 0) - Number(b.bookmark_count || 0))
    .forEach((tweet, index, ranked) => state.saveRanks.set(tweet.id, index / Math.max(1, ranked.length - 1)));
  updateFilterOptions();
  render();
} catch (error) {
  elements.loading.innerHTML = `<p>Could not open the library.</p><small>${escapeText(error.message)}</small>`;
}
