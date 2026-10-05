import { audio } from '../services/audio';
import Phaser from 'phaser';
import { ArtCache } from '../art/ArtCache';
import { ART_KEYS } from '../art/frames';
import { PALETTE } from '../art/palette';
import { addBackground } from '../art/proceduralTextures';
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { describeObjective, getCampaign, type CampaignNode, type Region } from '../campaign/config';
import {
  campaignComplete,
  currentNode,
  markStorySeen,
  nodeStars,
  nodeUnlocked,
  pendingStory,
  regionStars,
  regionUnlocked,
  totalStars,
} from '../campaign/progress';
import { getContent } from '../engine/content';
import { Rng } from '../engine/rng';
import { PROGRESSION } from '../progression/config';
import { saves } from '../save';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { COLORS, hex, textStyle } from '../ui/theme';
import { showToast } from '../ui/Toast';
import { fadeIn, goToScene } from '../ui/transitions';
import { campaignMatchData, playableDecks, type PlayerDeckChoice } from './matchStarts';

const HEADER_H = 250;
const REGION_H = 1980;
/** Zig-zag column per node (mirrored on odd regions) so neighbours never overlap. */
const NODE_X = [540, 800, 540, 280, 540, 800, 540, 280, 540];
const NODE_R = 54;
const BOSS_R = 84;
const DRAG_THRESHOLD = 14;

/** Region background colours; the last two regions are not tied to one landscape. */
const SPECIAL_COLORS: Record<number, { color: number; dark: number }> = {
  6: { color: 0x7a5fd0, dark: 0x2e1f63 },
  7: { color: 0xc9a227, dark: 0x5a4410 },
};

const DIFFICULTY_NAMES: Record<string, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  nightmare: 'Nightmare',
};

export interface CampaignSceneData {
  /** Node to scroll to (e.g. the one just played). */
  focus?: string;
}

/** The scrollable world map: 8 regions × 10 nodes, stars, unlocks and story. */
export class CampaignScene extends Phaser.Scene {
  private map!: Phaser.GameObjects.Container;
  private minY = 0;
  private dragStart: { pointerY: number; mapY: number } | null = null;
  private dragged = false;
  private decks: PlayerDeckChoice[] = [];
  private deckIndex = 0;
  private deckButton!: Button;
  private modalOpen = false;

  constructor() {
    super(SCENE_KEYS.Campaign);
  }

  create(data: CampaignSceneData = {}): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('map');
    this.modalOpen = false;
    const campaign = getCampaign();
    const save = saves().save;

    this.map = this.add.container(0, HEADER_H);
    const worldH = campaign.regions.length * REGION_H + 120;
    this.minY = Math.min(HEADER_H, GAME_HEIGHT - worldH);
    campaign.regions.forEach((r, i) => this.drawRegion(r, i));
    this.drawPaths();
    campaign.regions.forEach((r) => r.nodes.forEach((n) => this.drawNode(n)));

