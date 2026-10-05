import Phaser from 'phaser';
import { addBackground } from '../art/proceduralTextures';
import { GAME_WIDTH, SCENE_KEYS } from '../config/display';
import type { MatchView, ProfileResult, QueueResult } from '../online/protocol';
import { syncNow } from '../online/client/cloudSync';
import {
  account,
  call,
  onMatchViews,
  ONLINE_CONFIGURED,
  OnlineError,
  type Account,
} from '../online/client/net';
import { OnlineMatch } from '../online/client/OnlineMatch';
import { audio } from '../services/audio';
import { isOnline, OFFLINE_MESSAGE, onNetworkChange } from '../services/network';
import { Button } from '../ui/Button';
import { Chips } from '../ui/Chips';
import { formatDuration } from '../ui/RewardReveal';
import { COLORS, hex, textStyle } from '../ui/theme';
import { showToast } from '../ui/Toast';
import { fadeIn, goToScene } from '../ui/transitions';
import { promptText } from './deckUi';
import type { MatchSceneData } from './MatchSetupScene';
import { bodyText, DeckChooser, panel } from './modeUi';

type Tab = 'ranked' | 'friendly';

/** Online lobby: Ranked matchmaking and Friendly rooms (6-character codes). */
export class OnlineScene extends Phaser.Scene {
  private tab: Tab = 'ranked';
  private body!: Phaser.GameObjects.Container;
  private deck!: DeckChooser;
  private stopWatch: (() => void) | null = null;
  private poll: Phaser.Time.TimerEvent | null = null;
  private starting = false;

  constructor() {
    super(SCENE_KEYS.Online);
  }

