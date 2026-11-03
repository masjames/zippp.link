# Grooming thread: FEAT-102

## user 2026-10-23T12:15:35Z

Groom this card. Ask me the open decisions one at a time.

## assistant 2026-10-23T12:15:37Z

First open decision: for the "hard flags block Terima" criterion, what counts as an explicit acknowledgement — a checkbox the staff taps, or a typed reason?

## user 2026-10-23T12:15:54Z

what the hell is that . speak eloquently

## assistant 2026-10-23T12:15:56Z

My apologies for the clumsy phrasing. Let me put it plainly.

When a hard flag appears on a receipt, the staff member must do something before they can tap Terima. The question is what that something should be: a simple checkbox they tick, or a short typed reason explaining the fix.

Which would you prefer?

## user 2026-10-23T12:18:14Z

still dont understand

## assistant 2026-10-23T12:18:16Z

Let me try again, simpler.

Sometimes the app spots a problem on a receipt — say a missing date. It won't let staff tap **Terima** until they deal with it. There are two ways to deal with it:

1. **Tick a box** — one tap, no typing.
2. **Type a short reason** — they explain what they fixed.

Which one do you want?

## user 2026-10-23T12:18:38Z

tick a box

## assistant 2026-10-23T12:18:39Z

DECISION: Hard flags are cleared by ticking a checkbox, not by typing a reason.

Next question: when a hard flag is cleared by ticking the box, should the app still send that acknowledgement to `/api/corrections` as part of the telemetry, or is the checkbox purely local?

## decision 2026-10-23T12:18:39Z

Hard flags are cleared by ticking a checkbox, not by typing a reason.

