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

document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('audioPlayer')) {
        setupLetterPageSearch();
    } else {
        setupMainPageSearch();
    }
});

// --- Main page (index.html): navigate to the right letter page on Enter ---

function setupMainPageSearch() {
    const alphabetTable = document.querySelector('table.boxed');
    if (!alphabetTable) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'search-container';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'dict-search';
    input.setAttribute('dir', 'rtl');
    input.setAttribute('placeholder', ' ئىزدەش...');

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

    // Make alphabet rows clickable
    Array.from(alphabetTable.querySelectorAll('tr')).slice(1).forEach(row => {
        const link = row.querySelector('a');
        if (!link) return;
        row.classList.add('clickable-row');
        row.addEventListener('click', () => { window.location.href = link.href; });
    });

    input.focus();
}

// --- Letter pages (A.html etc.): filter both tables as you type ---

function setupLetterPageSearch() {
    const boxedTables = document.querySelectorAll('table.boxed');
    if (boxedTables.length < 2) return;

    const wordTable = boxedTables[0];
    const dictTable = boxedTables[1];

    const wrapper = document.createElement('p');
    wrapper.id = 'search-container';
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'dict-search';
    input.setAttribute('dir', 'rtl');
    input.setAttribute('placeholder', ' ئىزدەش...');
    wrapper.appendChild(input);
    wordTable.parentNode.insertBefore(wrapper, wordTable);

    // Group dict table rows into per-word entries.
    // A new entry starts on any row containing a nested .Larger span (the word heading).
    const allDictRows = Array.from(dictTable.querySelectorAll('tr'));
    const headerRow = allDictRows[0];
    const entries = [];
    let current = null;

    for (let i = 1; i < allDictRows.length; i++) {
        const row = allDictRows[i];
        if (row.querySelector('.Larger .Larger')) {
            if (current) entries.push(current);
            current = { word: row.textContent.trim(), rows: [row] };
        } else if (current) {
            current.rows.push(row);
        }
    }
    if (current) entries.push(current);

    const wordRows = Array.from(wordTable.querySelectorAll('tr'));

    function applyFilter(q) {
        if (!q) {
            wordRows.forEach(r => (r.style.display = ''));
            allDictRows.forEach(r => (r.style.display = ''));
            return;
        }
        wordRows.forEach(r => (r.style.display = r.textContent.includes(q) ? '' : 'none'));
        headerRow.style.display = '';
        entries.forEach(e => {
            const show = e.word.includes(q);
            e.rows.forEach(r => (r.style.display = show ? '' : 'none'));
        });
    }

    input.addEventListener('input', () => applyFilter(input.value.trim()));
    input.addEventListener('keydown', e => {
        if (e.key === 'Escape') { input.value = ''; applyFilter(''); }
    });

    const preload = new URLSearchParams(window.location.search).get('q');
    if (preload) {
        input.value = preload;
        applyFilter(preload);
        const first = wordTable.querySelector('tr:not([style*="none"])');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}
