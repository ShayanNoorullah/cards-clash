import { audio } from '../services/audio';
import Phaser from 'phaser';
import { ArtCache } from '../art/ArtCache';
import { ART_KEYS } from '../art/frames';
import { PALETTE } from '../art/palette';
import { addBackground } from '../art/proceduralTextures';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { getContent } from '../engine/content';
import { deckSlotsUnlocked } from '../progression/levels';
import { saves } from '../save';
import { decodeDeck, deckIssues, deckSize, encodeDeck } from '../save/decks';
import { deckSlotFromList, type DeckSlot } from '../save/saveData';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ScrollGrid } from '../ui/ScrollGrid';
import { COLORS, hex, textStyle } from '../ui/theme';
import { showToast } from '../ui/Toast';
import { fadeIn, goToScene } from '../ui/transitions';
import { pickFromList, promptText, showDeckCode } from './deckUi';

const ROW_H = 210;

/** The 10 deck slots: create, edit, activate, share, import, duplicate, delete. */
export class DecksScene extends Phaser.Scene {
  private grid!: ScrollGrid;

  constructor() {
    super(SCENE_KEYS.Decks);
  }

  create(): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    const header = this.add.graphics().setDepth(10);
    header.fillStyle(COLORS.panel, 0.95);
    header.fillRect(0, 0, GAME_WIDTH, 200);
    this.add
      .text(GAME_WIDTH / 2, 70, 'My Decks', textStyle(72, { color: hex(COLORS.accent) }))
      .setOrigin(0.5)
      .setDepth(11);
    this.add
      .text(
        GAME_WIDTH / 2,
        150,
        'Tap a deck to edit, share or make it your active deck.',
        textStyle(28, { color: hex(COLORS.textDim) }),
      )
      .setOrigin(0.5)
      .setDepth(11);
    new Button(this, 100, 70, 'Back', {
      width: 160,
      height: 80,
      fontSize: 34,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: () => goToScene(this, SCENE_KEYS.MainMenu),
    }).setDepth(11);
    this.grid = new ScrollGrid(this, {
      x: 0,
      y: 210,
      width: GAME_WIDTH,
      height: GAME_HEIGHT - 210,
      cols: 1,
      cellHeight: ROW_H,
    });
    this.refresh();
    this.input.keyboard?.on('keydown-ESC', () => goToScene(this, SCENE_KEYS.MainMenu));
  }

  private refresh(): void {
    const save = saves().save;
    this.grid.setItems(
      save.decks.map((slot, i) => ({
        build: (scene, x, y) => this.row(scene, x, y, slot, i),
        onTap: () => {
          if (!slot && i >= this.unlockedSlots()) {
            showToast(this, `This slot unlocks at level ${this.slotUnlockLevel(i)}.`);
            return;
          }
          if (slot) this.slotActions(i, slot);
          else this.newDeck(i);
        },
      })),
      true,
    );
  }

  private row(
    scene: Phaser.Scene,
    x: number,
    y: number,
    slot: DeckSlot | null,
    i: number,
  ): Phaser.GameObjects.Container {
    const { ctx } = getContent();
    const save = saves().save;
    const c = scene.add.container(x, y);
    const w = GAME_WIDTH - 60;
    const h = ROW_H - 24;
    const g = scene.add.graphics();
    const active = save.selectedDeck === i;
    g.fillStyle(COLORS.outline, 1);
    g.fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 30);
    g.fillStyle(slot ? COLORS.panel : COLORS.panelLight, 0.95);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 26);
    if (active) {
      g.lineStyle(6, COLORS.accent, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 26);
    }
    c.add(g);
    if (!slot) {
      const locked = i >= this.unlockedSlots();
      c.add(
        scene.add
          .text(
            0,
            0,
            locked
              ? `🔒  Slot ${i + 1} — unlocks at level ${this.slotUnlockLevel(i)}`
              : `+  New deck (slot ${i + 1})`,
            textStyle(locked ? 34 : 44, { color: hex(COLORS.textDim) }),
          )
          .setOrigin(0.5),
      );
      return c;
    }
    const hero = ctx.heroes.byId.get(slot.heroId);
    if (hero) c.add(ArtCache.heroImage(scene, -w / 2 + 90, 0, hero).setDisplaySize(140, 140));
    c.add(
      scene.add.text(-w / 2 + 185, -48, `${active ? '★ ' : ''}${slot.name}`, textStyle(40)).setOrigin(0, 0.5),
    );
    slot.landscapes.forEach((l, k) =>
      c.add(scene.add.image(-w / 2 + 210 + k * 56, 8, ART_KEYS.landIcon(l)).setDisplaySize(50, 50)),
    );
    c.add(
      scene.add
        .text(
          -w / 2 + 450,
          8,
          hero?.name ?? '',
          textStyle(28, { color: hero ? hex(PALETTE[hero.landscape].light) : '#fff' }),
        )
        .setOrigin(0, 0.5),
    );
    const issues = deckIssues(slot, save, ctx);
    const status =
      issues.errors.length === 0
        ? issues.warnings.length === 0
          ? 'Ready to play'
          : `Playable · ${issues.warnings.length} warning(s)`
        : `${deckSize(slot)}/${ctx.balance.deckSize} cards · not playable yet`;
    c.add(
      scene.add
        .text(
          -w / 2 + 185,
          58,
          status,
          textStyle(28, { color: issues.errors.length ? '#ff9a9a' : '#8dff7a' }),
        )
        .setOrigin(0, 0.5),
    );
    return c;
  }

  private unlockedSlots(): number {
    const save = saves().save;
    return deckSlotsUnlocked(save.progression.level, save.decks.length);
  }

  private slotUnlockLevel(i: number): number {
    let lvl = 1;
    while (deckSlotsUnlocked(lvl, saves().save.decks.length) <= i) lvl++;
    return lvl;
  }

  private firstEmpty(): number {
    const limit = this.unlockedSlots();
    return saves().save.decks.findIndex((d, i) => !d && i < limit);
  }

  private newDeck(i: number): void {
    const { starterDecks, ctx } = getContent();
    pickFromList(this, `New deck (slot ${i + 1})`, [
      {
        label: 'Empty deck',
        onPick: () =>
          void this.createAndEdit(
            i,
            deckSlotFromList(
              `deck-${Date.now()}`,
              `Deck ${i + 1}`,
              ctx.heroes.all[0]!.id,
              ['golden', 'golden', 'golden', 'golden'],
              [],
              Date.now(),
            ),
          ),
      },
      {
        label: 'Copy a starter deck',
        onPick: () =>
          pickFromList(
            this,
            'Starter decks',
            starterDecks.map((d) => ({
              label: d.name,
              onPick: () =>
                void this.createAndEdit(
                  i,
                  deckSlotFromList(`deck-${Date.now()}`, d.name, d.heroId, d.landscapes, d.cards, Date.now()),
                ),
            })),
          ),
      },
      { label: 'Import a deck code', onPick: () => this.importCode(i) },
    ]);
  }

  private async createAndEdit(i: number, slot: DeckSlot): Promise<void> {
    await saves().update((s) => {
      s.decks[i] = slot;
    });
    goToScene(this, SCENE_KEYS.DeckBuilder, { slot: i });
  }

  private importCode(i: number): void {
    promptText(this, 'Import deck', 'Paste a deck code (starts with CC1-).', '', 'Import', (code) => {
      const r = decodeDeck(code, getContent());
      if (!r.ok) return r.error;
      void this.createAndEdit(i, {
        id: `deck-${Date.now()}`,
        name: `Imported ${i + 1}`,
        heroId: r.heroId,
        landscapes: r.landscapes,
        cards: r.cards,
        updatedAt: Date.now(),
      });
      return null;
    });
  }

  private slotActions(i: number, slot: DeckSlot): void {
    const { ctx } = getContent();
    const playable = deckIssues(slot, saves().save, ctx).errors.length === 0;
    pickFromList(this, slot.name, [
      {
        label: 'Edit',
        color: COLORS.primary,
        onPick: () => goToScene(this, SCENE_KEYS.DeckBuilder, { slot: i }),
      },
      {
        label: 'Set as active deck',
        caption: playable ? 'used for Quick Match' : 'finish the deck first',
        onPick: () => {
          if (!playable) {
            showToast(this, 'Finish the deck (40 legal cards you own) first.');
            return;
          }
          void saves()
            .update((s) => void (s.selectedDeck = i))
            .then(() => this.refresh());
        },
      },
      { label: 'Share deck code', onPick: () => showDeckCode(this, encodeDeck(slot)) },
      {
        label: 'Duplicate',
        onPick: () => {
          const target = this.firstEmpty();
          if (target < 0) {
            showToast(this, 'All 10 slots are full.');
            return;
          }
          void saves()
            .update(
              (s) =>
                void (s.decks[target] = {
                  ...structuredClone(slot),
                  id: `deck-${Date.now()}`,
                  name: `${slot.name} (copy)`.slice(0, 24),
                }),
            )
            .then(() => this.refresh());
        },
      },
      {
        label: 'Delete',
        color: COLORS.danger,
        onPick: () => {
          new Modal(
            this,
            'Delete deck?',
            `"${slot.name}" will be removed. Your cards stay in your collection.`,
            [
              {
                label: 'Delete',
                color: COLORS.danger,
                shadowColor: COLORS.dangerDark,
                onClick: () =>
                  void saves()
                    .update((s) => {
                      s.decks[i] = null;
                      if (s.selectedDeck === i) s.selectedDeck = Math.max(0, s.decks.findIndex(Boolean));
                    })
                    .then(() => this.refresh()),
              },
              { label: 'Keep', onClick: () => undefined },
            ],
          ).setDepth(600);
        },
      },
    ]);
  }
}
