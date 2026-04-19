const PAGE_SIZE = 200;
const STORAGE_KEY = 'uyghur-synonyms-search-mode';

const LETTER_ORDER = ['A','E','B','P','T','J','C','X','D','R','Z','ZH','S','SH','GH','F','Q','K','G','NG','L','M','N','H','O','U','OE','UE','W','EE','I','Y'];
const LETTER_LABELS = {A:'ئا',E:'ئە',B:'ب',P:'پ',T:'ت',J:'ج',C:'چ',X:'خ',D:'د',R:'ر',Z:'ز',ZH:'ژ',S:'س',SH:'ش',GH:'غ',F:'ف',Q:'ق',K:'ك',G:'گ',NG:'ڭ',L:'ل',M:'م',N:'ن',H:'ھ',O:'ئو',U:'ئۇ',OE:'ئۆ',UE:'ئۈ',W:'ۋ',EE:'ئې',I:'ئى',Y:'ي'};

// Maps first one or two Uyghur characters to their letter-page filename.
// Vowel letters all start with ئ (U+0626), so we check two chars first.
const CHAR_TO_PAGE = {
    '\u0626\u0627': 'A',    // ئا
    '\u0626\u06D5': 'E',    // ئە
    '\u0626\u0648': 'O',    // ئو
    '\u0626\u06C7': 'U',    // ئۇ
    '\u0626\u06C6': 'OE',   // ئۆ
    '\u0626\u06C8': 'UE',   // ئۈ
    '\u0626\u06D0': 'EE',   // ئې
    '\u0626\u06CC': 'I',    // ئى
    '\u0626\u0649': 'I',    // ئى (alt codepoint)
    '\u0628': 'B',   // ب
    '\u067E': 'P',   // پ
    '\u062A': 'T',   // ت
    '\u062C': 'J',   // ج
    '\u0686': 'C',   // چ
    '\u062E': 'X',   // خ
    '\u062F': 'D',   // د
    '\u0631': 'R',   // ر
    '\u0632': 'Z',   // ز
    '\u0698': 'ZH',  // ژ
    '\u0633': 'S',   // س
    '\u0634': 'SH',  // ش
    '\u063A': 'GH',  // غ
    '\u0641': 'F',   // ف
    '\u0642': 'Q',   // ق
    '\u0643': 'K',   // ك
    '\u06A9': 'K',   // ک (alt)
    '\u06AF': 'G',   // گ
    '\u06AD': 'NG',  // ڭ
    '\u0644': 'L',   // ل
    '\u0645': 'M',   // م
    '\u0646': 'N',   // ن
    '\u06BE': 'H',   // ھ
    '\u06CB': 'W',   // ۋ
    '\u064A': 'Y',   // ي
};

function getLetterPage(word) {
    if (!word) return null;
    return CHAR_TO_PAGE[word.slice(0, 2)] || CHAR_TO_PAGE[word[0]] || null;
}

// Fold visually identical Uyghur codepoint variants to a canonical form.
// U+0649 (ALEF MAKSURA) and U+06CC (FARSI YEH) both render as ى in Uyghur.
// U+0643 (KAF) and U+06A9 (KEHEH) both render as ك.
function normalize(s) {
    return s.replace(/\u0649/g, '\u06CC').replace(/\u06A9/g, '\u0643');
}

