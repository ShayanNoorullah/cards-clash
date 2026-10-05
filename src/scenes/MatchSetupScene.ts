import { audio } from '../services/audio';
import Phaser from 'phaser';
import { ArtCache } from '../art/ArtCache';
import { PALETTE } from '../art/palette';
import { addBackground } from '../art/proceduralTextures';
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { getContent } from '../engine/content';
import { DIFFICULTIES, type Difficulty } from '../ai/profiles';
import type { DeckList } from '../engine/types';
import type { MatchSetup, Seat } from '../match/MatchController';
import type { OnlineMatch } from '../online/client/OnlineMatch';
import { heroUnlocked } from '../progression/levels';
import { saves } from '../save';
import { isPlayable, slotToLeveledDeckList } from '../save/decks';
import { Button } from '../ui/Button';
import { COLORS, hex, textStyle } from '../ui/theme';
import { fadeIn, goToScene } from '../ui/transitions';

interface DeckOption {
  name: string;
  description: string;
  deck: DeckList;
}

/** Your playable saved decks first, then every starter deck. */
function deckOptions(): DeckOption[] {
  const { ctx, starterDecks } = getContent();
  const save = saves().save;
  const mine: DeckOption[] = [];
  save.decks.forEach((slot, i) => {
    if (slot && isPlayable(slot, save, ctx)) {
      mine.push({
        name: `${i === save.selectedDeck ? '★ ' : ''}${slot.name}`,
        description: 'One of your decks.',
        deck: slotToLeveledDeckList(slot, save),
      });
    }
  });
  return [
    ...mine,
    ...starterDecks.map((d) => ({ name: d.name, description: d.description, deck: d as DeckList })),
  ];
}

/** Where a match came from: decides its rewards and end screen. */
export type MatchContext =
  | { kind: 'quick' }
  | { kind: 'campaign'; nodeId: string }
  | { kind: 'tutorial'; lessonId: string }
  | { kind: 'daily'; day: string }
  | { kind: 'gauntlet' }
  | { kind: 'draft' }
  | { kind: 'sandbox' }
  | { kind: 'online' };

export interface MatchSceneData {
  seats: [Seat, Seat];
  seed: number | string;
  setup?: MatchSetup;
  context?: MatchContext;
  /** Online matches: the connected match (state comes from the server). */
  online?: OnlineMatch;
}

/** Local match setup: pick decks, and play against the AI or a friend (hot-seat). */
export class MatchSetupScene extends Phaser.Scene {
  private picks: [number, number] = [0, 1];
  /** Player 2 is a human (hot-seat) or an AI of the given difficulty. */
  private opponent: 'human' | Difficulty = 'normal';
  private subtitle!: Phaser.GameObjects.Text;
  private panels: Phaser.GameObjects.Container[] = [];

  constructor() {
    super(SCENE_KEYS.MatchSetup);
  }

  private options: DeckOption[] = [];

  create(): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    this.panels = [];
    this.options = deckOptions();
    const save = saves().save;
    const active = save.decks[save.selectedDeck];
    const activeName = active ? `★ ${active.name}` : '';
    const mineFirst = Math.max(
      0,
      this.options.findIndex((o) => o.name === activeName),
    );
    const starterStart = this.options.length - getContent().starterDecks.length;
    this.picks = [mineFirst, Math.min(this.options.length - 1, starterStart + 5)];
    this.add
      .text(GAME_WIDTH / 2, 110, 'Quick Match', textStyle(84, { color: hex(COLORS.accent) }))
      .setOrigin(0.5);
    this.subtitle = this.add
      .text(GAME_WIDTH / 2, 200, '', textStyle(34, { color: hex(COLORS.textDim) }))
      .setOrigin(0.5);

