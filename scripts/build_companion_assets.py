"""Build HEC Stage 3A runtime artwork from an external audited production ZIP."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import zipfile
from pathlib import Path

from PIL import Image


ZIP_ROOT = "HEC_Alpha_0_6_33_Stage3_Companion_Assets"
COMPANIONS = (
    ("percy-pelican", "percy"),
    ("wally-wombat", "wally"),
    ("anna-goanna", "anna"),
    ("shelly-turtle", "shelly"),
    ("ruby-ringneck", "ruby"),
    ("bonnie-bilby", "bonnie"),
    ("skip-kangaroo", "skip"),
    ("rusty-dingo", "rusty"),
    ("gary-galah", "gary"),
    ("monty-python", "monty"),
    ("chuckles-kookaburra", "chuckles"),
    ("ernie-echidna", "ernie"),
    ("spike-thorny-devil", "spike"),
    ("cassie-cassowary", "cassie"),
    ("salty-crocodile", "salty"),
    ("bushy-koala", "bushy"),
)


def zip_path(relative: str) -> str:
    return f"{ZIP_ROOT}/{relative}"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def open_rgba(data: bytes, expected_size: tuple[int, int], label: str) -> Image.Image:
    with Image.open(io.BytesIO(data)) as source:
        if source.mode != "RGBA":
            raise ValueError(f"{label}: expected RGBA, received {source.mode}")
        if source.size != expected_size:
            raise ValueError(f"{label}: expected {expected_size}, received {source.size}")
        image = source.copy()
    alpha_min, alpha_max = image.getchannel("A").getextrema()
    if alpha_min != 0 or alpha_max != 255:
        raise ValueError(f"{label}: expected transparent and opaque pixels")
    return image


def fitted_canvas(source: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Fit the full visible character onto a transparent bottom-aligned canvas."""
    alpha_box = source.getchannel("A").getbbox()
    if not alpha_box:
        raise ValueError("Artwork contains no visible pixels")

    left, top, right, bottom = alpha_box
    margin = round(max(right - left, bottom - top) * 0.045)
    crop_box = (
        max(0, left - margin),
        max(0, top - margin),
        min(source.width, right + margin),
        min(source.height, bottom + margin),
    )
    character = source.crop(crop_box)

    canvas_width, canvas_height = size
    inner_width = round(canvas_width * 0.96)
    inner_height = round(canvas_height * 0.96)
    scale = min(inner_width / character.width, inner_height / character.height)
    resized_size = (
        max(1, round(character.width * scale)),
        max(1, round(character.height * scale)),
    )
    character = character.resize(resized_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    x = (canvas_width - character.width) // 2
    y = canvas_height - round(canvas_height * 0.02) - character.height
    canvas.alpha_composite(character, (x, max(0, y)))
    return canvas


def save_webp(image: Image.Image, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "WEBP", quality=91, method=6)


def build(audited_zip: Path, output_root: Path) -> None:
    runtime_root = output_root / "runtime"

    with zipfile.ZipFile(audited_zip) as archive:
        audit = archive.read(zip_path("ASSET_AUDIT.txt"))
        if b"AUDIT RESULT: PASS" not in audit:
            raise ValueError("The supplied asset audit does not report PASS")

        manifest_bytes = archive.read(zip_path("asset_manifest.json"))
        archive.getinfo(zip_path("AUDIT_CONTACT_SHEET.jpg"))
        manifest = json.loads(manifest_bytes)
        expected_short_names = [short_name for _, short_name in COMPANIONS]
        if manifest.get("roster") != expected_short_names:
            raise ValueError("The ZIP roster does not match the canonical Stage 3A roster")
        manifest_assets = {item["name"]: item for item in manifest.get("assets", [])}
        if set(manifest_assets) != set(expected_short_names):
            raise ValueError("The ZIP must contain exactly 16 audited asset records")

        expected_master_paths = {zip_path(f"masters/{name}.png") for name in expected_short_names}
        expected_picker_paths = {zip_path(f"pickers/{name}.png") for name in expected_short_names}
        actual_master_paths = {
            name for name in archive.namelist() if name.startswith(zip_path("masters/")) and name.endswith(".png")
        }
        actual_picker_paths = {
            name for name in archive.namelist() if name.startswith(zip_path("pickers/")) and name.endswith(".png")
        }
        if actual_master_paths != expected_master_paths or actual_picker_paths != expected_picker_paths:
            raise ValueError("The ZIP must contain exactly 16 masters and 16 pickers")

        for companion_id, short_name in COMPANIONS:
            master_bytes = archive.read(zip_path(f"masters/{short_name}.png"))
            picker_bytes = archive.read(zip_path(f"pickers/{short_name}.png"))
            if sha256(master_bytes) != manifest_assets[short_name]["sha256"]:
                raise ValueError(f"{short_name}: master checksum does not match the audited manifest")

            master = open_rgba(master_bytes, (1800, 1800), f"{short_name} master")
            picker = open_rgba(picker_bytes, (512, 512), f"{short_name} picker")

            save_webp(
                fitted_canvas(master, (512, 640)),
                runtime_root / "hero" / "512" / f"{companion_id}.webp",
            )
            save_webp(
                fitted_canvas(master, (1024, 1280)),
                runtime_root / "hero" / "1024" / f"{companion_id}.webp",
            )
            save_webp(
                fitted_canvas(picker, (320, 360)),
                runtime_root / "picker" / f"{companion_id}.webp",
            )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build shipped runtime WebPs from the external approved audited source pack."
    )
    parser.add_argument(
        "audited_zip",
        type=Path,
        help="External path to HEC_Alpha_0_6_33_Stage3_Companion_Assets.zip",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "assets" / "companions",
        help="Application companion asset root; only runtime/ outputs are written",
    )
    args = parser.parse_args()
    build(args.audited_zip.resolve(), args.output_root.resolve())
    print(f"Built {len(COMPANIONS)} audited companion asset sets in {args.output_root.resolve()}")


if __name__ == "__main__":
    main()
