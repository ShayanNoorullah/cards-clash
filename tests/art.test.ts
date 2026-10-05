import { describe, expect, it } from 'vitest';
import {
  adjust,
  darken,
  fromHsl,
  hexToInt,
  intToHex,
  lighten,
  luminance,
  mix,
  toHsl,
} from '../src/art/color';
import { BODY_TYPES, cardGenome, creatureGenome, heroGenome } from '../src/art/genome';
import { validateManifest } from '../src/art/manifest';
import { PALETTE, RARITY_COLORS, RARITY_SHAPE } from '../src/art/palette';
import manifest from '../src/data/asset-manifest.json';
import { buildContent, RARITIES } from '../src/engine';
import legacyCards from './fixtures/legacy-cards.json';
import legacyHeroes from './fixtures/legacy-heroes.json';
import legacyDecks from './fixtures/legacy-starter-decks.json';
import {
  cardIcons,
  rarityLabel,
  requirementLabel,
  requirementPips,
  statView,
  typeLabel,
} from '../src/ui/cardText';

// The procedural art and text helpers are checked on the legacy pool, which has
// every card shape (tokens, keywords, auras); the shipped pool has illustrations.
const { ctx } = buildContent(legacyCards, legacyHeroes, legacyDecks);
const card = (id: string) => ctx.cards.byId.get(id)!;

