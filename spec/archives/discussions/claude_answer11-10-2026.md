# zippp: review of the overview, next steps, and detail on steps 3, 4, 5

Date: 11 October 2026
Source: `zippp-overview.md`, cross-checked against `SPEC.md`, `ARCHITECTURE.md`, `REVISION-1.md`, `README.md`.

---

## Part 1. Discussion of zippp-overview

The design holds together well. "Wrong and unflagged" is the right north-star metric, the hot path is deterministic, and the framework answer is sound. My concerns are mostly about where the verifier's guarantee is weaker than the doc implies.

### The verifier

Grounding checks that a value appears somewhere in the OCR tokens. That catches model hallucination, but not OCR misreads. If PP-OCR reads 18.000 as 15.000, the value is grounded and the arithmetic is internally consistent, so nothing flags it. Most wrong-and-unflagged cases will likely come from there, plus coincidental grounding, where small numbers like qty "1" or "2" and round prices exist somewhere on almost any receipt. The row-source check helps, but it only flags and the value is kept. The 0.8 score threshold is the main defense against misreads, so it is the first thing to tune on real data.

Flag-and-keep on arithmetic failures is the right call. A printed total is not a hallucination, and nulling it forces a retype.

### Open question 3: flag noise

Requiring a tap on every flagged field risks rubber-stamping. After a week, staff tap through without looking and the flags become theater. Split flags into hard ones (`not_in_ocr`, arithmetic) that require real attention, and soft ones (`low_confidence` on a single token) that are shown but do not gate Accept. Then track the fraction of cards needing any tap, with a target like under a third, and treat anything above that as a verifier bug.

### Open question 5: the hedge

If vision wins the race before OCR returns, there is no OCR text yet, so the result is flagged `ungrounded` on every field. That spikes flags exactly when the user is already waiting. Two possible fixes: let the OCR call keep running and verify the vision result when it arrives (late-binding grounding), or keep the function warm so cold starts rarely hit. First check how often the hedge fires in the logs.

### Where the dataset pays off

Labels can come mostly for free. At Accept, the diff between the extracted receipt and the user's edited draft is a field-level correction. Logging only those diffs, with no images, gives a production estimate of how often the read is wrong, with no extra labeling work. The caveat is that unedited-but-wrong values are invisible, so it complements the golden set rather than replacing it.

The bigger gap is that the golden set is synthetic placeholders and the paid comparison has not been run. That blocks open question 1 (the production default). Do that before the dataset page, which is just a table. Collect 30 to 50 real notas and include the ugly ones: handwritten, carbon copy, faded thermal paper. Indonesian warung notas are often handwritten, and PP-OCR will likely struggle there while vision models may win, which would make per-receipt-type routing worth building.

### Inconsistencies between the docs

- `SPEC.md` says the image goes to memory, then extract, then append, then drop. `REVISION-1.md` persists image blobs in IndexedDB. That is on-device, so probably fine, but the spec should say so.
- `SPEC.md` says no free tier is used for client work, while the overview says PP-OCRv6 runs inside a free daily quota. The 20,000 pages per day cap is also a scaling cliff to plan for.
- Sending customer receipt images to Baidu AI Studio and text to DeepSeek is a real privacy disclosure for business owners. Surface it plainly in the product, not only in the spec.
- If customer photos are ever kept for a shared golden set, that conflicts with the drop-the-image stance and needs explicit consent. Keep the golden set to your own and consenting testers' receipts, and use per-customer data only as a tuning holdout.
- `ARCHITECTURE.md` still mentions the Check screen, which `REVISION-1.md` removed.

### Frameworks (ADK, LangChain, LangGraph)

Agree with the overview's recommendation. A graph framework solves orchestration problems that do not exist here, and it costs cold-start time and bundle size where users are waiting. If routing becomes real, a small typed state machine in TypeScript will carry a long way, and QStash covers durable batch work.

---

## Part 2. What to do now

1. **Build a real golden set (this week).** Collect 30 to 50 actual notas from your own use and from consenting testers, including handwritten, carbon copy, and faded thermal. Label them by tapping the best method in `/admin/eval`, and add expected values only for totals. Everything else depends on this, and it is the cheapest step.

2. **Run the paid four-method comparison once on that set.** This answers open question 1 and tells you whether handwritten receipts need routing. Watch two numbers: wrong-and-unflagged per method, and the share of cards that need a tap.

3. **Add field-level diff logging at Accept.** Log what the extraction said versus what the user submitted, with no images. It is a small change and gives a production error signal from day one.

4. **Check the hedge in the logs.** Count how often it fires and how often vision wins before OCR returns. If frequent, implement late-binding verification. If rare, leave it alone.

5. **Tier the flags after you see real flag rates.** Split hard flags that gate Accept from soft ones that only display. Do not decide thresholds until step 2 gives data, since the 0.8 cutoff is currently a guess.

