import { audio } from '../services/audio';
import Phaser from 'phaser';
import { ArtCache } from '../art/ArtCache';
import { addBackground } from '../art/proceduralTextures';
import { GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { getCampaign } from '../campaign/config';
import { getContent } from '../engine/content';
import { dailyDungeon, dailyStatus, msUntilNextDungeon } from '../modes/daily';
import { PROGRESSION } from '../progression/config';
import { localDay } from '../progression/daily';
import { saves } from '../save';
import { Button } from '../ui/Button';
import { formatDuration } from '../ui/RewardReveal';
import { COLORS, hex, textStyle } from '../ui/theme';
import { fadeIn, goToScene } from '../ui/transitions';
import { dailyMatchData } from './matchStarts';
import { bodyText, DeckChooser, modeHeader, panel, rewardText } from './modeUi';

const AI_NAMES: Record<string, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  nightmare: 'Nightmare',
};

/** Today's dungeon: who you face, its modifiers, the reward and a countdown to the next one. */
export class DailyScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Daily);
  }

  create(): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    modeHeader(this, 'Daily Dungeon');
    const now = Date.now();
    const content = getContent();
    const dungeon = dailyDungeon(localDay(now), getCampaign(), content);
    const status = dailyStatus(saves().save, now);
    const cfg = PROGRESSION.modes.daily;

    const timer = this.add
      .text(GAME_WIDTH / 2, 160, '', textStyle(30, { color: hex(COLORS.textDim) }))
      .setOrigin(0.5);
    const tick = () =>
      timer.setText(`${dungeon.day} · new dungeon in ${formatDuration(msUntilNextDungeon(Date.now()))}`);
    tick();
    this.time.addEvent({ delay: 1000, loop: true, callback: tick });

    panel(this, 220, 560);
    const hero = content.ctx.heroes.byId.get(dungeon.enemyDeck.heroId);
    if (hero) ArtCache.heroImage(this, 200, 400, hero).setDisplaySize(260, 260);
    const deckName = getCampaign().decks.get(dungeon.deckId)?.name ?? '';
    this.add
      .text(360, 300, dungeon.enemyName, textStyle(46, { color: hex(COLORS.accent) }))
      .setOrigin(0, 0.5);
    bodyText(
      this,
      360,
      340,
      `${deckName}\n${AI_NAMES[dungeon.ai]} AI · enemy cards Lv${cfg.cardLevel}`,
      28,
      '#ffffff',
      640,
    );
    const [playerRules, enemyRules] = dungeon.rules;
    const lines = [
      ...enemyRules.map((r) => `Enemy · ${r.name}: ${r.text}`),
      ...playerRules.map((r) => `You · ${r.name}: ${r.text}`),
    ];
    bodyText(this, 60, 560, `Today's modifiers\n${lines.join('\n')}`, 28, '#fff3c4');

    panel(this, 820, 300, status.won);
    bodyText(
      this,
      60,
      850,
      [
        status.won ? '✓ Cleared today!' : 'Not cleared yet',
        `Attempts today: ${status.attempts}`,
        `First win of the day: ${rewardText(cfg.reward)}`,
        'Every match also gives normal XP and Coins. Unlimited retries.',
      ].join('\n'),
      30,
    );

    const deck = new DeckChooser(this, GAME_WIDTH / 2, 1300);
    new Button(this, GAME_WIDTH / 2, 1480, status.won ? 'Play again' : 'Enter the Dungeon', {
      width: 700,
      height: 160,
      fontSize: 54,
      onClick: () => goToScene(this, SCENE_KEYS.Match, dailyMatchData(deck.current, Date.now())),
    });
    bodyText(
      this,
      60,
      1620,
      'A new dungeon appears every day at midnight, with a different enemy and modifiers. Everyone gets the same dungeon on the same day.',
      26,
      hex(COLORS.textDim),
    );
  }
}
