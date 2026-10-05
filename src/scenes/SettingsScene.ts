import Phaser from 'phaser';
import { addBackground } from '../art/proceduralTextures';
import { GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { LANGUAGES, t } from '../i18n/strings';
import { LESSONS } from '../tutorial/tutorial';
import { audio } from '../services/audio';
import { getSettings, updateSettings, type AnimationSpeed } from '../services/settings';
import { Button } from '../ui/Button';
import { Chips } from '../ui/Chips';
import { Slider } from '../ui/Slider';
import { bodySize, COLORS, hex, textStyle } from '../ui/theme';
import { fadeIn, goToScene } from '../ui/transitions';
import { tutorialMatchData } from './matchStarts';
import { panel } from './modeUi';

const TEXT_SIZES = [
  { value: '0.9', label: '90%' },
  { value: '1', label: '100%' },
  { value: '1.15', label: '115%' },
  { value: '1.3', label: '130%' },
];

/** Audio, motion, text size, board view, accessibility and language. Saved instantly. */
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Settings);
  }

  create(): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    const s = getSettings();
    this.add
      .text(GAME_WIDTH / 2, 80, t('settings.title'), textStyle(72, { color: hex(COLORS.accent) }))
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

    const heading = (y: number, key: Parameters<typeof t>[0]) =>
      this.add.text(60, y, t(key), textStyle(38, { color: hex(COLORS.accent) })).setOrigin(0, 0.5);
    const label = (y: number, text: string, help?: string) => {
      this.add.text(60, y, text, textStyle(32)).setOrigin(0, 0.5);
      if (help)
        this.add
          .text(60, y + 36, help, textStyle(22, { color: hex(COLORS.textDim), strokeThickness: 3 }))
          .setOrigin(0, 0.5);
    };
    const onOff = (x: number, y: number, value: boolean, onChange: (v: boolean) => void) =>
      new Chips(
        this,
        x,
        y,
        [
          { value: 'on', label: t('common.on') },
          { value: 'off', label: t('common.off') },
        ],
        value ? 'on' : 'off',
        (v) => onChange(v === 'on'),
        { fontSize: 28, height: 60 },
      );

    // Audio
    panel(this, 160, 250);
    heading(200, 'settings.audio');
    label(270, t('settings.music'));
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const musicPct = this.add.text(GAME_WIDTH - 60, 270, pct(s.musicVolume), textStyle(28)).setOrigin(1, 0.5);
    new Slider(this, 640, 270, 420, s.musicVolume, (v) => {
      updateSettings({ musicVolume: v });
      musicPct.setText(pct(v));
    });
    label(350, t('settings.sfx'));
    const sfxPct = this.add.text(GAME_WIDTH - 60, 350, pct(s.sfxVolume), textStyle(28)).setOrigin(1, 0.5);
    new Slider(
      this,
      640,
      350,
      420,
      s.sfxVolume,
      (v) => {
        updateSettings({ sfxVolume: v });
        sfxPct.setText(pct(v));
      },
      () => audio.play('coins'),
    );

    // Display & motion
    panel(this, 440, 640);
    heading(480, 'settings.display');
    label(560, t('settings.speed'));
    new Chips<'1' | '2' | 'instant'>(
      this,
      760,
      560,
      [
        { value: '1', label: t('settings.speed.normal') },
        { value: '2', label: t('settings.speed.fast') },
        { value: 'instant', label: t('settings.speed.instant') },
      ],
      String(s.animationSpeed) as '1' | '2' | 'instant',
      (v) => updateSettings({ animationSpeed: (v === 'instant' ? 'instant' : Number(v)) as AnimationSpeed }),
      { fontSize: 26, height: 60, maxWidth: 520 },
    );
    label(660, t('settings.reducedMotion'), t('settings.reducedMotion.help'));
    onOff(860, 660, s.reducedMotion, (v) => updateSettings({ reducedMotion: v }));
    label(770, t('settings.textSize'));
    const sample = this.add
      .text(
        60,
        830,
        'The quick brown fox floops the lazy dog.',
        textStyle(bodySize(30), { color: '#fff3c4' }),
      )
      .setOrigin(0, 0.5);
    new Chips(
      this,
      760,
      770,
      TEXT_SIZES,
      TEXT_SIZES.reduce((best, o) =>
        Math.abs(Number(o.value) - s.textScale) < Math.abs(Number(best.value) - s.textScale) ? o : best,
      ).value,
      (v) => {
        updateSettings({ textScale: Number(v) });
        sample.setFontSize(bodySize(30));
      },
      { fontSize: 24, height: 56, maxWidth: 560 },
    );
    label(910, t('settings.board'));
    new Chips<'3d' | '2d'>(
      this,
      800,
      910,
      [
        { value: '3d', label: t('settings.board.3d') },
        { value: '2d', label: t('settings.board.2d') },
      ],
      s.boardView,
      (v) => updateSettings({ boardView: v }),
      { fontSize: 26, height: 60, maxWidth: 460 },
    );
    label(1010, t('settings.colorblind'), t('settings.colorblind.help'));
    onOff(860, 1010, s.colorblindIcons, (v) => updateSettings({ colorblindIcons: v }));

    // Language
    panel(this, 1110, 150);
    heading(1150, 'settings.language');
    new Chips(
      this,
      760,
      1185,
      LANGUAGES.map((l) => ({ value: l.id, label: l.name })),
      s.language,
      (v) => updateSettings({ language: v }),
      { fontSize: 26, height: 60, maxWidth: 520 },
    );
    this.add
      .text(60, 1220, 'More languages can be added to the string table.', {
        ...textStyle(bodySize(22), { color: hex(COLORS.textDim), strokeThickness: 3 }),
      })
      .setOrigin(0, 0.5);

    new Button(this, GAME_WIDTH / 2, 1560, 'Account & cloud save', {
      width: 940,
      height: 110,
      fontSize: 38,
      color: 0x2b7a8a,
      shadowColor: 0x0f3a44,
      onClick: () => goToScene(this, SCENE_KEYS.Account),
    });
    new Button(this, GAME_WIDTH / 2 - 250, 1400, t('settings.credits'), {
      width: 440,
      height: 120,
      fontSize: 40,
      color: COLORS.secondary,
      shadowColor: COLORS.secondaryDark,
      onClick: () => goToScene(this, SCENE_KEYS.Credits),
    });
    new Button(this, GAME_WIDTH / 2 + 250, 1400, t('settings.tutorial'), {
      width: 440,
      height: 120,
      fontSize: 40,
      color: COLORS.accent,
      shadowColor: COLORS.accentDark,
      onClick: () => goToScene(this, SCENE_KEYS.Match, tutorialMatchData(LESSONS[0]!.id)),
    });
    this.add
      .text(
        GAME_WIDTH / 2,
        1680,
        `Cards Clash v${__APP_VERSION__} · settings are saved on this device`,
        textStyle(24, { color: hex(COLORS.textDim) }),
      )
      .setOrigin(0.5);
  }
}
