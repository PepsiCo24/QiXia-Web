#!/usr/bin/env python3
"""Slice the uploaded 9x8 QiXia spirit-cat sheet into animation frames.

The uploaded sheet is *not* a strict uniform grid: each row places its eight
cats at different x positions, and rows 4-7 have neighbours whose bodies or
tails touch. This script therefore:

1. finds the nine horizontal row bands from fully transparent gutters;
2. splits each band into exactly eight sprites, using the column with the
   lowest ink coverage as the seam whenever a block still contains several
   cats;
3. trims each sprite, then composes every frame onto one shared canvas so the
   whole animation set keeps a single scale and a single ground baseline,
   while preserving each frame's own vertical offset inside its row band
   (this is what makes the jump arc and the idle bob readable).

Output: public/pet/qixia-cat/frames/*.png plus a QA contact sheet.
"""
from __future__ import annotations

import json
import pathlib

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "pet" / "qixia-cat"
SOURCE = ASSETS / "6682def1-a017-471b-a77d-e04cab5f53ad_副本.png"
FRAMES = ASSETS / "frames"
QA = ROOT / "docs" / "pet-qa"

INK = 60          # alpha above this counts as artwork
PAD = 4           # transparent padding around the shared canvas
COLS = 8          # eight cats per row in the uploaded sheet

ROW_NAMES = [
    "idle", "walk-right", "walk-left", "wave", "jump",
    "sleep", "curious", "thinking", "happy",
]

# Frame durations in ms, tuned per action feel.
DURATIONS = {
    "idle": 190, "walk-right": 110, "walk-left": 110, "wave": 140,
    "jump": 95, "sleep": 260, "curious": 170, "thinking": 150, "happy": 150,
}


def runs(mask: np.ndarray) -> list[tuple[int, int]]:
    spans, start = [], None
    for index, value in enumerate(mask):
        if value and start is None:
            start = index
        elif not value and start is not None:
            spans.append((start, index - 1))
            start = None
    if start is not None:
        spans.append((start, len(mask) - 1))
    return spans


def label_components(mask: np.ndarray) -> list[dict]:
    """8-connected components via iterative flood fill (numpy bool input)."""
    height, width = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    components = []
    for sy in range(height):
        row = np.flatnonzero(mask[sy] & ~seen[sy])
        for sx in row:
            if seen[sy, sx]:
                continue
            stack = [(sy, int(sx))]
            seen[sy, sx] = True
            pixels = []
            while stack:
                y, x = stack.pop()
                pixels.append((y, x))
                for dy in (-1, 0, 1):
                    ny = y + dy
                    if ny < 0 or ny >= height:
                        continue
                    for dx in (-1, 0, 1):
                        nx = x + dx
                        if nx < 0 or nx >= width:
                            continue
                        if mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            stack.append((ny, nx))
            ys = [p[0] for p in pixels]
            xs = [p[1] for p in pixels]
            components.append({
                "pixels": pixels,
                "area": len(pixels),
                "box": (min(xs), min(ys), max(xs) + 1, max(ys) + 1),
            })
    components.sort(key=lambda c: c["area"], reverse=True)
    return components


def clean_cell(cell_alpha: np.ndarray) -> np.ndarray:
    """Drop slivers of the neighbouring cat that cross the slice seam.

    The largest component is always the cat itself. Small components that touch
    the left or right seam are pieces of the neighbour and are discarded, while
    interior decoration (falling maple leaf, cloud, sparkle) is kept.
    """
    mask = cell_alpha > INK
    components = label_components(mask)
    if not components:
        return mask
    height, width = mask.shape
    keep = np.zeros_like(mask)
    main = components[0]["area"]
    for index, component in enumerate(components):
        x0, _, x1, _ = component["box"]
        touches_seam = x0 <= 0 or x1 >= width
        if index == 0 or not touches_seam or component["area"] >= main * 0.25:
            for y, x in component["pixels"]:
                keep[y, x] = True
    return keep


