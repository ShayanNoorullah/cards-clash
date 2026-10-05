/**
 * Small full-screen overlays shared by the Decks and Deck Builder scenes.
 * Each overlay hides the scene's DOM inputs (which draw above the canvas)
 * via the `domToHide` list and restores them on close.
 */
import Phaser from 'phaser';
import { CARD_H } from '../art/cardLayout';
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import type { CardDef } from '../engine/types';
import { Button } from '../ui/Button';
import { CardView } from '../ui/CardView';
import { addTextField, fieldValue } from '../ui/TextField';
import { COLORS, hex, textStyle } from '../ui/theme';

export interface OverlayHandle {
  container: Phaser.GameObjects.Container;
  close: () => void;
}

export function openOverlay(
  scene: Phaser.Scene,
  domToHide: Phaser.GameObjects.DOMElement[] = [],
  tapToClose = false,
): OverlayHandle {
  const container = scene.add.container(0, 0).setDepth(500);
  const dim = scene.add
    .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0820, 0.92)
    .setOrigin(0)
    .setInteractive();
  container.add(dim);
  for (const el of domToHide) el.setVisible(false);
  const ownDom: Phaser.GameObjects.DOMElement[] = [];
  container.setData('ownDom', ownDom);
  const close = () => {
    for (const el of ownDom) el.destroy();
    container.destroy();
    for (const el of domToHide) if (el.active) el.setVisible(true);
  };
  if (tapToClose) dim.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, close);
  return { container, close };
}

function trackDom(h: OverlayHandle, el: Phaser.GameObjects.DOMElement): Phaser.GameObjects.DOMElement {
  (h.container.getData('ownDom') as Phaser.GameObjects.DOMElement[]).push(el);
  return el.setDepth(501);
}

export interface ListOption {
  label: string;
  caption?: string;
  color?: number;
  onPick: () => void;
}

/** A two-column list of big buttons (starter decks, heroes, actions). */
export function pickFromList(
  scene: Phaser.Scene,
  title: string,
  options: ListOption[],
  domToHide: Phaser.GameObjects.DOMElement[] = [],
): OverlayHandle {
  const h = openOverlay(scene, domToHide, true);
  h.container.add(
    scene.add.text(GAME_WIDTH / 2, 110, title, textStyle(56, { color: hex(COLORS.accent) })).setOrigin(0.5),
  );
  const cols = options.length > 5 ? 2 : 1;
  const w = cols === 2 ? 480 : 760;
  options.forEach((o, i) => {
    const col = cols === 2 ? i % 2 : 0;
    const row = cols === 2 ? Math.floor(i / 2) : i;
    const x = cols === 2 ? GAME_WIDTH / 2 + (col === 0 ? -255 : 255) : GAME_WIDTH / 2;
    const opts = {
      width: w,
      height: 130,
      fontSize: 34,
      color: o.color ?? COLORS.secondary,
      shadowColor: COLORS.secondaryDark,
      onClick: () => {
        h.close();
        o.onPick();
      },
      ...(o.caption ? { caption: o.caption } : {}),
    };
    h.container.add(new Button(scene, x, 260 + row * 165, o.label, opts));
  });
  h.container.add(
    new Button(scene, GAME_WIDTH / 2, GAME_HEIGHT - 120, 'Cancel', {
      width: 400,
      height: 110,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: () => h.close(),
    }),
  );
  return h;
}

