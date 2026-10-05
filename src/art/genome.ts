/**
 * Art "genomes": small, deterministic descriptions of a piece of placeholder art,
 * derived from a card/hero id with the seeded RNG. Pure (no Phaser) so they can
 * be unit-tested; painters.ts turns them into pixels.
 */
import { Rng } from '../engine/rng';
import type { CardDef, CardLandscape, EffectType, HeroDef } from '../engine/types';
import { adjust, darken, lighten, mix } from './color';
import { PALETTE } from './palette';

export const BODY_TYPES = ['blob', 'beast', 'bird', 'biped', 'serpent', 'golem'] as const;
export type BodyType = (typeof BODY_TYPES)[number];
export type HeadGear = 'none' | 'horns' | 'ears' | 'antennae' | 'spikes' | 'crown' | 'leaf';
export type Pattern = 'none' | 'spots' | 'stripes' | 'belly';
export type Mouth = 'smile' | 'fangs' | 'beak' | 'frown' | 'none';

export interface CreatureGenome {
  kind: 'creature';
  landscape: CardLandscape;
  body: BodyType;
  /** 0.55 .. 1: overall scale inside the art window. */
  size: number;
  bodyColor: number;
  bellyColor: number;
  accentColor: number;
  outline: number;
  eyes: 1 | 2 | 3;
  eyeStyle: 'round' | 'angry' | 'sleepy';
  mouth: Mouth;
  headGear: HeadGear;
  wings: boolean;
  tail: boolean;
  pattern: Pattern;
  glow: boolean;
  decorSeed: number;
}

export type SpellMotif =
  | 'flame'
  | 'heart'
  | 'arrow'
  | 'snowflake'
  | 'cards'
  | 'skull'
  | 'sprout'
  | 'swirl'
  | 'shield'
  | 'star'
  | 'quake'
  | 'gem';

export interface SpellGenome {
  kind: 'spell';
  landscape: CardLandscape;
  motif: SpellMotif;
  rays: number;
  primary: number;
  secondary: number;
  glowColor: number;
  rotation: number;
  decorSeed: number;
}

export type Structure =
  'tower' | 'wall' | 'castle' | 'pit' | 'altar' | 'banner' | 'windmill' | 'house' | 'obelisk';

export interface BuildingGenome {
  kind: 'building';
  landscape: CardLandscape;
  structure: Structure;
  wallColor: number;
  roofColor: number;
  trimColor: number;
  windows: number;
  flag: boolean;
  decorSeed: number;
}

export interface HeroGenome {
  kind: 'hero';
  landscape: CardLandscape;
  skin: number;
  hair: number;
  outfit: number;
  trim: number;
  hairStyle: 'short' | 'long' | 'bun' | 'wild' | 'bald';
  hat: 'none' | 'crown' | 'hood' | 'wizard' | 'helm' | 'flower';
  beard: boolean;
  eyeStyle: 'round' | 'angry' | 'sleepy';
  decorSeed: number;
}

export type ArtGenome = CreatureGenome | SpellGenome | BuildingGenome | HeroGenome;

const SKIN_TONES = [0xffe0c2, 0xf5c9a0, 0xd9a577, 0xb07b4f, 0x8a5a36, 0x6b4428, 0xc9e6b8, 0xb9d4ff];

function pickBody(rng: Rng, card: CardDef): BodyType {
  if (card.type !== 'creature') return 'blob';
  const kw = card.keywords.map((k) => k.split(':')[0]);
  const weights: Record<BodyType, number> = { blob: 2, beast: 3, bird: 2, biped: 3, serpent: 2, golem: 2 };
  if (kw.includes('swift')) weights.bird += 5;
  if (kw.includes('guard') || kw.includes('shield')) weights.golem += 5;
  if (kw.includes('poison') || kw.includes('regenerate')) {
    weights.blob += 4;
    weights.serpent += 3;
  }
  if (kw.includes('rush')) weights.beast += 4;
  if (kw.includes('ranged')) weights.biped += 5;
  const name = card.name.toLowerCase();
  const hints: [RegExp, BodyType][] = [
    [/owl|heron|bird|phoenix|rooster|bee/, 'bird'],
    [/golem|titan|colossus|sentinel|sentry|guardian|troll/, 'golem'],
    [/slime|puff|toad|blob|jelly|gumdrop|mud/, 'blob'],
    [/serpent|worm|wyrm|leech|salamander|scorpion/, 'serpent'],
    [/hound|cat|lion|elk|jackal|pup|lamb|rat|imp|elk/, 'beast'],
    [
      /knight|archer|mage|priest|queen|king|hag|witch|shaman|dancer|druid|marshal|squire|scout|bard|cleric|pharaoh|juggler|pyro|seer|adept|warden|wanderer|sellsword|warlord|brawler|berserker|gunner|lasher|medic|gnome/,
      'biped',
    ],
  ];
  // A matching name decides the body outright (an "Archer" should look like an archer).
  for (const [re, body] of hints) if (re.test(name)) return body;
  return rng.weighted(
    BODY_TYPES,
    BODY_TYPES.map((b) => weights[b]),
  );
}

