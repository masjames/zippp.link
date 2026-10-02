# zippp pricing (Lili's list, 24 Sep 2026)

Council sat. Lili wrote the books. One pack. Same SKU in two currencies (~Rp 17.900 / USD).

## The list you send

|| | **Prepaid pack** |
|---|---|---|
| **USD** | **$29** |
| **IDR** | **Rp 499.000** |
| Documents | 20 receipts / invoices |
| Extra | buy the pack again |
| CSV / JSON | included |
| Their Google Sheet | included (we paste) |
| Setup / install fee | no |
| Monthly | no, until they buy again |
| Login / OAuth | no (manual paste for now; Google OAuth is Phase 1, see `SPEC.md`) |
| We parse | after the transfer lands |

No free twenty. Airparser can give that away because it is already an app.

## Privacy

Client receipts are processed by two services: the photo goes to **Baidu AI Studio (PaddleOCR-VL)** for OCR, and the extracted text goes to **DeepSeek** for structuring. **Google Gemini** is used only as a fallback if that pipeline fails. No free tier is used for client work. Tell them. (See `COGS.md`.)

## What the room wanted (not the quote)

|| Voice | Their number | Lili |
|---|---|---|---|
| Carnegie | Rp 350k / $79 / install $397 | too proud for this week |
| Marc Lou | $9 / $29 / $49 self-serve | $9 is scrap; Stripe later |
| Pieter | **$29 / 20 prepaid** | **this is the list** |
| Masa | Rp 149k / 20 then Rp 249k/mo | door too cheap; monthly too soon |
| Ellison | Rp 250k / $49 / $99 run | never $9 (kept); $49 pack (dropped) |
| Bryan | Rp 250k local, skip monthly | brother dissent: cheaper door if they flinch |

Custom install ($497 class) is a WhatsApp quote after they have paid a pack and asked. Not on this page.
