import Phaser from 'phaser';
import { ArtCache } from '../art/ArtCache';
import { addBackground } from '../art/proceduralTextures';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { getContent } from '../engine/content';
import { claimableAchievements } from '../progression/achievements';
import { applyReward } from '../progression/client';
import { PROGRESSION } from '../progression/config';
import {
  claimLogin,
  ensureDailyQuests,
  loginRewardAvailable,
  nextLoginReward,
  questComplete,
} from '../progression/daily';
import { levelProgress } from '../progression/levels';
import {
  chestReadyAt,
  claimFreeChest,
  freeChestReady,
  isChestReady,
  isUnlocking,
  openChestSlot,
  openNowCost,
  startUnlock,
} from '../progression/rewards';
import { saves } from '../save';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { t } from '../i18n/strings';
import { addShine, addWordmark } from '../ui/logo';
import { getSettings } from '../services/settings';
import { audio } from '../services/audio';
import { LESSONS } from '../tutorial/tutorial';
import { tutorialMatchData } from './matchStarts';
import { drawChest, formatDuration } from '../ui/RewardReveal';
import { COLORS, hex, textStyle } from '../ui/theme';
import { showToast } from '../ui/Toast';
import { fadeIn, goToScene } from '../ui/transitions';

const CHEST_Y = 520;
const SLOT_X = [130, 330, 530, 730];
const FREE_X = 950;

/** Hub: player header, chests, Play and the other screens. */
export class MainMenuScene extends Phaser.Scene {
  private header!: Phaser.GameObjects.Container;
  private chests!: Phaser.GameObjects.Container;
  private questsButton!: Button;

  constructor() {
    super(SCENE_KEYS.MainMenu);
  }

  create(): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    const cx = GAME_WIDTH / 2;

    // Today's quests are picked on entering the menu.
    const withQuests = ensureDailyQuests(saves().save, Date.now());
    if (withQuests !== saves().save) void saves().commit(withQuests);

    this.header = this.add.container(0, 0);
    this.chests = this.add.container(0, 0);
    addWordmark(this, cx, 340, 96);

