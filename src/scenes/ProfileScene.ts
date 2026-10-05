import Phaser from 'phaser';
import { ArtCache } from '../art/ArtCache';
import { ART_KEYS, CARD_BACK_STYLES, type CardBackStyle } from '../art/frames';
import { addBackground } from '../art/proceduralTextures';
import { GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { getCampaign } from '../campaign/config';
import { totalStars } from '../campaign/progress';
import { getContent } from '../engine/content';
import { t } from '../i18n/strings';
import { PROGRESSION } from '../progression/config';
import {
  avatarStatus,
  cardBackStatus,
  setAvatar,
  setCardBack,
  setProfileName,
  type CosmeticResult,
} from '../progression/cosmetics';
import { levelProgress } from '../progression/levels';
import { audio } from '../services/audio';
import { saves } from '../save';
import { LESSONS } from '../tutorial/tutorial';
import { Button } from '../ui/Button';
import { COLORS, hex, textStyle } from '../ui/theme';
import { showToast } from '../ui/Toast';
import { fadeIn, goToScene } from '../ui/transitions';
import { promptText } from './deckUi';
import { panel } from './modeUi';

/** Name, avatar, card back, level and lifetime stats. Cosmetics are earned, never bought. */
export class ProfileScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Profile);
  }

  create(): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    const content = getContent();
    const save = saves().save;
    this.add
      .text(GAME_WIDTH / 2, 80, t('profile.title'), textStyle(72, { color: hex(COLORS.accent) }))
      .setOrigin(0.5);
    new Button(this, 100, 80, t('common.back'), {
      width: 160,
      height: 80,
      fontSize: 34,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: () => goToScene(this, SCENE_KEYS.MainMenu),
    });
    this.input.keyboard?.on('keydown-ESC', () => goToScene(this, SCENE_KEYS.MainMenu));

    // Identity: avatar, name, level.
    panel(this, 160, 260);
    const hero = content.ctx.heroes.byId.get(save.profile.avatar) ?? content.ctx.heroes.all[0]!;
    ArtCache.heroImage(this, 170, 290, hero).setDisplaySize(200, 200);
    this.add.text(310, 220, save.profile.name, textStyle(52)).setOrigin(0, 0.5);
    const prog = levelProgress(save.progression.xp);
    this.add.text(310, 285, `Level ${prog.level}`, textStyle(34, { color: '#fff3c4' })).setOrigin(0, 0.5);
    const bar = this.add.graphics();
    bar.fillStyle(0x120c2b, 1);
    bar.fillRoundedRect(310, 320, 460, 30, 15);
    bar.fillStyle(0x6dff8a, 1);
    bar.fillRoundedRect(313, 323, Math.max(24, 454 * prog.ratio), 24, 12);
    new Button(this, 900, 300, t('profile.rename'), {
      width: 220,
      height: 90,
      fontSize: 32,
      color: COLORS.secondary,
      shadowColor: COLORS.secondaryDark,
      onClick: () =>
        promptText(
          this,
          t('profile.rename'),
          '2–16 letters or numbers',
          saves().save.profile.name,
          'Save',
          (value) => {
            const r = setProfileName(saves().save, value);
            if (!r.ok) return r.error;
            void saves()
              .commit(r.save)
              .then(() => this.scene.restart());
            return null;
          },
          [],
          16,
        ),
    });

    // Stats.
    const life = save.lifetime;
    const campaign = getCampaign();
    const winRate = life.matches > 0 ? Math.round((100 * life.wins) / life.matches) : 0;
    const collectible = content.ctx.cards.all.filter((c) => !c.token).length;
    const owned = Object.values(save.collection).filter((c) => c.count > 0).length;
    const stats: [string, string][] = [
      ['Matches', String(life.matches)],
      ['Wins / Losses', `${life.wins} / ${life.losses}`],
      ['Win rate', `${winRate}%`],
      ['Campaign stars', `${totalStars(save, campaign)} / ${campaign.nodes.size * 3}`],
      ['Collection', `${owned} / ${collectible}`],
      ['Achievements', `${save.achievements.claimed.length} / ${PROGRESSION.achievements.length}`],
      ['Creatures played', String(life.creaturesPlayed)],
      ['Spells cast', String(life.spellsCast)],
      ['Hero damage dealt', String(life.heroDamage)],
      ['Creatures destroyed', String(life.creaturesDestroyed)],
      ['Ultimates used', String(life.ultimatesUsed)],
      ['Chests opened', String(life.chestsOpened)],
      [
        'Tutorial',
        `${LESSONS.filter((l) => save.tutorial.done.includes(l.id)).length} / ${LESSONS.length} lessons`,
      ],
    ];
    panel(this, 440, 70 + Math.ceil(stats.length / 2) * 52);
    this.add
      .text(60, 475, t('profile.stats'), textStyle(36, { color: hex(COLORS.accent) }))
      .setOrigin(0, 0.5);
    stats.forEach(([k, v], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 60 + col * 500;
      const y = 530 + row * 52;
      this.add
        .text(x, y, k, textStyle(26, { color: hex(COLORS.textDim), strokeThickness: 3 }))
        .setOrigin(0, 0.5);
      this.add.text(x + 460, y, v, textStyle(28)).setOrigin(1, 0.5);
    });

    // Avatars: 8 heroes, then 8 campaign bosses.
    const avatarsTop = 920;
    this.add
      .text(60, avatarsTop, t('profile.avatar'), textStyle(36, { color: hex(COLORS.accent) }))
      .setOrigin(0, 0.5);
    avatarStatus(save, content).forEach((a, i) => {
      const x = 120 + (i % 8) * 120;
      const y = avatarsTop + 90 + Math.floor(i / 8) * 130;
      const h = content.ctx.heroes.byId.get(a.id);
      if (!h) return;
      const selected = save.profile.avatar === a.id;
      const g = this.add.graphics();
      g.fillStyle(selected ? COLORS.accent : COLORS.outline, 1);
      g.fillCircle(x, y, 56);
      const img = ArtCache.heroImage(this, x, y, h).setDisplaySize(100, 100);
      if (!a.unlocked) {
        img.setTint(0x333344).setAlpha(0.6);
        this.add.text(x, y, '🔒', textStyle(34)).setOrigin(0.5);
      }
      img.setInteractive({ useHandCursor: true });
      img.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () =>
        this.apply(setAvatar(saves().save, a.id, content), `${a.name}: ${a.requirement}`),
      );
    });

    // Card backs.
    const backsTop = 1260;
    this.add
      .text(60, backsTop, t('profile.cardBack'), textStyle(36, { color: hex(COLORS.accent) }))
      .setOrigin(0, 0.5);
    cardBackStatus(save).forEach((b, i) => {
      const x = 200 + i * 340;
      const y = backsTop + 200;
      const style: CardBackStyle = (CARD_BACK_STYLES as readonly string[]).includes(b.id)
        ? (b.id as CardBackStyle)
        : 'classic';
      const selected = save.profile.cardBack === b.id;
      const g = this.add.graphics();
      g.fillStyle(selected ? COLORS.accent : COLORS.outline, 1);
      g.fillRoundedRect(x - 98, y - 136, 196, 272, 20);
      const img = this.add.image(x, y, ART_KEYS.cardBack(style)).setDisplaySize(180, 252);
      if (!b.unlocked) img.setTint(0x333344);
      this.add
        .text(
          x,
          y + 170,
          b.unlocked ? b.name : `🔒 ${b.requirement}`,
          textStyle(24, { wordWrap: { width: 300 } }),
        )
        .setOrigin(0.5, 0);
      img.setInteractive({ useHandCursor: true });
      img.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () =>
        this.apply(setCardBack(saves().save, b.id), b.requirement),
      );
    });
  }

  private apply(r: CosmeticResult, lockedHint: string): void {
    if (!r.ok) {
      audio.play('error');
      showToast(this, r.error.startsWith('Locked') ? `${t('profile.locked')}: ${lockedHint}` : r.error);
      return;
    }
    audio.play('pick');
    void saves()
      .commit(r.save)
      .then(() => this.scene.restart());
  }
}
