import type Phaser from 'phaser';
import { CARD_H, CARD_W } from '../art/cardLayout';
import { FONT_FAMILY, GAME_WIDTH } from '../config/display';
import { other, type GameState, type PlayerId } from '../engine/types';
import type { Highlight, TutorialRunner } from '../tutorial/tutorial';
import { Button } from '../ui/Button';
import { COLORS } from '../ui/theme';
import { END_TURN, HAND_SCALE, TOKEN_H, TOKEN_W } from './layout';
import type { BoardView } from './views/BoardView';

const PANEL_Y = 1405;
const PANEL_H = 176;
const DEPTH = 380;

/**
 * The tutorial coach: a text panel above the hand (with "Next" on info steps)
 * and pulsing rings around whatever the current step points at.
 */
export class TutorialCoach {
  private readonly panel: Phaser.GameObjects.Container;
  private readonly text: Phaser.GameObjects.Text;
  private readonly nextBtn: Button;
  private readonly rings: Phaser.GameObjects.Container;
  private shownStep = -1;
  private pulse: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly board: BoardView,
    private readonly runner: TutorialRunner,
    onNext: () => void,
  ) {
    this.rings = scene.add.container(0, 0).setDepth(DEPTH + 10);
    this.panel = scene.add.container(GAME_WIDTH / 2, PANEL_Y).setDepth(DEPTH);
    const g = scene.add.graphics();
    g.fillStyle(COLORS.outline, 1);
    g.fillRoundedRect(-524, -PANEL_H / 2 - 4, 1048, PANEL_H + 8, 30);
    g.fillStyle(0xfff3c4, 1);
    g.fillRoundedRect(-520, -PANEL_H / 2, 1040, PANEL_H, 26);
    // Swallow taps on the panel so they don't reach the board underneath.
    const hit = scene.add.zone(0, 0, 1040, PANEL_H).setInteractive();
    this.text = scene.add
      .text(-495, 0, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '29px',
        color: '#2a1f4d',
        lineSpacing: 4,
        resolution: 2,
        wordWrap: { width: 990, useAdvancedWrap: true },
      })
      .setOrigin(0, 0.5);
    this.nextBtn = new Button(scene, 420, 46, 'Next', {
      width: 170,
      height: 72,
      fontSize: 32,
      onClick: onNext,
    });
    this.panel.add([g, hit, this.text, this.nextBtn]);
    this.pulse = scene.tweens.add({
      targets: this.rings,
      alpha: { from: 1, to: 0.55 },
      duration: 650,
      yoyo: true,
      repeat: -1,
    });
    this.hide();
  }

  /** Shows the current step when it's the player's turn and nothing else is on screen. */
  update(state: GameState, viewer: PlayerId, canShow: boolean, compact: boolean): void {
    const step = this.runner.step;
    if (!step || !canShow || state.phase !== 'main' || state.activePlayer !== viewer) {
      this.hide();
      return;
    }
    const info = !step.expect;
    if (this.shownStep !== this.runner.stepIndex) {
      this.shownStep = this.runner.stepIndex;
      this.text.setWordWrapWidth(info ? 800 : 990);
      this.text.setText(step.text);
    }
    this.nextBtn.setVisible(info);
    // While choosing a lane or target the Cancel button sits where the panel is.
    this.panel.setVisible(!compact);
    this.drawRings(step.highlight ?? [], state, viewer);
    this.rings.setVisible(true);
  }

  hide(): void {
    this.panel.setVisible(false);
    this.rings.setVisible(false);
  }

  destroy(): void {
    this.pulse.remove();
    this.panel.destroy();
    this.rings.destroy();
  }

  private drawRings(highlights: readonly Highlight[], state: GameState, viewer: PlayerId): void {
    this.rings.removeAll(true);
    const g = this.scene.add.graphics();
    this.rings.add(g);
    g.lineStyle(10, 0xffd23f, 1);
    const box = (x: number, y: number, w: number, h: number) => {
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 24);
      // Point down at the target, or up at it when it is at the very top of the screen.
      const above = y - h / 2 - 34 > 30;
      this.rings.add(
        this.scene.add
          .text(x, above ? y - h / 2 - 34 : y + h / 2 + 34, above ? '▼' : '▲', {
            fontFamily: FONT_FAMILY,
            fontSize: '48px',
            color: '#ffd23f',
            stroke: '#2a1f4d',
            strokeThickness: 8,
          })
          .setOrigin(0.5),
      );
    };
    const side = (s: 'me' | 'enemy'): PlayerId => (s === 'me' ? viewer : other(viewer));
    for (const h of highlights) {
      switch (h.kind) {
        case 'hand': {
          const inst = state.players[viewer].hand.find((c) => c.cardId === h.card);
          const pos = inst ? this.board.hand.positionOf(inst.iid) : null;
          if (pos) box(pos.x, pos.y, CARD_W * HAND_SCALE + 24, CARD_H * HAND_SCALE + 24);
          break;
        }
        case 'lane':
        case 'creature': {
          const pos = this.board.creaturePos(side(h.side), h.lane);
          const sc = this.board.creatureScale(side(h.side), h.lane);
          if (h.kind === 'lane') {
            const tile = this.board.tilePos(side(h.side), h.lane);
            box(tile.x, tile.y, 250 * sc, 440 * sc);
          } else box(pos.x, pos.y - 40 * sc, (TOKEN_W + 30) * sc, (TOKEN_H + 30) * sc);
          break;
        }
        case 'hero': {
          const pos = this.board.heroPos(side(h.side));
          box(pos.x, pos.y, 200, 200);
          break;
        }
        case 'deck': {
          const pos = this.board.deckPos(viewer);
          box(pos.x, pos.y, 150, 190);
          break;
        }
        case 'endTurn':
          box(END_TURN.x, END_TURN.y, END_TURN.w + 24, END_TURN.h + 24);
          break;
      }
    }
  }
}