  create(data: { tab?: Tab } = {}): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    this.starting = false;
    this.tab = data.tab ?? this.tab;
    this.add.text(GAME_WIDTH / 2, 80, 'Online', textStyle(72, { color: hex(COLORS.accent) })).setOrigin(0.5);
    new Button(this, 100, 80, 'Back', {
      width: 160,
      height: 80,
      fontSize: 34,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: () => this.leave(SCENE_KEYS.Play),
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopWaiting());
    if (!ONLINE_CONFIGURED) {
      panel(this, 200, 380);
      bodyText(
        this,
        60,
        230,
        'Online play is not set up in this build. Everything else works offline.\n\nTo enable it, create a free Supabase project and follow server/README.md.',
        32,
      );
      return;
    }
    if (!isOnline()) {
      panel(this, 200, 300);
      bodyText(this, 60, 230, OFFLINE_MESSAGE, 32);
      // Come back here by itself when the connection returns.
      const stop = onNetworkChange((up) => {
        if (up) this.scene.restart({ tab: this.tab });
      });
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);
      return;
    }
    // Losing the connection while in the lobby: say so (queueing resumes when it returns).
    const stop = onNetworkChange((up) => showToast(this, up ? 'Back online.' : OFFLINE_MESSAGE));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);
    void account().then((a) => this.afterAccount(a));
  }

  private leave(scene: string): void {
    void call({ op: 'cancelQueue' }).catch(() => undefined);
    goToScene(this, scene);
  }

  private async afterAccount(a: Account): Promise<void> {
    if (a.kind !== 'guest' && a.kind !== 'email') {
      panel(this, 200, 300);
      bodyText(
        this,
        60,
        230,
        'Sign in to play online: as a guest in one tap, or with an email so your account works on any device.',
        32,
      );
      new Button(this, GAME_WIDTH / 2, 600, 'Sign in', {
        width: 600,
        height: 130,
        onClick: () => goToScene(this, SCENE_KEYS.Account, { back: SCENE_KEYS.Online }),
      });
      return;
    }
    // Back into an unfinished match (reconnect within the grace period).
    try {
      const { view } = await call<{ view: MatchView | null }>({ op: 'current' });
      if (view && view.status === 'active') {
        this.startMatch(view.matchId);
        return;
      }
    } catch {
      // ignore; the lobby still works
    }
    new Chips<Tab>(
      this,
      GAME_WIDTH / 2,
      180,
      [
        { value: 'ranked', label: 'Ranked' },
        { value: 'friendly', label: 'Friendly' },
      ],
      this.tab,
      (v) => this.scene.restart({ tab: v }),
      { fontSize: 32, height: 70 },
    );
    new Button(this, GAME_WIDTH - 130, 80, 'Account', {
      width: 220,
      height: 80,
      fontSize: 30,
      color: COLORS.secondary,
      shadowColor: COLORS.secondaryDark,
      onClick: () => this.leave(SCENE_KEYS.Account),
    });
    this.body = this.add.container(0, 0);
    this.deck = new DeckChooser(this, GAME_WIDTH / 2, 1360);
    this.stopWatch = onMatchViews(a.userId, (v) => {
      if (v.status === 'active' && v.state) this.startMatch(v.matchId);
    });
    if (this.tab === 'ranked') await this.renderRanked();
    else this.renderFriendly();
  }

  private stopWaiting(): void {
    this.stopWatch?.();
    this.stopWatch = null;
    this.poll?.remove();
    this.poll = null;
  }

  private startMatch(matchId: string): void {
    if (this.starting) return;
    this.starting = true;
    this.stopWaiting();
    void OnlineMatch.open(matchId)
      .then((online) => {
        audio.play('star');
        const data: MatchSceneData = {
          seats: online.seats,
          seed: online.seed,
          context: { kind: 'online' },
          online,
        };
        goToScene(this, SCENE_KEYS.Match, data);
      })
      .catch((err: unknown) => {
        this.starting = false;
        showToast(this, err instanceof OnlineError ? err.message : 'Could not open the match.');
      });
  }

  private async renderRanked(): Promise<void> {
    panel(this, 260, 300);
    let profile: ProfileResult | null = null;
    try {
      profile = await call<ProfileResult>({ op: 'profile' });
    } catch (err) {
      showToast(this, err instanceof OnlineError ? err.message : 'Could not reach the server.');
    }
    if (profile) {
      this.add
        .text(60, 310, `${profile.tier}`, textStyle(56, { color: hex(COLORS.accent) }))
        .setOrigin(0, 0.5);
      this.add.text(GAME_WIDTH - 60, 310, `Rating ${profile.rating}`, textStyle(40)).setOrigin(1, 0.5);
      bodyText(
        this,
        60,
        370,
        `${profile.season.name} · ends in ${formatDuration(profile.season.endsAt - Date.now())}\n${profile.games} games · ${profile.wins} wins · ${profile.losses} losses`,
        28,
        hex(COLORS.textDim),
      );
    }
    bodyText(
      this,
      60,
      600,
      'Ranked uses cards you own (your save is synced to the cloud first). Every card plays at level 3, so collections are fair. 60 seconds per turn.',
      28,
    );
    this.renderQueueButton();
  }

  private renderQueueButton(): void {
    this.body.removeAll(true);
    this.body.add(
      new Button(this, GAME_WIDTH / 2, 1540, 'Find match', {
        width: 700,
        height: 150,
        fontSize: 56,
        color: 0xc98a2a,
        shadowColor: 0x5a3608,
        onClick: () => void this.queue(),
      }),
    );
  }

  private async queue(): Promise<void> {
    try {
      await syncNow();
      const r = await call<QueueResult>({ op: 'queue', deck: this.deck.current.deck });
      if (r.status === 'matched') return this.startMatch(r.matchId);
      this.showSearching(Date.now());
    } catch (err) {
      audio.play('error');
      showToast(this, err instanceof OnlineError ? err.message : 'Could not join the queue.');
    }
  }

  private showSearching(since: number): void {
    this.body.removeAll(true);
    const label = this.add.text(GAME_WIDTH / 2, 1480, '', textStyle(40)).setOrigin(0.5);
    const spinner = this.add.graphics({ x: GAME_WIDTH / 2, y: 1400 });
    spinner.lineStyle(10, COLORS.accent, 1);
    spinner.beginPath();
    spinner.arc(0, 0, 40, 0, Math.PI * 1.4);
    spinner.strokePath();
    this.tweens.add({ targets: spinner, angle: 360, duration: 1000, repeat: -1 });
    this.body.add([label, spinner]);
    this.body.add(
      new Button(this, GAME_WIDTH / 2, 1640, 'Cancel', {
        width: 400,
        height: 110,
        color: COLORS.danger,
        shadowColor: COLORS.dangerDark,
        onClick: () => {
          this.poll?.remove();
          void call({ op: 'cancelQueue' }).finally(() => this.renderQueueButton());
        },
      }),
    );
    const tick = () => label.setText(`Searching for an opponent… ${formatDuration(Date.now() - since)}`);
    tick();
    // Light polling (the match also arrives via Realtime); it lets the rating window widen.
    this.poll = this.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => {
        tick();
        void call<QueueResult>({ op: 'queueStatus' })
          .then((r) => {
            if (r.status === 'matched') this.startMatch(r.matchId);
            else if (r.status === 'idle') this.renderQueueButton();
          })
          .catch(() => undefined);
      },
    });
    this.time.addEvent({ delay: 1000, loop: true, callback: tick });
  }

  private renderFriendly(): void {
    panel(this, 260, 260);
    bodyText(
      this,
      60,
      290,
      'Play a friend anywhere: one of you creates a room and shares the 6-character code, the other joins with it. Any of your decks, no rating change.',
      30,
    );
    this.body.add(
      new Button(this, GAME_WIDTH / 2, 700, 'Create a room', {
        width: 700,
        height: 140,
        fontSize: 48,
        color: COLORS.primary,
        shadowColor: COLORS.primaryDark,
        onClick: () => void this.createRoom(),
      }),
    );
    this.body.add(
      new Button(this, GAME_WIDTH / 2, 880, 'Join with a code', {
        width: 700,
        height: 140,
        fontSize: 48,
        onClick: () =>
          promptText(this, 'Join a room', 'Enter the 6-character code', '', 'Join', (value) => {
            const code = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (code.length !== 6) return 'Codes have 6 letters and numbers.';
            void call<{ matchId: string }>({ op: 'joinRoom', code, deck: this.deck.current.deck })
              .then((r) => this.startMatch(r.matchId))
              .catch((err: unknown) =>
                showToast(this, err instanceof OnlineError ? err.message : 'Could not join.'),
              );
            return null;
          }),
      }),
    );
  }

  private async createRoom(): Promise<void> {
    try {
      const r = await call<{ matchId: string; code: string }>({
        op: 'createRoom',
        deck: this.deck.current.deck,
      });
      this.body.removeAll(true);
      panel(this, 600, 420);
      this.body.add(
        this.add
          .text(GAME_WIDTH / 2, 670, 'Your room code', textStyle(36, { color: hex(COLORS.textDim) }))
          .setOrigin(0.5),
      );
      const code = this.add
        .text(GAME_WIDTH / 2, 790, r.code, textStyle(120, { color: hex(COLORS.accent) }))
        .setOrigin(0.5)
        .setLetterSpacing(18);
      this.body.add(code);
      this.body.add(
        this.add.text(GAME_WIDTH / 2, 900, 'Waiting for your friend to join…', textStyle(34)).setOrigin(0.5),
      );
      this.body.add(
        new Button(this, GAME_WIDTH / 2, 960 + 30, 'Copy code', {
          width: 320,
          height: 80,
          fontSize: 30,
          color: COLORS.secondary,
          shadowColor: COLORS.secondaryDark,
          onClick: () => {
            void navigator.clipboard?.writeText(r.code).then(() => showToast(this, 'Code copied.'));
          },
        }),
      );
      // Realtime announces the guest; a slow poll covers missed messages.
      this.poll = this.time.addEvent({
        delay: 5000,
        loop: true,
        callback: () =>
          void call<{ view: MatchView }>({ op: 'view', matchId: r.matchId })
            .then(({ view }) => {
              if (view.status === 'active') this.startMatch(view.matchId);
            })
            .catch(() => undefined),
      });
    } catch (err) {
      showToast(this, err instanceof OnlineError ? err.message : 'Could not create a room.');
    }
  }
}
