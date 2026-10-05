"""
Imports the Card Wars card list from "CARD INFO EXTRACTOR" into the game.

    python scripts/cardwars/import_cards.py [--source "CARD INFO EXTRACTOR/card info"] [--style realistic]

Writes:
  src/data/cards.json    every Creature, Spell and Building (all variants)
  src/data/heroes.json   every Hero
  public/cards/*.webp    the chosen art style, resized for the game
  src/data/card-sources.json  per-card source URL (attribution)

Card names, stats and ability texts are copied exactly. scripts/cardwars/abilities.py
holds the rules for each ability text; the import fails if a text has no rule.
Needs Python 3.9+ and Pillow.
"""
import argparse
import csv
import json
import os
import re
import sys

from PIL import Image, ImageChops

sys.path.insert(0, os.path.dirname(__file__))
from abilities import BUILDING, FLOOP, HERO_ABILITY, SPELL  # noqa: E402

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))

FACTION = {
    'Blue Plains': 'azure',
    'Corn Fields': 'golden',
    'Useless Swamp': 'murk',
    'Sandy Lands': 'dune',
    'Nice Lands': 'candy',
    'Rainbow': 'neutral',
    '': 'neutral',
}
RARITY = {
    'Cool': ('common', 1),
    'Nice': ('uncommon', 2),
    'Rare': ('rare', 3),
    'Very Rare': ('epic', 4),
    'Algebraic Rare': ('legendary', 5),
    'Unbelievably Rare': ('legendary', 7),
}
# Values the source data is missing (documented in CREDITS.md).
PATCHES = {
    ('Polterclops', 'Regular'): {'Magic Cost': '4', 'Attack': '2', 'Defense': '30', 'Floop Cost': '7'},
    ('Super Hug', 'Regular'): {'Magic Cost': '2'},
}
ART_SIZE = (384, 384)  # the square illustration inside each 768x900 source image


def norm(text):
    t = re.sub(r'\s+', ' ', text.strip()).lower()
    return t.rstrip('. ')


def table(d):
    return {norm(k): v for k, v in d.items()}


FLOOP_N, SPELL_N, BUILDING_N, HERO_N = table(FLOOP), table(SPELL), table(BUILDING), table(HERO_ABILITY)


def slug(text):
    return re.sub(r'[^a-z0-9]+', '_', text.lower().replace("'", '')).strip('_')


def card_id(name, variant):
    base = slug(name)
    if variant in ('Regular', '') or variant.lower() in name.lower():
        return base
    return f'{base}_{slug(variant)}'


def stars_of(row):
    raw = row['Rarity Stars'].strip()
    if raw.isdigit():
        return int(raw)
    if raw:
        return raw.count('★')
    return RARITY.get(row['Rarity'], ('common', 1))[1]


def rarity_of(row):
    return RARITY.get(row['Rarity'], ('common', 1))[0]


def to_int(v, what, name):
    try:
        return int(v)
    except ValueError:
        raise SystemExit(f'{name}: {what} "{v}" is not a number (add it to PATCHES)')


