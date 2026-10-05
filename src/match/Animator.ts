import { cardBackKey } from '../ui/cosmetic';
import { audio } from '../services/audio';
import { sfxForEvent } from './sfx';
import type Phaser from 'phaser';
import { CARD_H } from '../art/cardLayout';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import type { GameEvent } from '../engine/events';
import type { GameState, PlayerId, RulesContext, TargetRef } from '../engine/types';
import { getSettings } from '../services/settings';
import { CardView } from '../ui/CardView';
import { banner, burst, dur, floatText, shake, tweenAsync, wait } from './fx';
import type { BoardView } from './views/BoardView';

/**
 * Plays engine events as animations, strictly in order, then syncs the board
 * to the authoritative state. Animations never change game state.
 */
export class Animator {
  private running: Promise<void> = Promise.resolve();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly board: BoardView,
    private readonly ctx: RulesContext,
    private readonly names: [string, string],
  ) {}

  /** Queues a batch of events; resolves when it (and earlier batches) finished. */
  play(events: readonly GameEvent[], finalState: GameState): Promise<void> {
    this.running = this.running.then(() => this.run(events, finalState));
    return this.running;
  }

  private async run(events: readonly GameEvent[], finalState: GameState): Promise<void> {
    this.board.interactive = false;
    this.board.hand.enabled = false;
    try {
      let draws = 0;
      for (const e of events) {
        if (e.type === 'cardDrawn' && ++draws > 3) continue;
        await this.step(e, finalState);
      }
    } finally {
      this.board.sync(finalState);
      this.board.interactive = true;
      this.board.hand.enabled = true;
    }
  }

  private tokenPos(t: TargetRef): { x: number; y: number } {
    return this.board.targetPos(t);
  }

  private async step(e: GameEvent, final: GameState): Promise<void> {
    const scene = this.scene;
    const board = this.board;
    const sound = sfxForEvent(e, board.viewer, this.ctx.cards);
    if (sound) audio.play(sound);
    switch (e.type) {
      case 'turnStarted':
        await banner(
          scene,
          `${this.names[e.player]}'s turn`,
          e.player === board.viewer ? 0x6dff8a : 0xff9a3c,
          450,
        );
        return;
      case 'cardDrawn': {
        const from = board.deckPos(e.player);
        const to = e.player === board.viewer ? { x: GAME_WIDTH / 2, y: 1600 } : { x: from.x + 70, y: from.y };
        const back = scene.add.image(from.x, from.y, cardBackKey()).setDisplaySize(72, 100).setDepth(600);
        await tweenAsync(scene, { targets: back, x: to.x, y: to.y, duration: 220, ease: 'Cubic.Out' });
        back.destroy();
        return;
      }
      case 'cardPlayed':
        await this.cardPlayed(e.player, e.cardId, e.iid, e.lane);
        return;
      case 'creatureSummoned': {
        const t = board.spawnToken(e.player, e.lane, e.cardId, e.iid);
        if (t) {
          t.setScale(0.2 * t.baseScale);
          await tweenAsync(scene, { targets: t, scale: t.baseScale, duration: 260, ease: 'Back.Out' });
          const c = final.players[e.player].lanes[e.lane]?.creature;
          if (c?.iid === e.iid) t.refresh(final, this.ctx, c, e.lane);
        }
        return;
      }
      case 'cardReplaced':
        board.removeToken(e.iid);
        return;
      case 'buildingPlaced': {
        const lv = board.laneView(e.player, e.lane);
        lv.refresh(final.players[e.player].lanes[e.lane]!, this.ctx);
        floatText(scene, lv.x, lv.y - 40, this.ctx.cards.byId.get(e.cardId)?.name ?? '', '#fff3c4', 34);
        await wait(scene, 250);
        return;
      }
      case 'creatureMoved': {
        const t = board.tokenByIid(e.iid);
        if (!t) return;
        const to = board.creaturePos(e.player, e.to);
        board.setTokenLane(e.iid, e.to);
        await tweenAsync(scene, { targets: t, x: to.x, y: to.y, duration: 300, ease: 'Cubic.InOut' });
        return;
      }
      case 'floop': {
        const t = board.tokenByIid(e.iid);
        if (!t) return;
        floatText(scene, t.x, t.y - 90, 'Floop!', '#d9b8ff', 44);
        await tweenAsync(scene, { targets: t, scale: t.baseScale * 1.15, duration: 160, yoyo: true });
        t.setScale(t.baseScale);
        return;
      }
      case 'ultimateUsed': {
        const hero = this.ctx.heroes.byId.get(e.heroId);
        if (!getSettings().reducedMotion && dur(300) > 0) scene.cameras.main.flash(dur(250), 255, 230, 120);
        await banner(scene, hero ? `${hero.name}!` : 'Hero Ability!', 0xffd23f, 700);
        return;
      }
      case 'triggered': {
        const t = e.iid ? board.tokenByIid(e.iid) : undefined;
        if (t) await tweenAsync(scene, { targets: t, scale: t.baseScale * 1.1, duration: 120, yoyo: true });
        return;
      }
      case 'attack': {
        const t = board.tokenByIid(e.iid);
        if (!t) return;
        const home = { x: t.x, y: t.y };
        const target = this.tokenPos(e.target);
        const reach = getSettings().reducedMotion ? 0.2 : 0.65;
        t.setDepth(200);
        await tweenAsync(scene, {
          targets: t,
          x: home.x + (target.x - home.x) * reach,
          y: home.y + (target.y - home.y) * reach,
          duration: 180,
          ease: 'Cubic.In',
        });
        void tweenAsync(scene, { targets: t, x: home.x, y: home.y, duration: 220, ease: 'Cubic.Out' }).then(
          () => t.setDepth(100),
        );
        return;
      }
      case 'damage': {
        const pos = this.tokenPos(e.target);
        floatText(scene, pos.x, pos.y - 30, `-${e.amount}`, '#ff5f6d', 64);
        burst(scene, pos.x, pos.y, 0xff8a5c, 8);
        if (e.target.kind === 'hero') {
          const panel = board.heroPanel(e.target.player);
          panel.setHp(panel.displayedHp - e.amount);
          if (e.amount >= 3) shake(scene, 0.006 + Math.min(0.01, e.amount * 0.001));
        } else if (e.target.kind === 'creature') {
          const c = final.players[e.target.player].lanes[e.target.lane]?.creature;
          const t = c ? board.tokenByIid(c.iid) : undefined;
          if (t && dur(100) > 0) {
            const x = t.x;
            await tweenAsync(scene, { targets: t, x: x + 12, duration: 50, yoyo: true, repeat: 1 });
            t.x = x;
          }
        }
        await wait(scene, 140);
        return;
      }
      case 'heal': {
        const pos = this.tokenPos(e.target);
        floatText(scene, pos.x, pos.y - 30, `+${e.amount}`, '#7dff8a', 58);
        if (e.target.kind === 'hero') {
          const panel = board.heroPanel(e.target.player);
          panel.setHp(panel.displayedHp + e.amount);
        }
        await wait(scene, 120);
        return;
      }
      case 'shieldBroken':
      case 'shieldGained':
      case 'frozen':
      case 'thawed':
      case 'poisoned':
      case 'keywordGranted': {
        const pos = board.creaturePos(e.player, e.lane);
        const text =
          e.type === 'shieldBroken'
            ? 'Shield broken!'
            : e.type === 'shieldGained'
              ? 'Shield!'
              : e.type === 'frozen'
                ? 'Frozen!'
                : e.type === 'thawed'
                  ? 'Thawed'
                  : e.type === 'poisoned'
                    ? `Poison ${e.poison}`
                    : `+${e.keyword.split(':')[0]}`;
        const color =
          e.type === 'poisoned'
            ? '#d09cff'
            : e.type === 'frozen' || e.type === 'thawed'
              ? '#bfe8ff'
              : '#9fe7ff';
        floatText(scene, pos.x, pos.y - 70, text, color, 36);
        if (e.type !== 'thawed') await wait(scene, 160);
        return;
      }
      case 'statsChanged': {
        const pos = board.creaturePos(e.player, e.lane);
        floatText(scene, pos.x, pos.y + 40, `${e.atk}/${e.def}`, '#fff3a0', 40);
        await wait(scene, 120);
        return;
      }
      case 'creatureDestroyed': {
        const t = board.tokenByIid(e.iid);
        const pos = t ? { x: t.x, y: t.y } : board.creaturePos(e.player, e.lane);
        burst(scene, pos.x, pos.y, 0xffc93c, 26);
        if (t) await tweenAsync(scene, { targets: t, alpha: 0, scale: 0.6, angle: 12, duration: 260 });
        board.removeToken(e.iid);
        return;
      }
      case 'returnedToHand':
      case 'tokenVanished': {
        const t = board.tokenByIid(e.iid);
        if (t)
          await tweenAsync(scene, {
            targets: t,
            y: t.y + (e.player === board.viewer ? 400 : -300),
            alpha: 0,
            scale: 0.5,
            duration: 320,
          });
        board.removeToken(e.iid);
        return;
      }
      case 'landscapeFlipped':
      case 'landscapeRestored':
      case 'landscapeConverted': {
        const lv = board.laneView(e.player, e.lane);
        await lv.flipTween(() => lv.refresh(final.players[e.player].lanes[e.lane]!, this.ctx), dur(360));
        return;
      }
      case 'fatigue': {
        const pos = board.heroPos(e.player);
        floatText(scene, pos.x + 120, pos.y, 'Fatigue!', '#ffb0b0', 44);
        await wait(scene, 200);
        return;
      }
      case 'effectLimitReached':
        await banner(scene, 'Effect chain stopped!', 0xff5f6d, 500);
        return;
      case 'buildingDestroyed':
      case 'buildingReturned':
      case 'buildingMoved': {
        const lane = e.type === 'buildingMoved' ? e.from : e.lane;
        const pos = board.tilePos(e.player, lane);
        const label =
          e.type === 'buildingDestroyed' ? 'Destroyed!' : e.type === 'buildingReturned' ? 'To hand' : 'Moved';
        burst(scene, pos.x, pos.y, 0xb38cff, 18);
        floatText(scene, pos.x, pos.y - 40, label, '#e5d4ff', 34);
        await wait(scene, 220);
        return;
      }
      case 'cardRecovered': {
        const pos = board.deckPos(e.player);
        const name = this.ctx.cards.byId.get(e.cardId)?.name ?? '';
        floatText(scene, pos.x, pos.y - 60, e.stolen ? `Stolen: ${name}` : `+ ${name}`, '#b8ffb8', 30);
        await wait(scene, 200);
        return;
      }
      case 'status': {
        const pos = board.creaturePos(e.player, e.lane);
        const text = {
          floopLocked: 'No Floop!',
          attackLocked: 'No Attack!',
          redirect: 'Exposed!',
          reset: 'Reset',
          swapped: 'Swapped!',
        }[e.status];
        floatText(scene, pos.x, pos.y - 70, text, '#ffe08a', 34);
        await wait(scene, 160);
        return;
      }
      case 'laneSealed': {
        const pos = board.tilePos(e.player, e.lane);
        floatText(scene, pos.x, pos.y - 30, 'Sealed', '#ffb0b0', 34);
        await wait(scene, 160);
        return;
      }
      case 'playBlocked':
      case 'costChanged':
      case 'handCycled': {
        const pos = board.heroPos(e.player);
        const text =
          e.type === 'playBlocked'
            ? `No ${e.what}s next turn`
            : e.type === 'handCycled'
              ? 'New hand!'
              : e.amount < 0
                ? 'Cheaper!'
                : 'Costs more!';
        floatText(scene, pos.x + 160, pos.y, text, '#ffe08a', 32);
        await wait(scene, 160);
        return;
      }
      case 'cardDiscarded':
        if (e.from === 'hand') {
          const pos = board.deckPos(e.player);
          floatText(scene, pos.x, pos.y - 60, 'Discard', '#d0c8f0', 30);
        }
        return;
      default:
        return;
    }
  }

  private async cardPlayed(
    player: PlayerId,
    cardId: string,
    iid: string,
    lane: number | null,
  ): Promise<void> {
    const card = this.ctx.cards.byId.get(cardId);
    if (!card || dur(300) <= 0) return;
    const scene = this.scene;
    const board = this.board;
    const start =
      player === board.viewer
        ? (board.hand.positionOf(iid) ?? { x: GAME_WIDTH / 2, y: 1650 })
        : board.heroPos(player);
    const view = new CardView(scene, start.x, start.y, card).setScale(0.3).setDepth(650);
    const showY = GAME_HEIGHT / 2 - 150;
    const bigScale = Math.min(1.6, 900 / CARD_H);
    await tweenAsync(scene, {
      targets: view,
      x: GAME_WIDTH / 2,
      y: showY,
      scale: card.type === 'spell' ? bigScale : 1.1,
      duration: 260,
      ease: 'Cubic.Out',
    });
    await wait(scene, player === board.viewer ? 350 : 800);
    if (lane !== null) {
      const to = card.type === 'creature' ? board.creaturePos(player, lane) : board.tilePos(player, lane);
      await tweenAsync(scene, {
        targets: view,
        x: to.x,
        y: to.y,
        scale: 0.4,
        alpha: 0.4,
        duration: 220,
        ease: 'Cubic.In',
      });
    } else {
      await tweenAsync(scene, { targets: view, alpha: 0, scale: bigScale * 1.1, duration: 220 });
    }
    view.destroy();
  }
}