    this.drawHeader(totalStars(save, campaign), campaign.nodes.size * 3);
    const focus = (data.focus && campaign.nodes.get(data.focus)) || currentNode(save, campaign);
    this.scrollTo(this.nodePos(focus).y);
    this.setupScrolling();
    this.input.keyboard?.on('keydown-ESC', () => goToScene(this, SCENE_KEYS.Play));
    this.time.delayedCall(350, () => this.showPendingStory());
  }

  // -------------------------------------------------------------------------
  // Layout
  // -------------------------------------------------------------------------

  private nodePos(node: CampaignNode): { x: number; y: number } {
    const top = node.region * REGION_H;
    if (node.boss) return { x: GAME_WIDTH / 2, y: top + 1770 };
    const x = NODE_X[node.index] ?? GAME_WIDTH / 2;
    return { x: node.region % 2 === 0 ? x : GAME_WIDTH - x, y: top + 250 + node.index * 150 };
  }

  private regionColors(index: number, region: Region): { color: number; dark: number } {
    return SPECIAL_COLORS[index] ?? PALETTE[region.landscape];
  }

  private drawRegion(region: Region, index: number): void {
    const save = saves().save;
    const campaign = getCampaign();
    const top = index * REGION_H;
    const { color, dark } = this.regionColors(index, region);
    const g = this.add.graphics();
    g.fillStyle(dark, 1);
    g.fillRect(0, top, GAME_WIDTH, REGION_H);
    g.fillStyle(color, 0.35);
    g.fillRect(0, top + 150, GAME_WIDTH, REGION_H - 150);
    g.fillStyle(0x000000, 0.25);
    g.fillRect(0, top, GAME_WIDTH, 8);
    this.map.add(g);
    // Scattered landscape tiles for texture (seeded, so the map always looks the same).
    const rng = new Rng(`map:${region.id}`);
    for (let i = 0; i < 9; i++) {
      this.map.add(
        this.add
          .image(
            rng.int(60, GAME_WIDTH - 60),
            top + rng.int(200, REGION_H - 80),
            ART_KEYS.tile(region.landscape),
          )
          .setAlpha(0.1)
          .setScale(0.7 + rng.next() * 0.5)
          .setAngle(rng.int(-12, 12)),
      );
    }
    const unlocked = regionUnlocked(save, campaign, index);
    this.map.add(
      this.add
        .text(40, top + 75, `${index + 1}. ${region.name}`, textStyle(54, { color: hex(COLORS.accent) }))
        .setOrigin(0, 0.5),
    );
    this.map.add(
      this.add
        .text(GAME_WIDTH - 40, top + 75, `★ ${regionStars(save, region)}/30`, textStyle(40))
        .setOrigin(1, 0.5),
    );
    if (!unlocked) {
      const lock = this.add.graphics();
      lock.fillStyle(0x0b0820, 0.6);
      lock.fillRect(0, top + 150, GAME_WIDTH, REGION_H - 150);
      this.map.add(lock);
      const prevBoss = campaign.regions[index - 1]?.nodes[9]?.boss;
      const bossName = prevBoss
        ? (getContent().ctx.heroes.byId.get(prevBoss.heroId)?.name ?? 'the boss')
        : 'the boss';
      this.map.add(
        this.add
          .text(GAME_WIDTH / 2, top + REGION_H / 2, `🔒\nDefeat ${bossName}\nto unlock ${region.name}`, {
            fontFamily: FONT_FAMILY,
            fontSize: '46px',
            color: '#ffffff',
            align: 'center',
            stroke: '#2a1f4d',
            strokeThickness: 8,
          })
          .setOrigin(0.5)
          .setDepth(5),
      );
    }
  }

  private drawPaths(): void {
    const save = saves().save;
    const campaign = getCampaign();
    const nodes = campaign.regions.flatMap((r) => r.nodes);
    const g = this.add.graphics();
    for (let i = 1; i < nodes.length; i++) {
      const a = this.nodePos(nodes[i - 1]!);
      const b = this.nodePos(nodes[i]!);
      const open = nodeUnlocked(save, campaign, nodes[i]!);
      g.lineStyle(16, 0x2a1f4d, open ? 0.9 : 0.4);
      g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(8, open ? 0xfff3c4 : 0x9aa3b8, open ? 0.95 : 0.35);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    this.map.add(g);
  }

  private drawNode(node: CampaignNode): void {
    const save = saves().save;
    const campaign = getCampaign();
    const { x, y } = this.nodePos(node);
    const unlocked = nodeUnlocked(save, campaign, node);
    const stars = nodeStars(save, node.id);
    const isCurrent = unlocked && stars === 0;
    const r = node.boss ? BOSS_R : NODE_R;
    const c = this.add.container(x, y);
    this.map.add(c);

    const g = this.add.graphics();
    g.fillStyle(0x2a1f4d, 1);
    g.fillCircle(0, 0, r + 8);
    g.fillStyle(!unlocked ? 0x3a3550 : stars > 0 ? 0x23863d : COLORS.accent, 1);
    g.fillCircle(0, 0, r);
    c.add(g);
    if (node.boss) {
      const hero = getContent().ctx.heroes.byId.get(node.boss.heroId);
      if (hero) {
        const img = ArtCache.heroImage(this, 0, 0, hero).setDisplaySize(r * 1.8, r * 1.8);
        if (!unlocked) img.setAlpha(0.35);
        c.add(img);
      }
      c.add(this.add.text(0, -r - 26, '♛ BOSS', textStyle(28, { color: '#ffd23f' })).setOrigin(0.5));
    } else {
      c.add(
        this.add
          .text(
            0,
            0,
            unlocked ? String(node.index + 1) : '🔒',
            textStyle(unlocked ? 46 : 36, {
              color: isCurrent ? '#2a1f4d' : '#ffffff',
              strokeThickness: isCurrent ? 0 : 6,
            }),
          )
          .setOrigin(0.5),
      );
    }
    if (isCurrent) {
      const ring = this.add.graphics();
      ring.lineStyle(8, 0xffffff, 1);
      ring.strokeCircle(0, 0, r + 18);
      c.add(ring);
      this.tweens.add({ targets: ring, alpha: 0.2, scale: 1.12, duration: 800, yoyo: true, repeat: -1 });
    }
    // Stars and name below the node.
    for (let i = 0; i < 3; i++) {
      c.add(
        this.add
          .text((i - 1) * 34, r + 24, '★', {
            fontFamily: FONT_FAMILY,
            fontSize: '36px',
            color: i < stars ? '#ffd23f' : '#4a4466',
            stroke: '#2a1f4d',
            strokeThickness: 6,
          })
          .setOrigin(0.5),
      );
    }
    c.add(
      this.add
        .text(
          0,
          r + 58,
          node.name,
          textStyle(24, { color: unlocked ? '#ffffff' : '#9aa3b8', strokeThickness: 5 }),
        )
        .setOrigin(0.5),
    );
    const zone = this.add.zone(0, 0, r * 2 + 40, r * 2 + 40).setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      if (this.dragged || this.modalOpen) return;
      if (!unlocked) {
        showToast(
          this,
          node.index === 0 ? "Beat the previous region's boss first." : 'Win the previous battle first.',
        );
        return;
      }
      this.showNode(node);
    });
    c.add(zone);
  }

  private drawHeader(stars: number, maxStars: number): void {
    const g = this.add.graphics().setDepth(20);
    g.fillStyle(COLORS.panel, 0.97);
    g.fillRect(0, 0, GAME_WIDTH, HEADER_H);
    g.fillStyle(COLORS.outline, 1);
    g.fillRect(0, HEADER_H - 6, GAME_WIDTH, 6);
    // Block map taps under the header.
    this.add
      .zone(GAME_WIDTH / 2, HEADER_H / 2, GAME_WIDTH, HEADER_H)
      .setInteractive()
      .setDepth(20);
    this.add
      .text(GAME_WIDTH / 2, 66, 'Campaign', textStyle(68, { color: hex(COLORS.accent) }))
      .setOrigin(0.5)
      .setDepth(21);
    new Button(this, 100, 66, 'Back', {
      width: 160,
      height: 80,
      fontSize: 34,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: () => goToScene(this, SCENE_KEYS.Play),
    }).setDepth(21);
    this.add
      .text(GAME_WIDTH - 40, 66, `★ ${stars}/${maxStars}`, textStyle(40, { color: '#ffd23f' }))
      .setOrigin(1, 0.5)
      .setDepth(21);
    this.decks = playableDecks();
    const saved = this.registry.get('campaignDeck') as string | undefined;
    this.deckIndex = Math.max(
      0,
      this.decks.findIndex((d) => d.name === saved),
    );
    this.deckButton = new Button(this, GAME_WIDTH / 2, 178, '', {
      width: 760,
      height: 84,
      fontSize: 32,
      color: COLORS.secondary,
      shadowColor: COLORS.secondaryDark,
      onClick: () => {
        if (this.decks.length < 2) {
          showToast(this, 'Build more decks in Decks to switch between them.');
          return;
        }
        this.deckIndex = (this.deckIndex + 1) % this.decks.length;
        this.updateDeckLabel();
      },
    }).setDepth(21);
    this.updateDeckLabel();
    if (campaignComplete(saves().save, getCampaign())) {
      this.add
        .text(
          GAME_WIDTH / 2,
          124,
          'Campaign complete! Go for 3 stars everywhere.',
          textStyle(24, { color: '#8dff7a' }),
        )
        .setOrigin(0.5)
        .setDepth(21);
    }
  }

  private updateDeckLabel(): void {
    const d = this.decks[this.deckIndex]!;
    this.deckButton.setLabel(`Your deck: ${d.name}${this.decks.length > 1 ? '  ▸' : ''}`);
    this.registry.set('campaignDeck', d.name);
  }

  // -------------------------------------------------------------------------
  // Scrolling
  // -------------------------------------------------------------------------

  private scrollTo(worldY: number): void {
    this.setMapY(GAME_HEIGHT / 2 + 120 - worldY);
  }

  private setMapY(y: number): void {
    this.map.y = Phaser.Math.Clamp(y, this.minY, HEADER_H);
  }

  private setupScrolling(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (this.modalOpen || p.y < HEADER_H) return;
      this.dragStart = { pointerY: p.y, mapY: this.map.y };
      this.dragged = false;
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (!this.dragStart || !p.isDown) return;
      const dy = p.y - this.dragStart.pointerY;
      if (Math.abs(dy) > DRAG_THRESHOLD) this.dragged = true;
      if (this.dragged) this.setMapY(this.dragStart.mapY + dy);
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.dragStart = null;
      // Let node handlers (which run on the same pointer-up) see `dragged` first.
      this.time.delayedCall(0, () => (this.dragged = false));
    });
    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (_p: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
        if (!this.modalOpen) this.setMapY(this.map.y - dy);
      },
    );
  }

  // -------------------------------------------------------------------------
  // Panels
  // -------------------------------------------------------------------------

  private modal(title: string, body: string, buttons: ConstructorParameters<typeof Modal>[3]): void {
    this.modalOpen = true;
    const m = new Modal(this, title, body, buttons).setDepth(100);
    m.once(Phaser.GameObjects.Events.DESTROY, () => (this.modalOpen = false));
  }

  private showNode(node: CampaignNode): void {
    const campaign = getCampaign();
    const { ctx } = getContent();
    const save = saves().save;
    const deck = campaign.decks.get(node.deck);
    const hero = deck ? ctx.heroes.byId.get(deck.heroId) : undefined;
    const best = nodeStars(save, node.id);
    const region = campaign.regions[node.region]!;
    const lines = [
      `${region.name} · battle ${node.index + 1}/10`,
      `Opponent: ${hero?.name ?? '?'} · ${DIFFICULTY_NAMES[node.ai]} AI · cards Lv${node.level}`,
      '',
      `Best: ${'★'.repeat(best)}${'☆'.repeat(3 - best)}`,
      '★ Win the battle',
      ...node.stars.map((o) => `★ ${describeObjective(o)}`),
    ];
    const enemyRules = node.enemyRules.map((id) => campaign.rules.get(id)!);
    const playerRules = node.playerRules.map((id) => campaign.rules.get(id)!);
    if (enemyRules.length > 0) lines.push('', ...enemyRules.map((r) => `Enemy · ${r.name}: ${r.text}`));
    if (playerRules.length > 0) lines.push('', ...playerRules.map((r) => `You · ${r.name}: ${r.text}`));
    if (best === 0) {
      const cfg = PROGRESSION.campaign;
      const boss = node.boss ? cfg.bossFirstClear[node.region] : undefined;
      const parts = [
        `${(cfg.firstClearCoins[node.region] ?? 0) + (boss?.coins ?? 0)} Coins`,
        `${cfg.firstClearXp[node.region] ?? 0} XP`,
      ];
      if (boss?.gems) parts.push(`${boss.gems} Gems`);
      if (boss?.chest) parts.push(PROGRESSION.chests.types[boss.chest].name);
      lines.push('', `First win: ${parts.join(' + ')}`);
    }
    lines.push(`Each new star: +${PROGRESSION.campaign.gemsPerNewStar} Gems`);
    const player = this.decks[this.deckIndex]!;
    this.modal(node.boss ? `Boss: ${hero?.name ?? node.name}` : node.name, lines.join('\n'), [
      {
        label: 'Battle!',
        caption: `with ${player.name}`,
        onClick: () => goToScene(this, SCENE_KEYS.Match, campaignMatchData(node.id, player)),
      },
      { label: 'Close', color: COLORS.danger, shadowColor: COLORS.dangerDark, onClick: () => undefined },
    ]);
  }

  /** Region outros and intros the player hasn't read yet, one after another. */
  private showPendingStory(): void {
    const campaign = getCampaign();
    const beat = pendingStory(saves().save, campaign);
    if (!beat) return;
    const index = campaign.regions.indexOf(beat.region);
    if (beat.kind === 'intro') this.scrollTo(this.nodePos(beat.region.nodes[0]!).y);
    this.modal(
      beat.kind === 'intro' ? `Chapter ${index + 1}: ${beat.region.name}` : `${beat.region.name}: cleared!`,
      beat.text,
      [
        {
          label: 'Continue',
          onClick: () => {
            void saves()
              .commit(markStorySeen(saves().save, beat.key))
              .then(() => this.time.delayedCall(250, () => this.showPendingStory()));
          },
        },
      ],
    );
  }
}