def crop_padding(im):
    """The source art sits on a flat dark background: keep only the illustration."""
    bg = im.getpixel((2, 2))
    mask = ImageChops.difference(im, Image.new('RGB', im.size, bg)).convert('L').point(lambda v: 255 if v > 18 else 0)
    box = mask.getbbox()
    return im.crop(box) if box else im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', default=os.path.join(ROOT, 'CARD INFO EXTRACTOR', 'card info'))
    ap.add_argument('--style', default='realistic')
    ap.add_argument('--skip-art', action='store_true')
    args = ap.parse_args()

    rows = list(csv.DictReader(open(os.path.join(args.source, 'data', 'csv', 'all-cards.csv'), encoding='utf-8-sig')))
    site = json.load(open(os.path.join(args.source, 'website', 'data', 'cards.json'), encoding='utf-8'))
    art_by_key = {(c['type'], c['name'], c['variant']): c['artStyles'].get(args.style) for c in site}

    missing, cards, heroes, sources, art_jobs = [], [], [], {}, []
    seen = set()
    for row in rows:
        row = {k: (v or '').strip() for k, v in row.items()}
        raw_name, variant, kind = row['Card Name'], row['Variant'], row['Card Type']
        # Drop stray symbols left by the wiki scrape (e.g. "♙Throne of Doom").
        name = re.sub(r'^[^\w(]+', '', raw_name).strip()
        row.update(PATCHES.get((name, variant), {}))
        if kind == 'Hero':
            cid = slug(name)
        else:
            cid = card_id(name, variant)
        if cid in seen:
            raise SystemExit(f'duplicate id {cid}')
        seen.add(cid)
        art = art_by_key.get((kind, raw_name, variant)) or art_by_key.get((kind, name, variant))
        if not art:
            guess = os.path.join('assets', 'art', args.style, f'{kind.lower()}-{slug(name).replace("_", "-")}-{variant.lower()}.png')
            if os.path.exists(os.path.join(args.source, 'website', guess)):
                art = guess
        image = f'cards/{cid}.webp' if art else None
        if art:
            art_jobs.append((os.path.join(args.source, 'website', art.split('?')[0]), cid))
        sources[cid] = row['Source URL']

        if kind == 'Hero':
            text = row['Hero Ability']
            m = re.match(r'^\((\d+) turns?\)\s*(.*)$', text, re.I)
            cooldown, body = (int(m.group(1)), m.group(2)) if m else (3, text)
            effects = HERO_N.get(norm(body))
            if effects is None:
                missing.append(('hero', text))
                continue
            hero = {
                'id': cid,
                'name': name,
                'title': 'Hero',
                'landscape': 'neutral',
                'flavorText': '',
                'artKey': f'hero_{cid}',
                'passive': {'name': '', 'text': ''},
                'ultimate': {'name': 'Hero Ability', 'text': text, 'cooldown': cooldown, 'effects': effects},
            }
            if image:
                hero['image'] = image
            heroes.append(hero)
            continue

        land = FACTION[row['Faction']]
        base = {
            'id': cid,
            'name': name,
            'type': kind.lower(),
            'landscape': land,
            'requirements': [] if land == 'neutral' else [{'landscape': land, 'count': 1}],
            'cost': to_int(row['Magic Cost'], 'Magic Cost', name),
            'rarity': rarity_of(row),
            'stars': stars_of(row),
        }
        if variant not in ('Regular', '') and variant.lower() not in name.lower():
            base['variant'] = variant
        if kind == 'Creature':
            text = row['Floop Ability']
            effects = FLOOP_N.get(norm(text))
            if effects is None:
                missing.append(('floop', text))
                continue
            floop_cost = to_int(row['Floop Cost'], 'Floop Cost', name)
            base.update({
                'atk': to_int(row['Attack'], 'Attack', name),
                'def': max(1, to_int(row['Defense'], 'Defense', name)),
                'keywords': [],
                'floop': {'cost': floop_cost, 'effects': effects},
                'text': f'Floop ({floop_cost} MP): {text}',
            })
        elif kind == 'Spell':
            text = row['Spell Effect']
            effects = SPELL_N.get(norm(text))
            if effects is None:
                missing.append(('spell', text))
                continue
            base.update({'effects': effects, 'text': text})
        else:
            text = row['Building Effect']
            rule = BUILDING_N.get(norm(text))
            if rule is None:
                missing.append(('building', text))
                continue
            abilities, statics = rule
            if abilities:
                base['abilities'] = abilities
            if statics:
                base['statics'] = statics
            base['text'] = text
        base.update({'flavorText': '', 'artKey': cid})
        if image:
            base['image'] = image
        cards.append(base)

    if missing:
        for kind, text in missing:
            print(f'NO RULE ({kind}): {text}')
        raise SystemExit(f'{len(missing)} ability texts have no rule in abilities.py')

    order = {'creature': 0, 'spell': 1, 'building': 2}
    cards.sort(key=lambda c: (order[c['type']], c['landscape'], c['cost'], c['name'], c['id']))
    heroes.sort(key=lambda h: h['name'])
    data = os.path.join(ROOT, 'src', 'data')
    with open(os.path.join(data, 'cards.json'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('[\n' + ',\n'.join(json.dumps(c, ensure_ascii=False) for c in cards) + '\n]\n')
    with open(os.path.join(data, 'heroes.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(heroes, f, ensure_ascii=False, indent=2)
        f.write('\n')
    with open(os.path.join(data, 'card-sources.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(sources, f, ensure_ascii=False, indent=0, sort_keys=True)
        f.write('\n')
    print(f'{len(cards)} cards, {len(heroes)} heroes')

    if args.skip_art:
        return
    out_dir = os.path.join(ROOT, 'public', 'cards')
    os.makedirs(out_dir, exist_ok=True)
    total = 0
    for src, cid in art_jobs:
        dst = os.path.join(out_dir, f'{cid}.webp')
        if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
            with Image.open(src) as im:
                im = crop_padding(im.convert('RGB')).resize(ART_SIZE, Image.LANCZOS)
                im.save(dst, 'WEBP', quality=72, method=6)
        total += os.path.getsize(dst)
    print(f'{len(art_jobs)} images, {total / 1e6:.1f} MB in public/cards')


if __name__ == '__main__':
    main()
