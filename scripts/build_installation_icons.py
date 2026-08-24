#!/usr/bin/env python3
"""Build deterministic My Data and TEST Home Screen icons."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "app-icons"


def font(size: int):
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default(size=size)


def centred(draw, xy, text, selected_font, fill):
    draw.text(xy, text, font=selected_font, fill=fill, anchor="mm", align="center")


def my_data_icon(size: int):
    image = Image.new("RGB", (size, size), "#eaf6ec")
    draw = ImageDraw.Draw(image)
    margin = round(size * 0.045)
    draw.rounded_rectangle((margin, margin, size-margin, size-margin), radius=round(size*.19), fill="#2e6d4d", outline="#173b29", width=max(2,round(size*.018)))
    draw.ellipse((size*.23, size*.16, size*.77, size*.70), fill="#f9fff9")
    draw.ellipse((size*.40, size*.22, size*.60, size*.52), fill="#8fcf78")
    draw.polygon([(size*.50,size*.25),(size*.66,size*.18),(size*.58,size*.38)], fill="#347c45")
    draw.line((size*.50,size*.29,size*.55,size*.47), fill="#245f36", width=max(2,round(size*.016)))
    centred(draw, (size*.5, size*.60), "HEC", font(round(size*.19)), "#173b29")
    draw.rounded_rectangle((size*.18,size*.72,size*.82,size*.88), radius=round(size*.05), fill="#f9fff9")
    centred(draw, (size*.5, size*.80), "MY DATA", font(round(size*.082)), "#173b29")
    return image


def test_icon(size: int):
    image = Image.new("RGB", (size, size), "#ffd400")
    draw = ImageDraw.Draw(image)
    margin = round(size * .035)
    draw.rounded_rectangle((margin,margin,size-margin,size-margin), radius=round(size*.17), fill="#ffd400", outline="#111111", width=max(4,round(size*.04)))
    draw.rectangle((size*.08,size*.11,size*.92,size*.27), fill="#d71920")
    centred(draw, (size*.5,size*.19), "ISOLATED", font(round(size*.075)), "#ffffff")
    centred(draw, (size*.5,size*.44), "HEC", font(round(size*.25)), "#111111")
    draw.rounded_rectangle((size*.11,size*.59,size*.89,size*.85), radius=round(size*.05), fill="#111111")
    centred(draw, (size*.5,size*.72), "TEST", font(round(size*.19)), "#ffd400")
    return image


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        my_data_icon(size).save(OUTPUT / f"hec-my-data-{size}.png", optimize=True)
        test_icon(size).save(OUTPUT / f"hec-test-{size}.png", optimize=True)


if __name__ == "__main__":
    main()
