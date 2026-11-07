# 14. Spreadsheet library research (FEAT-121)

Status: research, decision proposed, needs owner sign-off.
Researched: 2026-11-05. Versions and dates come from `npm view` on that day and from the
pages listed under Sources. Nothing here changes code.

## 1. Question

FEAT-121 imports Excel (`.xlsx`, maybe `.xls`) and CSV files on the server route
`POST /api/import/parse`. Which library or approach should parse them, given untrusted
files, Vercel serverless limits, and the fact that zippp already talks to Google Sheets?

## 2. Recommendation (short)

| Need | Choice | Pin | Install source |
|---|---|---|---|
| `.xlsx` reader | `read-excel-file` | `9.3.14` (exact, no caret) | public npm registry |
| CSV reader | `csv-parse` with its sync API (`csv-parse/sync`) | `7.0.3` (exact) | public npm registry |
| `.xls` (legacy binary) | Not supported in V1. Reject with a "save as .xlsx" message | n/a | n/a |
| Google Drive conversion | Rejected | n/a | n/a |
| SheetJS `xlsx` | Rejected for V1 (see section 4) | n/a | n/a |

Why in one paragraph: `read-excel-file` is MIT, installs from the normal registry so
`npm audit` keeps working, was modified 2026-10-29, reads cached cell values and never
evaluates formulas, and parses XML as a stream. Its gaps (no zip size limits, 1904 date
system and merged cells undocumented, `.xlsx` only) are covered by a mandatory
pre-flight check and by test fixtures, listed below. `csv-parse` is MIT, modified
2026-09-25, and has hard limits (`max_record_size`, `to`) that suit untrusted uploads.
The one thing it lacks, delimiter auto-detection, is a small function we write and test.

Both pins above are exact versions. Re-check them in slice S-I1 before installing.

## 3. Comparison table

| Library | Licence | Latest (2026-11-05) | Last modified | Formats | Security record | Maintenance | Verdict |
|---|---|---|---|---|---|---|---|
| `read-excel-file` | MIT | 9.3.14 | 2026-10-29 | `.xlsx` only; `.xls` throws `XLS_FILE_NOT_SUPPORTED` | No known CVE found in Snyk summary (it does not cover dependencies). No documented size limits | Active, frequent releases | Primary for XLSX |
| SheetJS `xlsx` (npm registry) | Apache-2.0 | 0.18.5 | registry copy is stale | `.xlsx`, `.xls`, `.csv`, many more | 0.18.5 has CVE-2023-30533 (prototype pollution) and CVE-2024-22363 (ReDoS) | Project active, registry copy abandoned | Rejected |
| SheetJS `xlsx` (CDN 0.20.3) | Apache-2.0 | 0.20.3 | n/a | same as above | Patched (fix first shipped in 0.19.3) | Active, but outside npm | Fallback only if `.xls` becomes required |
| ExcelJS | MIT | 4.4.0 | 2024-12-20 | `.xlsx`, `.csv` | Reported issues: prototype pollution, unbounded decompression, path traversal in `addImage` (ReversingLabs, refreshed 2026-10-21; the CVE numbers on that page need independent confirmation) | Snyk rates maintenance Inactive | Rejected |
| `node-xlsx` | Apache-2.0 | 0.24.0 | 2024-04-15 | wraps SheetJS 0.20.2 from the CDN | inherits SheetJS | thin wrapper, slow updates | Rejected (no benefit over SheetJS) |
| `csv-parse` | MIT | 7.0.3 | 2026-09-25 | CSV, any delimiter, streams and sync | `max_record_size`, `to`, `bom`, `encoding` options | Active | Primary for CSV |
| PapaParse | MIT | 5.7.0 | 2026-08-24 | CSV, delimiter auto-detect | docs do not state BOM handling or Node string usage | Active | Fallback for CSV |
| `@fast-csv/parse` | MIT | 5.0.8 | 2026-10-05 | CSV streams | not evaluated further | Active | Not needed |

Licences above are from `npm view` on 2026-11-05. The SheetJS licence also matches the
Apache-2.0 text in its repository LICENSE file.

## 4. SheetJS in detail

- The `xlsx` package on the public npm registry is stuck at 0.18.5, which is affected by
  CVE-2023-30533 (prototype pollution on reading crafted files, CVSS 7.8, fixed in 0.19.3)
  and CVE-2024-22363 (ReDoS).
