/**
 * Which sound each game event makes. Pure (the Animator plays the result).
 */
import type { GameEvent } from '../engine/events';
import type { CardDb, PlayerId } from '../engine/types';
import type { SfxId } from '../services/audio';

export function sfxForEvent(e: GameEvent, viewer: PlayerId, cards: CardDb): SfxId | null {
  switch (e.type) {
    case 'turnStarted':
      return e.player === viewer ? 'turnStart' : null;
    case 'turnEnded':
      return 'endTurn';
    case 'cardDrawn':
      return 'draw';
    case 'cardPlayed':
      return cards.byId.get(e.cardId)?.type === 'spell' ? 'spell' : 'play';
    case 'creatureSummoned':
      return 'summon';
    case 'buildingPlaced':
      return 'building';
    case 'creatureMoved':
      return 'move';
    case 'floop':
      return 'floop';
    case 'ultimateUsed':
      return 'ultimate';
    case 'attack':
      return 'attack';
    case 'damage':
      return e.target.kind === 'hero' ? 'heroHit' : 'hit';
    case 'fatigue':
      return 'heroHit';
    case 'heal':
      return 'heal';
    case 'creatureDestroyed':
      return 'destroy';
    case 'frozen':
      return 'freeze';
    case 'poisoned':
      return 'poison';
    case 'shieldGained':
    case 'shieldBroken':
      return 'shield';
    case 'landscapeFlipped':
    case 'landscapeRestored':
    case 'landscapeConverted':
      return 'flip';
    case 'returnedToHand':
    case 'cardDiscarded':
      return 'move';
    case 'ultimateCharge':
      return null;
    default:
      return null;
  }
}
