#!/usr/bin/env python3
"""
Generate alternate app icon variants from the base icon.
Extracts the white logo via alpha/luminance mask and composites onto various backgrounds.
Also creates inverted variants (colored logo on white/dark backgrounds).
"""

from PIL import Image, ImageDraw
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_ICON = os.path.join(BASE_DIR, "assets", "icon.png")
OUT_DIR = os.path.join(BASE_DIR, "assets", "icons")
SIZE = 1024
CORNER_RADIUS = 200  # For preview thumbnails (actual iOS mask is applied by OS)

os.makedirs(OUT_DIR, exist_ok=True)

# Load source icon and extract the logo mask
src = Image.open(SRC_ICON).convert("RGBA").resize((SIZE, SIZE), Image.LANCZOS)
r, g, b, a = src.split()

# The logo is white on colored bg — extract white pixels as mask
# White pixels: R>200, G>200, B>200
logo_mask = Image.new('L', (SIZE, SIZE), 0)
src_pixels = src.load()
mask_pixels = logo_mask.load()
for y in range(SIZE):
    for x in range(SIZE):
        pr, pg, pb, pa = src_pixels[x, y]
        if pr > 200 and pg > 200 and pb > 200:
            mask_pixels[x, y] = 255

def make_icon(bg_color, logo_color, name):
    """Create an icon with solid bg and colored logo."""
    img = Image.new("RGBA", (SIZE, SIZE), bg_color)
    logo_layer = Image.new("RGBA", (SIZE, SIZE), logo_color)
    img.paste(logo_layer, (0, 0), logo_mask)
    out_path = os.path.join(OUT_DIR, f"{name}.png")
    img.save(out_path, "PNG")
    print(f"  {name}.png")

def make_gradient_icon(color_top, color_bottom, logo_color, name):
    """Create an icon with vertical gradient bg and colored logo."""
    img = Image.new("RGBA", (SIZE, SIZE))
    draw = ImageDraw.Draw(img)
    for y in range(SIZE):
        t = y / SIZE
        r = int(color_top[0] + (color_bottom[0] - color_top[0]) * t)
        g = int(color_top[1] + (color_bottom[1] - color_top[1]) * t)
        b = int(color_top[2] + (color_bottom[2] - color_top[2]) * t)
        draw.line([(0, y), (SIZE, y)], fill=(r, g, b, 255))
    logo_layer = Image.new("RGBA", (SIZE, SIZE), logo_color)
    img.paste(logo_layer, (0, 0), logo_mask)
    out_path = os.path.join(OUT_DIR, f"{name}.png")
    img.save(out_path, "PNG")
    print(f"  {name}.png")

print("Generating icon variants...")

# === Group 1: Different background colors, white logo ===
bg_variants = [
    ("#3A547F", "default"),      # Original blue
    ("#1C1C1E", "dark"),         # Dark/black
    ("#FF3B30", "red"),          # Red
    ("#FF9500", "orange"),       # Orange
    ("#34C759", "green"),        # Green
    ("#8E5CD9", "purple"),       # Purple
    ("#0A84FF", "blue"),         # Bright blue
    ("#FF2D55", "pink"),         # Pink
    ("#00C7BE", "teal"),         # Teal
]

print("\nBackground variants (white logo):")
for bg_hex, name in bg_variants:
    bg = tuple(int(bg_hex.lstrip('#')[i:i+2], 16) for i in (0, 2, 4)) + (255,)
    make_icon(bg, (255, 255, 255, 255), f"icon-bg-{name}")

# === Group 2: White/light background, colored logo ===
logo_variants = [
    ("#3A547F", "classic-blue"),
    ("#1C1C1E", "black"),
    ("#FF3B30", "red"),
    ("#8E5CD9", "purple"),
    ("#0A84FF", "blue"),
    ("#34C759", "green"),
]

print("\nLight bg variants (colored logo):")
for logo_hex, name in logo_variants:
    logo = tuple(int(logo_hex.lstrip('#')[i:i+2], 16) for i in (0, 2, 4)) + (255,)
    make_icon((255, 255, 255, 255), logo, f"icon-light-{name}")

# === Group 3: Dark background, colored logo ===
print("\nDark bg variants (colored logo):")
for logo_hex, name in [("#0A84FF", "blue"), ("#34C759", "green"), ("#FF3B30", "red"), ("#FF9500", "orange"), ("#8E5CD9", "purple")]:
    logo = tuple(int(logo_hex.lstrip('#')[i:i+2], 16) for i in (0, 2, 4)) + (255,)
    make_icon((28, 28, 30, 255), logo, f"icon-dark-{name}")

# === Group 4: Gradient backgrounds, white logo ===
print("\nGradient variants:")
gradients = [
    ((10, 132, 255), (88, 86, 214), "blue-purple"),
    ((255, 59, 48), (255, 149, 0), "red-orange"),
    ((52, 199, 89), (0, 199, 190), "green-teal"),
    ((255, 45, 85), (142, 92, 217), "pink-purple"),
    ((30, 30, 30), (80, 80, 100), "midnight"),
]
for top, bottom, name in gradients:
    make_gradient_icon(top, bottom, (255, 255, 255, 255), f"icon-grad-{name}")

# Copy default as the "original" reference
import shutil
shutil.copy2(SRC_ICON, os.path.join(OUT_DIR, "icon-bg-default.png"))

print(f"\nDone! Generated icons in {OUT_DIR}")
print(f"Total: {len(os.listdir(OUT_DIR))} icons")