- SheetJS documents the CDN as the authoritative source, for example
  `npm i --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, and describes the
  stale registry copy as a known registry problem.
- Costs of using the CDN version: `npm audit` and Dependabot do not track it, so we would
  watch advisories by hand; installs depend on a third party host (SheetJS suggests
  vendoring the tarball); one report mentions a certificate error on install in a locked
  down environment.
- Benefit: reads `.xls` and many other formats, and exposes `WBProps.date1904`.
- Decision: not worth the supply chain and audit cost for V1, because V1 does not need
  `.xls`. If `.xls` becomes a requirement (slice S-I6), use the CDN 0.20.3 tarball vendored
  into the repo with a recorded sha512 and a calendar reminder to check advisories.

## 5. The Google Drive option

Idea: upload the file to the user's Drive with conversion to a Google Sheet, then read it
through the Sheets API we already use.

| Question | Finding |
|---|---|
| Scope | Needs `drive.file` at minimum (Google's own Java sample uses it; Node samples use full Drive). We already hold Drive scope for the optional proof feature, so it is technically possible. |
| Where the data lands | A new file in the user's Drive. zippp's rule is that optional photo proof lands in the user's Drive only, and that zippp keeps no receipt ledger. An imported bank statement is more sensitive than a receipt photo. Leaving it in Drive without consent is a privacy regression, and deleting it afterwards needs `drive` write access and can fail. |
| Latency | Upload, conversion, then a Sheets read means three calls and conversion time on Google's side. In-memory parsing takes about 0.1 to 2.5 seconds for 1 to 50 MB according to the read-excel-file project's own table, which is a vendor figure. |
| Size and quotas | Google documents 5 MB as the simple or multipart threshold and resumable uploads above that. Its page did not state a conversion size limit or a quota, so we cannot plan capacity from it. |
| Failure modes | Needs a valid Google grant (FEAT-119 `google-grant`), so a user without the grant could not import at all. Rate limits and consent expiry affect imports. |
| Parsing control | Google decides how dates and numbers are converted, in the sheet's locale. We lose the control we need to follow "never invent values". |

Decision: rejected. In-memory parsing keeps the file out of storage, works without a
Google grant, and keeps parsing rules under our tests.

## 6. Evaluation against the checklist

| Concern | `read-excel-file` 9.3.14 | `csv-parse` 7.0.3 | What zippp must add |
|---|---|---|---|
| Prototype pollution, ReDoS | None known from searches on 2026-11-05. Not audited by us | None known | Row and cell caps, timeout, and keep the library result as plain arrays before mapping |
| Zip bomb | No limits documented. Uses `unzipper-esm` on Node | not applicable | Pre-flight on the zip central directory (section 8) plus route memory and time limits |
| Memory on Vercel | XML is read with a streaming parser (`saxen`) | `max_record_size`, `to` | Vercel gives 2 GB (Hobby) or 4 GB (Pro) memory per function and a 4.5 MB request body limit. Set a smaller `memory` for this route. |
| Request body size | n/a | n/a | Vercel rejects bodies above 4.5 MB with 413, and the limit cannot be changed. Cap import files at 4 MB including multipart overhead, or use direct upload to Blob (a different design, not in V1). Note that `/api/extract` has a 12 MB constant, which Vercel's limit makes unreachable. |
| Bundle size | Not measured. Measure in S-I1 with `next build` output | Not measured | Keep the parse route its own function so the dependency does not enter other routes |
| Maintenance | Modified 2026-10-29 | Modified 2026-09-25 | Pin, review changelog on each bump |
| Licence | MIT | MIT | none |
| Streaming | Yes (XML stream) but we hand it a Buffer | Yes, we use sync | Not needed at a 4 MB cap |
| Excel serial dates | Detects date cells by number format, returns `Date` | n/a | Test fixtures; reject on uncertainty |
| 1904 date system | Not documented in the README | n/a | Pre-flight reads `xl/workbook.xml` for `date1904`; see section 8 |
| Merged cells | Not documented | n/a | Fixture; treat only the top-left cell as filled, others empty, never copy values down |
| Formulas | Reads the cached result, never evaluates. No cached value gives an empty cell | n/a | Never recalculate. A formula without a cached value stays empty |
| Multiple sheets | `readSheet(file, sheet)` by index (from 1) or name; default export reads all | n/a | V1 reads the first non-empty sheet only; later sheets are slice S-I6 |
| Text encoding | n/a (XML is UTF-8) | `encoding`, `bom: true` | We decode CSV bytes ourselves (section 7) |
| Indonesian number formats | `parseNumber` option exists; cell numbers are real numbers | text only | Shared `parseMoney` module (FEAT-121). Never let a library guess `12.500` |

## 7. CSV handling rules (our code, around `csv-parse`)

1. Take the uploaded bytes. If they start with the UTF-8 BOM (EF BB BF), drop it
   (`csv-parse` also offers `bom: true`; do both is harmless).
2. Decode as UTF-8 with fatal errors on. If decoding throws, decode as Windows-1252
   with `TextDecoder("windows-1252")`. Do not guess other encodings. If neither works,
   reject with the unreadable-file message.
3. Sniff the delimiter from the first 5 non-empty lines among comma, semicolon, tab and
   pipe: choose the one with the most consistent non-zero count per line. Ties go to
   semicolon when the decimal comma is present, otherwise comma. This function is ours,
   about 30 lines, with fixtures. Indonesian spreadsheets saved by Excel often use
   semicolons.
4. Call `csv-parse/sync` with: `delimiter` set from the sniff, `bom: true`,
   `relax_quotes: false`, `skip_empty_lines: true`, `relax_column_count: true`,
   `max_record_size` set (proposed 16 KB), `to` set to the row cap plus the header, and
   `columns: false` (we map columns ourselves).
5. Never use `dynamicTyping` style conversion. Every cell stays a string until
   `parseMoney` or the date parser reads it.

PapaParse is the fallback if delimiter sniffing proves hard to maintain. Its docs
describe delimiter guessing from comma, tab, pipe, semicolon and two control characters,
but do not state BOM handling, and its `encoding` option applies to browser file reading,
so we would still decode bytes ourselves.

## 8. Mandatory hardening checklist

All values are Proposed until the owner signs off. Put the numbers in
`src/lib/billing/config.ts`, not in the route.

| # | Control | Value | Where |
|---|---|---|---|
| 1 | Extension and MIME allow list | `.xlsx`, `.csv`, plus `text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. Reject `.xlsm`, `.xlsb`, `.xls`, `.ods` | route |
| 2 | Magic bytes check | `.xlsx` must start with `PK\x03\x04`; CSV must not contain NUL bytes | route |
| 3 | File size cap | 4 MB, matches Vercel's 4.5 MB body limit with margin | route, before parsing |
| 4 | Zip entry count cap | 200 entries | pre-flight |
| 5 | Zip total uncompressed size cap | 50 MB | pre-flight, from the central directory |
| 6 | Zip compression ratio cap | 100 to 1 per entry | pre-flight |
| 7 | Reject macros | any `vbaProject.bin` entry rejects the file, regardless of extension | pre-flight |
| 8 | Reject external links and embedded objects | any `xl/externalLinks/` or `xl/embeddings/` entry rejects the file | pre-flight |
| 9 | Date system | read `xl/workbook.xml`; if `date1904` is true, reject with the unsupported-date message unless fixtures prove the library converts correctly | pre-flight |
| 10 | Sheet cap | read the first non-empty sheet only (V1) | parse |
| 11 | Row cap | 2,000 data rows read; 25 drafts produced per file in V1 | parse |
| 12 | Column cap | 50 columns | parse |
| 13 | Cell length cap | 1,000 characters per cell, longer cells are truncated for display and flagged | map |
| 14 | No formula evaluation | use cached values only; empty if missing | parse |
| 15 | Timeout | route `maxDuration` 10 s and an internal 8 s race | route |
| 16 | Memory | set a small per-function `memory` for the import route in `vercel.json` | config |
| 17 | Plain data only | convert library output to plain arrays of strings, numbers and dates, then drop the library objects | parse |
| 18 | Log hygiene | log only file size, row count, column count, duration, error code. Never cell values or file names | route |
| 19 | Rate limit | per user, value from the FEAT-121 card | route |
| 20 | Auth | bearer or cookie, same resolver as other routes | route |

