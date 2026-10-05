import Phaser from 'phaser';
import { addBackground } from '../art/proceduralTextures';
import { GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { lastSync, resetSyncMeta, syncNow } from '../online/client/cloudSync';
import {
  account,
  linkEmail,
  ONLINE_CONFIGURED,
  OnlineError,
  playAsGuest,
  sendEmailCode,
  signOut,
  verifyEmailCode,
  verifyLinkCode,
  type Account,
} from '../online/client/net';
import { audio } from '../services/audio';
import { isOnline, OFFLINE_MESSAGE, onNetworkChange } from '../services/network';
import { Button } from '../ui/Button';
import { COLORS, hex, textStyle } from '../ui/theme';
import { showToast } from '../ui/Toast';
import { fadeIn, goToScene } from '../ui/transitions';
import { promptText } from './deckUi';
import { bodyText, panel } from './modeUi';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Online account: play as a guest, sign in with an email code, link a guest to an email, cloud save. */
export class AccountScene extends Phaser.Scene {
  private back: string = SCENE_KEYS.Settings;

  constructor() {
    super(SCENE_KEYS.Account);
  }

  create(data: { back?: string } = {}): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    this.back = data.back ?? SCENE_KEYS.Settings;
    this.add.text(GAME_WIDTH / 2, 80, 'Account', textStyle(72, { color: hex(COLORS.accent) })).setOrigin(0.5);
    new Button(this, 100, 80, 'Back', {
      width: 160,
      height: 80,
      fontSize: 34,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: () => goToScene(this, this.back),
    });
    if (!ONLINE_CONFIGURED) {
      panel(this, 200, 420);
      bodyText(
        this,
        60,
        230,
        'Online play is not set up in this build.\n\nThe game is fully playable offline. To enable accounts, cloud save and PvP, create a free Supabase project and add its URL and anon key to .env.local (see server/README.md).',
        32,
      );
      return;
    }
    if (!isOnline()) {
      panel(this, 200, 300);
      bodyText(this, 60, 230, OFFLINE_MESSAGE, 32);
      // Come back here by itself when the connection returns.
      const stop = onNetworkChange((up) => {
        if (up) this.scene.restart({ back: this.back });
      });
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);
      return;
    }
    void account().then((a) => this.render(a));
  }

  private async run(label: string, op: () => Promise<unknown>, ok?: string): Promise<void> {
    try {
      await op();
      if (ok) showToast(this, ok);
      this.scene.restart({ back: this.back });
    } catch (err) {
      audio.play('error');
      showToast(this, err instanceof OnlineError ? err.message : `${label} failed. Check your connection.`);
    }
  }

  private askEmail(title: string, then: (email: string) => Promise<void>): void {
    promptText(this, title, 'Your email address', '', 'Send code', (value) => {
      const email = value.trim();
      if (!EMAIL.test(email)) return 'Enter a valid email address.';
      void then(email);
      return null;
    });
  }

  private askCode(email: string, verify: (code: string) => Promise<void>, ok: string): void {
    promptText(this, 'Enter the code', `We emailed a 6-digit code to ${email}`, '', 'Confirm', (value) => {
      if (!/^\d{6}$/.test(value.trim())) return 'The code has 6 digits.';
      void this.run('Sign-in', () => verify(value), ok);
      return null;
    });
  }

  private render(a: Account): void {
    const button = (
      y: number,
      label: string,
      onClick: () => void,
      color: number = COLORS.secondary,
      shadow: number = COLORS.secondaryDark,
    ) =>
      new Button(this, GAME_WIDTH / 2, y, label, {
        width: 760,
        height: 120,
        fontSize: 40,
        color,
        shadowColor: shadow,
        onClick,
      });
    panel(this, 180, 300);
    const status =
      a.kind === 'signedOut'
        ? 'Not signed in'
        : a.kind === 'guest'
          ? 'Playing as a guest'
          : a.kind === 'email'
            ? `Signed in as ${a.email}`
            : 'Offline';
    this.add.text(60, 230, status, textStyle(40)).setOrigin(0, 0.5);
    const sync = lastSync();
    bodyText(
      this,
      60,
      280,
      a.kind === 'signedOut'
        ? 'Sign in to save your progress in the cloud and play online. Guests can link an email later without losing anything.'
        : `Cloud save: ${sync ? `last synced ${new Date(sync.at).toLocaleString()}` : 'not synced yet'}${
            sync && sync.flags.length > 0
              ? '\nSome changes were refused by the server (impossible gains).'
              : ''
          }${a.kind === 'guest' ? '\nGuest progress lives on this device only until you link an email.' : ''}`,
      28,
      hex(COLORS.textDim),
    );

    if (a.kind === 'signedOut') {
      button(
        600,
        'Play as guest',
        () => void this.run('Guest sign-in', playAsGuest, 'Signed in as a guest.'),
        COLORS.primary,
        COLORS.primaryDark,
      );
      button(760, 'Sign in with email', () =>
        this.askEmail('Sign in', async (email) => {
          try {
            await sendEmailCode(email);
            this.askCode(email, (code) => verifyEmailCode(email, code), 'Signed in.');
          } catch (err) {
            showToast(this, err instanceof OnlineError ? err.message : 'Could not send the code.');
          }
        }),
      );
      return;
    }
    button(
      600,
      'Sync now',
      () => void this.run('Sync', syncNow, 'Cloud save is up to date.'),
      COLORS.primary,
      COLORS.primaryDark,
    );
    if (a.kind === 'guest')
      button(760, 'Link an email', () =>
        this.askEmail('Link an email', async (email) => {
          try {
            const needsCode = await linkEmail(email);
            if (!needsCode) {
              showToast(this, 'Email linked. Your progress is safe.');
              this.scene.restart({ back: this.back });
              return;
            }
            this.askCode(
              email,
              (code) => verifyLinkCode(email, code),
              'Email linked. Your progress is safe.',
            );
          } catch (err) {
            showToast(this, err instanceof OnlineError ? err.message : 'Could not send the code.');
          }
        }),
      );
    button(
      920,
      'Sign out',
      () =>
        void this.run(
          'Sign out',
          async () => {
            await signOut();
            resetSyncMeta();
          },
          'Signed out. Your local save stays on this device.',
        ),
      COLORS.danger,
      COLORS.dangerDark,
    );
  }
}