    for (const p of [0, 1] as const) this.panels.push(this.add.container(GAME_WIDTH / 2, 530 + p * 620));
    this.renderPanels();

    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 180, 'START', {
      width: 640,
      height: 150,
      fontSize: 70,
      onClick: () => this.start(),
    });
    new Button(this, 130, 90, 'Back', {
      width: 190,
      height: 90,
      fontSize: 38,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: () => goToScene(this, SCENE_KEYS.MainMenu),
    });
    this.input.keyboard?.on('keydown-ESC', () => goToScene(this, SCENE_KEYS.MainMenu));
  }

  private renderPanels(): void {
    const { ctx } = getContent();
    const starterDecks = this.options;
    this.subtitle.setText(
      this.opponent === 'human'
        ? 'Two players, one device. Pick a deck each.'
        : 'Pick your deck and your opponent. Tap Player 2 to change the AI.',
    );
    for (const p of [0, 1] as const) {
      const c = this.panels[p]!;
      c.removeAll(true);
      const option = starterDecks[this.picks[p]]!;
      const deck = { ...option.deck, name: option.name, description: option.description };
      const hero = ctx.heroes.byId.get(deck.heroId)!;
      const pal = PALETTE[hero.landscape];
      const g = this.add.graphics();
      g.fillStyle(COLORS.outline, 0.9);
      g.fillRoundedRect(-500, -270, 1000, 540, 40);
      g.lineStyle(6, pal.color, 1);
      g.strokeRoundedRect(-500, -270, 1000, 540, 40);
      c.add(g);
      if (p === 1) {
        const label =
          this.opponent === 'human'
            ? 'Player 2: Human'
            : `Player 2: AI (${this.opponent[0]!.toUpperCase()}${this.opponent.slice(1)})`;
        c.add(
          new Button(this, 0, -225, label, {
            width: 620,
            height: 80,
            fontSize: 38,
            color: this.opponent === 'human' ? COLORS.secondary : COLORS.accent,
            shadowColor: this.opponent === 'human' ? COLORS.secondaryDark : COLORS.accentDark,
            onClick: () => {
              const options: ('human' | Difficulty)[] = [...DIFFICULTIES, 'human'];
              this.opponent = options[(options.indexOf(this.opponent) + 1) % options.length]!;
              this.renderPanels();
            },
          }),
        );
      } else {
        c.add(this.add.text(0, -225, 'Player 1: You', textStyle(48)).setOrigin(0.5));
      }
      c.add(ArtCache.heroImage(this, -300, 20, hero).setDisplaySize(260, 260));
      c.add(this.add.text(-300, 180, hero.name, textStyle(30)).setOrigin(0.5));
      c.add(this.add.text(80, -130, deck.name, textStyle(50, { color: hex(pal.light) })).setOrigin(0.5));
      c.add(
        this.add
          .text(
            80,
            -70,
            `${deck.description}\n\nLandscapes: ${deck.landscapes.map((l) => PALETTE[l].name).join(', ')}`,
            {
              fontFamily: FONT_FAMILY,
              fontSize: '30px',
              color: '#ffffff',
              align: 'center',
              wordWrap: { width: 560, useAdvancedWrap: true },
              resolution: 2,
            },
          )
          .setOrigin(0.5, 0),
      );
      const arrow = (x: number, label: string, delta: number) =>
        c.add(
          new Button(this, x, 180, label, {
            width: 150,
            height: 100,
            fontSize: 56,
            color: COLORS.secondary,
            shadowColor: COLORS.secondaryDark,
            onClick: () => {
              // Player 1 can only pick decks whose hero they have unlocked.
              const level = saves().save.progression.level;
              let next = this.picks[p];
              for (let k = 0; k < starterDecks.length; k++) {
                next = (next + delta + starterDecks.length) % starterDecks.length;
                if (p === 1 || heroUnlocked(starterDecks[next]!.deck.heroId, level)) break;
              }
              this.picks[p] = next;
              this.renderPanels();
            },
          }),
        );
      arrow(-40, '<', -1);
      arrow(400, '>', 1);
      c.add(
        this.add
          .text(180, 180, `${this.picks[p] + 1} / ${starterDecks.length}`, textStyle(34))
          .setOrigin(0.5),
      );
    }
  }

  private start(): void {
    const starterDecks = this.options.map((o) => o.deck);
    const seats: [Seat, Seat] = [
      { name: 'Player 1', human: true, deck: starterDecks[this.picks[0]]! },
      this.opponent === 'human'
        ? { name: 'Player 2', human: true, deck: starterDecks[this.picks[1]]! }
        : {
            name: `AI (${this.opponent})`,
            human: false,
            deck: starterDecks[this.picks[1]]!,
            ai: { difficulty: this.opponent },
          },
    ];
    const data: MatchSceneData = { seats, seed: Date.now() };
    goToScene(this, SCENE_KEYS.Match, data);
  }
}
