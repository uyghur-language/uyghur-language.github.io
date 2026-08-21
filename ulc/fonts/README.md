# Bundled Uyghur fonts

Four UKIJ families in regular and bold, self-hosted so both the interface and
the font picker work for every visitor rather than only for people who have
the desktop fonts installed.

| Family | Regular | Bold |
| --- | --- | --- |
| UKIJ Tuz Basma | `UKIJTuzBasma.woff2` 33 KB | `UKIJTuzBasmaBold.woff2` 33 KB |
| UKIJ Tuz Kitab | `UKIJTuzKitab.woff2` 33 KB | `UKIJTuzKitabBold.woff2` 36 KB |
| UKIJ Basma Qara | `UKIJBasmaQara.woff2` 22 KB | `UKIJBasmaQaraBold.woff2` 20 KB |
| UKIJ Tuz Gezit | `UKIJTuzGezit.woff2` 33 KB | `UKIJTuzGezitBold.woff2` 32 KB |

241 KB in total, but a visitor only ever downloads the face they are using.
Both weights ship for each family because the selected face sets the interface
as well as the Uyghur text, and the UI has 600-weight labels; without a real
bold the browser would synthesize one.

Only Tuz Basma, the default, is preloaded. There is no `local()` on any face:
the page should render the same for everyone rather than shifting for whoever
has the desktop fonts, and the installed originals differ from these subsets
at `U+2192` (below).

## Attribution

Created by the **Uyghur Computer Science Association** (UKIJ,
<http://www.ukij.org>), designed by Tursunjan Sultan. The embedded copyright
notice reads "Free distributed and all rights reserved"; the OpenType
embedding permission bits are *Installable* (`fsType` 0) for Tuz Basma, Tuz
Kitab and Tuz Gezit, and *Editable* (`fsType` 8, marked LGPL) for Basma
Qara — all of which permit web embedding.

These fonts are **not** covered by this repository's Apache 2.0 LICENSE,
which applies to the converter's own code.

## How these were produced

Converted from the original TrueType releases with `fontTools`: subset to the
ranges the page can display, then compressed to WOFF2.

```
pyftsubset UKIJTuzB.ttf \
  --unicodes=U+0020-00FF,U+0131,U+0152-0153,U+02BB-02BC,\
U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF,\
U+2000-206F,U+2190-2191,U+2193-21FF,U+2700-27BF,U+2C60-2C7F \
  --layout-features='*' --no-hinting --desubroutinize \
  --flavor=woff2 --output-file=UKIJTuzBasma.woff2
```

Three details in that command are load-bearing:

- **`--layout-features='*'`** keeps the GSUB tables that drive Arabic
  joining. Drop them and every word falls apart into isolated letters.
- **The Arabic presentation-form ranges** (`FB50-FDFF`, `FE70-FEFF`) are kept
  for the same reason — these are 2004-era fonts that map contextual forms
  through cmap.
- **`U+2192` is deliberately omitted**, which is why the arrows range is split
  into `2190-2191` and `2193-21FF`. In Tuz Basma the glyph named `arrowright`
  is drawn as an O-with-dieresis (54 outline points, where Tuz Kitab and Tuz
  Gezit have 17), so `Latin → ئۇيغۇرچە` rendered as `Latin ö ئۇيغۇرچە`. The
  outline is wrong in the original font, not in the subset. Leaving the
  codepoint out lets it fall through to the system font, which draws a real
  arrow. `U+2194` (↔, used in the subtitle) is fine and is kept.

One thing to know rather than fix: these families draw `U+2014` (em dash) at
baseline height, where it reads as an underscore. The interface copy avoids em
dashes for that reason.

Dropping the unused Cyrillic and symbol coverage roughly halves each file.
Output was verified pixel-identical to the originals: the same Uyghur and
Latin strings, plus the symbols the interface draws, rendered in both the full
and subset builds and compared — 48 width comparisons across all eight faces
and a full-page pixel diff, zero differences.
