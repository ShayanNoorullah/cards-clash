import { audio } from '../services/audio';
import Phaser from 'phaser';
import { addBackground } from '../art/proceduralTextures';
import { FONT_FAMILY, GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { getCampaign } from '../campaign/config';
import { currentNode, totalStars } from '../campaign/progress';
import { dailyStatus } from '../modes/daily';
import { draftCostText } from '../modes/draft';
import { PROGRESSION } from '../progression/config';
import ONLINE_DATA from '../data/online.json';
import { modeUnlockLevel, modeUnlocked } from '../progression/levels';
import { saves } from '../save';
import { LESSONS } from '../tutorial/tutorial';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { COLORS, hex, textStyle } from '../ui/theme';
import { showToast } from '../ui/Toast';
import { fadeIn, goToScene } from '../ui/transitions';
import { pickFromList } from './deckUi';
import { playableDecks, sandboxMatchData, tutorialMatchData } from './matchStarts';
import { rewardText } from './modeUi';

interface ModeCard {
  label: string;
  caption: string;
  color: number;
  shadow: number;
  /** Mode id in progression.json unlocks (null = always open). */
  mode: string | null;
  /** Rules and rewards, shown before the mode starts. */
  rules?: string;
  rewards?: string;
  /** Milestone that adds the mode, when it isn't built yet. */
  comingIn?: string;
  onStart?: () => void;
}

/** Choose how to play. Each mode shows its rules and rewards first. */
export class PlayScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Play);
  }

  create(): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    const save = saves().save;
    const level = save.progression.level;
    this.add.text(GAME_WIDTH / 2, 90, 'Play', textStyle(84, { color: hex(COLORS.accent) })).setOrigin(0.5);
    new Button(this, 100, 90, 'Back', {
      width: 160,
      height: 80,
      fontSize: 34,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: () => goToScene(this, SCENE_KEYS.MainMenu),
    });

    const campaign = getCampaign();
    const stars = totalStars(save, campaign);
    const region = campaign.regions[currentNode(save, campaign).region]!;
    const lessonsDone = LESSONS.filter((l) => save.tutorial.done.includes(l.id)).length;
    const p = PROGRESSION;
    const m = p.modes;
    const daily = dailyStatus(save, Date.now());
    const gauntletRun = save.modes.gauntlet;
    const draftRun = save.modes.draft;
    const purple = { color: 0x7a5fd0, shadow: 0x4a3590 };

    const modes: ModeCard[] = [
      {
        label: 'Campaign',
        caption: `★ ${stars}/${campaign.nodes.size * 3}  ·  ${region.name}`,
        color: COLORS.primary,
        shadow: COLORS.primaryDark,
        mode: 'campaign',
        rules:
          'Travel through 8 regions of 10 battles. Win for 1 star; meet the two battle goals for up to 3. A boss with a special rule guards each region.',
        rewards: `First win of each battle: Coins + XP. +${p.campaign.gemsPerNewStar} Gems per new star. Bosses: a chest and Gems. Plus normal match rewards.`,
        onStart: () => goToScene(this, SCENE_KEYS.Campaign),
      },
      {
        label: 'Quick Battle',
        caption: 'Any deck vs the AI or a friend',
        color: COLORS.secondary,
        shadow: COLORS.secondaryDark,
        mode: 'quick',
        rules: 'Pick any two decks. Play the AI (Easy to Nightmare) or a friend on this device.',
        rewards: `Win: ${p.xp.match.win} XP + ${p.matchCoins.win} Coins + a victory chest. Loss: ${p.xp.match.loss} XP + ${p.matchCoins.loss} Coins. Games against a friend give no rewards.`,
        onStart: () => goToScene(this, SCENE_KEYS.MatchSetup),
      },
      {
        label: 'Tutorial',
        caption: `${lessonsDone}/${LESSONS.length} lessons done`,
        color: COLORS.accent,
        shadow: COLORS.accentDark,
        mode: null,
        onStart: () => this.pickLesson(),
      },
      {
        label: 'Daily Dungeon',
        caption: daily.won ? '✓ Cleared today' : 'New challenge every day',
        ...purple,
        mode: 'daily',
        rules:
          'One dungeon per day, the same for everyone: a set enemy deck with modifiers. Unlimited attempts.',
        rewards: `First win each day: ${rewardText(m.daily.reward)}. Plus normal match rewards.`,
        onStart: () => goToScene(this, SCENE_KEYS.Daily),
      },
      {
        label: 'Gauntlet',
        caption: gauntletRun
          ? gauntletRun.over
            ? 'Rewards waiting!'
            : `Run: ${gauntletRun.wins} wins`
          : `${m.gauntlet.battles} battles in a row`,
        ...purple,
        mode: 'gauntlet',
        rules: `${m.gauntlet.battles} battles with one deck. Hero HP carries over (+${m.gauntlet.healBetween} HP after each win). One loss ends the run; the last foe is a boss.`,
        rewards: `By wins, up to ${rewardText(m.gauntlet.rewards[m.gauntlet.battles] ?? {})} for a perfect run. Plus normal match rewards.`,
        onStart: () => goToScene(this, SCENE_KEYS.Gauntlet),
      },
      {
        label: 'Draft Arena',
        caption: draftRun ? `Run: ${draftRun.wins}W ${draftRun.losses}L` : `Entry ${draftCostText()}`,
        ...purple,
        mode: 'draft',
        rules: `Pay ${draftCostText()}. Pick a hero, a landscape and ${m.draft.picks} cards (1 of 3 each), then play until ${m.draft.maxWins} wins or ${m.draft.maxLosses} losses.`,
        rewards: `By wins, up to ${rewardText(m.draft.rewards[m.draft.maxWins] ?? {})} for ${m.draft.maxWins} wins. Plus normal match rewards.`,
        onStart: () => goToScene(this, SCENE_KEYS.Draft),
      },
      {
        label: 'Sandbox',
        caption: 'Test decks freely',
        ...purple,
        mode: 'sandbox',
        rules: `Any of your decks against a Practice Dummy with ${m.sandbox.dummyHp} HP that never plays. Tools let you refill MP, add any card, spawn enemies and more.`,
        rewards: 'None: this is a playground.',
        onStart: () => this.pickSandboxDeck(),
      },
      {
        label: 'Friendly PvP',
        caption: 'Play a friend with a room code',
        color: 0x2b7a8a,
        shadow: 0x0f3a44,
        mode: 'friendly',
        rules:
          'One player creates a room and shares its 6-character code; the other joins. Any of your decks, every card at level 3, 60 seconds per turn.',
        rewards: 'None: just for fun. No rating change.',
        onStart: () => goToScene(this, SCENE_KEYS.Online, { tab: 'friendly' }),
      },
      {
        label: 'Ranked PvP',
        caption: 'Climb the season ladder',
        color: 0x8a2b3a,
        shadow: 0x3e0f18,
        mode: 'ranked',
        rules:
          'Matchmaking by rating. Cards you own, all at level 3; 60 seconds per turn; leaving for over 60 seconds forfeits. Seasons last 6 weeks and end with a soft rating reset.',
        rewards: `Win: ${ONLINE_DATA.rewards.rankedWin.coins} Coins + ${ONLINE_DATA.rewards.rankedWin.xp} XP; loss: ${ONLINE_DATA.rewards.rankedLoss.coins} Coins + ${ONLINE_DATA.rewards.rankedLoss.xp} XP; season rewards by tier. Granted by the server.`,
        onStart: () => goToScene(this, SCENE_KEYS.Online, { tab: 'ranked' }),
      },
    ];

    modes
      .slice(0, 3)
      .forEach((mode, i) => this.modeButton(mode, GAME_WIDTH / 2, 330 + i * 230, 900, 190, level));
    this.add
      .text(GAME_WIDTH / 2, 1030, 'More modes', textStyle(40, { color: hex(COLORS.textDim) }))
      .setOrigin(0.5);
    modes.slice(3).forEach((mode, i) => {
      const x = GAME_WIDTH / 2 + (i % 2 === 0 ? -225 : 225);
      const y = 1160 + Math.floor(i / 2) * 175;
      this.modeButton(mode, x, y, 420, 145, level);
    });
    this.add
      .text(GAME_WIDTH / 2, 1830, `Player level ${level}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: hex(COLORS.textDim),
      })
      .setOrigin(0.5);
    this.input.keyboard?.on('keydown-ESC', () => goToScene(this, SCENE_KEYS.MainMenu));
  }

  private modeButton(m: ModeCard, x: number, y: number, w: number, h: number, level: number): void {
    const locked = m.mode !== null && !modeUnlocked(m.mode, level);
    const unlockAt = m.mode ? modeUnlockLevel(m.mode) : 1;
    let caption = m.caption;
    if (m.comingIn)
      caption = locked ? `Level ${unlockAt} · coming in ${m.comingIn}` : `Coming in ${m.comingIn}`;
    else if (locked) caption = `Unlocks at level ${unlockAt}`;
    const disabled = locked || m.comingIn !== undefined;
    new Button(this, x, y, locked ? `🔒 ${m.label}` : m.label, {
      width: w,
      height: h,
      fontSize: h > 160 ? 64 : 42,
      color: disabled ? 0x5b5a70 : m.color,
      shadowColor: disabled ? 0x33324a : m.shadow,
      caption,
      onClick: () => {
        if (locked) showToast(this, `${m.label} unlocks at player level ${unlockAt}.`);
        else if (m.comingIn) showToast(this, `${m.label} arrives in milestone ${m.comingIn}.`);
        else if (m.rules) this.showInfo(m);
        else m.onStart?.();
      },
    });
  }

  /** Rules and rewards before starting a mode. */
  private showInfo(m: ModeCard): void {
    new Modal(this, m.label, `${m.rules}\n\nRewards: ${m.rewards}`, [
      { label: 'Play', onClick: () => m.onStart?.() },
      { label: 'Back', color: COLORS.danger, shadowColor: COLORS.dangerDark, onClick: () => undefined },
    ]);
  }

  private pickSandboxDeck(): void {
    pickFromList(
      this,
      'Sandbox: choose a deck',
      playableDecks().map((d) => ({
        label: d.name,
        onPick: () => goToScene(this, SCENE_KEYS.Match, sandboxMatchData(d)),
      })),
    );
  }

  private pickLesson(): void {
    const done = saves().save.tutorial.done;
    pickFromList(
      this,
      'Tutorial',
      LESSONS.map((l, i) => {
        const reward = [
          l.reward.coins ? `${l.reward.coins} Coins` : '',
          l.reward.gems ? `${l.reward.gems} Gems` : '',
        ]
          .filter(Boolean)
          .join(' + ');
        return {
          label: `${done.includes(l.id) ? '✓ ' : ''}${i + 1}. ${l.name}`,
          caption: done.includes(l.id) ? l.summary : `${l.summary} Reward: ${reward}`,
          color: done.includes(l.id) ? 0x23863d : COLORS.secondary,
          onPick: () => goToScene(this, SCENE_KEYS.Match, tutorialMatchData(l.id)),
        };
      }),
    );
  }
}