Limits of the pre-flight: sizes in a zip central directory are declared by the file and
can be false. Controls 15 and 16 are the backstop. They bound damage but do not prevent a
crafted file from using its time and memory budget once. Accept this residual risk, or
move parsing to an isolated worker later.

## 9. Test fixtures (S-I1)

Store small generated files under `src/lib/import/__fixtures__/` (no real user data).

| Fixture | Purpose |
|---|---|
| `plain.xlsx` | one sheet, header row, 5 rows, text and numbers |
| `dates-1900.xlsx`, `dates-1904.xlsx` | same dates in both systems; proves the date system rule |
| `dates-as-text.xlsx` | dates stored as text in `dd/mm/yyyy` and `d-mmm-yy`; must not be reinterpreted wrongly |
| `serial-number-format.xlsx` | date cell with a custom number format |
| `merged-cells.xlsx` | merged header and merged value cells; unknown cells stay empty |
| `formulas.xlsx` | cached values present; plus one file saved without cached values (empty cells expected) |
| `formula-error.xlsx` | `#DIV/0!` and `#REF!` cells read as empty, not as text |
| `two-sheets.xlsx` | first sheet empty, second sheet has data; first non-empty sheet is read |
| `hidden-sheet.xlsx` | hidden sheet is skipped |
| `macro.xlsm`, `renamed-macro.xlsx` | rejected by extension and by `vbaProject.bin` |
| `legacy.xls` | rejected with the save-as-xlsx message |
| `zip-bomb.xlsx` | high ratio and large declared size; rejected by pre-flight |
| `many-entries.xlsx` | above the entry cap |
| `huge-rows.xlsx` | above the row cap; stops at the cap and says so |
| `wide.xlsx` | above the column cap |
| `external-link.xlsx` | rejected |
| `id-numbers.xlsx` | cells like `12.500`, `12,5`, `Rp 1.250.000`, `(25.000)`, `-25.000` stored as text; parsed only by `parseMoney` |
| `bom.csv` | UTF-8 with BOM |
| `semicolon.csv` | semicolon delimiter and decimal commas |
| `tab.csv`, `pipe.csv` | delimiter sniff |
| `cp1252.csv` | Windows-1252 bytes (accented merchant names) |
| `invalid-bytes.csv` | neither decoder works; rejected |
| `quotes.csv` | embedded delimiters, newlines and doubled quotes inside quoted cells |
| `ragged.csv` | rows with fewer and more columns than the header |
| `empty.csv`, `header-only.csv` | clear "no rows" message |
| `formula-injection.csv` | cells starting with `=`, `+`, `-`, `@`; kept as text, never evaluated, and written to the Sheet through the existing `escapeSheetText` |
| `big-record.csv` | one record over `max_record_size`; rejected |
| `prototype.xlsx` | header names such as `__proto__` and `constructor`; the result must not pollute `Object.prototype` |

