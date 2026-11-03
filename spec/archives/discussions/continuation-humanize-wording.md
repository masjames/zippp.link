# Continuation: humanize all wording, then revise the app copy

Repo: `github.com/masjames/zippp.link` · Source of truth: `spec/wording.txt`

This is a handoff. Start on a machine with a clean git tree.

## Goal

Humanize every user-visible string so the copy does not read as AI-generated,
then let that humanized text be the revised app wording. All 788 keys (394
entries, EN + ID) live in `spec/wording.txt`. The app reads the values at
runtime (`src/lib/content.ts`), so changing values changes the UI with no code
change.

## Status

Not done. `spec/wording.txt` is unchanged. The first attempt ran the humanizer
with concurrency 3 and hit HTTP 429 rate limits on roughly half the calls; it
was aborted. Run it sequentially.

## How it works

The `humanize` skill uses the free DiaIQ humanizer (no auth):

```
POST https://humanizer.diaiq.com/api/humanize
{ "text": "...", "passes": 1 }
-> { "text": "...", "original_words": n, "humanized_words": n, "passes": 1 }
```

English prose rewrites well. Indonesian comes back usable but mixed (the hero
line became "...selalu diseting ulang", which is worse than the original), so
review the ID diff before shipping it.

## Run it

A ready script is committed: `scripts/humanize-wording.mjs`.

```
node scripts/humanize-wording.mjs          # passes=1, minWords=3, delayMs=250
node scripts/humanize-wording.mjs 2        # two passes
```

It edits `spec/wording.txt` in place. Then:

```
git diff spec/wording.txt        # read it, both languages
npx tsc --noEmit
npm run build
```

The script is sequential with a 250ms delay and retries (429 gets extra
backoff). It keeps keys and spacing and validates every output:

- drops any output that loses a `{placeholder}`, adds an em dash, loses the
  `zippp` brand, or drifts too far in length; those keep the original value
- skips values shorter than `minWords` (labels, buttons)
- skips multi-line values (the legal page bodies with `#` headings and `-`
  lists) so their formatting is not broken
- fixes one existing bug: a stray `# --- Revision 2 ---` marker is currently
  glued to `app.check.datePlaceholder.id`; the script resets that value to
  `dd/mm/yyyy`

If a run stops early, restore from git and start again; the script writes only
once, at the end.

## Open decisions

1. Passes: 1 is enough; 2-3 rewrite harder. The script defaults to 1.
2. Multi-line legal bodies (7 entries) and the contact bodies are skipped. If
   you want them humanized, do it per paragraph and keep the `#` and `-`
   markers.
3. Short labels are left as is. The API returns 1-2 word inputs unchanged, so
   there is nothing to gain.
4. After the first pass, read the ID diff. Fix any awkward lines by hand.

## Also pending (separate doc)

`spec/discussions/continuation-vercel-doku.md`: set the DOKU env on the Vercel
project `masjames-projects/zippp-link` and use the correct DOKU Checkout
Client-Id (the current sandbox `doku_key_sandbox_*` is rejected as
`invalid_client_id`).

## Repo rules (AGENTS.md)

Specs are the source of truth; update the owning spec in the same change. All
user-visible strings live in `spec/wording.txt` (AGENTS.md still says
`wording.md`; fix that when convenient). No em dashes. No secrets in git, no
`NEXT_PUBLIC` for secrets. Run `npm run build` and `npx tsc --noEmit` before
done. One task at a time.