describe('color helpers', () => {
  it('round-trips hex and HSL', () => {
    expect(intToHex(hexToInt('#3f8fe0'))).toBe('#3f8fe0');
    for (const c of [0x000000, 0xffffff, 0xff0000, 0x3f8fe0, 0x8a4fc4]) {
      const back = fromHsl(toHsl(c));
      for (const shift of [16, 8, 0])
        expect(Math.abs(((back >> shift) & 0xff) - ((c >> shift) & 0xff))).toBeLessThanOrEqual(1);
    }
    expect(() => hexToInt('#12')).toThrow();
  });

  it('lightens, darkens, mixes and measures luminance', () => {
    expect(luminance(lighten(0x3f8fe0, 0.2))).toBeGreaterThan(luminance(0x3f8fe0));
    expect(luminance(darken(0x3f8fe0, 0.2))).toBeLessThan(luminance(0x3f8fe0));
    expect(mix(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    expect(adjust(0xff0000, 120)).toBe(0x00ff00);
  });
});

describe('palette', () => {
  it('covers every landscape plus neutral with distinct icons', () => {
    const entries = Object.values(PALETTE);
    expect(entries).toHaveLength(7);
    expect(new Set(entries.map((e) => e.icon)).size).toBe(7);
  });

  it('rarities differ by color AND gem shape (colorblind safe)', () => {
    expect(new Set(RARITIES.map((r) => RARITY_COLORS[r])).size).toBe(5);
    expect(new Set(RARITIES.map((r) => RARITY_SHAPE[r])).size).toBe(5);
  });
});

describe('art genomes', () => {
  it('are deterministic per card id', () => {
    for (const c of ctx.cards.all) expect(cardGenome(c)).toEqual(cardGenome(c));
    for (const h of ctx.heroes.all) expect(heroGenome(h)).toEqual(heroGenome(h));
  });

  it('match the card type', () => {
    for (const c of ctx.cards.all) {
      const g = cardGenome(c);
      expect(g.kind).toBe(c.type === 'creature' ? 'creature' : c.type);
      expect(g.landscape).toBe(c.landscape);
    }
  });

  it('give creatures a wide variety of looks', () => {
    const creatures = ctx.cards.all.filter((c) => c.type === 'creature');
    const genomes = creatures.map(creatureGenome);
    const bodies = new Set(genomes.map((g) => g.body));
    expect(bodies).toEqual(new Set(BODY_TYPES));
    const signatures = new Set(genomes.map((g) => `${g.body}|${g.headGear}|${g.pattern}|${g.bodyColor}`));
    expect(signatures.size).toBeGreaterThan(creatures.length * 0.9);
    for (const g of genomes) {
      expect(g.size).toBeGreaterThan(0.5);
      expect(g.size).toBeLessThanOrEqual(1);
    }
  });

  it('use names as hints and crown the legendaries', () => {
    expect(creatureGenome(card('azure_icicle_archer')).body).toBe('biped');
    expect(creatureGenome(card('azure_glacier_sentinel')).body).toBe('golem');
    expect(creatureGenome(card('azure_blizzard_owl')).body).toBe('bird');
    expect(creatureGenome(card('murk_bog_toad')).body).toBe('blob');
    for (const c of ctx.cards.all.filter((x) => x.type === 'creature' && x.rarity === 'legendary')) {
      expect(creatureGenome(c).headGear, c.id).toBe('crown');
    }
  });

  it('pick spell motifs from effects and building shapes from names', () => {
    const g = cardGenome(card('azure_cold_snap'));
    expect(g.kind === 'spell' && g.motif).toBe('snowflake');
    const b = cardGenome(card('golden_windmill'));
    expect(b.kind === 'building' && b.structure).toBe('windmill');
  });
});

describe('card text helpers', () => {
  it('builds type lines, requirements and rarity labels', () => {
    expect(typeLabel(card('golden_harvest_knight'))).toBe('Creature · Corn Fields');
    expect(typeLabel(card('token_bee'))).toBe('Token Creature · Corn Fields');
    expect(requirementLabel(card('golden_harvest_knight'))).toBe('Needs 2 Corn Fields');
    expect(requirementLabel(card('neutral_wanderer'))).toBe('No requirement');
    expect(requirementPips(card('azure_queen_ysolde'))).toBe(3);
    expect(rarityLabel(card('ember_ignatrix'))).toBe('Legendary');
  });

  it('lists keyword and ability icons in a stable order', () => {
    expect(cardIcons(card('ember_ignatrix'))).toEqual(['rush', 'onAttack']);
    expect(cardIcons(card('murk_swamp_lurker'))).toEqual(['stealth', 'poison']);
    expect(cardIcons(card('dune_scorpion'))).toEqual(['floop']);
    expect(cardIcons(card('ember_warlord'))).toEqual(['aura', 'rush']);
    expect(cardIcons(card('dune_sphinx'))).toEqual(['spellPower']);
    expect(cardIcons(card('golden_wheat_giant'))).toEqual(['aura']);
    expect(cardIcons(card('neutral_wanderer'))).toEqual([]);
  });

  it('reports stat trends for live creatures', () => {
    const c = card('neutral_wanderer');
    expect(statView(c)).toEqual({ atk: 3, def: 3, atkTrend: 0, defTrend: 0 });
    const creature = { damage: 1 } as never;
    expect(statView(c, { creature, atk: 4, def: 2 })).toEqual({ atk: 4, def: 2, atkTrend: 1, defTrend: -1 });
    expect(statView(card('ember_bolt'))).toBeNull();
  });
});

describe('asset manifest', () => {
  it('the shipped manifest is valid', () => {
    expect(validateManifest(manifest)).toEqual([]);
  });

  it('rejects bad keys and paths', () => {
    const known = new Set([...ctx.cards.all.map((c) => `art-${c.artKey}`), 'hero-sola', 'tile-azure']);
    const errors = validateManifest(
      {
        version: 1,
        images: {
          'art-golden_sunsprout': 'art/sprout.png',
          'art-not_a_card': 'art/x.png',
          'bad key': 'art/y.png',
          'hero-sola': '../../secret.png',
          'tile-azure': 'tiles/azure.gif',
        },
      },
      known,
    );
    expect(errors).toHaveLength(4);
    expect(errors.join('\n')).toMatch(/art-not_a_card" does not match/);
    expect(errors.join('\n')).toMatch(/bad key" is not a valid texture key/);
    expect(errors.join('\n')).toMatch(/hero-sola" has an invalid path/);
    expect(errors.join('\n')).toMatch(/tile-azure" has an invalid path/);
  });
});
