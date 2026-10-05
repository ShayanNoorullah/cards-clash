/**
 * Sandbox editing tools. These edit a copy of the match state directly (outside
 * the normal action pipeline), which is only allowed in Sandbox matches, where
 * nothing is recorded or rewarded. Pure.
 */
import { cloneState } from '../engine/state';
import type { CreatureInPlay, GameState, PlayerId, RulesContext } from '../engine/types';

export type SandboxEdit =
  | { type: 'refillMp'; player: PlayerId }
  | { type: 'chargeUltimate'; player: PlayerId }
  | { type: 'healHero'; player: PlayerId }
  | { type: 'drawCard'; player: PlayerId }
  | { type: 'addToHand'; player: PlayerId; cardId: string }
  | { type: 'spawnCreature'; player: PlayerId; lane: number; cardId: string }
  | { type: 'clearBoard'; player: PlayerId }
  | { type: 'readyCreatures'; player: PlayerId };

export const SANDBOX_HAND_LIMIT = 12;

/** Applies one edit. Returns null when the edit is not possible (e.g. full hand). */
export function applySandboxEdit(state: GameState, edit: SandboxEdit, ctx: RulesContext): GameState | null {
  if (state.phase !== 'main') return null;
  const s = cloneState(state);
  const p = s.players[edit.player];
  switch (edit.type) {
    case 'refillMp':
      p.mp = ctx.balance.maxMp;
      return s;
    case 'chargeUltimate':
      p.ultimateCharge = ctx.balance.ultimateChargeMax;
      return s;
    case 'healHero':
      p.hp = p.maxHp;
      return s;
    case 'drawCard': {
      const top = p.deck.shift();
      if (!top || p.hand.length >= SANDBOX_HAND_LIMIT) return null;
      p.hand.push(top);
      return s;
    }
    case 'addToHand': {
      const card = ctx.cards.byId.get(edit.cardId);
      if (!card || card.token || p.hand.length >= SANDBOX_HAND_LIMIT) return null;
      p.hand.push({ iid: `c${s.nextInstanceId++}`, cardId: card.id, owner: p.id });
      return s;
    }
    case 'spawnCreature': {
      const card = ctx.cards.byId.get(edit.cardId);
      const lane = p.lanes[edit.lane];
      if (!card || card.type !== 'creature' || !lane) return null;
      const creature: CreatureInPlay = {
        iid: `c${s.nextInstanceId++}`,
        cardId: card.id,
        owner: p.id,
        damage: 0,
        atkMod: 0,
        defMod: 0,
        tempAtk: 0,
        tempDef: 0,
        exhausted: false,
        summoningSick: false,
        movesThisTurn: 0,
        shield: card.keywords.includes('shield'),
        frozen: false,
        poison: 0,
        stealth: card.keywords.includes('stealth'),
        grantedKeywords: [],
        token: card.token === true,
      };
      lane.creature = creature;
      return s;
    }
    case 'clearBoard':
      for (const lane of p.lanes) {
        lane.creature = null;
        lane.building = null;
      }
      return s;
    case 'readyCreatures':
      for (const lane of p.lanes) {
        if (!lane.creature) continue;
        lane.creature.exhausted = false;
        lane.creature.summoningSick = false;
        lane.creature.frozen = false;
      }
      return s;
  }
}
