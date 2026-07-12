# Okyanus: Uyghur Dictionaries
# ئوكيانۇس قامۇسى

This repository contains the source for **Okyanus** (ئوكيانۇس, "Ocean"), a collection of
free, open Uyghur-language dictionaries and reference works published as a static website:

👉 [https://uyghur-language.github.io](https://uyghur-language.github.io/)

The site is a GitHub Pages project. Each dictionary is a self-contained set of static HTML
pages (one page per letter), so the whole thing works with no backend and can be browsed
entirely client-side.

## Dictionaries

The landing page ([index.html](index.html)) links to the following dictionaries. Each lives
in its own folder as a set of per-letter pages (`A.html`, `B.html`, …) plus an `index.html`:

| Folder | Name | Description |
| --- | --- | --- |
| [uyghur/](uyghur/) | ئۇيغۇر تىلى ئىزاھلىق لۇغىتى | Uyghur explanatory (monolingual) dictionary, Arabic script |
| [latin/](latin/) | Uyghur Tili Izahliq Lughiti | The explanatory dictionary in Latin script |
| [names/](names/) | ئۇيغۇر كىشى ئىسىملىرى لۇغىتى | Dictionary of Uyghur personal names |
| [history/](history/) | تارىخ لۇغىتى | History dictionary |
| [english-uyghur/](english-uyghur/) | ئىنگلىزچە-ئۇيغۇرچە لۇغەت | English–Uyghur dictionary |
| [uyghur-synonyms/](uyghur-synonyms/) | ئۇيغۇر تىلىدىكى مەنىداش سۆزلەر | Uyghur synonyms |
| [quran/](quran/) | قۇرئان كەرىم تەرجىمىسى | Uyghur Quran translation app (see below) |

The dictionary HTML pages are generated from source data with
[Racket Scribble](https://docs.racket-lang.org/scribble/) (hence the `scribble-*` CSS/JS
referenced in the pages). Client-side search and audio playback are provided by `search.js`
and `audio_play.js` within each dictionary folder.

## Other assets

- **[audio/](audio/)** — MP3 pronunciations for dictionary entries, organized into
  subfolders by letter (`A/`, `B/`, … `ZH/`). Referenced by the audio play buttons in the
  Uyghur explanatory dictionary.
- **[fonts/](fonts/)** — UKIJ Uyghur fonts (`UKIJBasma.ttf`, `UKIJTuzBB.ttf`, etc.) used to
  render Uyghur Arabic script consistently across browsers.
- **[utils/](utils/)** — helper scripts, e.g. `unescape_unicode.py`.
- **[style.css](style.css)** / **[uyghur-font.css](uyghur-font.css)** — styling and font
  declarations for the landing page.

The landing page is built with Bootstrap 5, Bootstrap Icons, and HTMX, and includes a
light/dark mode toggle.

## Quran app

The [quran/](quran/) folder is a small standalone web app for reading the Uyghur translation
of the Quran. It ships offline surah data under `quran/data/`, uses a service worker
(`quran/sw.js`) for offline access, and can also fetch translations live from the
[quranenc.com](https://quranenc.com) API (see [quran/uyghur_quran_api.md](quran/uyghur_quran_api.md)).

## Related repositories

The dictionary source data lives in separate repositories under the
[uyghur-language](https://github.com/orgs/uyghur-language/repositories) organization,
including the Uyghur explanatory dictionary in JSON format
([uyghur-dictionary](https://github.com/uyghur-language/uyghur-dictionary)),
[english-uyghur](https://github.com/uyghur-language/english-uyghur), and
[uyghur-synonyms](https://github.com/uyghur-language/uyghur-synonyms).

## Contributing & history

- See [CHANGELOG.md](CHANGELOG.md) for the change history (English and Uyghur).
- See [contributors.md](contributors.md) for the list of contributors.

Contributions — corrections, new entries, additional dictionaries, or audio — are welcome
via pull request.