Each fixture has a test that asserts both the parsed output and the error code. Add a
test that fails if `Object.prototype` gains a key after any import test.

## 10. What needs the owner

1. Approve `read-excel-file` 9.3.14 (MIT) for XLSX and `csv-parse` 7.0.3 (MIT) for CSV.
2. Confirm `.xls` stays out of V1.
3. Confirm the 4 MB file cap, which comes from Vercel's 4.5 MB request limit. A larger cap
   needs direct upload to storage, which is a bigger design.
4. Approve the hardening numbers in section 8.
5. Decide who watches advisories for the two packages (Dependabot on the registry covers
   both, since neither comes from a CDN).

## 11. Open points that research could not settle

- `read-excel-file` documentation says nothing about the 1904 date system or merged cells.
  The fixtures in section 9 decide, and control 9 rejects 1904 files until proven.
- The exact `fflate` and `unzipper-esm` behaviour on malformed zips was not tested here.
  S-I1 must run `zip-bomb.xlsx` and `many-entries.xlsx` against the real route.
- No bundle size was measured. S-I1 records the route's function size from `next build`.
- ExcelJS CVE identifiers came from one aggregator page. They are not relied on, because
  ExcelJS is rejected on maintenance grounds.

## Sources

- SheetJS installation guide, Node.js: https://docs.sheetjs.com/docs/getting-started/installation/nodejs
- SheetJS date handling: https://docs.sheetjs.com/docs/csf/features/dates
- SheetJS licence file: https://raw.githubusercontent.com/SheetJS/sheetjs/master/LICENSE
- CVE-2023-30533 summary: https://www.miggo.io/vulnerability-database/cve/CVE-2023-30533
- CVE-2024-22363 advisory: https://github.com/advisories/GHSA-5pgg-2g8v-p4x9
- Project that moved to the CDN build and recorded the fix: https://github.com/AgentsPilot/neuronforge/pull/499
- SheetJS npm usage review: https://safeguard.sh/resources/blog/npm-xlsx
- ExcelJS on Snyk: https://security.snyk.io/package/npm/exceljs
- ExcelJS on ReversingLabs: https://secure.software/npm/packages/exceljs/vulnerabilities
- read-excel-file README: https://raw.githubusercontent.com/catamphetamine/read-excel-file/master/README.md
- read-excel-file on npm and Snyk: https://www.npmjs.com/package/read-excel-file and https://security.snyk.io/package/npm/read-excel-file
- csv-parse options: https://csv.js.org/parse/options/
- PapaParse documentation: https://www.papaparse.com/docs
- CSV parser comparisons: https://www.pkgpulse.com/guides/papaparse-vs-csv-parse-vs-fast-csv-parsing-2026
- Vercel Functions limits: https://vercel.com/docs/functions/limitations
- Google Drive uploads and conversion: https://developers.google.com/drive/api/guides/manage-uploads
- Package metadata: `npm view <name> version license time.modified dependencies`, run 2026-11-05.
