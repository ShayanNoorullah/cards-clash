"""
Builds the starter decks and campaign boss decks from src/data/cards.json.

    python scripts/cardwars/build_decks.py

Every deck is 40 legal cards: creatures picked by a simple value rating along a
mana curve, plus a hand-picked package of spells and buildings. Run again after
re-importing cards; the output is deterministic.
"""
import json
import os

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
CARDS = json.load(open(os.path.join(ROOT, 'src', 'data', 'cards.json'), encoding='utf-8'))
BY_ID = {c['id']: c for c in CARDS}
BALANCE = json.load(open(os.path.join(ROOT, 'src', 'data', 'balance.json'), encoding='utf-8'))['match']
MAX_COPIES = {
    'common': BALANCE['maxCopiesCommon'],
    'uncommon': BALANCE['maxCopiesUncommon'],
    'rare': BALANCE['maxCopiesRare'],
    'epic': BALANCE['maxCopiesEpic'],
    'legendary': BALANCE['maxCopiesLegendary'],
}
DECK_SIZE = BALANCE['deckSize']
RARITY_RANK = {'common': 0, 'uncommon': 1, 'rare': 2, 'epic': 3, 'legendary': 4}

# Floops that are weak or self-defeating for a generated deck.
AVOID = {
    'snowy_mcsnow', 'intern_stuffenstein', 'travelin_skeleton', 'the_pig', 'wall_of_ears', 'polterclops',
    # 97/84 for 5 MP: far above every other card, so generated decks leave it out.
    'tree_of_underneath', 'tree_of_underneath_gold',
}


def value(card):
    """Rough strength per MP: stats, plus a little for a cheap floop."""
    stats = card['atk'] * 1.0 + card['def'] * 0.75
    fl = card['floop']['cost']
    floop = 4 if fl <= 2 else 2 if fl <= 4 else 0
    return (stats + floop) / (card['cost'] + 1.5)


def creatures(lands, max_rarity, gold):
    pool = []
    for c in CARDS:
        if c['type'] != 'creature' or c['id'] in AVOID:
            continue
        if c['landscape'] != 'neutral' and c['landscape'] not in lands:
            continue
        if RARITY_RANK[c['rarity']] > RARITY_RANK[max_rarity]:
            continue
        if c.get('variant') and not gold:
            continue
        if not gold and c['id'].endswith('_gold'):
            continue
        if gold and not c['id'].endswith('_gold') and (c['id'] + '_gold') in BY_ID:
            continue  # bosses use the Gold version when there is one
        pool.append(c)
    return pool


def build(name, lands, spells, buildings, max_rarity='rare', gold=False, legend_slots=0, neutral_share=0.25):
    deck = {}

    def add(cid, n):
        card = BY_ID[cid]
        room = DECK_SIZE - sum(deck.values())
        n = min(n, MAX_COPIES[card['rarity']] - deck.get(cid, 0), room)
        if n > 0:
            deck[cid] = deck.get(cid, 0) + n

    for cid, n in spells + buildings:
        add(cid, n)
    pool = creatures(set(lands), max_rarity, gold)
    # A few top-rarity cards for bosses.
    if legend_slots:
        tops = [c for c in creatures(set(lands), 'legendary', gold) if c['rarity'] in ('epic', 'legendary')]
        tops = [c for c in tops if c['landscape'] != 'neutral']
        for c in sorted(tops, key=lambda c: -value(c))[:legend_slots]:
            add(c['id'], 1)
    curve = {0: 2, 1: 6, 2: 7, 3: 6, 4: 4, 5: 3}
    filled = {k: 0 for k in curve}
    for c in [BY_ID[i] for i in deck if BY_ID[i]['type'] == 'creature']:
        filled[c['cost']] += deck[c['id']]
    neutral_cap = round((DECK_SIZE - sum(n for _, n in spells + buildings)) * neutral_share)
    neutral_used = 0
    for cost in sorted(curve):
        options = sorted((c for c in pool if c['cost'] == cost), key=lambda c: (-value(c), c['id']))
        for c in options:
            if filled[cost] >= curve[cost]:
                break
            if c['landscape'] == 'neutral' and neutral_used >= neutral_cap:
                continue
            before = deck.get(c['id'], 0)
            add(c['id'], min(3, curve[cost] - filled[cost]))
            got = deck.get(c['id'], 0) - before
            filled[cost] += got
            if c['landscape'] == 'neutral':
                neutral_used += got
    # Top up with the best remaining creatures at any cost.
    rest = sorted(pool, key=lambda c: (-value(c), c['id']))
    while sum(deck.values()) < DECK_SIZE:
        before = sum(deck.values())
        for c in rest:
            add(c['id'], 1)
            if sum(deck.values()) >= DECK_SIZE:
                break
        if sum(deck.values()) == before:
            raise SystemExit(f'{name}: not enough cards')
    order = {'creature': 0, 'spell': 1, 'building': 2}
    return dict(sorted(deck.items(), key=lambda kv: (order[BY_ID[kv[0]]['type']], BY_ID[kv[0]]['cost'], kv[0])))