def split_blocks(occ: np.ndarray, blocks: list[tuple[int, int]]) -> list[tuple[int, int]]:
    """Force exactly COLS blocks, merging tiny gaps and splitting wide ones."""
    blocks = list(blocks)
    while len(blocks) > COLS:
        gaps = [(blocks[i + 1][0] - blocks[i][1], i) for i in range(len(blocks) - 1)]
        _, index = min(gaps)
        blocks[index] = (blocks[index][0], blocks[index + 1][1])
        del blocks[index + 1]

    while len(blocks) < COLS:
        widest = max(range(len(blocks)), key=lambda i: blocks[i][1] - blocks[i][0])
        x0, x1 = blocks[widest]
        margin = max(2, (x1 - x0) // 10)
        low, high = x0 + margin, x1 - margin
        if high <= low:  # degenerate block, split in the middle
            low, high = x0 + 1, x1 - 1
        seam = min(range(low, high + 1), key=lambda x: (int(occ[x]), abs(x - (x0 + x1) // 2)))
        blocks[widest:widest + 1] = [(x0, seam - 1), (seam, x1)]
    return blocks


def main() -> None:
    sheet = Image.open(SOURCE).convert("RGBA")
    alpha = np.array(sheet.getchannel("A"))
    height, width = alpha.shape

    bands = [(a, b) for a, b in runs((alpha > INK).sum(axis=1) > 0) if b - a > 40]
    if len(bands) != 9:
        raise SystemExit(f"expected 9 row bands, found {len(bands)}: {bands}")

    sprites: list[dict] = []
    for row, (y0, y1) in enumerate(bands):
        occ = (alpha[y0:y1 + 1] > INK).sum(axis=0)
        blocks = split_blocks(occ, runs(occ > 0))
        if len(blocks) != COLS:
            raise SystemExit(f"row {row} produced {len(blocks)} blocks")
        row_cells = []
        for col, (x0, x1) in enumerate(blocks):
            cell_alpha = alpha[y0:y1 + 1, x0:x1 + 1]
            keep = clean_cell(cell_alpha)
            rows = np.where(keep.any(axis=1))[0]
            cols = np.where(keep.any(axis=0))[0]
            if rows.size == 0 or cols.size == 0:
                raise SystemExit(f"empty sprite at row {row} col {col}")
            top, bottom = y0 + int(rows[0]), y0 + int(rows[-1])
            left, right = x0 + int(cols[0]), x0 + int(cols[-1])
            # Keep soft alpha edges around retained components instead of
            # turning every alpha <= INK pixel into a hard transparent edge.
            from PIL import ImageFilter
            support = np.array(Image.fromarray((keep * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5))) > 0
            top, bottom = max(y0, top - 2), min(y1, bottom + 2)
            left, right = max(x0, left - 2), min(x1, right + 2)
            crop = sheet.crop((left, top, right + 1, bottom + 1)).copy()
            crop_alpha = np.array(crop.getchannel("A"))
            kept = support[top - y0:bottom - y0 + 1, left - x0:right - x0 + 1]
            crop_alpha[~kept] = 0
            crop.putalpha(Image.fromarray(crop_alpha))
            row_cells.append({
                "row": row,
                "col": col,
                "name": ROW_NAMES[row],
                "box": (left, top, right + 1, bottom + 1),
                "band": (y0, y1),
                "image": crop,
                "ink": int(keep.sum()),
            })
        # A somersault row can contain a frame that is only the sweeping tail.
        # Keep the file for inspection but drop it from the animation.
        median_ink = float(np.median([c["ink"] for c in row_cells]))
        for cell in row_cells:
            cell["fragment"] = cell["ink"] < median_ink * 0.6
        sprites.extend(row_cells)

    # One shared canvas: identical scale and ground baseline for every frame.
    max_w = max(s["image"].width for s in sprites)
    max_band = max(b[1] - b[0] + 1 for b in bands)
    canvas_w, canvas_h = max_w + PAD * 2, max_band + PAD * 2

    FRAMES.mkdir(parents=True, exist_ok=True)
    # Overwrite this script's deterministic filenames only; preserve other art.
    if FRAMES.resolve() != (ROOT / 'public/pet/qixia-cat/frames').resolve():
        raise SystemExit('unexpected frame output path')

    manifest_animations: dict[str, dict] = {}
    for name in ROW_NAMES:
        manifest_animations[name] = {"loop": True, "frames": []}

    for sprite in sprites:
        band_bottom_offset = canvas_h - PAD - (sprite["band"][1] - sprite["band"][0] + 1)
        y = band_bottom_offset + (sprite["box"][1] - sprite["band"][0])
        x = (canvas_w - sprite["image"].width) // 2
        canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
        canvas.alpha_composite(sprite["image"], (x, y))
        filename = f"{sprite['name']}-{sprite['col']}.png"
        canvas.save(FRAMES / filename, optimize=True)
        sprite["file"] = filename
        if sprite["fragment"]:
            continue
        manifest_animations[sprite["name"]]["frames"].append({
            "src": f"frames/{filename}",
            "duration": DURATIONS[sprite["name"]],
        })

    # Web actions that the uploaded sheet does not draw explicitly reuse the
    # closest existing frames; each mapping is documented in docs/PET_ASSETS.md.
    def reuse(target: str, source: str, indices: list[int], duration: int, loop: bool) -> None:
        frames = []
        for index in indices:
            frames.append({"src": f"frames/{source}-{index}.png", "duration": duration})
        manifest_animations[target] = {"loop": loop, "frames": frames}

    manifest_animations['jump']['loop'] = False
    manifest_animations['wave']['loop'] = False
    reuse("dragged", "jump", [2, 3, 4], 110, True)
    reuse("landing", "jump", [6, 7], 120, False)
    reuse("guide", "wave", [2, 4, 6], 160, True)
    reuse("talking", "idle", [1, 3, 5, 7], 130, True)
    reuse("celebrate", "happy", list(range(8)), 120, False)

    # Legacy aliases kept so the currently shipped player keeps working while
    # the app migrates to the richer action names.
    for alias, origin in (("listen", "curious"), ("think", "thinking"), ("talk", "talking")):
        manifest_animations[alias] = {
            "loop": True,
            "frames": [dict(frame) for frame in manifest_animations[origin]["frames"]],
        }

    manifest = {
        "version": 1,
        "anchor": {"x": 0.5, "y": 1},
        "animations": manifest_animations,
    }
    (ASSETS / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # QA contact sheet: dark background proves the alpha cut-out, and frame
    # labels make each action row easy to compare.
    QA.mkdir(parents=True, exist_ok=True)
    cell_w, cell_h = canvas_w + 6, canvas_h + 6
    sheet_qa = Image.new("RGBA", (cell_w * COLS, cell_h * 9), (16, 26, 22, 255))
    for sprite in sprites:
        frame = Image.open(FRAMES / sprite["file"])
        sheet_qa.alpha_composite(frame, (sprite["col"] * cell_w + 3, sprite["row"] * cell_h + 3))
    sheet_qa.convert("RGB").save(QA / "contact-sheet.png", optimize=True)

    # Per-action GIF previews so motion can be judged without the site.
    for name, animation in manifest_animations.items():
        layers, durations = [], []
        for frame in animation["frames"]:
            image = Image.open(ROOT / "public" / "pet" / "qixia-cat" / frame["src"])
            plate = Image.new("RGBA", image.size, (16, 26, 22, 255))
            plate.alpha_composite(image)
            layers.append(plate.convert("RGB"))
            durations.append(frame["duration"])
        layers[0].save(
            QA / f"{name}.gif",
            save_all=True,
            append_images=layers[1:],
            duration=durations,
            loop=0 if animation["loop"] else 1,
            optimize=True,
        )

    print(json.dumps({
        "canvas": [canvas_w, canvas_h],
        "frames": len(sprites),
        "animations": {k: len(v["frames"]) for k, v in manifest_animations.items()},
        "rows": {ROW_NAMES[r]: b for r, b in enumerate(bands)},
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
