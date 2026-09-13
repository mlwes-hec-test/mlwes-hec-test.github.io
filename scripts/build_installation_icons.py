#!/usr/bin/env python3
"""Maintain role icon copies from the accepted Circle Balance production family.

TEST's checked-in production PNGs are the canonical sized artwork, verified at
accepted TEST v37 e6afb3204b5007956e52bf2103d07481cd347fda. Do not redraw them.
The separately preserved master is named 1024 but is actually 1254 x 1254.
"""
from pathlib import Path
from hashlib import sha256
import argparse
import struct

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "app-icons"
MASTER_HASH = "7236332209a640a78bf055b35f61ee0df35e4428b81e695f4cefb8ff49326135"
APPROVED = {
    180: "821ad74175976371f63744c5c6c2949c21e70089b5b4e673385849c9af692cf1",
    192: "bd16a47f77112c95b89983e6e5849fcce9c5331dce30dc48d1dd17182e4f737e",
    512: "915bb5322764baeaa2967ee987b92d86648a4540227e60693496238d6fd509b0",
}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    master = (OUTPUT / "hec-official-current-1024.png").read_bytes()
    if sha256(master).hexdigest() != MASTER_HASH:
        raise ValueError("Approved Circle Balance master changed; review required")
    for size, expected in APPROVED.items():
        artwork = (OUTPUT / f"hec-test-{size}.png").read_bytes()
        if sha256(artwork).hexdigest() != expected or struct.unpack(">II", artwork[16:24]) != (size, size):
            raise ValueError(f"Approved production artwork changed: {size}")
        destination = OUTPUT / f"hec-my-data-{size}.png"
        if args.check:
            if destination.read_bytes() != artwork:
                raise ValueError(f"My Data icon differs from approved artwork: {size}")
        elif not destination.exists() or destination.read_bytes() != artwork:
            destination.write_bytes(artwork)
    print("Approved Circle Balance master and 180/192/512 role icons verified")

if __name__ == "__main__":
    main()
