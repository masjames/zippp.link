#!/usr/bin/env python3
"""
Burn timed captions into a screen recording.

    python3 demo/burn_captions.py \
        --input demo/in/zippp-demo.mov \
        --output demo/out/zippp-google-verification-demo.mp4 \
        --captions demo/in/captions.json

captions.json:

    [
      { "start": 2.0, "end": 7.5, "text": "zippp turns a receipt photo into rows." },
      { "start": 7.5, "end": 18.0, "text": "Spreadsheets: write accepted rows." }
    ]

Two passes: normalize to 1080p-class H.264 first, then overlay the caption
PNGs. ffmpeg here has no libass, so captions are rendered with Pillow and
composited with the overlay filter. Audio is kept if the input has it.
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]

MAX_SIDE = 1920


def run(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        raise SystemExit(f"command failed: {' '.join(cmd[:6])} ...")
    return result


def probe(path):
    out = run(
        [
            "ffprobe", "-v", "error", "-print_format", "json",
            "-show_streams", "-show_format", str(path),
        ]
    ).stdout
    data = json.loads(out)
    video = next(s for s in data["streams"] if s["codec_type"] == "video")
    has_audio = any(s["codec_type"] == "audio" for s in data["streams"])
    return {
        "width": int(video["width"]),
        "height": int(video["height"]),
        "duration": float(data["format"].get("duration") or 0),
        "has_audio": has_audio,
    }


def load_font(size):
    for candidate in FONT_CANDIDATES:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def wrap(draw, text, font, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width or not current:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def render_caption(text, frame_width, margin, out_path):
    font_size = max(20, round(frame_width * 0.0215))
    font = load_font(font_size)
    line_gap = round(font_size * 0.35)
    padding_x = round(font_size * 0.85)
    padding_y = round(font_size * 0.55)
    radius = round(font_size * 0.65)
    max_text_width = round(frame_width * 0.72)

    probe_draw = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    lines = wrap(probe_draw, text, font, max_text_width)
    line_height = font_size + line_gap
    text_width = max(round(probe_draw.textlength(line, font=font)) for line in lines)
    text_height = line_height * len(lines) - line_gap

    width = text_width + padding_x * 2
    height = text_height + padding_y * 2

    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(
        [(0, 0), (width - 1, height - 1)],
        radius=radius,
        fill=(18, 12, 12, 210),
        outline=(255, 255, 255, 30),
        width=2,
    )

    y = padding_y
    for line in lines:
        line_width = round(draw.textlength(line, font=font))
        x = (width - line_width) // 2
        # Soft shadow, then white text.
        draw.text((x + 2, y + 2), line, font=font, fill=(0, 0, 0, 160))
        draw.text((x, y), line, font=font, fill=(255, 255, 255, 255))
        y += line_height

    image.save(out_path, "PNG")
    return width, height, margin


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--captions", required=True)
    parser.add_argument("--max-side", type=int, default=MAX_SIDE)
    args = parser.parse_args()

    src = Path(args.input)
    out = Path(args.output)
    captions = json.loads(Path(args.captions).read_text())
    captions.sort(key=lambda c: c["start"])

    info = probe(src)
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix="zippp-captions-"))
    base = tmp / "base.mp4"

    # Pass 1: normalize. Fit inside max_side, even dimensions, 30 fps, H.264.
    scale = (
        f"scale={args.max_side}:{args.max_side}:"
        "force_original_aspect_ratio=decrease:flags=lanczos,"
        "pad=ceil(iw/2)*2:ceil(ih/2)*2,setsar=1,fps=30"
    )
    cmd = [
        "ffmpeg", "-y", "-i", str(src), "-vf", scale,
        "-c:v", "libx264", "-crf", "20", "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
    ]
    if info["has_audio"]:
        cmd += ["-c:a", "aac", "-b:a", "128k"]
    cmd += [str(base)]
    run(cmd)

    base_info = probe(base)
    width = base_info["width"]
    height = base_info["height"]
    margin = round(height * 0.055)

    # Pass 2: overlay each caption only inside its time window.
    inputs = ["-i", str(base)]
    filters = []
    last = "0:v"
    for i, caption in enumerate(captions, start=1):
        png = tmp / f"caption-{i}.png"
        _, cap_h, _ = render_caption(caption["text"], width, margin, png)
        inputs += ["-i", str(png)]
        y = height - margin - cap_h
        filters.append(
            f"[{last}][{i}:v]overlay=x=(W-w)/2:y={y}:"
            f"enable='between(t,{caption['start']},{caption['end']})'[v{i}]"
        )
        last = f"v{i}"

    filter_complex = ";".join(filters) if filters else "[0:v]null[vout]"
    if filters:
        filter_complex += f";[{last}]null[vout]"

    cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", filter_complex,
           "-map", "[vout]"]
    if info["has_audio"]:
        cmd += ["-map", "0:a", "-c:a", "copy"]
    cmd += [
        "-c:v", "libx264", "-crf", "19", "-preset", "veryfast",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        str(out),
    ]
    run(cmd)

    print(f"OK {out} ({width}x{height}, {len(captions)} captions)")


if __name__ == "__main__":
    main()