# Shared packages.
DRAW = [('strawberry_butt', 2)]
REMOVAL = [('cerebral_bloodstorm', 2)]
BURN = [('blood_transfusion', 1)]
ATTACK_SPELL = {'golden': 'corn_scepter', 'azure': 'puma_claw', 'murk': 'bone_wand', 'dune': 'tome_of_ankhs', 'candy': 'super_hug'}

STARTERS = [
    ('starter_corn_fields', 'Corn Fields', 'Pump up your creatures and trample the lanes.', 'jake',
     ['golden'] * 4, DRAW + REMOVAL + [('corn_scepter', 2), ('brief_power', 1)], [('corn_dome', 2), ('corn_castle', 1)]),
    ('starter_blue_plains', 'Blue Plains', 'Tricks, bounces and card draw from the Woadic tribes.', 'ghost_jake',
     ['azure'] * 4, DRAW + REMOVAL + [('ultimate_magic_hands', 1), ('falling_star', 2)], [('astral_fortress', 2), ('stonehenge', 1)]),
    ('starter_useless_swamp', 'Useless Swamp', 'Floop for damage and burn the enemy down.', 'princess_cookie',
     ['murk'] * 4, DRAW + REMOVAL + BURN + [('bone_wand', 2)], [('spirit_tower', 1), ('corn_dome', 1)]),
    ('starter_sandy_lands', 'Sandy Lands', 'Walls of sand that outlast everything.', 'banana_guard',
     ['dune'] * 4, DRAW + REMOVAL + [('tome_of_ankhs', 2), ('woad_blood', 1)], [('sand_castle', 2), ('astral_fortress', 1)]),
    ('starter_nice_lands', 'Nice Lands', 'Heal, heal and heal again.', 'cinnamon_bun',
     ['candy'] * 4, DRAW + REMOVAL + [('pentaid', 1), ('woad_blood', 2)], [('nicelands_tower', 2), ('comfy_cave', 1)]),
    ('starter_corn_swamp', 'Corn & Swamp', 'Big attackers backed by swamp floops.', 'finn',
     ['golden', 'golden', 'murk', 'murk'], DRAW + REMOVAL + BURN + [('witch_way', 1)], [('corn_dome', 2), ('obelisx_of_vengeance', 1)]),
    ('starter_plains_sand', 'Plains & Sand', 'Sturdy walls and clever floops.', 'bmo',
     ['azure', 'azure', 'dune', 'dune'], DRAW + REMOVAL + [('falling_star', 1), ('woad_blood', 1)], [('sand_castle', 2), ('astral_fortress', 1)]),
    ('starter_nice_sand', 'Nice & Sand', 'Nothing gets through, nothing stays hurt.', 'princess_bubblegum',
     ['candy', 'candy', 'dune', 'dune'], DRAW + REMOVAL + [('pentaid', 1), ('tome_of_ankhs', 1)], [('nicelands_tower', 1), ('sand_castle', 2)]),
    ('starter_corn_plains', 'Corn & Plains', 'Hit hard, then pull the rug.', 'marceline',
     ['golden', 'golden', 'azure', 'azure'], DRAW + REMOVAL + [('corn_scepter', 1), ('brief_power', 1)], [('the_big_hen_house', 2), ('corn_dome', 1)]),
    ('starter_rainbow_road', 'Rainbow Road', 'A bit of every land.', 'pajama_finn',
     ['golden', 'azure', 'murk', 'candy'], DRAW + REMOVAL + [('witch_way', 1), ('zazos_magic_seeds', 1)], [('cave_of_solitude', 1), ('corn_parthenon', 2)]),
]