// Build a regex that matches both codepoint variants of each character.
function buildSearchRegex(q) {
    const pattern = [...q].map(c => {
        if ('\u06CC\u0649'.includes(c)) return '[\u06CC\u0649]';
        if ('\u0643\u06A9'.includes(c))  return '[\u0643\u06A9]';
        return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');
    return new RegExp(pattern, 'g');
}

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

document.addEventListener('DOMContentLoaded', function () {
    const table = document.querySelector('table.boxed');
    if (!table) return;
    // Letter pages have 2-column rows (word + synonyms); main page has 1-column rows.
    const firstDataRow = table.querySelector('tr:nth-child(2)');
    const cols = firstDataRow ? firstDataRow.querySelectorAll('td').length : 0;
    if (cols >= 2) {
        setupLetterPageSearch();
    } else {
        setupMainPageSearch();
    }
});

// --- Main page: navigate to the right letter page on Enter ---

function setupMainPageSearch() {
    const alphabetTable = document.querySelector('table.boxed');
    if (!alphabetTable) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'search-container';

    const input = document.createElement('input');
    input.type = 'search';
    input.id = 'dict-search';
    input.setAttribute('dir', 'rtl');
    input.setAttribute('placeholder', ' ئىزدەش...');
    input.setAttribute('aria-label', 'ئىزدەش');

    const btn = document.createElement('button');
    btn.id = 'search-btn';
    btn.textContent = 'ئىزدە';

    const hint = document.createElement('span');
    hint.id = 'search-hint';

    wrapper.appendChild(input);
    wrapper.appendChild(btn);
    wrapper.appendChild(hint);
    alphabetTable.parentNode.insertBefore(wrapper, alphabetTable);

    function navigate() {
        const word = input.value.trim();
        const page = getLetterPage(word);
        if (page) {
            input.classList.remove('search-error');
            window.location.href = page + '.html?q=' + encodeURIComponent(word);
        } else {
            input.classList.add('search-error');
            hint.textContent = word ? 'تېپىلمىدى' : '';
            hint.className = word ? 'hint-notfound' : '';
        }
    }

    input.addEventListener('input', function () {
        input.classList.remove('search-error');
        const word = this.value.trim();
        const page = getLetterPage(word);
        if (word && page) {
            hint.textContent = '⟹ ' + page;
            hint.className = 'hint-found';
        } else if (word) {
            hint.textContent = 'تېپىلمىدى';
            hint.className = 'hint-notfound';
        } else {
            hint.textContent = '';
            hint.className = '';
        }
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') navigate();
        if (e.key === 'Escape') {
            input.value = '';
            input.classList.remove('search-error');
            hint.textContent = '';
            hint.className = '';
        }
    });

    btn.addEventListener('click', navigate);

    Array.from(alphabetTable.querySelectorAll('tr')).slice(1).forEach(row => {
        const link = row.querySelector('a');
        if (!link) return;
        row.classList.add('clickable-row');
        row.addEventListener('click', () => { window.location.href = link.href; });
    });

    document.addEventListener('keydown', e => {
        if (e.key === '/' && document.activeElement !== input) {
            e.preventDefault();
            input.focus();
        }
    });

    input.focus();
}

// --- Letter pages: filter, highlight, paginate, navigate ---

function setupLetterPageSearch() {
    const wordTable = document.querySelector('table.boxed');
    if (!wordTable) return;

    // Build search UI
    const wrapper = document.createElement('div');
    wrapper.id = 'search-container';

    const input = document.createElement('input');
    input.type = 'search';
    input.id = 'dict-search';
    input.setAttribute('dir', 'rtl');
    input.setAttribute('placeholder', ' ئىزدەش...');
    input.setAttribute('aria-label', 'ئىزدەش');

    // Toggle cycles: all → word-only → synonym-only → all
    const modeBtn = document.createElement('button');
    modeBtn.id = 'search-mode-btn';
    modeBtn.title = 'ئىزدەش ئۇسۇلى: ھەممە / سۆز / مەنىداش';

    const countEl = document.createElement('span');
    countEl.id = 'search-count';
    countEl.setAttribute('dir', 'rtl');
    countEl.setAttribute('aria-live', 'polite');
    countEl.setAttribute('aria-atomic', 'true');

    wrapper.appendChild(input);
    wrapper.appendChild(modeBtn);
    wrapper.appendChild(countEl);
    wordTable.parentNode.insertBefore(wrapper, wordTable);

    // Prev/next letter navigation inserted above the search bar
    setupLetterNav(wrapper);

    const paginationEl = document.createElement('div');
    paginationEl.id = 'pagination';
    wordTable.after(paginationEl);

    // Snapshot original cell HTML and precompute normalized text for fast filtering
    const dataRows = Array.from(wordTable.querySelectorAll('tr')).slice(1);
    dataRows.forEach(row => {
        const tds = row.querySelectorAll('td');
        tds.forEach(td => { td.dataset.orig = td.innerHTML; });
        row.dataset.normSyn  = tds[0] ? normalize(tds[0].textContent) : '';
        row.dataset.normWord = tds[1] ? normalize(tds[1].textContent) : '';
    });

    // Empty-results row, shown only when nothing matches
    const noResultsRow = wordTable.insertRow(-1);
    noResultsRow.id = 'no-results-row';
    noResultsRow.style.display = 'none';
    const noResultsTd = noResultsRow.insertCell(0);
    noResultsTd.colSpan = 2;
    noResultsTd.setAttribute('dir', 'rtl');
    noResultsTd.textContent = 'نەتىجە تېپىلمىدى';

    // Search mode persisted in localStorage
    const MODES = ['all', 'word', 'synonym'];
    const LABELS = { all: 'ھەممە', word: 'سۆز', synonym: 'مەنىداش' };
    let mode = localStorage.getItem(STORAGE_KEY) || 'all';
    if (!MODES.includes(mode)) mode = 'all';
    modeBtn.textContent = LABELS[mode];

    modeBtn.addEventListener('click', () => {
        mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
        modeBtn.textContent = LABELS[mode];
        localStorage.setItem(STORAGE_KEY, mode);
        applyFilter(input.value.trim());
    });

    let filteredRows = dataRows.slice();
    let highlightedRows = new Set();
    let currentPage = 1;

    function applyFilter(q) {
        const nq = normalize(q);

        // Restore only rows that were previously highlighted
        highlightedRows.forEach(row => {
            row.querySelectorAll('td').forEach(td => { td.innerHTML = td.dataset.orig; });
        });
        highlightedRows.clear();

        // Use precomputed normalized strings — no per-keystroke normalize() calls
        filteredRows = dataRows.filter(row => {
            if (!nq) return true;
            if (mode === 'word')    return row.dataset.normWord.includes(nq);
            if (mode === 'synonym') return row.dataset.normSyn.includes(nq);
            return row.dataset.normWord.includes(nq) || row.dataset.normSyn.includes(nq);
        });

        if (q) {
            const re = buildSearchRegex(q);
            filteredRows.forEach(row => {
                row.querySelectorAll('td').forEach((td, i) => {
                    if (mode === 'word'    && i !== 1) return;
                    if (mode === 'synonym' && i !== 0) return;
                    td.innerHTML = td.dataset.orig.replace(re, m => `<mark>${m}</mark>`);
                });
                highlightedRows.add(row);
            });
        }

        countEl.textContent = q ? filteredRows.length + ' نەتىجە' : '';
        currentPage = 1;
        renderPage();
        history.replaceState(null, '', q
            ? window.location.pathname + '?q=' + encodeURIComponent(q)
            : window.location.pathname);
    }

    function renderPage() {
        const start = (currentPage - 1) * PAGE_SIZE;
        const visible = new Set(filteredRows.slice(start, start + PAGE_SIZE));
        dataRows.forEach(r => { r.style.display = visible.has(r) ? '' : 'none'; });
        noResultsRow.style.display = filteredRows.length === 0 ? '' : 'none';
        renderPagination();
    }

    function renderPagination() {
        paginationEl.innerHTML = '';
        const total = Math.ceil(filteredRows.length / PAGE_SIZE);
        if (total <= 1) return;

        function mkBtn(label, disabled, onClick) {
            const b = document.createElement('button');
            b.className = 'page-btn';
            b.textContent = label;
            b.disabled = disabled;
            if (!disabled) b.addEventListener('click', () => {
                onClick();
                wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            return b;
        }

        const info = document.createElement('span');
        info.textContent = currentPage + ' / ' + total;

        paginationEl.appendChild(mkBtn('◀', currentPage === 1,    () => { currentPage--; renderPage(); }));
        paginationEl.appendChild(info);
        paginationEl.appendChild(mkBtn('▶', currentPage === total, () => { currentPage++; renderPage(); }));
    }

    input.addEventListener('input', debounce(() => applyFilter(input.value.trim()), 150));
    input.addEventListener('keydown', e => {
        if (e.key === 'Escape') { input.value = ''; applyFilter(''); }
    });

    document.addEventListener('keydown', e => {
        if (e.key === '/' && document.activeElement !== input) {
            e.preventDefault();
            input.focus();
        }
    });

    const preload = new URLSearchParams(window.location.search).get('q');
    if (preload) {
        input.value = preload;
        applyFilter(preload);
        if (filteredRows[0]) filteredRows[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        applyFilter('');
        input.focus();
    }
}

// Insert prev/next letter links above the search container
function setupLetterNav(searchWrapper) {
    const match = window.location.pathname.match(/\/([A-Za-z]+)\.html$/);
    if (!match) return;
    const current = match[1].toUpperCase();
    const idx = LETTER_ORDER.indexOf(current);
    if (idx === -1) return;

    const nav = document.createElement('div');
    nav.id = 'letter-nav';

    function navLink(letter, label) {
        const a = document.createElement('a');
        a.href = letter + '.html';
        a.className = 'letter-nav-link';
        a.textContent = label;
        return a;
    }

    if (idx > 0) {
        const prev = LETTER_ORDER[idx - 1];
        nav.appendChild(navLink(prev, '◀ ' + LETTER_LABELS[prev]));
    } else {
        nav.appendChild(document.createElement('span'));
    }

    if (idx < LETTER_ORDER.length - 1) {
        const next = LETTER_ORDER[idx + 1];
        nav.appendChild(navLink(next, LETTER_LABELS[next] + ' ▶'));
    }

    searchWrapper.parentNode.insertBefore(nav, searchWrapper);
}
