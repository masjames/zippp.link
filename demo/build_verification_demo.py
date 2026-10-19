#!/usr/bin/env python3
"""
Cut, concat, and caption the Google verification demo.

    python3 demo/build_verification_demo.py

Input:  demo/in/zippp-demo-2.mov (macOS screen recording, gitignored)
Output: demo/out/zippp-google-verification-demo.mp4 (1734x1970, H.264, no audio)

Segment times are source seconds, caption times are output seconds. The dark
band at the bottom is padding, so captions never cover app controls.
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SRC = "demo/in/zippp-demo-2.mov"
OUT = "demo/out/zippp-google-verification-demo.mp4"
W, H = 1734, 1800
FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

# (start, end, note) in source seconds
SEGMENTS = [
    (0.0, 10.5, "landing"),
    (10.5, 39.5, "account + email consent"),
    (39.5, 61.0, "privacy policy"),
    (95.0, 137.5, "drive + spreadsheets consent"),
    (137.5, 158.0, "create sheet"),
    (164.5, 173.0, "sheet created"),
    (190.0, 212.0, "receipt card + debug + accept"),
    (271.5, 276.5, "row in sheet"),
    (276.5, 281.5, "settings and sign out"),
]

# (start, end, text) in FINAL seconds
CAPTIONS = [
    (0.6, 6.0, "Receipt photos become rows in your Google Sheet."),
    (11.5, 16.0, "Sign in with the Google account that owns the sheet."),
    (17.5, 26.0, "The app is under review, so Google shows its standard warning. Continue."),
    (27.5, 34.0, "Scope 1, email: identify the account, send account email, check admin."),
    (40.0, 47.0, "Privacy policy: how Google user data is used, shared, and protected."),
    (48.0, 55.0, "The AI step gets the photo only. No account data, sheet id, rows, or Drive file."),
    (56.0, 60.5, "Who we share with, how we protect it, and the Limited Use statement."),
    (62.0, 69.5, "Google now asks for the two data scopes: Drive file and Spreadsheets."),
    (72.0, 78.0, "Drive file: only the spreadsheet zippp creates or you pick."),
    (78.5, 84.5, "Spreadsheets: write accepted rows, read the header row only."),
    (85.0, 90.0, "Both checked and expanded. Then Allow."),
    (100.0, 103.5, "The app loads with the new grant."),
    (106.0, 112.5, "No sheet connected, so create one. This is Drive file in use."),
    (113.0, 118.5, "Name the sheet and pick a template. zippp creates it in Drive."),
    (120.0, 124.0, "Creating the file in Google Drive."),
    (125.5, 131.5, "The new spreadsheet exists in Google Drive."),
    (133.0, 137.0, "One receipt. Open the card to check it."),
    (138.0, 146.0, "Debug panel: OCR text and the rows sent to the model. No Google data."),
    (146.5, 153.5, "Correct a field, then Accept. One credit, one row."),
    (155.0, 159.3, "The row is now in the user's own Google Sheet."),
    (159.8, 164.3, "Sign out deletes the token and sheet setup. The sheet stays yours."),
]

MARGIN_X = 60
MARGIN_BOTTOM = 70
MAX_TEXT_W = 1200
FONT_SIZE = 42
BAND = 170


def font():
    return ImageFont.truetype(FONT, FONT_SIZE)


def wrap(draw, text, f, max_w):
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=f) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def render(text, path):
    f = font()
    probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    lines = wrap(probe, text, f, MAX_TEXT_W)
    line_h = FONT_SIZE + 14
    text_w = max(round(probe.textlength(l, font=f)) for l in lines)
    text_h = line_h * len(lines) - 14
    pad_x, pad_y = 34, 26
    w = text_w + pad_x * 2
    h = text_h + pad_y * 2
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(
        [(0, 0), (w - 1, h - 1)], radius=26, fill=(18, 12, 12, 216)
    )
    y = pad_y
    for line in lines:
        d.text((pad_x + 1, y + 1), line, font=f, fill=(0, 0, 0, 150))
        d.text((pad_x, y), line, font=f, fill=(255, 255, 255, 255))
        y += line_h
    img.save(path)
    return h


def main():
    tmp = Path("/tmp/zippp-build")
    tmp.mkdir(exist_ok=True)

    filters = []
    for i, (start, end, _note) in enumerate(SEGMENTS):
        filters.append(
            f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS,"
            f"fps=30,setsar=1[s{i}]"
        )
    joined = "".join(f"[s{i}]" for i in range(len(SEGMENTS)))
    filters.append(f"{joined}concat=n={len(SEGMENTS)}:v=1:a=0[base]")
    filters.append(f"[base]pad=iw:ih+{BAND}:0:0:color=0x160f0e[padded]")

    inputs = ["-i", SRC]
    last = "padded"
    for i, (start, end, text) in enumerate(CAPTIONS, start=1):
        png = tmp / f"cap{i}.png"
        h = render(text, png)
        inputs += ["-i", str(png)]
        y = H + (BAND - h) // 2
        filters.append(
            f"[{last}][{i}:v]overlay=x=(W-w)/2:y={y}:"
            f"enable='between(t,{start},{end})'[v{i}]"
        )
        last = f"v{i}"

    cmd = [
        "ffmpeg", "-y", *inputs,
        "-filter_complex", ";".join(filters),
        "-map", f"[{last}]",
        "-c:v", "libx264", "-crf", "18", "-preset", "medium",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
        OUT,
    ]
    print("running ffmpeg ...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        sys.stderr.write(res.stderr[-4000:])
        raise SystemExit("ffmpeg failed")
    total = sum(e - s for s, e, _ in SEGMENTS)
    print(f"OK {OUT}  ~{total:.1f}s  {len(CAPTIONS)} captions")


if __name__ == "__main__":
    main()