6. **Clean up the docs.** Reconcile the image-retention wording in `SPEC.md`, the free-quota statement, and the stale Check screen reference in `ARCHITECTURE.md`. Add a plain privacy disclosure about Baidu and DeepSeek to the product copy in `wording.md`.

**Defer:** the dataset page, framework experiments, Axiom, and code generation from lessons. None of them move the wrong-and-unflagged number until steps 1 and 2 are done.

---

## Part 3. Steps 3, 4, 5 in detail

Step 3 comes first because step 5 depends on its data.

### Step 3: Log what users change at Accept

**The idea.** Every card holds two versions of the receipt: what zippp extracted (`receipt`) and what the user finally approved (`draft`). The difference between them is a free correction label, collected without anyone doing extra work.

**What to record.** When the user taps Accept, compare the two versions field by field and send one small record to the server. For each field, store:

- the field name (merchant, date, total, or line item N's description, qty, amount)
- whether the user changed it
- whether it was flagged, and which flag types
- the run id, so you can link it to the existing `extract.run` log line, which already knows which method produced the read

No images, and ideally no raw values. Edited-or-not plus flag types is enough to answer the main questions, and it avoids storing customers' business data.

**What it tells you.** Every field lands in one of four boxes:

| | Flagged | Not flagged |
|---|---|---|
| **User edited it** | The system worked | **Wrong and unflagged** (the north-star number) |
| **User left it** | Verifier was too noisy | Probably correct |

The top right box is the number you want at zero. The bottom left box tells you how noisy the verifier is.

**Things to get right.**

- Normalize before comparing. `15.000` versus `15000` is not a correction, so compare parsed numbers and trimmed text.
- Line items can be added, deleted, or reordered. Match by position, and record "item count changed" as its own event.
- An assumed date (the client fills the capture date) is not an extraction error, so exclude it.
- It misses errors the user did not notice. Treat it as a lower bound on wrongness, and keep the golden set as the ground truth.

### Step 4: Check whether the hedge hurts you

**What the hedge does today.** If PaddleOCR has not answered after 5 seconds, the vision method starts in parallel, and the first result that passes the verifier wins. This exists because OCR cold starts sometimes exceed the 10-second production timeout.

**The possible problem.** The verifier grounds values in OCR text. If vision wins, OCR may not have finished, so there is no text to ground against, and a result with no OCR is flagged `ungrounded` on every field. So the slow runs, where the user is already waiting, may also produce the most flagged cards. One thing to confirm in the code: does an all-ungrounded vision result count as "passing the verifier" in the race? If not, the hedge may rarely win at all, which is also worth knowing.

**First, measure.** Do not build anything yet. Make sure each `extract.run` log line records:

- whether the hedge fired
- which leg won
- how long OCR took if it finished anyway (this may not be captured today, since the function returns once a winner exists)

Then answer three questions from a week of real use: how often does the hedge fire, how often does vision win, and are those cards flagged much more than normal ones? As a rough guide, if vision wins on a small share of runs (a few percent), leave it alone. If it is something like 15% or more, act. Those cutoffs are rough starting points, not rules.

**If you need to act, in order of effort.**

1. **Keep OCR warm.** The cold start is on the Baidu side, so a tiny scheduled ping (GitHub Actions or an Upstash QStash schedule, since Vercel's hobby plan limits cron) may remove the cause. It uses a small slice of the 20,000 pages per day.
2. **Late verification.** Let OCR keep running after vision wins, then re-ground the vision result when OCR arrives and update the card's flags. It is more work and needs the client to receive a second update.
3. **Accept it.** If slow runs are rare, extra flags on them are an acceptable price.

### Step 5: Tier the flags

**Today.** Every flagged field gets an amber border, and Accept stays disabled until each one is tapped. The risk is that most cards need several taps, people start tapping without reading, and the flags stop meaning anything.

**The change.** Split flags into two tiers:

- **Hard** (must be tapped before Accept): `not_in_ocr`, arithmetic mismatch, `ungrounded`. These mean the value is missing, unsupported, or the numbers do not add up.
- **Soft** (shown in amber, but do not block Accept): `low_confidence` on a single token, and `row_mismatch` when the value is grounded elsewhere.

**Why it waits for data.** Those groupings are a first guess. Step 3 lets you check them properly:

- **Per flag type, how often was the field actually edited?** If a flag leads to an edit often (say over 30% of the time), keep it hard. If it almost never does (under roughly 10%), make it soft or remove it. Again, rough starting points.
- **Tune the 0.8 score cutoff.** Group fields by OCR score and see at which score users start editing. If many edited fields were unflagged with scores of 0.8 to 0.9, the cutoff is too low. If almost nothing below 0.9 gets edited, it may be too strict.
- **Track one health number:** the share of cards that need any tap. If it creeps toward half, treat it as a verifier bug.

**The order matters.** Step 3 gives the data, step 4 tells you whether slow vision reads are polluting that data, and step 5 is where you use it. Doing step 5 early means tuning on a guess.
