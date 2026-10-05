import type Phaser from 'phaser';
import type { CardDef, HeroDef } from '../engine/types';
import { ART, FIGURE_SIZE, HERO_PORTRAIT, TEXTURE_SCALE as K } from './cardLayout';
import { ART_KEYS, bake } from './frames';
import { cardGenome, heroGenome } from './genome';
import { MANIFEST } from './manifest';
import {
  paintBuildingCinematic,
  paintCreatureCinematic,
  paintHeroCinematic,
  paintSpellCinematic,
} from './cinematic';

/** How an illustration is cropped: the card's art window, a square portrait, or a standing card. */
export type ArtVariant = 'art' | 'square' | 'standee';

const VARIANT_SIZE: Record<ArtVariant, { w: number; h: number }> = {
  art: { w: ART.w * K, h: ART.h * K },
  square: { w: HERO_PORTRAIT * K, h: HERO_PORTRAIT * K },
  standee: { w: Math.round(FIGURE_SIZE * 0.82 * K), h: FIGURE_SIZE * K },
};

/** Where the crop sits vertically in the source image (0 = top, 1 = bottom): faces are usually high. */
const FOCUS_Y: Record<ArtVariant, number> = { art: 0.4, square: 0.5, standee: 0.5 };

/**
 * On-demand card art. Art is baked the first time a card is shown and shared by
 * every view of that card. Views acquire/release keys; when more than
 * `maxUnused` baked textures are unreferenced, the least recently used ones are
 * freed, which keeps GPU memory bounded on budget phones.
 * Keys listed in the asset manifest are real images and are never evicted.
 *
 * Cards and heroes with an `image` show their procedural art until the image
 * has loaded, then `upgrade` swaps the illustration in (see bind*).
 */
class ArtCacheImpl {
  private readonly refs = new Map<string, number>();
  /** Unreferenced baked keys, oldest first. */
  private readonly idle: string[] = [];
  /** Image downloads in flight, by URL. */
  private readonly loading = new Map<string, Promise<HTMLImageElement>>();
  maxUnused = 36;

  private imageKey(id: string, variant: ArtVariant): string {
    return `img-${variant}-${id}`;
  }

