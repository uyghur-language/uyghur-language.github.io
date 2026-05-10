'use strict';

const state = {
  currentSurah:  1,
  currentAyah:   null,
  verses:        [],
  searchIndex:   [],
  searchQuery:   '',
  searchResults: [],
  bookmarks:     JSON.parse(localStorage.getItem('bookmarks') || '[]'),
  isPlaying:     false,
  autoPlay:      false,
  filterActive:  false,
  filterResults: [],
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $verseList    = document.getElementById('verse-list');
const $loadingState = document.getElementById('loading-state');
const $errorState   = document.getElementById('error-state');
const $errorMessage = document.getElementById('error-message');
const $retryBtn     = document.getElementById('retry-btn');

// ── UI state helpers ──────────────────────────────────────────────────────────
function showLoading() {
  $loadingState.hidden = false;
  $errorState.hidden   = true;
  $verseList.hidden    = true;
}

function showError(msg) {
  $errorMessage.textContent = msg;
  $errorState.hidden   = false;
  $loadingState.hidden = true;
  $verseList.hidden    = true;
}

function showVerses() {
  $verseList.hidden    = false;
  $loadingState.hidden = true;
  $errorState.hidden   = true;
}

// ── Bookmark helpers ──────────────────────────────────────────────────────────
function isBookmarked(surah, ayah) {
  return state.bookmarks.some(b => b.surah === surah && b.ayah === ayah);
}

// ── Verse card construction ───────────────────────────────────────────────────
const BISMILLAH_AR = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';

const BOOKMARK_SVG = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
</svg>`;

const PLAY_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
  <circle cx="12" cy="12" r="10"/>
  <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
</svg>`;

function buildBismillah() {
  const el = document.createElement('div');
  el.className = 'bismillah-header';
  el.setAttribute('dir', 'rtl');
  el.setAttribute('lang', 'ar');
  el.textContent = BISMILLAH_AR;
  return el;
}

function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)
  ).join('');
}

function buildVerseCard(verse, query = null) {
  const bm = isBookmarked(verse.surah, verse.ayah);

  const card = document.createElement('article');
  card.className = 'verse-card';
  card.id = `v${verse.surah}-${verse.ayah}`;
  card.setAttribute('role', 'listitem');
  card.dataset.surah = verse.surah;
  card.dataset.ayah  = verse.ayah;

  // header row
  const header = document.createElement('div');
  header.className = 'verse-header';

  const label = document.createElement('span');
  label.className = 'verse-label';
  label.textContent = `${verse.surah_name_en} — ${verse.ayah}`;

  const actions = document.createElement('div');
  actions.className = 'verse-actions';

  const bmBtn = document.createElement('button');
  bmBtn.className = 'verse-btn bookmark-btn' + (bm ? ' bookmarked' : '');
  bmBtn.setAttribute('aria-label', bm ? 'Remove bookmark' : 'Add bookmark');
  bmBtn.title = 'Bookmark';
  bmBtn.innerHTML = BOOKMARK_SVG;
  if (bm) bmBtn.querySelector('svg').setAttribute('fill', 'currentColor');

  const playBtn = document.createElement('button');
  playBtn.className = 'verse-btn play-btn';
  playBtn.setAttribute('aria-label', 'Play recitation');
  playBtn.title = 'Play';
  playBtn.innerHTML = PLAY_SVG;

  actions.appendChild(bmBtn);
  actions.appendChild(playBtn);
  header.appendChild(label);
  header.appendChild(actions);

  // body: three text blocks
  const body = document.createElement('div');
  body.className = 'verse-body';

  const ar = document.createElement('p');
  ar.className = 'text-ar';
  ar.setAttribute('dir', 'rtl');
  ar.setAttribute('lang', 'ar');
  if (query) { ar.innerHTML = highlightText(verse.text_ar, query); }
  else        { ar.textContent = verse.text_ar; }

  const en = document.createElement('p');
  en.className = 'text-en';
  en.setAttribute('dir', 'ltr');
  en.setAttribute('lang', 'en');
  if (query) { en.innerHTML = highlightText(verse.text_en, query); }
  else        { en.textContent = verse.text_en; }

  const ug = document.createElement('p');
  ug.className = 'text-ug';
  ug.setAttribute('dir', 'rtl');
  ug.setAttribute('lang', 'ug');
  if (query) { ug.innerHTML = highlightText(verse.text_ug, query); }
  else        { ug.textContent = verse.text_ug; }

  body.appendChild(ar);
  body.appendChild(en);
  body.appendChild(ug);

  card.appendChild(header);
  card.appendChild(body);
  return card;
}

