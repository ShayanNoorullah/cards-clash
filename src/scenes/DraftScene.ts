import { audio } from '../services/audio';
import Phaser from 'phaser';
import { ArtCache } from '../art/ArtCache';
import { ART_KEYS } from '../art/frames';
import { PALETTE } from '../art/palette';
import { addBackground } from '../art/proceduralTextures';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { getContent } from '../engine/content';
import type { LandscapeType } from '../engine/types';
import {
  claimDraft,
  draftCostText,
  draftDeck,
  draftOpponent,
  draftOver,
  draftReward,
  pickCard,
  pickHero,
  pickLandscape,
  primaryLandscape,
  retireDraft,
  startDraft,
  type DraftResult,
} from '../modes/draft';
import { applyReward } from '../progression/client';
import { PROGRESSION } from '../progression/config';
import { saves } from '../save';
import { Button } from '../ui/Button';
import { heroSummary } from '../ui/cardText';
import { CardView } from '../ui/CardView';
import { Modal } from '../ui/Modal';
import { COLORS, hex, textStyle } from '../ui/theme';
import { showToast } from '../ui/Toast';
import { fadeIn, goToScene } from '../ui/transitions';
import { draftMatchData } from './matchStarts';
import { bodyText, modeHeader, panel, rewardText } from './modeUi';

const AI_NAMES: Record<string, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  nightmare: 'Nightmare',
};