export function creatureGenome(card: CardDef): CreatureGenome {
  const rng = new Rng(`art:${card.id}`);
  const pal = PALETTE[card.landscape];
  const hueShift = rng.int(-28, 28);
  const bodyColor = adjust(pal.color, hueShift, rng.next() * 0.2 - 0.1, rng.next() * 0.16 - 0.08);
  const kw = card.type === 'creature' ? card.keywords.map((k) => k.split(':')[0]) : [];
  const legendary = card.rarity === 'legendary';
  const headGear: HeadGear = legendary
    ? 'crown'
    : rng.weighted<HeadGear>(
        ['none', 'horns', 'ears', 'antennae', 'spikes', 'leaf'],
        [3, 2, 3, 1, kw.includes('thorns') ? 6 : 1, card.landscape === 'golden' ? 3 : 1],
      );
  return {
    kind: 'creature',
    landscape: card.landscape,
    body: pickBody(rng, card),
    size: Math.min(1, 0.58 + card.cost * 0.07),
    bodyColor,
    bellyColor: lighten(mix(bodyColor, 0xffffff, 0.35), 0.05),
    accentColor: adjust(bodyColor, 150 + rng.int(-30, 30), 0.1, 0),
    outline: darken(pal.dark, 0.2),
    eyes: rng.weighted([1, 2, 3] as const, [1, 8, 1]),
    eyeStyle: rng.weighted(['round', 'angry', 'sleepy'] as const, [5, kw.includes('rush') ? 6 : 2, 1]),
    mouth: rng.weighted<Mouth>(['smile', 'fangs', 'beak', 'frown', 'none'], [4, 3, 1, 1, 1]),
    headGear,
    wings: kw.includes('swift') || rng.chance(0.12),
    tail: rng.chance(0.55),
    pattern: rng.weighted<Pattern>(['none', 'spots', 'stripes', 'belly'], [2, 2, 1, 3]),
    glow: card.rarity === 'epic' || legendary,
    decorSeed: rng.int(0, 0x7fffffff),
  };
}

const MOTIF_BY_EFFECT: Partial<Record<EffectType, SpellMotif>> = {
  damage: 'flame',
  heal: 'heart',
  buff: 'arrow',
  freeze: 'snowflake',
  draw: 'cards',
  discard: 'cards',
  poison: 'skull',
  destroy: 'skull',
  summon: 'sprout',
  returnToHand: 'swirl',
  move: 'swirl',
  shield: 'shield',
  grantKeyword: 'star',
  flip: 'quake',
  convert: 'quake',
  restore: 'sprout',
  gainMp: 'gem',
  loseMp: 'gem',
  chargeUltimate: 'star',
};

export function spellGenome(card: CardDef): SpellGenome {
  const rng = new Rng(`art:${card.id}`);
  const pal = PALETTE[card.landscape];
  const first = card.type === 'spell' ? card.effects[0]?.type : undefined;
  const motif = (first && MOTIF_BY_EFFECT[first]) ?? 'star';
  return {
    kind: 'spell',
    landscape: card.landscape,
    motif,
    rays: rng.int(6, 12),
    primary: adjust(pal.color, rng.int(-15, 15), 0.1, 0.05),
    secondary: pal.light,
    glowColor: lighten(pal.color, 0.25),
    rotation: rng.next() * Math.PI,
    decorSeed: rng.int(0, 0x7fffffff),
  };
}

export function buildingGenome(card: CardDef): BuildingGenome {
  const rng = new Rng(`art:${card.id}`);
  const pal = PALETTE[card.landscape];
  const name = card.name.toLowerCase();
  const hints: [RegExp, Structure][] = [
    [/windmill/, 'windmill'],
    [/banner/, 'banner'],
    [/wall/, 'wall'],
    [/castle|ziggurat/, 'castle'],
    [/obelisk/, 'obelisk'],
    [/tower|spire|watchtower/, 'tower'],
    [/pit|trench|well|fountain/, 'pit'],
    [/altar|brazier|forge|volcano/, 'altar'],
    [/library|granary|bakery|house/, 'house'],
  ];
  const hinted = hints.find(([re]) => re.test(name))?.[1];
  const structure =
    hinted ??
    rng.pick<Structure>([
      'tower',
      'wall',
      'castle',
      'pit',
      'altar',
      'banner',
      'windmill',
      'house',
      'obelisk',
    ]);
  return {
    kind: 'building',
    landscape: card.landscape,
    structure,
    wallColor: mix(pal.light, 0xcfc6b8, 0.4),
    roofColor: adjust(pal.color, rng.int(-10, 10), 0, -0.05),
    trimColor: pal.dark,
    windows: rng.int(1, 3),
    flag: rng.chance(0.6),
    decorSeed: rng.int(0, 0x7fffffff),
  };
}

export function heroGenome(hero: HeroDef): HeroGenome {
  const rng = new Rng(`art:${hero.id}`);
  const pal = PALETTE[hero.landscape];
  return {
    kind: 'hero',
    landscape: hero.landscape,
    skin: rng.pick(SKIN_TONES),
    hair: rng.pick([0x2b1a10, 0x6b3b1e, 0xd9a441, 0xf2f2f2, 0xc2412d, 0x3d3a7a, 0x1f7a5a]),
    outfit: pal.color,
    trim: pal.light,
    hairStyle: rng.pick(['short', 'long', 'bun', 'wild', 'bald'] as const),
    hat: rng.weighted(['none', 'crown', 'hood', 'wizard', 'helm', 'flower'] as const, [
      3,
      1,
      2,
      2,
      1,
      hero.landscape === 'candy' ? 4 : 1,
    ]),
    beard: rng.chance(0.3),
    eyeStyle: rng.pick(['round', 'angry', 'sleepy'] as const),
    decorSeed: rng.int(0, 0x7fffffff),
  };
}

export function cardGenome(card: CardDef): ArtGenome {
  if (card.type === 'spell') return spellGenome(card);
  if (card.type === 'building') return buildingGenome(card);
  return creatureGenome(card);
}