    const play = new Button(this, cx, 790, t('menu.play'), {
      width: 800,
      height: 190,
      fontSize: 92,
      color: 0xc98a2a,
      shadowColor: 0x5a3608,
      caption: t('menu.play.caption'),
      onClick: () => goToScene(this, SCENE_KEYS.Play),
    });
    // A warm glow behind PLAY, and a light sweep across it.
    const playGlow = this.add.graphics().setDepth(-1);
    for (let i = 10; i > 0; i--) {
      playGlow.fillStyle(0xffb347, 0.025);
      playGlow.fillRoundedRect(cx - 400 - i * 9, 790 - 95 - i * 9, 800 + i * 18, 200 + i * 18, 30 + i * 6);
    }
    if (!getSettings().reducedMotion)
      this.tweens.add({
        targets: playGlow,
        alpha: 0.4,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    const playMask = this.add.rectangle(cx, 790, 800, 190, 0xffffff).setVisible(false);
    addShine(this, cx, 790, 800, 190, playMask, 10, 2200);
    this.tweens.add({
      targets: play,
      scale: 1.03,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    const nav = (
      x: number,
      y: number,
      label: string,
      caption: string,
      onClick: () => void,
      color: number = COLORS.secondary,
      shadow: number = COLORS.secondaryDark,
    ) =>
      new Button(this, x, y, label, {
        width: 420,
        height: 140,
        fontSize: 52,
        color,
        shadowColor: shadow,
        caption,
        onClick,
      });
    nav(cx - 225, 1030, t('menu.collection'), t('menu.collection.caption'), () =>
      goToScene(this, SCENE_KEYS.Collection),
    );
    nav(cx + 225, 1030, t('menu.decks'), t('menu.decks.caption'), () => goToScene(this, SCENE_KEYS.Decks));
    nav(cx - 225, 1215, t('menu.shop'), t('menu.shop.caption'), () => goToScene(this, SCENE_KEYS.Shop));
    this.questsButton = nav(cx + 225, 1215, t('menu.quests'), t('menu.quests.caption'), () =>
      goToScene(this, SCENE_KEYS.Quests),
    );
    nav(cx - 225, 1400, t('menu.profile'), t('menu.profile.caption'), () =>
      goToScene(this, SCENE_KEYS.Profile),
    );
    nav(
      cx + 225,
      1400,
      t('menu.settings'),
      t('menu.settings.caption'),
      () => goToScene(this, SCENE_KEYS.Settings),
      0x4a4f66,
      0x1d2030,
    );

    this.add
      .text(cx, GAME_HEIGHT - 60, t('menu.footer'), textStyle(32, { color: hex(COLORS.textDim) }))
      .setOrigin(0.5);

    this.refresh();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.renderChests() });
    this.input.keyboard?.on('keydown-ESC', () => goToScene(this, SCENE_KEYS.Title));
    if (!saves().save.tutorial.offered) this.time.delayedCall(500, () => this.offerTutorial());
    else if (loginRewardAvailable(saves().save, Date.now()))
      this.time.delayedCall(500, () => this.offerLogin());
  }

  /** First launch: suggest the three short tutorial lessons (asked once). */
  private offerTutorial(): void {
    // Recorded as soon as it is shown: closing it any way (Back, tapping outside) counts as "not now".
    const offered = saves().commit({
      ...saves().save,
      tutorial: { ...saves().save.tutorial, offered: true },
    });
    new Modal(
      this,
      'Welcome to Cards Clash!',
      'New here? Three short lessons teach you everything: lanes, creatures, spells, Floop and Hero Abilities. You can replay them anytime from Play.',
      [
        {
          label: 'Start the tutorial',
          onClick: () => {
            void offered.then(() => goToScene(this, SCENE_KEYS.Match, tutorialMatchData(LESSONS[0]!.id)));
          },
        },
        {
          label: 'Skip for now',
          color: COLORS.secondary,
          shadowColor: COLORS.secondaryDark,
          onClick: () => {
            void offered.then(() => {
              if (loginRewardAvailable(saves().save, Date.now())) this.offerLogin();
            });
          },
        },
      ],
    );
  }

  private refresh(): void {
    this.renderHeader();
    this.renderChests();
    const save = saves().save;
    const pending =
      save.quests.active.filter((q) => questComplete(q) && !q.claimed).length +
      claimableAchievements(save) +
      (loginRewardAvailable(save, Date.now()) ? 1 : 0);
    this.questsButton.setLabel(pending > 0 ? `Quests (${pending})` : 'Quests');
  }

  private renderHeader(): void {
    const h = this.header;
    h.removeAll(true);
    const save = saves().save;
    const { ctx } = getContent();
    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 0.92);
    g.fillRoundedRect(16, 16, GAME_WIDTH - 32, 220, 34);
    h.add(g);
    const hero = ctx.heroes.byId.get(save.profile.avatar) ?? ctx.heroes.all[0]!;
    const avatar = ArtCache.heroImage(this, 120, 126, hero).setDisplaySize(170, 170);
    avatar.setInteractive({ useHandCursor: true });
    avatar.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => goToScene(this, SCENE_KEYS.Profile));
    h.add(avatar);
    h.add(this.add.text(230, 70, save.profile.name, textStyle(44)).setOrigin(0, 0.5));
    const p = levelProgress(save.progression.xp);
    h.add(this.add.text(230, 128, `Level ${p.level}`, textStyle(36, { color: '#fff3c4' })).setOrigin(0, 0.5));
    const bar = this.add.graphics();
    bar.fillStyle(0x120c2b, 1);
    bar.fillRoundedRect(230, 160, 420, 34, 17);
    bar.fillStyle(0x6dff8a, 1);
    bar.fillRoundedRect(234, 164, Math.max(26, 412 * p.ratio), 26, 13);
    h.add(bar);
    h.add(this.add.text(440, 177, `${p.into} / ${p.needed} XP`, textStyle(22)).setOrigin(0.5));
    const c = save.currencies;
    h.add(
      this.add
        .text(GAME_WIDTH - 50, 70, `${c.coins} Coins`, textStyle(36, { color: '#ffd23f' }))
        .setOrigin(1, 0.5),
    );
    h.add(
      this.add
        .text(GAME_WIDTH - 50, 125, `${c.gems} Gems`, textStyle(36, { color: '#8fd8ff' }))
        .setOrigin(1, 0.5),
    );
    h.add(
      this.add
        .text(GAME_WIDTH - 50, 180, `${c.dust} Dust`, textStyle(36, { color: '#d9b8ff' }))
        .setOrigin(1, 0.5),
    );
  }

  private renderChests(): void {
    const c = this.chests;
    for (const child of c.list) this.tweens.killTweensOf(child);
    c.removeAll(true);
    const save = saves().save;
    const now = Date.now();
    save.chests.slots.forEach((slot, i) => {
      const x = SLOT_X[i]!;
      const g = this.add.graphics();
      g.fillStyle(COLORS.outline, 0.85);
      g.fillRoundedRect(x - 90, CHEST_Y - 90, 180, 190, 24);
      c.add(g);
      if (!slot) {
        c.add(
          this.add
            .text(x, CHEST_Y, 'Empty\nslot', textStyle(26, { color: hex(COLORS.textDim) }))
            .setOrigin(0.5),
        );
        return;
      }
      const chest = drawChest(this, x, CHEST_Y - 10, slot.type, 0.62);
      c.add(chest);
      let label: string;
      let color = '#ffffff';
      if (isChestReady(slot, now)) {
        label = 'OPEN!';
        color = '#8dff7a';
        if (!this.tweens.isTweening(chest))
          this.tweens.add({ targets: chest, scale: 0.7, duration: 500, yoyo: true, repeat: -1 });
      } else if (slot.unlockStartedAt !== null) {
        label = formatDuration(chestReadyAt(slot)! - now);
        color = '#ffd27a';
      } else {
        label = formatDuration(PROGRESSION.chests.types[slot.type].unlockMinutes * 60_000);
      }
      c.add(this.add.text(x, CHEST_Y + 72, label, textStyle(26, { color })).setOrigin(0.5));
      const zone = this.add.zone(x, CHEST_Y, 180, 190).setInteractive({ useHandCursor: true });
      zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.chestTapped(i));
      c.add(zone);
    });

    // Free chest
    const g = this.add.graphics();
    g.fillStyle(0x0d2a1c, 0.95);
    g.fillRoundedRect(FREE_X - 90, CHEST_Y - 90, 180, 190, 18);
    g.lineStyle(3, COLORS.accent, 0.9);
    g.strokeRoundedRect(FREE_X - 90, CHEST_Y - 90, 180, 190, 18);
    c.add(g);
    c.add(drawChest(this, FREE_X, CHEST_Y - 10, PROGRESSION.chests.freeChest.type, 0.62));
    const ready = freeChestReady(save, now);
    c.add(
      this.add
        .text(
          FREE_X,
          CHEST_Y + 72,
          ready ? 'FREE!' : formatDuration(save.chests.freeReadyAt - now),
          textStyle(26, { color: ready ? '#8dff7a' : '#ffffff' }),
        )
        .setOrigin(0.5),
    );
    const fz = this.add.zone(FREE_X, CHEST_Y, 180, 190).setInteractive({ useHandCursor: true });
    fz.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      if (!freeChestReady(saves().save, Date.now())) {
        showToast(this, `Free chest in ${formatDuration(saves().save.chests.freeReadyAt - Date.now())}.`);
        return;
      }
      void applyReward(
        this,
        (s, rng) => claimFreeChest(s, Date.now(), getContent(), rng),
        'Free chest!',
      ).then(() => this.refresh());
    });
    c.add(fz);
  }

  private chestTapped(index: number): void {
    const save = saves().save;
    const slot = save.chests.slots[index];
    if (!slot) return;
    const now = Date.now();
    const def = PROGRESSION.chests.types[slot.type];
    const open = (useGems: boolean) =>
      void applyReward(
        this,
        (s, rng) => openChestSlot(s, index, Date.now(), getContent(), rng, useGems),
        def.name,
      ).then(() => this.refresh());
    if (isChestReady(slot, now)) {
      open(false);
      return;
    }
    const cost = openNowCost(slot, now);
    const buttons = [];
    if (slot.unlockStartedAt === null && !isUnlocking(save, now)) {
      buttons.push({
        label: `Start unlocking (${formatDuration(def.unlockMinutes * 60_000)})`,
        onClick: () => {
          const r = startUnlock(saves().save, index, Date.now());
          if (!r.ok) showToast(this, r.error);
          else
            void saves()
              .commit(r.save)
              .then(() => this.refresh());
        },
      });
    }
    buttons.push({
      label: `Open now (${cost} Gems)`,
      color: 0x3fa9ff,
      shadowColor: 0x1d5fa8,
      onClick: () => open(true),
    });
    buttons.push({
      label: 'Close',
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: () => undefined,
    });
    const status =
      slot.unlockStartedAt !== null
        ? `Unlocking: ${formatDuration(chestReadyAt(slot)! - now)} left.`
        : isUnlocking(save, now)
          ? 'Another chest is unlocking. Only one at a time.'
          : `Takes ${formatDuration(def.unlockMinutes * 60_000)} to unlock.`;
    new Modal(
      this,
      def.name,
      `${status}\nContains ${def.cards} cards, ${def.coins[0]}–${def.coins[1]} Coins and Dust.`,
      buttons,
    );
  }

  private offerLogin(): void {
    const { day, reward } = nextLoginReward(saves().save);
    const parts = [
      reward.coins ? `${reward.coins} Coins` : '',
      reward.gems ? `${reward.gems} Gems` : '',
      reward.dust ? `${reward.dust} Dust` : '',
      reward.chest ? PROGRESSION.chests.types[reward.chest].name : '',
    ].filter(Boolean);
    new Modal(this, `Daily reward — Day ${day}/7`, `Welcome back! Today: ${parts.join(' + ')}.`, [
      {
        label: 'Claim',
        onClick: () =>
          void applyReward(
            this,
            (s, rng) => claimLogin(s, Date.now(), getContent(), rng),
            `Day ${day} reward`,
          ).then(() => this.refresh()),
      },
    ]);
  }
}
