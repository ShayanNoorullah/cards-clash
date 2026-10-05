/**
 * Pure helpers that describe a card for display (no Phaser): type line,
 * keyword icon list, stat values. Used by CardView and the gallery.
 */
import { parseKeyword } from '../engine/keywords';
import type { CardDef, CreatureInPlay, HeroDef } from '../engine/types';
import type { IconId } from '../art/icons';
import { PALETTE, RARITY_LABEL } from '../art/palette';

export function typeLabel(card: CardDef): string {
  const kind = card.token ? 'Token Creature' : card.type[0]!.toUpperCase() + card.type.slice(1);
  return `${kind} · ${PALETTE[card.landscape].name}`;
}

export function rarityLabel(card: CardDef): string {
  return RARITY_LABEL[card.rarity];
}

/** Requirement text, e.g. "Needs 2 Golden Fields" or "No requirement". */
export function requirementLabel(card: CardDef): string {
  if (card.requirements.length === 0) return 'No requirement';
  return `Needs ${card.requirements.map((r) => `${r.count} ${PALETTE[r.landscape].name}`).join(', ')}`;
}

/** Total landscape pips shown next to the landscape icon. */
export function requirementPips(card: CardDef): number {
  return card.requirements.reduce((n, r) => n + r.count, 0);
}

/**
 * Icons for the card's keywords and ability markers, in a stable order.
 * Keywords first (as printed), then triggers, floop, aura, spell power.
 */
export function cardIcons(card: CardDef): IconId[] {
  const out: IconId[] = [];
  const push = (id: IconId) => {
    if (!out.includes(id)) out.push(id);
  };
  if (card.type === 'creature') {
    for (const k of card.keywords) {
      const parsed = parseKeyword(k);
      if (parsed) push(parsed[0] === 'feast' ? 'lifesteal' : parsed[0]);
    }
  }
  for (const a of card.abilities ?? []) {
    switch (a.trigger) {
      case 'onPlay':
      case 'onDestroy':
      case 'startOfTurn':
      case 'endOfTurn':
      case 'onAttack':
      case 'onDamaged':
        push(a.trigger);
        break;
      default:
        push('aura');
    }
  }
  if (card.type === 'creature' && card.floop) push('floop');
  for (const s of card.statics ?? []) {
    if (s.kind === 'spellPower') push('spellPower');
    else if (s.kind === 'keyword') {
      const parsed = parseKeyword(s.keyword);
      if (parsed) push(parsed[0] === 'feast' ? 'lifesteal' : parsed[0]);
    } else push('aura');
  }
  return out;
}

export interface StatView {
  atk: number;
  def: number;
  /** -1 below printed, 0 same, +1 above printed (for coloring badges). */
  atkTrend: -1 | 0 | 1;
  defTrend: -1 | 0 | 1;
}

/** Printed stats, or live stats when an in-play creature and its computed values are given. */
export function statView(
  card: CardDef,
  live?: { creature: CreatureInPlay; atk: number; def: number },
): StatView | null {
  if (card.type !== 'creature') return null;
  if (!live) return { atk: card.atk, def: card.def, atkTrend: 0, defTrend: 0 };
  const trend = (now: number, base: number): -1 | 0 | 1 => (now > base ? 1 : now < base ? -1 : 0);
  return {
    atk: live.atk,
    def: live.def,
    atkTrend: trend(live.atk, card.atk),
    defTrend: live.creature.damage > 0 ? -1 : trend(live.def, card.def),
  };
}

export function heroSummary(hero: HeroDef): string {
  const ability = `${hero.ultimate.name}: ${hero.ultimate.text}`;
  return hero.passive.name ? `${hero.passive.name}: ${hero.passive.text}\n\n${ability}` : ability;
}

/** Own turns until a Hero Ability is ready (0 = ready). Damage-charged abilities return null. */
export function abilityTurnsLeft(hero: HeroDef, charge: number, max: number): number | null {
  if (charge >= max) return 0;
  const cd = hero.ultimate.cooldown;
  if (!cd) return null;
  return Math.ceil((max - charge) / Math.ceil(max / cd));
}

/** "Ready", "Ready in 2 turns" or "40%". */
export function abilityStatus(hero: HeroDef, charge: number, max: number): string {
  const left = abilityTurnsLeft(hero, charge, max);
  if (left === 0) return 'Ready';
  if (left === null) return `${charge}%`;
  return `Ready in ${left} turn${left === 1 ? '' : 's'}`;
}