/** The whole Draft Arena flow, one screen per stage of the run. */
export class DraftScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Draft);
  }

  create(): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    modeHeader(this, 'Draft Arena');
    const run = saves().save.modes.draft;
    if (!run) this.renderEntry();
    else if (run.stage === 'hero') this.renderHeroes();
    else if (run.stage === 'landscape') this.renderLandscapes();
    else if (run.stage === 'cards') this.renderPick();
    else this.renderBattles();
  }

  private apply(op: (save: ReturnType<typeof saves>['save']) => DraftResult): void {
    const r = op(saves().save);
    if (!r.ok) {
      showToast(this, r.error);
      return;
    }
    void saves()
      .commit(r.save)
      .then(() => this.scene.restart());
  }

  private rewardTable(y: number, highlight: number | null): void {
    const cfg = PROGRESSION.modes.draft;
    panel(this, y, 70 + cfg.rewards.length * 44);
    this.add
      .text(60, y + 36, 'Rewards by wins', textStyle(32, { color: hex(COLORS.accent) }))
      .setOrigin(0, 0.5);
    cfg.rewards.forEach((r, wins) => {
      const color = wins === highlight ? '#8dff7a' : '#ffffff';
      const yy = y + 84 + wins * 44;
      this.add
        .text(80, yy, `${wins} ${wins === 1 ? 'win ' : 'wins'}`, textStyle(26, { color }))
        .setOrigin(0, 0.5);
      this.add.text(240, yy, rewardText(r), textStyle(24, { color })).setOrigin(0, 0.5);
    });
  }

  private renderEntry(): void {
    const cfg = PROGRESSION.modes.draft;
    panel(this, 170, 300);
    bodyText(
      this,
      60,
      195,
      `Build a deck on the spot: pick a hero, a second landscape, then ${cfg.picks} cards, one of three at a time. ${cfg.basicsPerLandscape * 2} basic creatures complete your deck. Play until ${cfg.maxWins} wins or ${cfg.maxLosses} losses. Drafted cards are for this run only. All cards play at level ${cfg.cardLevel}.`,
      29,
    );
    this.rewardTable(500, null);
    new Button(this, GAME_WIDTH / 2, 1560, `Enter · ${draftCostText()}`, {
      width: 700,
      height: 160,
      fontSize: 50,
      onClick: () => this.apply((s) => startDraft(s, `draft:${Date.now()}`, getContent())),
    });
    const c = saves().save.currencies;
    this.add
      .text(
        GAME_WIDTH / 2,
        1680,
        `You have ${c.coins} Coins · ${c.gems} Gems`,
        textStyle(28, { color: hex(COLORS.textDim) }),
      )
      .setOrigin(0.5);
  }

  private renderHeroes(): void {
    const run = saves().save.modes.draft!;
    const { ctx } = getContent();
    this.add.text(GAME_WIDTH / 2, 180, 'Choose your hero', textStyle(48)).setOrigin(0.5);
    run.heroOffer.forEach((id, i) => {
      const hero = ctx.heroes.byId.get(id);
      if (!hero) return;
      const y = 280 + i * 470;
      panel(this, y, 440);
      ArtCache.heroImage(this, 190, y + 150, hero).setDisplaySize(240, 240);
      this.add.text(340, y + 50, hero.name, textStyle(42, { color: hex(COLORS.accent) })).setOrigin(0, 0.5);
      bodyText(this, 340, y + 90, heroSummary(hero), 24, '#ffffff', 680);
      new Button(this, 190, y + 360, 'Pick', {
        width: 240,
        height: 100,
        onClick: () => this.apply((s) => pickHero(s, id, getContent())),
      });
    });
  }

  private renderLandscapes(): void {
    const run = saves().save.modes.draft!;
    const primary = primaryLandscape(run, getContent());
    this.add.text(GAME_WIDTH / 2, 180, 'Choose your second landscape', textStyle(46)).setOrigin(0.5);
    bodyText(
      this,
      60,
      240,
      `Your deck brings 2 × ${PALETTE[primary].name} (from your hero) and 2 of the landscape you pick. Cards are offered from both, plus neutral cards.`,
      28,
      hex(COLORS.textDim),
    );
    run.landscapeOffer.forEach((l: LandscapeType, i) => {
      const y = 480 + i * 380;
      panel(this, y, 340);
      this.add.image(260, y + 170, ART_KEYS.tile(l)).setDisplaySize(380, 238);
      this.add
        .text(500, y + 110, PALETTE[l].name, textStyle(44, { color: hex(COLORS.accent) }))
        .setOrigin(0, 0.5);
      new Button(this, 720, y + 230, 'Pick', {
        width: 260,
        height: 100,
        color: PALETTE[l].dark,
        shadowColor: COLORS.outline,
        onClick: () => this.apply((s) => pickLandscape(s, l, getContent())),
      });
    });
  }

  private renderPick(): void {
    const run = saves().save.modes.draft!;
    const { ctx } = getContent();
    const total = PROGRESSION.modes.draft.picks;
    this.add
      .text(GAME_WIDTH / 2, 180, `Pick ${run.picks.length + 1} of ${total}`, textStyle(48))
      .setOrigin(0.5);
    this.add
      .text(
        GAME_WIDTH / 2,
        240,
        'Tap a card to add it to your deck.',
        textStyle(28, { color: hex(COLORS.textDim) }),
      )
      .setOrigin(0.5);
    const scale = 1.08;
    run.offer.forEach((id, i) => {
      const card = ctx.cards.byId.get(id);
      if (!card) return;
      const x = GAME_WIDTH / 2 + (i - 1) * 345;
      const view = new CardView(this, x, 560, card).setScale(scale);
      view.setInteractive({ useHandCursor: true });
      view.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        audio.play('pick');
        this.apply((s) => pickCard(s, id, getContent()));
      });
    });
    // Picks so far: a mini mana curve and type counts.
    const picks = run.picks.map((id) => ctx.cards.byId.get(id)!);
    const curve = [0, 0, 0, 0, 0, 0, 0];
    for (const c of picks) curve[Math.min(6, c.cost)]!++;
    panel(this, 860, 420);
    this.add.text(60, 900, 'Your picks', textStyle(34, { color: hex(COLORS.accent) })).setOrigin(0, 0.5);
    const count = (t: string) => picks.filter((c) => c.type === t).length;
    this.add
      .text(
        GAME_WIDTH - 60,
        900,
        `${count('creature')} creatures · ${count('spell')} spells · ${count('building')} buildings`,
        textStyle(26),
      )
      .setOrigin(1, 0.5);
    const g = this.add.graphics();
    const maxN = Math.max(4, ...curve);
    curve.forEach((n, cost) => {
      const x = 130 + cost * 135;
      const h = (200 * n) / maxN;
      g.fillStyle(0x6dff8a, 0.9);
      g.fillRoundedRect(x - 40, 1180 - h, 80, Math.max(4, h), 8);
      this.add.text(x, 1215, cost === 6 ? '6+' : String(cost), textStyle(26)).setOrigin(0.5);
      if (n > 0) this.add.text(x, 1160 - h, String(n), textStyle(24)).setOrigin(0.5);
    });
    this.retireButton(1450, 'Retire draft', 'You lose the entry fee.');
  }

  private renderBattles(): void {
    const run = saves().save.modes.draft!;
    const content = getContent();
    const cfg = PROGRESSION.modes.draft;
    const deck = draftDeck(run, content);
    const hero = content.ctx.heroes.byId.get(run.heroId ?? '');
    panel(this, 170, 260);
    if (hero) ArtCache.heroImage(this, 150, 300, hero).setDisplaySize(200, 200);
    this.add
      .text(290, 230, hero?.name ?? 'Draft deck', textStyle(40, { color: hex(COLORS.accent) }))
      .setOrigin(0, 0.5);
    bodyText(
      this,
      290,
      270,
      `${[...new Set(run.landscapes)].map((l) => `2 × ${PALETTE[l].name}`).join(' · ')}\n${deck.cards.length} cards · Lv${cfg.cardLevel}`,
      26,
      '#ffffff',
      720,
    );
    new Button(this, 880, 380, 'View deck', {
      width: 260,
      height: 80,
      fontSize: 30,
      color: COLORS.secondary,
      shadowColor: COLORS.secondaryDark,
      onClick: () => this.showDeck(),
    });

    // Record: wins and losses as pips.
    panel(this, 460, 200);
    const pips = (label: string, n: number, max: number, y: number, color: number) => {
      this.add.text(60, y, label, textStyle(30)).setOrigin(0, 0.5);
      const g = this.add.graphics();
      for (let i = 0; i < max; i++) {
        g.fillStyle(i < n ? color : 0x3a3550, 1);
        g.fillCircle(260 + i * 80, y, 28);
      }
    };
    pips('Wins', run.wins, cfg.maxWins, 520, 0x23863d);
    pips('Losses', run.losses, cfg.maxLosses, 600, 0xe0413a);

    if (draftOver(run)) {
      this.rewardTable(700, run.wins);
      new Button(this, GAME_WIDTH / 2, 1680, 'Claim rewards', {
        width: 700,
        height: 150,
        fontSize: 52,
        onClick: () =>
          void applyReward(this, (s, rng) => claimDraft(s, getContent(), rng), 'Draft rewards').then(() =>
            this.scene.restart(),
          ),
      });
      return;
    }
    const opp = draftOpponent(run, content);
    panel(this, 700, 300);
    const oppHero = content.ctx.heroes.byId.get(opp.deck.heroId);
    if (oppHero) ArtCache.heroImage(this, 170, 850, oppHero).setDisplaySize(220, 220);
    this.add
      .text(320, 770, `Battle ${run.wins + run.losses + 1}`, textStyle(28, { color: hex(COLORS.textDim) }))
      .setOrigin(0, 0.5);
    this.add.text(320, 830, opp.name, textStyle(44, { color: hex(COLORS.accent) })).setOrigin(0, 0.5);
    bodyText(
      this,
      320,
      870,
      `${AI_NAMES[opp.ai]} AI · cards Lv${cfg.cardLevel}\nNext win pays: ${rewardText(draftReward(run.wins + 1))}`,
      26,
      '#ffffff',
      700,
    );
    new Button(this, GAME_WIDTH / 2, 1120, 'Battle!', {
      width: 700,
      height: 160,
      fontSize: 60,
      onClick: () => goToScene(this, SCENE_KEYS.Match, draftMatchData(run)),
    });
    this.retireButton(1320, 'Retire', `End the run now with ${run.wins} wins and claim that reward.`);
  }

  private retireButton(y: number, label: string, warning: string): void {
    new Button(this, GAME_WIDTH / 2, y, label, {
      width: 420,
      height: 100,
      fontSize: 34,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: () =>
        new Modal(this, 'Retire from the draft?', warning, [
          {
            label: 'Retire',
            color: COLORS.danger,
            shadowColor: COLORS.dangerDark,
            onClick: () => {
              void saves()
                .commit(retireDraft(saves().save))
                .then(() => this.scene.restart());
            },
          },
          { label: 'Keep drafting', onClick: () => undefined },
        ]),
    });
  }

  private showDeck(): void {
    const run = saves().save.modes.draft!;
    const { ctx } = getContent();
    const counts = new Map<string, number>();
    for (const id of draftDeck(run, getContent()).cards) counts.set(id, (counts.get(id) ?? 0) + 1);
    const cards = [...counts.entries()]
      .map(([id, n]) => ({ card: ctx.cards.byId.get(id)!, n }))
      .sort((a, b) => a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name));
    const o = this.add.container(0, 0).setDepth(500);
    const dim = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0820, 0.95)
      .setOrigin(0)
      .setInteractive();
    dim.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => o.destroy());
    o.add(dim);
    o.add(
      this.add
        .text(GAME_WIDTH / 2, 90, 'Draft deck', textStyle(56, { color: hex(COLORS.accent) }))
        .setOrigin(0.5),
    );
    const half = Math.ceil(cards.length / 2);
    cards.forEach(({ card, n }, i) => {
      const col = i < half ? 0 : 1;
      const row = i < half ? i : i - half;
      o.add(
        this.add
          .text(
            50 + col * 520,
            170 + row * 56,
            `${card.cost}  ${card.name}${n > 1 ? ` ×${n}` : ''}`,
            textStyle(26, { color: hex(PALETTE[card.landscape].light) }),
          )
          .setOrigin(0, 0.5),
      );
    });
    o.add(
      this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT - 60,
          'Tap anywhere to close',
          textStyle(28, { color: hex(COLORS.textDim) }),
        )
        .setOrigin(0.5),
    );
  }
}