// ── renderVerses ─────────────────────────────────────────────────────────────
function renderVerses(verses) {
  $verseList.innerHTML = '';

  const surah = verses[0]?.surah;
  const frag  = document.createDocumentFragment();

  // Bismillah header for every surah except 1 (its verse 1 is the Bismillah)
  // and 9 (At-Tawbah has no Bismillah)
  if (surah && surah !== 1 && surah !== 9) {
    frag.appendChild(buildBismillah());
  }

  for (const verse of verses) {
    frag.appendChild(buildVerseCard(verse));
  }

  $verseList.appendChild(frag);
  showVerses();
}

// ── loadSurah ─────────────────────────────────────────────────────────────────
async function loadSurah(surahNumber) {
  stopAudio();
  // Clear filter state (no re-render; this function will render after fetch)
  state.filterActive  = false;
  state.filterResults = [];
  $filterBanner.hidden = true;
  showLoading();
  if (location.protocol === 'file:') {
    showError('Open the app via a server (run: bash script/serve) or deploy to GitHub Pages.');
    return;
  }
  let res;
  try {
    res = await fetch(`../data/surah/${surahNumber}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error('loadSurah fetch error:', e);
    showError('Failed to load surah. Check your connection and ensure the server is running.');
    return;
  }
  try {
    state.verses       = await res.json();
    state.currentSurah = surahNumber;
    renderVerses(state.verses);
    $surahSelect.value = surahNumber;
    setPermalink(surahNumber);
  } catch (e) {
    console.error('loadSurah render error:', e);
    showError(`Render error: ${e.message}`);
  }
}

$retryBtn.addEventListener('click', () => loadSurah(state.currentSurah));

// ── Static surah metadata ─────────────────────────────────────────────────────
// Index 0 = surah 1. Matches the names used in build-data.py / JSON files.
const SURAH_NAMES = [
  {en:"Al-Fatihah",     ar:"الفاتحة",    ug:"ئالفاتىھە"},
  {en:"Al-Baqarah",     ar:"البقرة",      ug:"ئالبەقەرە"},
  {en:"Ali 'Imran",     ar:"آل عمران",    ug:"ئالى ئىمران"},
  {en:"An-Nisa",        ar:"النساء",      ug:"ئەننىساء"},
  {en:"Al-Ma'idah",     ar:"المائدة",     ug:"ئەلمائىدە"},
  {en:"Al-An'am",       ar:"الأنعام",     ug:"ئەلئەنئام"},
  {en:"Al-A'raf",       ar:"الأعراف",     ug:"ئەلئەئراف"},
  {en:"Al-Anfal",       ar:"الأنفال",     ug:"ئەلئەنفال"},
  {en:"At-Tawbah",      ar:"التوبة",      ug:"ئەتتەۋبە"},
  {en:"Yunus",          ar:"يونس",        ug:"يۇنۇس"},
  {en:"Hud",            ar:"هود",         ug:"ھۇد"},
  {en:"Yusuf",          ar:"يوسف",        ug:"يۈسۈپ"},
  {en:"Ar-Ra'd",        ar:"الرعد",       ug:"ئەررەئد"},
  {en:"Ibrahim",        ar:"إبراهيم",     ug:"ئىبراھىم"},
  {en:"Al-Hijr",        ar:"الحجر",       ug:"ئەلھىجر"},
  {en:"An-Nahl",        ar:"النحل",       ug:"ئەننەھل"},
  {en:"Al-Isra",        ar:"الإسراء",     ug:"ئەلئىسرا"},
  {en:"Al-Kahf",        ar:"الكهف",       ug:"ئەلكەھف"},
  {en:"Maryam",         ar:"مريم",        ug:"مەريەم"},
  {en:"Ta-Ha",          ar:"طه",          ug:"تاھا"},
  {en:"Al-Anbiya",      ar:"الأنبياء",    ug:"ئەلئەنبىياء"},
  {en:"Al-Hajj",        ar:"الحج",        ug:"ئەلھەج"},
  {en:"Al-Mu'minun",    ar:"المؤمنون",    ug:"ئەلمۇئمىنۇن"},
  {en:"An-Nur",         ar:"النور",       ug:"ئەننۇر"},
  {en:"Al-Furqan",      ar:"الفرقان",     ug:"ئەلفۇرقان"},
  {en:"Ash-Shu'ara",    ar:"الشعراء",     ug:"ئەششۇئەرا"},
  {en:"An-Naml",        ar:"النمل",       ug:"ئەننەمل"},
  {en:"Al-Qasas",       ar:"القصص",       ug:"ئەلقەسەس"},
  {en:"Al-'Ankabut",    ar:"العنكبوت",    ug:"ئەلئەنكەبۇت"},
  {en:"Ar-Rum",         ar:"الروم",       ug:"ئەررۇم"},
  {en:"Luqman",         ar:"لقمان",       ug:"لۇقمان"},
  {en:"As-Sajdah",      ar:"السجدة",      ug:"ئەسسەجدە"},
  {en:"Al-Ahzab",       ar:"الأحزاب",     ug:"ئەلئەھزاب"},
  {en:"Saba",           ar:"سبأ",         ug:"سەبەئ"},
  {en:"Fatir",          ar:"فاطر",        ug:"فاتىر"},
  {en:"Ya-Sin",         ar:"يس",          ug:"ياسىن"},
  {en:"As-Saffat",      ar:"الصافات",     ug:"ئەسسافات"},
  {en:"Sad",            ar:"ص",           ug:"ساد"},
  {en:"Az-Zumar",       ar:"الزمر",       ug:"ئەززۇمەر"},
  {en:"Ghafir",         ar:"غافر",        ug:"غافىر"},
  {en:"Fussilat",       ar:"فصلت",        ug:"فۇسسىلەت"},
  {en:"Ash-Shura",      ar:"الشورى",      ug:"ئەششۇرا"},
  {en:"Az-Zukhruf",     ar:"الزخرف",      ug:"ئەززۇخرۇف"},
  {en:"Ad-Dukhan",      ar:"الدخان",      ug:"ئەددۇخان"},
  {en:"Al-Jathiyah",    ar:"الجاثية",     ug:"ئەلجاسىيە"},
  {en:"Al-Ahqaf",       ar:"الأحقاف",     ug:"ئەلئەھقاف"},
  {en:"Muhammad",       ar:"محمد",        ug:"مۇھەممەد"},
  {en:"Al-Fath",        ar:"الفتح",       ug:"ئەلفەتھ"},
  {en:"Al-Hujurat",     ar:"الحجرات",     ug:"ئەلھۇجۇرات"},
  {en:"Qaf",            ar:"ق",           ug:"قاف"},
  {en:"Adh-Dhariyat",   ar:"الذاريات",    ug:"ئەززارىيات"},
  {en:"At-Tur",         ar:"الطور",       ug:"ئەتتۇر"},
  {en:"An-Najm",        ar:"النجم",       ug:"ئەننەجم"},
  {en:"Al-Qamar",       ar:"القمر",       ug:"ئەلقەمەر"},
  {en:"Ar-Rahman",      ar:"الرحمن",      ug:"ئەررەھمان"},
  {en:"Al-Waqi'ah",     ar:"الواقعة",     ug:"ئەلۋاقىئە"},
  {en:"Al-Hadid",       ar:"الحديد",      ug:"ئەلھەدىد"},
  {en:"Al-Mujadila",    ar:"المجادلة",    ug:"ئەلمۇجادىلە"},
  {en:"Al-Hashr",       ar:"الحشر",       ug:"ئەلھەشر"},
  {en:"Al-Mumtahanah",  ar:"الممتحنة",    ug:"ئەلمۇمتەھەنە"},
  {en:"As-Saf",         ar:"الصف",        ug:"ئەسساف"},
  {en:"Al-Jumu'ah",     ar:"الجمعة",      ug:"ئەلجۇمۇئە"},
  {en:"Al-Munafiqun",   ar:"المنافقون",   ug:"ئەلمۇنافىقۇن"},
  {en:"At-Taghabun",    ar:"التغابن",     ug:"ئەتتەغابۇن"},
  {en:"At-Talaq",       ar:"الطلاق",      ug:"ئەتتالاق"},
  {en:"At-Tahrim",      ar:"التحريم",     ug:"ئەتتەھرىم"},
  {en:"Al-Mulk",        ar:"الملك",       ug:"ئەلمۇلك"},
  {en:"Al-Qalam",       ar:"القلم",       ug:"ئەلقەلەم"},
  {en:"Al-Haqqah",      ar:"الحاقة",      ug:"ئەلھاققە"},
  {en:"Al-Ma'arij",     ar:"المعارج",     ug:"ئەلمەئارىج"},
  {en:"Nuh",            ar:"نوح",         ug:"نۇھ"},
  {en:"Al-Jinn",        ar:"الجن",        ug:"ئەلجىن"},
  {en:"Al-Muzzammil",   ar:"المزمل",      ug:"ئەلمۇززەممىل"},
  {en:"Al-Muddaththir", ar:"المدثر",      ug:"ئەلمۇددەسسىر"},
  {en:"Al-Qiyamah",     ar:"القيامة",     ug:"ئەلقىيامە"},
  {en:"Al-Insan",       ar:"الإنسان",     ug:"ئەلئىنسان"},
  {en:"Al-Mursalat",    ar:"المرسلات",    ug:"ئەلمۇرسەلات"},
  {en:"An-Naba",        ar:"النبأ",       ug:"ئەننەبەئ"},
  {en:"An-Nazi'at",     ar:"النازعات",    ug:"ئەننازىئات"},
  {en:"Abasa",          ar:"عبس",         ug:"ئەبەسە"},
  {en:"At-Takwir",      ar:"التكوير",     ug:"ئەتتەكۋىر"},
  {en:"Al-Infitar",     ar:"الانفطار",    ug:"ئەلئىنفىتار"},
  {en:"Al-Mutaffifin",  ar:"المطففين",    ug:"ئەلمۇتەففىفىن"},
  {en:"Al-Inshiqaq",    ar:"الانشقاق",    ug:"ئەلئىنشىقاق"},
  {en:"Al-Buruj",       ar:"البروج",      ug:"ئەلبۇرۇج"},
  {en:"At-Tariq",       ar:"الطارق",      ug:"ئەتتارىق"},
  {en:"Al-A'la",        ar:"الأعلى",      ug:"ئەلئەئلا"},
  {en:"Al-Ghashiyah",   ar:"الغاشية",     ug:"ئەلغاشىيە"},
  {en:"Al-Fajr",        ar:"الفجر",       ug:"ئەلفەجر"},
  {en:"Al-Balad",       ar:"البلد",       ug:"ئەلبەلەد"},
  {en:"Ash-Shams",      ar:"الشمس",       ug:"ئەششەمس"},
  {en:"Al-Layl",        ar:"الليل",       ug:"ئەللەيل"},
  {en:"Ad-Duha",        ar:"الضحى",       ug:"ئەددۇھا"},
  {en:"Ash-Sharh",      ar:"الشرح",       ug:"ئەششەرھ"},
  {en:"At-Tin",         ar:"التين",       ug:"ئەتتىن"},
  {en:"Al-'Alaq",       ar:"العلق",       ug:"ئەلئەلەق"},
  {en:"Al-Qadr",        ar:"القدر",       ug:"ئەلقەدر"},
  {en:"Al-Bayyinah",    ar:"البينة",      ug:"ئەلبەييىنە"},
  {en:"Az-Zalzalah",    ar:"الزلزلة",     ug:"ئەززەلزەلە"},
  {en:"Al-'Adiyat",     ar:"العاديات",    ug:"ئەلئادىيات"},
  {en:"Al-Qari'ah",     ar:"القارعة",     ug:"ئەلقارىئە"},
  {en:"At-Takathur",    ar:"التكاثر",     ug:"ئەتتەكاسۇر"},
  {en:"Al-'Asr",        ar:"العصر",       ug:"ئەلئەسر"},
  {en:"Al-Humazah",     ar:"الهمزة",      ug:"ئەلھۇمەزە"},
  {en:"Al-Fil",         ar:"الفيل",       ug:"ئەلفىل"},
  {en:"Quraysh",        ar:"قريش",        ug:"قۇرەيش"},
  {en:"Al-Ma'un",       ar:"الماعون",     ug:"ئەلمائۇن"},
  {en:"Al-Kawthar",     ar:"الكوثر",      ug:"ئەلكەۋسەر"},
  {en:"Al-Kafirun",     ar:"الكافرون",    ug:"ئەلكافىرۇن"},
  {en:"An-Nasr",        ar:"النصر",       ug:"ئەننەسر"},
  {en:"Al-Masad",       ar:"المسد",       ug:"ئەلمەسەد"},
  {en:"Al-Ikhlas",      ar:"الإخلاص",     ug:"ئەلئىخلاس"},
  {en:"Al-Falaq",       ar:"الفلق",       ug:"ئەلفەلەق"},
  {en:"An-Nas",         ar:"الناس",       ug:"ئەنناس"},
];

// Verse counts per surah (index 0 = surah 1)
const SURAH_VERSE_COUNTS = [
  7,286,200,176,120,165,206,75,129,109,
  123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,
  34,30,73,54,45,83,182,88,75,85,
  54,53,89,59,37,35,38,29,18,45,
  60,49,62,55,78,96,29,22,24,13,
  14,11,11,18,12,12,30,52,52,44,
  28,28,20,56,40,31,50,40,46,42,
  29,19,36,25,22,17,19,26,30,20,
  15,21,11,8,8,19,5,8,8,11,
  11,8,3,9,5,4,7,3,6,3,
  5,4,5,6,
];

// ── Navigation DOM refs ───────────────────────────────────────────────────────
const $surahSelect = document.getElementById('surah-select');
const $jumpSurah   = document.getElementById('jump-surah');
const $jumpAyah    = document.getElementById('jump-ayah');
const $jumpBtn     = document.getElementById('jump-btn');

// ── Populate surah dropdown ───────────────────────────────────────────────────
function populateSurahDropdown() {
  const frag = document.createDocumentFragment();
  SURAH_NAMES.forEach((names, i) => {
    const n   = i + 1;
    const opt = document.createElement('option');
    opt.value       = n;
    opt.textContent = `${n}. ${names.en} — ${names.ar} — ${names.ug}`;
    frag.appendChild(opt);
  });
  $surahSelect.appendChild(frag);
  $surahSelect.value = state.currentSurah;
}

// ── scrollToVerse ─────────────────────────────────────────────────────────────
function scrollToVerse(surah, ayah) {
  const el = document.getElementById(`v${surah}-${ayah}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Filter ────────────────────────────────────────────────────────────────────
const $filterBanner = document.getElementById('filter-banner');
const $filterCount  = document.getElementById('filter-count');

function clearFilter() {
  state.filterActive  = false;
  state.filterResults = [];
  $filterBanner.hidden = true;
  // Restore surah view only when verses are available
  if (state.verses.length) renderVerses(state.verses);
}

function applySearchFilter(verses, scrollSurah, scrollAyah) {
  stopAudio();
  state.filterActive  = true;
  state.filterResults = verses;
  // Render all matched verses in the main list
  $verseList.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const v of verses) frag.appendChild(buildVerseCard(v, state.searchQuery));
  $verseList.appendChild(frag);
  showVerses();
  // Show filter banner
  $filterCount.textContent = `${verses.length} result${verses.length !== 1 ? 's' : ''} for "${state.searchQuery}"`;
  $filterBanner.hidden = false;
  // Scroll to the selected verse
  requestAnimationFrame(() => scrollToVerse(scrollSurah, scrollAyah));
}

// ── Permalink ─────────────────────────────────────────────────────────────────
function setPermalink(surah, ayah = null) {
  const url = new URL(location.href);
  url.searchParams.set('surah', surah);
  if (ayah) {
    url.searchParams.set('ayah', ayah);
  } else {
    url.searchParams.delete('ayah');
  }
  history.replaceState(null, '', url);
}

// ── Surah dropdown handler ────────────────────────────────────────────────────
$surahSelect.addEventListener('change', () => {
  const n = parseInt($surahSelect.value, 10);
  if (n >= 1 && n <= 114) loadSurah(n);
});

// ── Ayah jump handler ─────────────────────────────────────────────────────────
async function handleJump() {
  const s = parseInt($jumpSurah.value, 10);
  const a = parseInt($jumpAyah.value, 10);

  if (!s || s < 1 || s > 114) {
    $jumpSurah.focus();
    return;
  }
  const maxAyah = SURAH_VERSE_COUNTS[s - 1];
  if (!a || a < 1 || a > maxAyah) {
    $jumpAyah.focus();
    return;
  }

  if (s !== state.currentSurah || state.filterActive) {
    await loadSurah(s);
  }
  state.currentAyah = a;
  scrollToVerse(s, a);
  setPermalink(s, a);
}

$jumpBtn.addEventListener('click', handleJump);
[$jumpSurah, $jumpAyah].forEach(el =>
  el.addEventListener('keydown', e => { if (e.key === 'Enter') handleJump(); })
);

// ── Search DOM refs ───────────────────────────────────────────────────────────
const $searchInput  = document.getElementById('search-input');
const $searchPanel  = document.getElementById('search-panel');
const $searchResults = document.getElementById('search-results');
const $searchEmpty  = document.getElementById('search-empty');
const $closeSearch  = document.getElementById('close-search-btn');
const $backdrop     = document.getElementById('overlay-backdrop');

// ── loadSearchIndex ───────────────────────────────────────────────────────────
async function loadSearchIndex() {
  if (state.searchIndex.length) return;          // already loaded
  const res = await fetch('../data/search-index.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  state.searchIndex = await res.json();
}

// ── searchVerses ──────────────────────────────────────────────────────────────
function searchVerses(query) {
  const q = query.toLowerCase();
  return state.searchIndex.filter(v =>
    v.text_ar.includes(query) ||           // exact (Arabic)
    v.text_ug.includes(query) ||           // exact (Uyghur)
    v.text_en.toLowerCase().includes(q)    // case-insensitive (English)
  );
}

// ── Snippet with highlighted keyword ─────────────────────────────────────────
const SNIPPET_RADIUS = 60;   // chars on each side of the match

function buildSnippet(text, query) {
  // find first match position (case-insensitive for English, exact for others)
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return escapeHtml(text.slice(0, SNIPPET_RADIUS * 2));

  const start   = Math.max(0, idx - SNIPPET_RADIUS);
  const end     = Math.min(text.length, idx + query.length + SNIPPET_RADIUS);
  const before  = (start > 0 ? '…' : '') + escapeHtml(text.slice(start, idx));
  const matched = `<mark>${escapeHtml(text.slice(idx, idx + query.length))}</mark>`;
  const after   = escapeHtml(text.slice(idx + query.length, end)) + (end < text.length ? '…' : '');
  return before + matched + after;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Render search results ─────────────────────────────────────────────────────
function renderSearchResults(query) {
  $searchResults.innerHTML = '';

  if (!query) {
    $searchEmpty.hidden = true;
    return;
  }

  const results = searchVerses(query);
  state.searchResults = results;

  if (!results.length) {
    $searchEmpty.hidden = false;
    return;
  }
  $searchEmpty.hidden = true;

  // Determine which field matched to show the best snippet
  const qLower = query.toLowerCase();
  const frag   = document.createDocumentFragment();

  for (const verse of results) {
    // Pick the text field that actually matches for the snippet
    let snippetHtml;
    if (verse.text_ar.includes(query)) {
      snippetHtml = buildSnippet(verse.text_ar, query);
    } else if (verse.text_ug.includes(query)) {
      snippetHtml = buildSnippet(verse.text_ug, query);
    } else {
      snippetHtml = buildSnippet(verse.text_en, query);
    }

    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.setAttribute('role', 'listitem');

    const label = document.createElement('div');
    label.className = 'result-label';
    label.textContent = `${verse.surah_name_en} — Ayah ${verse.ayah}`;

    const snippet = document.createElement('div');
    snippet.className = 'result-snippet';
    snippet.innerHTML = snippetHtml;   // safe: escapeHtml applied above

    item.appendChild(label);
    item.appendChild(snippet);

    item.addEventListener('click', () => {
      state.currentAyah = verse.ayah;
      applySearchFilter(state.searchResults, verse.surah, verse.ayah);
      setPermalink(verse.surah, verse.ayah);
      dismissSearchPanel();
    });

    frag.appendChild(item);
  }

  $searchResults.appendChild(frag);
}

// ── Open / close search panel ─────────────────────────────────────────────────
function openSearch() {
  $searchPanel.hidden = false;
  $backdrop.hidden    = false;
}

// Hides the panel and backdrop without touching search/filter state.
// Used after selecting a result so the filtered main view becomes visible.
function dismissSearchPanel() {
  $searchPanel.hidden = true;
  $backdrop.hidden    = true;
}

function closeSearch() {
  dismissSearchPanel();
  state.searchQuery        = '';
  state.searchResults      = [];
  $searchInput.value       = '';
  $searchResults.innerHTML = '';
  $searchEmpty.hidden      = true;
  // Filter stays active — cleared only by the explicit "✕ Clear" button
}

// ── Debounce ──────────────────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── Search input handler ──────────────────────────────────────────────────────
const handleSearch = debounce(async () => {
  const query = $searchInput.value.trim();
  state.searchQuery = query;

  if (!query) {
    $searchResults.innerHTML = '';
    $searchEmpty.hidden = true;
    if (state.filterActive) clearFilter();
    return;
  }

  try {
    await loadSearchIndex();
  } catch {
    return;   // silently skip if index unavailable
  }

  renderSearchResults(query);
}, 300);

$searchInput.addEventListener('input', () => {
  openSearch();
  handleSearch();
});

$closeSearch.addEventListener('click', closeSearch);
$backdrop.addEventListener('click', () => {
  closeSearch();
  closeBookmarks();
});

// ── Bookmarks DOM refs ────────────────────────────────────────────────────────
const $bookmarksBtn    = document.getElementById('bookmarks-btn');
const $bookmarksPanel  = document.getElementById('bookmarks-panel');
const $bookmarksList   = document.getElementById('bookmarks-list');
const $bookmarksEmpty  = document.getElementById('bookmarks-empty');
const $closeBookmarks  = document.getElementById('close-bookmarks-btn');

// ── Persist bookmarks ─────────────────────────────────────────────────────────
function saveBookmarks() {
  localStorage.setItem('bookmarks', JSON.stringify(state.bookmarks));
}

// ── Toggle bookmark for a verse ───────────────────────────────────────────────
function toggleBookmark(verse) {
  const idx = state.bookmarks.findIndex(
    b => b.surah === verse.surah && b.ayah === verse.ayah
  );
  if (idx === -1) {
    state.bookmarks.push(verse);
  } else {
    state.bookmarks.splice(idx, 1);
  }
  saveBookmarks();

  // Update the button in the currently rendered verse list
  const card  = document.getElementById(`v${verse.surah}-${verse.ayah}`);
  if (card) {
    const btn = card.querySelector('.bookmark-btn');
    const bm  = isBookmarked(verse.surah, verse.ayah);
    btn.classList.toggle('bookmarked', bm);
    btn.setAttribute('aria-label', bm ? 'Remove bookmark' : 'Add bookmark');
    btn.querySelector('svg').setAttribute('fill', bm ? 'currentColor' : 'none');
  }

  // Refresh bookmarks panel if it's open
  if (!$bookmarksPanel.hidden) renderBookmarksList();
}

// ── Wire bookmark buttons via event delegation ────────────────────────────────
$verseList.addEventListener('click', e => {
  const btn = e.target.closest('.bookmark-btn');
  if (!btn) return;
  const card  = btn.closest('.verse-card');
  const surah = parseInt(card.dataset.surah, 10);
  const ayah  = parseInt(card.dataset.ayah, 10);
  const pool  = state.filterActive ? state.filterResults : state.verses;
  const verse = pool.find(v => v.surah === surah && v.ayah === ayah);
  if (verse) toggleBookmark(verse);
});

// ── Render bookmarks panel ────────────────────────────────────────────────────
function renderBookmarksList() {
  $bookmarksList.innerHTML = '';

  if (!state.bookmarks.length) {
    $bookmarksEmpty.hidden = false;
    return;
  }
  $bookmarksEmpty.hidden = true;

  const frag = document.createDocumentFragment();
  for (const verse of state.bookmarks) {
    const item = document.createElement('div');
    item.className = 'bookmark-item';
    item.setAttribute('role', 'listitem');

    const text = document.createElement('div');
    text.className = 'bookmark-text';

    const label = document.createElement('div');
    label.className = 'result-label';
    label.textContent = `${verse.surah_name_en} — Ayah ${verse.ayah}`;

    const snippet = document.createElement('div');
    snippet.className = 'result-snippet';
    snippet.textContent = verse.text_ar.slice(0, 80) + (verse.text_ar.length > 80 ? '…' : '');

    text.appendChild(label);
    text.appendChild(snippet);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'bookmark-remove';
    removeBtn.setAttribute('aria-label', 'Remove bookmark');
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      toggleBookmark(verse);
    });

    item.appendChild(text);
    item.appendChild(removeBtn);

    item.addEventListener('click', async () => {
      closeBookmarks();
      if (verse.surah !== state.currentSurah || state.filterActive) {
        await loadSurah(verse.surah);
      }
      state.currentAyah = verse.ayah;
      scrollToVerse(verse.surah, verse.ayah);
      setPermalink(verse.surah, verse.ayah);
    });

    frag.appendChild(item);
  }
  $bookmarksList.appendChild(frag);
}

// ── Open / close bookmarks panel ─────────────────────────────────────────────
function openBookmarks() {
  renderBookmarksList();
  $bookmarksPanel.hidden = false;
  $backdrop.hidden       = false;
}

function closeBookmarks() {
  $bookmarksPanel.hidden = true;
  // only hide backdrop if search is also closed
  if ($searchPanel.hidden) $backdrop.hidden = true;
}

$bookmarksBtn.addEventListener('click', openBookmarks);
$closeBookmarks.addEventListener('click', closeBookmarks);

// ── Home button ──────────────────────────────────────────────────────────────
document.getElementById('home-btn').addEventListener('click', () => {
  document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── Dark mode ─────────────────────────────────────────────────────────────────
const $darkBtn   = document.getElementById('dark-mode-btn');
const $darkIcon  = document.getElementById('dark-icon');
const $lightIcon = document.getElementById('light-icon');

function applyDark(on) {
  document.body.classList.toggle('dark', on);
  $darkIcon.hidden  = on;
  $lightIcon.hidden = !on;
  $darkBtn.setAttribute('aria-label', on ? 'Switch to light mode' : 'Toggle dark mode');
}

$darkBtn.addEventListener('click', () => {
  const on = !document.body.classList.contains('dark');
  applyDark(on);
  localStorage.setItem('darkMode', on ? '1' : '0');
});

// ── Font size control ─────────────────────────────────────────────────────────
const FONT_MIN     = 1.2;
const FONT_MAX     = 3.5;
const FONT_STEP    = 0.2;
const FONT_DEFAULT = 1.9;

function applyFontSize(rem) {
  const clamped = Math.min(FONT_MAX, Math.max(FONT_MIN, rem));
  document.documentElement.style.setProperty('--arabic-size', `${clamped}rem`);
  return clamped;
}

document.getElementById('font-increase-btn').addEventListener('click', () => {
  const current = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--arabic-size')
  ) || FONT_DEFAULT;
  const next = applyFontSize(Math.round((current + FONT_STEP) * 10) / 10);
  localStorage.setItem('arabicSize', next);
});

document.getElementById('font-decrease-btn').addEventListener('click', () => {
  const current = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--arabic-size')
  ) || FONT_DEFAULT;
  const next = applyFontSize(Math.round((current - FONT_STEP) * 10) / 10);
  localStorage.setItem('arabicSize', next);
});

// ── Audio player ──────────────────────────────────────────────────────────────
const audio       = new Audio();
let   $playingCard = null;

const PAUSE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
  <circle cx="12" cy="12" r="10"/>
  <line x1="10" y1="8" x2="10" y2="16"/>
  <line x1="14" y1="8" x2="14" y2="16"/>
</svg>`;

function globalAyahNumber(surah, ayah) {
  let n = 0;
  for (let i = 0; i < surah - 1; i++) n += SURAH_VERSE_COUNTS[i];
  return n + ayah;
}

function audioUrl(surah, ayah) {
  return `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyahNumber(surah, ayah)}.mp3`;
}

function setCardPlaying(card, on) {
  if (!card) return;
  const btn = card.querySelector('.play-btn');
  if (!btn) return;
  btn.innerHTML = on ? PAUSE_SVG : PLAY_SVG;
  btn.setAttribute('aria-label', on ? 'Pause recitation' : 'Play recitation');
  btn.classList.toggle('playing', on);
}

function stopAudio() {
  if (!audio.paused) audio.pause();
  audio.src = '';
  setCardPlaying($playingCard, false);
  $playingCard    = null;
  state.isPlaying = false;
}

function playCard(card) {
  const surah = parseInt(card.dataset.surah, 10);
  const ayah  = parseInt(card.dataset.ayah, 10);

  // toggle pause if same verse
  if ($playingCard === card) {
    if (audio.paused) {
      audio.play().catch(() => {});
      setCardPlaying(card, true);
      state.isPlaying = true;
    } else {
      audio.pause();
      setCardPlaying(card, false);
      state.isPlaying = false;
    }
    return;
  }

  // different verse — stop previous
  setCardPlaying($playingCard, false);
  $playingCard    = card;
  audio.src       = audioUrl(surah, ayah);
  state.isPlaying = true;
  setCardPlaying(card, true);
  audio.play().catch(() => stopAudio());
}

audio.addEventListener('ended', () => {
  if (!state.autoPlay || !$playingCard) {
    setCardPlaying($playingCard, false);
    $playingCard    = null;
    state.isPlaying = false;
    return;
  }

  const surah = parseInt($playingCard.dataset.surah, 10);
  const ayah  = parseInt($playingCard.dataset.ayah,  10);

  setCardPlaying($playingCard, false);
  $playingCard = null;

  let nextSurah, nextAyah;

  if (state.filterActive && state.filterResults.length) {
    // Advance to the next verse in the filtered set
    const idx = state.filterResults.findIndex(v => v.surah === surah && v.ayah === ayah);
    if (idx === -1 || idx + 1 >= state.filterResults.length) {
      state.isPlaying = false;
      return;
    }
    const next = state.filterResults[idx + 1];
    nextSurah = next.surah;
    nextAyah  = next.ayah;
  } else {
    nextSurah = surah;
    nextAyah  = ayah + 1;
    if (nextAyah > SURAH_VERSE_COUNTS[surah - 1]) {
      state.isPlaying = false;
      return;
    }
  }

  const nextCard = document.getElementById(`v${nextSurah}-${nextAyah}`);
  if (nextCard) {
    scrollToVerse(nextSurah, nextAyah);
    playCard(nextCard);
  } else {
    state.isPlaying = false;
  }
});

// Event delegation — play buttons
$verseList.addEventListener('click', e => {
  const btn = e.target.closest('.play-btn');
  if (!btn) return;
  playCard(btn.closest('.verse-card'));
});


// Auto-play toggle
const $autoplayToggle = document.getElementById('autoplay-toggle');
$autoplayToggle.addEventListener('change', () => {
  state.autoPlay = $autoplayToggle.checked;
});

document.getElementById('clear-filter-btn').addEventListener('click', () => {
  closeSearch();
  clearFilter();
});

// ── Initialise ────────────────────────────────────────────────────────────────
applyDark(localStorage.getItem('darkMode') === '1');
applyFontSize(parseFloat(localStorage.getItem('arabicSize')) || FONT_DEFAULT);
populateSurahDropdown();

const _params    = new URLSearchParams(location.search);
const _initSurah = Math.max(1, Math.min(114, parseInt(_params.get('surah'), 10) || 1));
const _initAyah  = parseInt(_params.get('ayah'), 10) || null;

loadSurah(_initSurah).then(() => {
  if (_initAyah) requestAnimationFrame(() => scrollToVerse(_initSurah, _initAyah));
});

// ── Service Worker registration ───────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('../sw.js').catch(() => {});
}