BOSSES = [
    ('boss_deck_haybale', 'Super Corn', 'super_jake', ['golden'] * 4,
     REMOVAL + [('corn_scepter', 2), ('strawberry_butt', 1)], [('corn_dome', 2), ('the_big_hen_house', 1)]),
    ('boss_deck_glacia', 'Plains Lord', 'super_hunson_abadeer', ['azure'] * 4,
     REMOVAL + [('falling_star', 2), ('ultimate_magic_hands', 1)], [('ghost_castle', 1), ('astral_fortress', 2)]),
    ('boss_deck_mire', 'Swamp Feast', 'super_princess_cookie', ['murk'] * 4,
     REMOVAL + BURN + [('bone_wand', 2)], [('spirit_tower', 2), ('autoplucker', 1)]),
    ('boss_deck_scorch', 'Burning Sands', 'super_flame_princess', ['dune'] * 4,
     REMOVAL + [('tome_of_ankhs', 2), ('woad_blood', 1)], [('sand_castle', 2), ('sand_sphinx', 1)]),
    ('boss_deck_bonbon', 'Candy Court', 'prince_gumball', ['candy'] * 4,
     REMOVAL + [('pentaid', 2), ('super_hug', 1)], [('nicelands_tower', 2), ('puffy_castle', 1)]),
    ('boss_deck_vex', 'Rainbow Guard', 'super_pajama_finn', ['golden', 'murk', 'dune', 'candy'],
     REMOVAL + BURN + [('witch_way', 2)], [('cave_of_solitude', 1), ('corn_parthenon', 2)]),
    ('boss_deck_jester', 'Monochrome', 'lord_monochromicorn', ['azure', 'azure', 'murk', 'murk'],
     REMOVAL + [('psychic_tempest', 2), ('volcano', 1)], [('shadow_pyramid', 1), ('obelisx_of_vengeance', 2)]),
    ('boss_deck_aurelia', 'Cinnamon Crown', 'super_cinnamon_bun', ['golden', 'golden', 'candy', 'candy'],
     REMOVAL + BURN + [('magic_hot_dog_pie', 1), ('strawberry_butt', 1)], [('ghost_castle', 1), ('dark_pyramid', 1), ('corn_dome', 1)]),
]


# Starter deck strength, tuned with `npm run sim:decks` (card stats are never changed):
# extra epic/legendary creatures for weaker lands, a lower rarity cap for stronger ones.
STARTER_TUNING = {
    'starter_corn_fields': {'legend_slots': 2},
    'starter_corn_swamp': {'legend_slots': 1},
    'starter_blue_plains': {'legend_slots': 2},
    'starter_sandy_lands': {'legend_slots': 2},
    'starter_nice_lands': {'legend_slots': 1},
    'starter_corn_plains': {'legend_slots': 1},
}


def main():
    starters = []
    for sid, name, desc, hero, lands, spells, buildings in STARTERS:
        starters.append({
            'id': sid,
            'name': name,
            'description': desc,
            'heroId': hero,
            'landscapes': lands,
            'cards': build(sid, lands, spells, buildings, **STARTER_TUNING.get(sid, {})),
        })
    bosses = []
    for i, (bid, name, hero, lands, spells, buildings) in enumerate(BOSSES):
        bosses.append({
            'id': bid,
            'name': name,
            'heroId': hero,
            'landscapes': lands,
            'cards': build(bid, lands, spells, buildings, max_rarity='legendary', gold=True, legend_slots=2 + i),
        })
    data = os.path.join(ROOT, 'src', 'data')
    with open(os.path.join(data, 'starter-decks.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(starters, f, indent=2)
        f.write('\n')
    with open(os.path.join(data, 'campaign-decks.json'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('[\n' + ',\n'.join('  ' + json.dumps(b) for b in bosses) + '\n]\n')
    for d in starters + bosses:
        print(d['id'], sum(d['cards'].values()), len(d['cards']), 'distinct')


if __name__ == '__main__':
    main()
