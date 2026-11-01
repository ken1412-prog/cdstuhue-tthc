#!/usr/bin/env python3
"""Create faithful, blue-graded photos from the original CDSTUHUE assets.

Do not generate replacement scenes: retain EVERY source pixel and the original
aspect ratio, then recolor image pixels to a coherent cobalt/cyan palette.
Source photographs are immutable and outputs are reproducible.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageOps

# Pillow 12 supports AVIF natively; optional plugin supports older runners.
try:
    import pillow_avif  # noqa: F401
except ImportError:
    pass

ROOT = Path(__file__).resolve().parents[1] / "site" / "assets" / "img"
SOURCES = (
    ("hue-bridge-night.webp", "hue-bridge-night-cyan.webp", 1500),
    ("nguyen-hoang-user-banner.avif", "nguyen-hoang-user-banner-cyan.webp", 2200),
)
# Relative lightness -> target RGB; no uniform overlay, so contours, reflections,
# bridge lighting and fine detail remain defined by the ORIGINAL image pixels.
STOPS = np.array([0.0, 0.10, 0.23, 0.39, 0.55, 0.71, 0.86, 1.0], dtype=np.float32)
PALETTE = np.array([
    [5, 23, 62], [6, 43, 103], [5, 77, 155], [7, 118, 200],
    [23, 159, 222], [64, 204, 238], [149, 236, 252], [248, 255, 255]
], dtype=np.float32)


def recolor(image):
    src = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    r, g, b = (src[..., k] for k in range(3))
    original_y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    # Adaptive contrast preserves detail in both the very dark night bridge
    # and the brighter panorama; avoid clipping any existing highlights.
    low, high = np.percentile(original_y, [0.7, 99.5])
    scale = max(float(high - low), 0.3)
    y = np.clip((original_y - low) / scale, 0.0, 1.0)
    y = np.power(y, 0.91)
    mapped = np.stack(
        [np.interp(y, STOPS, PALETTE[:, k]) for k in range(3)], axis=-1
    ).astype(np.float32)

    # Keep natural pink/gold illumination on illuminated bridge arches while
    # changing blue shadow and sky pixels into the shared cobalt/cyan palette.
    warm = np.clip((r - g * 1.04) * 4.0, 0, 1)
    warm *= np.clip((g - b * 0.84) * 4.0, 0, 1)
    warm *= np.clip((original_y - .16) * 3.0, 0, 1)
    warm *= .63
    warm_reference = np.stack([
        np.clip(255.0 * (r * 1.03 + .035), 0, 255),
        np.clip(255.0 * (g * 1.01 + .005), 0, 255),
        np.clip(255.0 * b * .98, 0, 255),
    ], axis=-1)
    mapped = mapped * (1 - warm[..., None]) + warm_reference * warm[..., None]

    # Retain native image microcontrast; no blur or fake replacement geometry.
    original_pixels = src * 255.0
    mapped = mapped * .91 + original_pixels * .09
    return Image.fromarray(np.clip(mapped + .5, 0, 255).astype("uint8"), "RGB")


def main():
    results = []
    for source, target, max_width in SOURCES:
        source_path, target_path = ROOT / source, ROOT / target
        if not source_path.is_file():
            raise FileNotFoundError(source_path)
        with Image.open(source_path) as loaded:
            original_size = loaded.size
            original = ImageOps.exif_transpose(loaded).convert("RGB")
        if original.width > max_width:
            new_size = (max_width, max(1, round(original.height * max_width / original.width)))
            original = original.resize(new_size, Image.Resampling.LANCZOS)
        enhanced = recolor(original)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        enhanced.save(target_path, "WEBP", quality=86, method=6)
        with Image.open(target_path) as final:
            assert final.size == enhanced.size and final.format == "WEBP"
        output_bytes = target_path.stat().st_size
        if output_bytes > 950_000:
            raise ValueError(f"Unexpectedly large asset: {target_path} ({output_bytes} bytes)")
        results.append({"source": source, "target": target,
                        "original_size": original_size,
                        "new_size": enhanced.size, "bytes": output_bytes})
    print("CYAN_ASSETS_GENERATED " + json.dumps(results, ensure_ascii=False))


if __name__ == "__main__":
    main()
