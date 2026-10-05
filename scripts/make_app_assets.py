"""
Draws the app icon and splash sources into assets/ (then `npx capacitor-assets generate`
makes every Android size). Uses two card illustrations from public/cards.

    python scripts/make_app_assets.py
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'assets')
BG = (18, 12, 43)
GOLD = (255, 210, 63)
INK = (40, 28, 80)
FONT = next(
    (f for f in ['C:/Windows/Fonts/impact.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'] if os.path.exists(f)),
    None,
)


def card(art_id, w, h):
    """A small card: gold rim, illustration, dark name strip."""
    c = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(c)
    r = int(w * 0.08)
    d.rounded_rectangle([0, 0, w - 1, h - 1], r, fill=GOLD)
    inset = int(w * 0.05)
    d.rounded_rectangle([inset, inset, w - inset, h - inset], int(r * 0.7), fill=INK)
    art = Image.open(os.path.join(ROOT, 'public', 'cards', f'{art_id}.webp')).convert('RGB')
    aw = w - 4 * inset
    art = art.resize((aw, aw), Image.LANCZOS)
    c.paste(art, (2 * inset, 2 * inset))
    d.rectangle([2 * inset, 2 * inset + aw + inset, w - 2 * inset, h - 3 * inset], fill=(70, 50, 130))
    return c


def emblem(size, with_text=True, transparent=False):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0) if transparent else BG + (255,))
    if not transparent:
        glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        ImageDraw.Draw(glow).ellipse([size * 0.15, size * 0.12, size * 0.85, size * 0.82], fill=(120, 80, 220, 140))
        img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(size * 0.08)))
    cw, ch = int(size * 0.36), int(size * 0.5)
    for art_id, angle, dx in [('ghost_bull', 14, -0.11), ('legion_of_earlings', -12, 0.11)]:
        c = card(art_id, cw, ch).rotate(angle, expand=True, resample=Image.BICUBIC)
        shadow = Image.new('RGBA', c.size, (0, 0, 0, 0))
        shadow.putalpha(c.getchannel('A').point(lambda a: a * 0.5))
        x = int(size / 2 - c.width / 2 + dx * size)
        y = int(size * 0.42 - c.height / 2)
        img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(size * 0.015)), (x + int(size * 0.01), y + int(size * 0.02)))
        img.alpha_composite(c, (x, y))
    if with_text and FONT:
        font = ImageFont.truetype(FONT, int(size * 0.2))
        d = ImageDraw.Draw(img)
        text = 'CC'
        box = d.textbbox((0, 0), text, font=font)
        tx = (size - (box[2] - box[0])) / 2
        ty = size * 0.7
        d.text((tx, ty), text, font=font, fill=GOLD, stroke_width=int(size * 0.012), stroke_fill=INK)
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    emblem(1024).convert('RGB').save(os.path.join(OUT, 'icon-only.png'))
    # Adaptive icon: art on a transparent foreground, plain background.
    fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    fg.alpha_composite(emblem(680, transparent=True), (172, 172))
    fg.save(os.path.join(OUT, 'icon-foreground.png'))
    Image.new('RGB', (1024, 1024), BG).save(os.path.join(OUT, 'icon-background.png'))
    for name in ('splash.png', 'splash-dark.png'):
        splash = Image.new('RGB', (2732, 2732), BG)
        e = emblem(1100).convert('RGB')
        splash.paste(e, ((2732 - 1100) // 2, (2732 - 1100) // 2))
        splash.save(os.path.join(OUT, name))
    print('assets/: icon-only, icon-foreground, icon-background, splash, splash-dark')


if __name__ == '__main__':
    main()