  private download(url: string): Promise<HTMLImageElement> {
    let p = this.loading.get(url);
    if (!p) {
      p = new Promise((resolve, reject) => {
        const el = new Image();
        el.decoding = 'async';
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error(`Could not load ${url}`));
        el.src = url;
      });
      // Keep the promise only while loading; the browser cache serves repeats.
      p.finally(() => this.loading.delete(url)).catch(() => undefined);
      this.loading.set(url, p);
    }
    return p;
  }

  /** Crops a loaded image into a canvas texture for one variant. */
  private addVariant(scene: Phaser.Scene, key: string, el: HTMLImageElement, variant: ArtVariant): void {
    if (scene.textures.exists(key)) return;
    const { w, h } = VARIANT_SIZE[variant];
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d')!;
    // Cover the target, keeping aspect ratio.
    const scale = Math.max(w / el.naturalWidth, h / el.naturalHeight);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (el.naturalWidth - sw) / 2;
    const sy = (el.naturalHeight - sh) * FOCUS_Y[variant];
    if (variant === 'standee') {
      // A standing card: rounded corners and a dark rim.
      const r = w * 0.08;
      g.beginPath();
      g.roundRect(0, 0, w, h, r);
      g.clip();
    } else if (variant === 'square') {
      // Hero portraits are round, like the hero frames they sit in.
      g.beginPath();
      g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
      g.clip();
    }
    g.drawImage(el, sx, sy, sw, sh, 0, 0, w, h);
    if (variant === 'square') {
      g.lineWidth = w * 0.04;
      g.strokeStyle = 'rgba(18, 12, 43, 0.95)';
      g.beginPath();
      g.arc(w / 2, h / 2, w / 2 - g.lineWidth / 2, 0, Math.PI * 2);
      g.stroke();
    }
    if (variant === 'standee') {
      g.lineWidth = w * 0.035;
      g.strokeStyle = 'rgba(18, 12, 43, 0.95)';
      g.beginPath();
      g.roundRect(0, 0, w, h, w * 0.08);
      g.stroke();
    }
    scene.textures.addCanvas(key, canvas);
  }

  /**
   * Loads the illustration of a card or hero (if it has one) and swaps it into
   * `target` once ready. The target's current key is read from and written to
   * its data ("artKey"), so whoever destroys it releases the right texture.
   */
  upgrade(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Image,
    def: { id: string; image?: string },
    variant: ArtVariant,
  ): void {
    if (!def.image) return;
    const key = this.imageKey(def.id, variant);
    const swap = () => {
      if (!target.active || !target.scene || target.getData('artKey') === key) return;
      const w = target.displayWidth;
      const h = target.displayHeight;
      const old = target.getData('artKey') as string | undefined;
      this.retain(key);
      target.setTexture(key).setDisplaySize(w, h);
      target.setData('artKey', key);
      if (old) this.release(scene, old);
    };
    if (scene.textures.exists(key)) {
      swap();
      return;
    }
    void this.download(def.image)
      .then((el) => {
        if (!target.active) return;
        this.addVariant(scene, key, el, variant);
        swap();
      })
      .catch(() => undefined); // keep the procedural art
  }

  /** The image key for a card variant if it is already loaded (no download). */
  loadedKey(scene: Phaser.Scene, def: { id: string; image?: string }, variant: ArtVariant): string | null {
    if (!def.image) return null;
    const key = this.imageKey(def.id, variant);
    return scene.textures.exists(key) ? key : null;
  }

  /** A card's art window as an Image, upgraded to the illustration when it loads. */
  cardImage(scene: Phaser.Scene, x: number, y: number, card: CardDef): Phaser.GameObjects.Image {
    const ready = this.loadedKey(scene, card, 'art');
    const key = ready ?? this.acquireCard(scene, card);
    if (ready) this.retain(ready);
    const img = scene.add.image(x, y, key).setData('artKey', key);
    if (!ready) this.upgrade(scene, img, card, 'art');
    return img;
  }

  /** A creature standing on the board, upgraded to its illustration when it loads. */
  figureImage(scene: Phaser.Scene, x: number, y: number, card: CardDef): Phaser.GameObjects.Image {
    const ready = this.loadedKey(scene, card, 'standee');
    const key = ready ?? this.acquireFigure(scene, card);
    if (ready) this.retain(ready);
    const img = scene.add.image(x, y, key).setData('artKey', key);
    if (!ready) this.upgrade(scene, img, card, 'standee');
    return img;
  }

  /** A square hero portrait. Hero images are kept like the baked portraits. */
  heroImage(scene: Phaser.Scene, x: number, y: number, hero: HeroDef): Phaser.GameObjects.Image {
    const ready = this.loadedKey(scene, hero, 'square');
    const key = ready ?? this.heroKey(scene, hero);
    const img = scene.add.image(x, y, key);
    if (!ready && hero.image) {
      const target = img;
      const swapKey = this.imageKey(hero.id, 'square');
      void this.download(hero.image)
        .then((el) => {
          if (!target.active || !target.scene) return;
          this.addVariant(target.scene, swapKey, el, 'square');
          this.heroImages.add(swapKey);
          const w = target.displayWidth;
          const h = target.displayHeight;
          target.setTexture(swapKey).setDisplaySize(w, h);
        })
        .catch(() => undefined);
    }
    return img;
  }

  /** Hero portrait images (never evicted, like baked portraits). */
  private readonly heroImages = new Set<string>();

  /** Returns the texture key for a card's art, baking it if needed. */
  acquireCard(scene: Phaser.Scene, card: CardDef): string {
    const key = ART_KEYS.art(card.artKey);
    if (!scene.textures.exists(key)) {
      const gn = cardGenome(card);
      bake(scene, key, ART.w * K, ART.h * K, (g) => {
        const w = ART.w * K;
        const h = ART.h * K;
        if (gn.kind === 'spell') paintSpellCinematic(g, w, h, gn);
        else if (gn.kind === 'building') paintBuildingCinematic(g, w, h, gn);
        else if (gn.kind === 'creature') paintCreatureCinematic(g, w, h, gn);
      });
    }
    this.retain(key);
    return key;
  }

  /**
   * A creature without its backdrop, for board figures. Shares the eviction
   * pool with card art. Non-creatures fall back to their card art.
   */
  acquireFigure(scene: Phaser.Scene, card: CardDef): string {
    const gn = cardGenome(card);
    if (gn.kind !== 'creature') return this.acquireCard(scene, card);
    const key = ART_KEYS.figure(card.artKey);
    if (!scene.textures.exists(key)) {
      bake(scene, key, FIGURE_SIZE * K, FIGURE_SIZE * K, (g) =>
        paintCreatureCinematic(g, FIGURE_SIZE * K, FIGURE_SIZE * K, gn, false),
      );
    }
    this.retain(key);
    return key;
  }

  /** Hero portraits are small and few, so they are baked once and kept. */
  heroKey(scene: Phaser.Scene, hero: HeroDef): string {
    const key = ART_KEYS.hero(hero.id);
    if (!scene.textures.exists(key)) {
      bake(scene, key, HERO_PORTRAIT * K, HERO_PORTRAIT * K, (g) =>
        paintHeroCinematic(g, HERO_PORTRAIT * K, heroGenome(hero)),
      );
    }
    return key;
  }

  /** Releases the art key stored on an image made by cardImage/figureImage. */
  releaseImage(scene: Phaser.Scene, img: Phaser.GameObjects.Image): void {
    const key = img.getData('artKey') as string | undefined;
    if (key) this.release(scene, key);
  }

  release(scene: Phaser.Scene, key: string): void {
    const n = (this.refs.get(key) ?? 0) - 1;
    if (n > 0) {
      this.refs.set(key, n);
      return;
    }
    this.refs.delete(key);
    if (key in MANIFEST.images) return;
    this.idle.push(key);
    while (this.idle.length > this.maxUnused) {
      const old = this.idle.shift()!;
      if (!this.refs.has(old) && scene.textures.exists(old)) scene.textures.remove(old);
    }
  }

  private retain(key: string): void {
    this.refs.set(key, (this.refs.get(key) ?? 0) + 1);
    const idx = this.idle.indexOf(key);
    if (idx >= 0) this.idle.splice(idx, 1);
  }

  stats(): { referenced: number; idle: number } {
    return { referenced: this.refs.size, idle: this.idle.length };
  }
}

export const ArtCache = new ArtCacheImpl();
