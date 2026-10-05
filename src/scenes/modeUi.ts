/**
 * Small pieces shared by the mode screens (Daily Dungeon, Gauntlet, Draft):
 * header, panels, reward text and a deck chooser.
 */
import type Phaser from 'phaser';
import { FONT_FAMILY, GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { PROGRESSION, type Reward } from '../progression/config';
import { Button } from '../ui/Button';
import { bodySize, COLORS, hex, textStyle } from '../ui/theme';
import { showToast } from '../ui/Toast';
import { goToScene } from '../ui/transitions';
import { playableDecks, type PlayerDeckChoice } from './matchStarts';

export function rewardText(r: Reward): string {
  return [
    r.coins ? `${r.coins} Coins` : '',
    r.gems ? `${r.gems} Gems` : '',
    r.dust ? `${r.dust} Dust` : '',
    r.xp ? `${r.xp} XP` : '',
    r.chest ? PROGRESSION.chests.types[r.chest].name : '',
  ]
    .filter(Boolean)
    .join(' + ');
}

export function modeHeader(scene: Phaser.Scene, title: string, back: string = SCENE_KEYS.Play): void {
  scene.add.text(GAME_WIDTH / 2, 80, title, textStyle(72, { color: hex(COLORS.accent) })).setOrigin(0.5);
  new Button(scene, 100, 80, 'Back', {
    width: 160,
    height: 80,
    fontSize: 34,
    color: COLORS.danger,
    shadowColor: COLORS.dangerDark,
    onClick: () => goToScene(scene, back),
  });
  scene.input.keyboard?.on('keydown-ESC', () => goToScene(scene, back));
}

export function panel(
  scene: Phaser.Scene,
  y: number,
  h: number,
  highlight = false,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const w = GAME_WIDTH - 60;
  g.fillStyle(COLORS.outline, 1);
  g.fillRoundedRect(26, y - 4, w + 8, h + 8, 30);
  g.fillStyle(highlight ? 0x1f5130 : COLORS.panel, 0.95);
  g.fillRoundedRect(30, y, w, h, 26);
  return g;
}

export function bodyText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 30,
  color = '#ffffff',
  width = GAME_WIDTH - 120,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: FONT_FAMILY,
    fontSize: `${bodySize(size)}px`,
    color,
    lineSpacing: 6,
    resolution: 2,
    wordWrap: { width, useAdvancedWrap: true },
  });
}

/** A button that cycles through the player's playable decks (remembered for the session). */
export class DeckChooser {
  private readonly decks: PlayerDeckChoice[];
  private index: number;
  private readonly button: Button;

  constructor(scene: Phaser.Scene, x: number, y: number, width = 760) {
    this.decks = playableDecks();
    const saved = scene.registry.get('modeDeck') as string | undefined;
    this.index = Math.max(
      0,
      this.decks.findIndex((d) => d.name === saved),
    );
    this.button = new Button(scene, x, y, '', {
      width,
      height: 90,
      fontSize: 32,
      color: COLORS.secondary,
      shadowColor: COLORS.secondaryDark,
      onClick: () => {
        if (this.decks.length < 2) {
          showToast(scene, 'Build more decks in Decks to switch between them.');
          return;
        }
        this.index = (this.index + 1) % this.decks.length;
        this.refresh(scene);
      },
    });
    this.refresh(scene);
  }

  get current(): PlayerDeckChoice {
    return this.decks[this.index]!;
  }

  private refresh(scene: Phaser.Scene): void {
    this.button.setLabel(`Your deck: ${this.current.name}${this.decks.length > 1 ? '  ▸' : ''}`);
    scene.registry.set('modeDeck', this.current.name);
  }
}
