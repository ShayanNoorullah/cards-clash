import { audio } from '../services/audio';
import Phaser from 'phaser';
import { ArtCache } from '../art/ArtCache';
import { addBackground } from '../art/proceduralTextures';
import { GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { getCampaign } from '../campaign/config';
import { getContent } from '../engine/content';
import {
  abandonGauntlet,
  claimGauntlet,
  gauntletOpponent,
  gauntletReward,
  startGauntlet,
} from '../modes/gauntlet';
import { applyReward } from '../progression/client';
import { PROGRESSION } from '../progression/config';
import { saves } from '../save';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { COLORS, hex, textStyle } from '../ui/theme';
import { showToast } from '../ui/Toast';
import { fadeIn, goToScene } from '../ui/transitions';
import { gauntletMatchData, runDeckFrom } from './matchStarts';
import { bodyText, DeckChooser, modeHeader, panel, rewardText } from './modeUi';

const AI_NAMES: Record<string, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  nightmare: 'Nightmare',
};

/** Start a run, see the next opponent and your HP, or claim the rewards when the run ends. */
export class GauntletScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Gauntlet);
  }

  create(): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    modeHeader(this, 'Gauntlet');
    const run = saves().save.modes.gauntlet;
    if (!run) this.renderStart();
    else if (run.over) this.renderOver(run.wins);
    else this.renderRun();
  }

  private rewardTable(y: number, highlight: number | null): void {
    const cfg = PROGRESSION.modes.gauntlet;
    panel(this, y, 70 + cfg.rewards.length * 46);
    this.add
      .text(60, y + 36, 'Rewards by wins', textStyle(32, { color: hex(COLORS.accent) }))
      .setOrigin(0, 0.5);
    cfg.rewards.forEach((r, wins) => {
      const color = wins === highlight ? '#8dff7a' : '#ffffff';
      this.add
        .text(80, y + 86 + wins * 46, `${wins} ${wins === 1 ? 'win ' : 'wins'}`, textStyle(28, { color }))
        .setOrigin(0, 0.5);
      this.add
        .text(260, y + 86 + wins * 46, rewardText(r) || '—', textStyle(26, { color }))
        .setOrigin(0, 0.5);
    });
  }

  private renderStart(): void {
    const cfg = PROGRESSION.modes.gauntlet;
    panel(this, 170, 270);
    bodyText(
      this,
      60,
      195,
      `Fight ${cfg.battles} battles in a row with one deck. Your Hero's HP carries over from battle to battle (you heal ${cfg.healBetween} HP after each win). One loss ends the run. The final opponent is a campaign boss!`,
      30,
    );
    this.rewardTable(470, null);
    const deck = new DeckChooser(this, GAME_WIDTH / 2, 1420);
    new Button(this, GAME_WIDTH / 2, 1600, 'Start the Gauntlet', {
      width: 700,
      height: 160,
      fontSize: 52,
      onClick: () => {
        const r = startGauntlet(
          saves().save,
          runDeckFrom(deck.current),
          `gauntlet:${Date.now()}`,
          getContent(),
        );
        if (!r.ok) {
          showToast(this, r.error);
          return;
        }
        void saves()
          .commit(r.save)
          .then(() => this.scene.restart());
      },
    });
  }

  private renderRun(): void {
    const run = saves().save.modes.gauntlet!;
    const content = getContent();
    const cfg = PROGRESSION.modes.gauntlet;
    const opp = gauntletOpponent(run, getCampaign(), content);
    const max = content.ctx.balance.heroMaxHp;

    // Progress: one circle per battle.
    for (let i = 0; i < cfg.battles; i++) {
      const x = GAME_WIDTH / 2 + (i - (cfg.battles - 1) / 2) * 150;
      const g = this.add.graphics();
      g.fillStyle(COLORS.outline, 1);
      g.fillCircle(x, 220, 48);
      g.fillStyle(i < run.wins ? 0x23863d : i === run.wins ? COLORS.accent : 0x3a3550, 1);
      g.fillCircle(x, 220, 42);
      this.add
        .text(
          x,
          220,
          i < run.wins ? '✓' : i === cfg.battles - 1 ? '♛' : String(i + 1),
          textStyle(36, {
            color: i === run.wins ? '#2a1f4d' : '#ffffff',
            strokeThickness: i === run.wins ? 0 : 5,
          }),
        )
        .setOrigin(0.5);
    }

    // HP bar.
    panel(this, 300, 150);
    this.add.text(60, 340, `${run.deck.name}`, textStyle(32)).setOrigin(0, 0.5);
    this.add
      .text(GAME_WIDTH - 60, 340, `HP ${run.hp}/${max}`, textStyle(32, { color: '#ff8a8a' }))
      .setOrigin(1, 0.5);
    const bar = this.add.graphics();
    bar.fillStyle(0x120c2b, 1);
    bar.fillRoundedRect(60, 380, GAME_WIDTH - 120, 40, 20);
    bar.fillStyle(0xe0413a, 1);
    bar.fillRoundedRect(64, 384, Math.max(30, (GAME_WIDTH - 128) * (run.hp / max)), 32, 16);

    // Next opponent.
    panel(this, 490, 420, opp.final);
    const hero = content.ctx.heroes.byId.get(opp.deck.heroId);
    if (hero) ArtCache.heroImage(this, 200, 700, hero).setDisplaySize(260, 260);
    this.add
      .text(
        360,
        560,
        opp.final ? 'Final battle' : `Battle ${opp.battle + 1} of ${cfg.battles}`,
        textStyle(30, { color: hex(COLORS.textDim) }),
      )
      .setOrigin(0, 0.5);
    this.add.text(360, 620, opp.name, textStyle(46, { color: hex(COLORS.accent) })).setOrigin(0, 0.5);
    bodyText(
      this,
      360,
      670,
      `${AI_NAMES[opp.ai]} AI · enemy cards Lv${opp.level}\nWin to earn: ${rewardText(gauntletReward(run.wins + 1))}`,
      28,
      '#ffffff',
      640,
    );

    new Button(this, GAME_WIDTH / 2, 1060, 'Fight!', {
      width: 700,
      height: 160,
      fontSize: 60,
      onClick: () => goToScene(this, SCENE_KEYS.Match, gauntletMatchData(run)),
    });
    new Button(this, GAME_WIDTH / 2, 1250, 'Abandon run', {
      width: 480,
      height: 100,
      fontSize: 34,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      caption: `keep the reward for ${run.wins} ${run.wins === 1 ? 'win' : 'wins'}`,
      onClick: () =>
        new Modal(
          this,
          'Abandon the Gauntlet?',
          `The run ends now with ${run.wins} wins. You can still claim that reward.`,
          [
            {
              label: 'Abandon',
              color: COLORS.danger,
              shadowColor: COLORS.dangerDark,
              onClick: () => {
                void saves()
                  .commit(abandonGauntlet(saves().save))
                  .then(() => this.scene.restart());
              },
            },
            { label: 'Keep going', onClick: () => undefined },
          ],
        ),
    });
    bodyText(
      this,
      60,
      1360,
      'You can leave and come back: the run is saved between battles.',
      26,
      hex(COLORS.textDim),
    );
  }

  private renderOver(wins: number): void {
    const cfg = PROGRESSION.modes.gauntlet;
    panel(this, 170, 200, wins === cfg.battles);
    this.add
      .text(
        GAME_WIDTH / 2,
        230,
        wins === cfg.battles ? 'Gauntlet conquered!' : 'Run over',
        textStyle(56, { color: hex(COLORS.accent) }),
      )
      .setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 310, `${wins}/${cfg.battles} wins`, textStyle(40)).setOrigin(0.5);
    this.rewardTable(420, wins);
    new Button(this, GAME_WIDTH / 2, 1500, 'Claim rewards', {
      width: 700,
      height: 160,
      fontSize: 54,
      onClick: () =>
        void applyReward(this, (s, rng) => claimGauntlet(s, getContent(), rng), 'Gauntlet rewards').then(() =>
          this.scene.restart(),
        ),
    });
  }
}
