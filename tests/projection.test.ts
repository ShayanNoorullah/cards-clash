import { describe, expect, it } from 'vitest';
import { BoardProjection, PLANE } from '../src/match/projection';
import { sanitizeSettings } from '../src/services/settings';

describe('board projection', () => {
  it('is the identity in 2D', () => {
    const p = new BoardProjection('2d');
    expect(p.project(300, 500)).toEqual({ x: 300, y: 500, s: 1 });
    expect(p.unproject(300, 500)).toEqual({ px: 300, py: 500 });
  });

  it('tilts the board in 3D: the far edge is smaller and higher, the near edge unchanged', () => {
    const p = new BoardProjection('3d');
    const far = p.project(0, PLANE.top);
    const near = p.project(0, PLANE.bottom);
    expect(far.s).toBeLessThan(near.s);
    expect(near).toMatchObject({ x: 0, y: PLANE.bottom, s: 1 });
    expect(far.x).toBeGreaterThan(0);
    expect(p.project(540, 600).x).toBeCloseTo(540);
    // Rows stay in order from far to near.
    let last = -Infinity;
    for (let y = PLANE.top; y <= PLANE.bottom; y += 40) {
      const sy = p.project(100, y).y;
      expect(sy).toBeGreaterThan(last);
      last = sy;
    }
  });

  it('unproject inverts project inside the board', () => {
    const p = new BoardProjection('3d');
    for (const [x, y] of [
      [135, 445],
      [945, 925],
      [540, PLANE.mid],
      [20, 300],
    ] as const) {
      const s = p.project(x, y);
      const back = p.unproject(s.x, s.y);
      expect(back.px).toBeCloseTo(x, 0);
      expect(back.py).toBeCloseTo(y, 0);
    }
  });

  it('draws rectangles as 2-point edges in 2D and sampled curves in 3D', () => {
    expect(new BoardProjection('2d').quad(0, 200, 100, 600)).toHaveLength(4);
    expect(new BoardProjection('3d').quad(0, 200, 100, 600, 10)).toHaveLength(22);
  });

  it('stores the board view in settings', () => {
    expect(sanitizeSettings({}).boardView).toBe('3d');
    expect(sanitizeSettings({ boardView: '2d' }).boardView).toBe('2d');
    expect(sanitizeSettings({ boardView: 'iso' as never }).boardView).toBe('3d');
  });
});