/** Shows a deck code with Copy (clipboard) and a selectable text field. */
export function showDeckCode(
  scene: Phaser.Scene,
  code: string,
  domToHide: Phaser.GameObjects.DOMElement[] = [],
): void {
  const h = openOverlay(scene, domToHide);
  h.container.add(
    scene.add
      .text(GAME_WIDTH / 2, 300, 'Deck code', textStyle(64, { color: hex(COLORS.accent) }))
      .setOrigin(0.5),
  );
  h.container.add(
    scene.add
      .text(GAME_WIDTH / 2, 390, 'Share it with a friend. They can paste it in My Decks → Import.', {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: hex(COLORS.textDim),
        align: 'center',
        wordWrap: { width: 900 },
      })
      .setOrigin(0.5, 0),
  );
  const field = trackDom(
    h,
    addTextField(scene, GAME_WIDTH / 2, 560, { width: 960, value: code, fontSize: 26 }),
  );
  (field.node as HTMLInputElement).readOnly = true;
  h.container.add(
    new Button(scene, GAME_WIDTH / 2, 760, 'Copy', {
      width: 400,
      height: 120,
      onClick: () => {
        const input = field.node as HTMLInputElement;
        input.select();
        const done = (ok: boolean) =>
          scene.add
            .text(
              GAME_WIDTH / 2,
              880,
              ok ? 'Copied!' : 'Select the code and copy it manually.',
              textStyle(32),
            )
            .setOrigin(0.5)
            .setDepth(502);
        if (navigator.clipboard?.writeText)
          navigator.clipboard.writeText(code).then(
            () => done(true),
            () => done(false),
          );
        else done(false);
      },
    }),
  );
  h.container.add(
    new Button(scene, GAME_WIDTH / 2, GAME_HEIGHT - 160, 'Close', {
      width: 400,
      height: 110,
      color: COLORS.secondary,
      shadowColor: COLORS.secondaryDark,
      onClick: () => h.close(),
    }),
  );
}

/** Text input overlay (rename, import). Returns the entered text via onSubmit. */
export function promptText(
  scene: Phaser.Scene,
  title: string,
  hint: string,
  initial: string,
  confirm: string,
  onSubmit: (value: string) => string | null,
  domToHide: Phaser.GameObjects.DOMElement[] = [],
  maxLength = 200,
): void {
  const h = openOverlay(scene, domToHide);
  h.container.add(
    scene.add.text(GAME_WIDTH / 2, 300, title, textStyle(60, { color: hex(COLORS.accent) })).setOrigin(0.5),
  );
  h.container.add(
    scene.add
      .text(GAME_WIDTH / 2, 380, hint, {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: hex(COLORS.textDim),
        align: 'center',
        wordWrap: { width: 900 },
      })
      .setOrigin(0.5, 0),
  );
  const error = scene.add
    .text(GAME_WIDTH / 2, 680, '', textStyle(30, { color: '#ff9a9a', wordWrap: { width: 900 } }))
    .setOrigin(0.5, 0);
  h.container.add(error);
  const submit = () => {
    const problem = onSubmit(fieldValue(field).trim());
    if (problem) error.setText(problem);
    else h.close();
  };
  const field = trackDom(
    h,
    addTextField(scene, GAME_WIDTH / 2, 560, { width: 900, value: initial, maxLength, onEnter: submit }),
  );
  h.container.add(
    new Button(scene, GAME_WIDTH / 2 - 210, 860, confirm, { width: 380, height: 120, onClick: submit }),
  );
  h.container.add(
    new Button(scene, GAME_WIDTH / 2 + 210, 860, 'Cancel', {
      width: 380,
      height: 120,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: () => h.close(),
    }),
  );
}

/** Large card view; tap anywhere to close. */
export function inspectCard(
  scene: Phaser.Scene,
  card: CardDef,
  extra: string[],
  domToHide: Phaser.GameObjects.DOMElement[] = [],
): void {
  const h = openOverlay(scene, domToHide, true);
  const scale = 2.1;
  h.container.add(new CardView(scene, GAME_WIDTH / 2, 80 + (CARD_H * scale) / 2, card).setScale(scale));
  h.container.add(
    scene.add
      .text(GAME_WIDTH / 2, 80 + CARD_H * scale + 40, [...extra, `“${card.flavorText}”`].join('\n'), {
        fontFamily: FONT_FAMILY,
        fontSize: '32px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 8,
        resolution: 2,
        wordWrap: { width: GAME_WIDTH - 120, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0),
  );
}
