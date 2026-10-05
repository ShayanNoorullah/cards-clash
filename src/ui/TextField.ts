import type Phaser from 'phaser';
import { FONT_FAMILY } from '../config/display';

export interface TextFieldOptions {
  width: number;
  height?: number;
  placeholder?: string;
  value?: string;
  maxLength?: number;
  fontSize?: number;
  onChange?: (value: string) => void;
  onEnter?: (value: string) => void;
}

/**
 * A real HTML <input> placed over the canvas with Phaser's DOM container, so
 * the phone's keyboard, paste and IME all work. Scales with the game.
 */
export function addTextField(
  scene: Phaser.Scene,
  x: number,
  y: number,
  o: TextFieldOptions,
): Phaser.GameObjects.DOMElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = o.placeholder ?? '';
  input.value = o.value ?? '';
  if (o.maxLength) input.maxLength = o.maxLength;
  input.autocomplete = 'off';
  input.spellcheck = false;
  Object.assign(input.style, {
    width: `${o.width}px`,
    height: `${o.height ?? 76}px`,
    fontSize: `${o.fontSize ?? 34}px`,
    fontFamily: FONT_FAMILY,
    padding: '0 22px',
    boxSizing: 'border-box',
    borderRadius: '22px',
    border: '4px solid #120c2b',
    background: '#fffaf0',
    color: '#120c2b',
    outline: 'none',
  });
  input.addEventListener('input', () => o.onChange?.(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      o.onEnter?.(input.value);
      input.blur();
    }
    // Keep Phaser keyboard shortcuts (ESC/space) from firing while typing.
    e.stopPropagation();
  });
  return scene.add.dom(x, y, input);
}

export function fieldValue(el: Phaser.GameObjects.DOMElement): string {
  return (el.node as HTMLInputElement).value;
}
