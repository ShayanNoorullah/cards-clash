import { audio } from '../services/audio';
import Phaser from 'phaser';
import { addBackground } from '../art/proceduralTextures';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { getContent } from '../engine/content';
import { achievementStatus, claimAchievement } from '../progression/achievements';
import { applyReward } from '../progression/client';
import { PROGRESSION, type Reward } from '../progression/config';
import {
  claimLogin,
  claimQuest,
  ensureDailyQuests,
  loginRewardAvailable,
  questComplete,
  questDef,
} from '../progression/daily';
import { saves } from '../save';
import { Button } from '../ui/Button';
import { Chips } from '../ui/Chips';
import { formatDuration } from '../ui/RewardReveal';
import { ScrollGrid } from '../ui/ScrollGrid';
import { COLORS, hex, textStyle } from '../ui/theme';
import { fadeIn, goToScene } from '../ui/transitions';

type Tab = 'daily' | 'achievements';

function rewardText(r: Reward): string {
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

/** Daily quests, the 7-day login calendar, and achievements. */
export class QuestsScene extends Phaser.Scene {
  private tab: Tab = 'daily';
  private body!: Phaser.GameObjects.Container;
  private grid!: ScrollGrid;

  constructor() {
    super(SCENE_KEYS.Quests);
  }

  create(): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    const fresh = ensureDailyQuests(saves().save, Date.now());
    if (fresh !== saves().save) void saves().commit(fresh);
    this.add.text(GAME_WIDTH / 2, 70, 'Quests', textStyle(76, { color: hex(COLORS.accent) })).setOrigin(0.5);
    new Button(this, 100, 70, 'Back', {
      width: 160,
      height: 80,
      fontSize: 34,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: () => goToScene(this, SCENE_KEYS.MainMenu),
    });
    new Chips(
      this,
      GAME_WIDTH / 2,
      180,
      [
        { value: 'daily', label: 'Daily' },
        { value: 'achievements', label: 'Achievements' },
      ],
      this.tab,
      (v) => {
        this.tab = v;
        this.render();
      },
      { fontSize: 32, height: 70 },
    );
    this.body = this.add.container(0, 0);
    this.grid = new ScrollGrid(this, {
      x: 0,
      y: 260,
      width: GAME_WIDTH,
      height: GAME_HEIGHT - 280,
      cols: 1,
      cellHeight: 170,
    });
    this.render();
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.tab === 'daily' && this.renderDailyTimer(),
    });
    this.input.keyboard?.on('keydown-ESC', () => goToScene(this, SCENE_KEYS.MainMenu));
  }

  private timer: Phaser.GameObjects.Text | null = null;

  private renderDailyTimer(): void {
    const d = new Date();
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    this.timer?.setText(`New quests in ${formatDuration(midnight - Date.now())}`);
  }

  private render(): void {
    this.body.removeAll(true);
    this.timer = null;
    if (this.tab === 'daily') {
      this.grid.setItems([]);
      this.grid.enabled = false;
      this.renderDaily();
    } else {
      this.grid.enabled = true;
      this.renderAchievements();
    }
  }

  private row(
    y: number,
    title: string,
    sub: string,
    progress: number,
    target: number,
    state: 'claim' | 'claimed' | 'progress',
    onClaim: () => void,
  ): void {
    const b = this.body;
    const w = GAME_WIDTH - 60;
    const g = this.add.graphics();
    g.fillStyle(COLORS.outline, 1);
    g.fillRoundedRect(26, y - 74, w + 8, 152, 28);
    g.fillStyle(state === 'claim' ? 0x1f5130 : COLORS.panel, 0.95);
    g.fillRoundedRect(30, y - 70, w, 144, 24);
    g.fillStyle(0x120c2b, 1);
    g.fillRoundedRect(60, y + 26, 560, 28, 14);
    g.fillStyle(0x6dff8a, 1);
    g.fillRoundedRect(64, y + 30, Math.max(20, 552 * Math.min(1, progress / target)), 20, 10);
    b.add(g);
    b.add(this.add.text(60, y - 38, title, textStyle(36)).setOrigin(0, 0.5));
    b.add(this.add.text(60, y - 2, sub, textStyle(24, { color: hex(COLORS.textDim) })).setOrigin(0, 0.5));
    b.add(this.add.text(640, y + 40, `${progress}/${target}`, textStyle(26)).setOrigin(0, 0.5));
    if (state === 'claim')
      b.add(
        new Button(this, GAME_WIDTH - 150, y, 'Claim', {
          width: 210,
          height: 90,
          fontSize: 36,
          onClick: onClaim,
        }),
      );
    else
      b.add(
        this.add
          .text(GAME_WIDTH - 150, y, state === 'claimed' ? '✓ Done' : '', textStyle(32, { color: '#8dff7a' }))
          .setOrigin(0.5),
      );
  }

  private renderDaily(): void {
    const save = saves().save;
    const content = getContent();
    let y = 330;
    this.body.add(
      this.add
        .text(60, y - 40, 'Daily quests', textStyle(40, { color: hex(COLORS.accent) }))
        .setOrigin(0, 0.5),
    );
    this.timer = this.add
      .text(GAME_WIDTH - 60, y - 40, '', textStyle(26, { color: hex(COLORS.textDim) }))
      .setOrigin(1, 0.5);
    this.body.add(this.timer);
    this.renderDailyTimer();
    y += 60;
    for (const q of save.quests.active) {
      const def = questDef(q.id);
      if (!def) continue;
      const state = q.claimed ? 'claimed' : questComplete(q) ? 'claim' : 'progress';
      this.row(
        y,
        def.text,
        `Reward: ${rewardText(def.reward)}`,
        q.progress,
        def.target,
        state,
        () =>
          void applyReward(this, (s, rng) => claimQuest(s, q.id, content, rng), 'Quest complete!').then(() =>
            this.render(),
          ),
      );
      y += 170;
    }
    this.body.add(
      this.add
        .text(60, y - 40, 'Daily login', textStyle(40, { color: hex(COLORS.accent) }))
        .setOrigin(0, 0.5),
    );
    y += 70;
    const claimedToday = !loginRewardAvailable(save, Date.now());
    const next = save.login.streakIndex;
    PROGRESSION.login.forEach((reward, i) => {
      const x = 105 + i * 145;
      const isNext = i === next && !claimedToday;
      // Days before the streak index are claimed; index 0 after today's claim means the cycle just completed.
      const done = claimedToday && next === 0 ? true : i < next;
      const g = this.add.graphics();
      g.fillStyle(isNext ? COLORS.accent : done ? 0x23863d : COLORS.panelLight, 1);
      g.fillRoundedRect(x - 66, y - 70, 132, 190, 20);
      this.body.add(g);
      this.body.add(
        this.add
          .text(
            x,
            y - 40,
            `Day ${i + 1}`,
            textStyle(26, { color: isNext ? '#120c2b' : '#ffffff', strokeThickness: isNext ? 0 : 4 }),
          )
          .setOrigin(0.5),
      );
      this.body.add(
        this.add
          .text(
            x,
            y + 30,
            rewardText(reward).replace(/ \+ /g, '\n'),
            textStyle(20, {
              color: isNext ? '#120c2b' : '#ffffff',
              strokeThickness: isNext ? 0 : 3,
              wordWrap: { width: 124 },
            }),
          )
          .setOrigin(0.5),
      );
    });
    y += 200;
    if (!claimedToday) {
      this.body.add(
        new Button(this, GAME_WIDTH / 2, y, `Claim day ${next + 1}`, {
          width: 500,
          height: 110,
          onClick: () =>
            void applyReward(
              this,
              (s, rng) => claimLogin(s, Date.now(), content, rng),
              `Day ${next + 1} reward`,
            ).then(() => this.render()),
        }),
      );
    } else {
      this.body.add(
        this.add
          .text(
            GAME_WIDTH / 2,
            y,
            'Come back tomorrow for the next reward!',
            textStyle(30, { color: hex(COLORS.textDim) }),
          )
          .setOrigin(0.5),
      );
    }
  }

  private renderAchievements(): void {
    const content = getContent();
    const list = achievementStatus(saves().save).sort(
      (a, b) =>
        Number(b.done && !b.claimed) - Number(a.done && !a.claimed) || Number(a.claimed) - Number(b.claimed),
    );
    this.grid.setItems(
      list.map((a) => ({
        build: (scene, x, y) => {
          const c = scene.add.container(x, y);
          const w = GAME_WIDTH - 60;
          const g = scene.add.graphics();
          const claimable = a.done && !a.claimed;
          g.fillStyle(COLORS.outline, 1);
          g.fillRoundedRect(-w / 2 - 4, -74, w + 8, 152, 28);
          g.fillStyle(claimable ? 0x1f5130 : COLORS.panel, 0.95);
          g.fillRoundedRect(-w / 2, -70, w, 144, 24);
          g.fillStyle(0x120c2b, 1);
          g.fillRoundedRect(-w / 2 + 30, 26, 560, 28, 14);
          g.fillStyle(0xffd23f, 1);
          g.fillRoundedRect(-w / 2 + 34, 30, Math.max(20, 552 * (a.progress / a.def.target)), 20, 10);
          c.add(g);
          c.add(
            scene.add
              .text(-w / 2 + 30, -38, `${a.def.name} — ${a.def.text}`, textStyle(32))
              .setOrigin(0, 0.5),
          );
          c.add(
            scene.add
              .text(
                -w / 2 + 30,
                -2,
                `Reward: ${rewardText(a.def.reward)}`,
                textStyle(24, { color: hex(COLORS.textDim) }),
              )
              .setOrigin(0, 0.5),
          );
          c.add(
            scene.add
              .text(-w / 2 + 610, 40, `${a.progress}/${a.def.target}`, textStyle(26))
              .setOrigin(0, 0.5),
          );
          c.add(
            scene.add
              .text(
                w / 2 - 120,
                0,
                a.claimed ? '✓ Done' : claimable ? 'Tap to claim' : '',
                textStyle(28, { color: '#8dff7a' }),
              )
              .setOrigin(0.5),
          );
          return c;
        },
        onTap: () => {
          if (a.done && !a.claimed)
            void applyReward(this, (s, rng) => claimAchievement(s, a.def.id, content, rng), a.def.name).then(
              () => this.render(),
            );
        },
      })),
    );
  }
}
