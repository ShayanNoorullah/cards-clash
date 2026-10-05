import '@fontsource/oswald/600.css';
import '@fontsource/oswald/700.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/500-italic.css';
import '@fontsource/barlow-condensed/600-italic.css';
import Phaser from 'phaser';
import { audio } from './services/audio';
import { GAME_HEIGHT, GAME_WIDTH } from './config/display';
import { BootScene } from './scenes/BootScene';
import { CreditsScene } from './scenes/CreditsScene';
import { CollectionScene } from './scenes/CollectionScene';
import { DeckBuilderScene } from './scenes/DeckBuilderScene';
import { DecksScene } from './scenes/DecksScene';
import { GalleryScene } from './scenes/GalleryScene';
import { AccountScene } from './scenes/AccountScene';
import { CampaignScene } from './scenes/CampaignScene';
import { OnlineScene } from './scenes/OnlineScene';
import { ProfileScene } from './scenes/ProfileScene';
import { SettingsScene } from './scenes/SettingsScene';
import { DailyScene } from './scenes/DailyScene';
import { DraftScene } from './scenes/DraftScene';
import { GauntletScene } from './scenes/GauntletScene';
import { PlayScene } from './scenes/PlayScene';
import { QuestsScene } from './scenes/QuestsScene';
import { ShopScene } from './scenes/ShopScene';
import { MatchScene } from './scenes/MatchScene';
import { MatchSetupScene } from './scenes/MatchSetupScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { logger } from './services/logger';
import { installCrashHandler } from './services/crashScreen';
import { installBackButton } from './services/backButton';
import { hasSaves, saves } from './save';

const log = logger.child('Main');

// Any uncaught error shows a recovery screen (the save is flushed first).
installCrashHandler(__APP_VERSION__, () => {
  if (hasSaves()) void saves().flush();
});

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#120c2b',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    powerPreference: 'high-performance',
  },
  input: {
    activePointers: 2,
  },
  // HTML <input> fields (search, deck names, deck codes) over the canvas.
  dom: {
    createContainer: true,
  },
  fps: {
    target: 60,
  },
  scene: [
    BootScene,
    PreloadScene,
    TitleScene,
    MainMenuScene,
    CreditsScene,
    GalleryScene,
    MatchSetupScene,
    MatchScene,
    CollectionScene,
    DecksScene,
    DeckBuilderScene,
    ShopScene,
    QuestsScene,
    PlayScene,
    CampaignScene,
    DailyScene,
    GauntletScene,
    DraftScene,
    SettingsScene,
    ProfileScene,
    OnlineScene,
    AccountScene,
  ],
};

const game = new Phaser.Game(config);
installBackButton(game);
log.info(`Cards Clash v${__APP_VERSION__} starting`);

// Browsers only allow sound after a user gesture.
for (const type of ['pointerdown', 'keydown', 'touchstart'] as const) {
  window.addEventListener(type, () => audio.unlock(), { passive: true });
}

if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game; __audio: typeof audio }).__game = game;
  (window as unknown as { __audio: typeof audio }).__audio = audio;
}
