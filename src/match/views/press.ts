import Phaser from 'phaser';

const LONG_PRESS_MS = 450;
const SLOP = 18;

/**
 * Adds tap + long-press handling to an interactive game object. Long press
 * (for inspecting) cancels the tap; moving the finger cancels both.
 */
export function attachPress(
  obj: Phaser.GameObjects.GameObject,
  onTap: () => void,
  onLongPress: () => void,
  isEnabled: () => boolean = () => true,
): void {
  let state: { x: number; y: number; long: boolean; timer: Phaser.Time.TimerEvent } | null = null;
  const scene = obj.scene;
  obj.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => {
    if (!isEnabled()) return;
    const timer = scene.time.delayedCall(LONG_PRESS_MS, () => {
      if (state) {
        state.long = true;
        onLongPress();
      }
    });
    state = { x: p.x, y: p.y, long: false, timer };
  });
  obj.on(Phaser.Input.Events.GAMEOBJECT_POINTER_MOVE, (p: Phaser.Input.Pointer) => {
    if (state && Phaser.Math.Distance.Between(p.x, p.y, state.x, state.y) > SLOP) {
      state.timer.remove();
      state = null;
    }
  });
  const end = (fire: boolean) => {
    if (!state) return;
    state.timer.remove();
    const wasLong = state.long;
    state = null;
    if (fire && !wasLong) onTap();
  };
  obj.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => end(true));
  obj.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => end(false));
}
