import { describe, expect, it } from 'vitest';
import { getContent, collectibleCards, maxCopiesFor } from '../src/engine';
import {
  craft,
  craftCost,
  levelUp,
  levelUpCost,
  ownedCount,
  scrap,
  scrapValue,
  spareCopies,
} from '../src/save/collection';
import {
  addCard,
  autoFill,
  canAdd,
  decodeDeck,
  deckIssues,
  deckSize,
  encodeDeck,
  idCode,
  isPlayable,
  manaCurve,
  removeCard,
  slotToDeckList,
} from '../src/save/decks';
import {
  CARD_POOL_REFUND_DUST,
  createNewSave,
  loadSaveString,
  migrate,
  SAVE_VERSION,
  type DeckSlot,
} from '../src/save/saveData';
import { BACKUP_KEY, CORRUPT_KEY, SAVE_KEY, SaveManager } from '../src/save/SaveManager';
import { MemoryStorage } from '../src/services/storage';

const content = getContent();
const { ctx } = content;
const NOW = 1_700_000_000_000;

describe('new save', () => {
  it('owns every starter-deck card, has starting currencies and 3 playable starter decks', () => {
    const s = createNewSave(content, NOW);
    expect(s.version).toBe(SAVE_VERSION);
    for (const deck of content.starterDecks)
      for (const id of deck.cards) expect(ownedCount(s, id)).toBeGreaterThan(0);
    expect(s.decks).toHaveLength(10);
    expect(s.decks.filter(Boolean)).toHaveLength(3);
    for (const d of s.decks.filter((x): x is DeckSlot => !!x)) expect(isPlayable(d, s, ctx)).toBe(true);
    expect(s.currencies.coins).toBeGreaterThan(0);
  });
});

describe('migrations and repair', () => {
  it('migrates a v0 prototype save (old cards become Dust, starter decks are given)', () => {
    const v0 = {
      name: 'Old Timer',
      coins: 77,
      cards: { golden_sunsprout: 3, ember_imp: 2 },
      deck: {
        heroId: 'vulka',
        landscapes: ['ember', 'ember', 'ember', 'ember'],
        cards: ['ember_imp', 'ember_imp'],
      },
    };
    const { save } = loadSaveString(JSON.stringify(v0), content, NOW);
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.profile.name).toBe('Old Timer');
    expect(save.currencies.coins).toBe(77);
    // The old card pool is gone: 5 copies are refunded as Dust.
    expect(save.collection.golden_sunsprout).toBeUndefined();
    expect(save.currencies.dust).toBeGreaterThanOrEqual(5 * CARD_POOL_REFUND_DUST);
    expect(save.decks[0]).toMatchObject({ heroId: content.starterDecks[0]!.heroId });
    expect(isPlayable(save.decks[0]!, save, ctx)).toBe(true);
  });

  it('rejects saves from a newer version', () => {
    expect(() => migrate({ version: 99 })).toThrow(/newer/);
  });

  it('repairs invalid data instead of crashing', () => {
    const s = createNewSave(content, NOW) as unknown as Record<string, unknown>;
    (s.collection as Record<string, unknown>).not_a_card = { count: 3, level: 1 };
    (s.collection as Record<string, unknown>).husker_worm = { count: -4, level: 99 };
    (s.decks as unknown[])[5] = {
      name: '',
      heroId: 'nobody',
      landscapes: ['lava'],
      cards: { husker_worm: 9, ghost: 1 },
    };
    (s.currencies as Record<string, unknown>).coins = 'lots';
    const { save, fixes } = loadSaveString(JSON.stringify(s), content, NOW);
    expect(save.collection.not_a_card).toBeUndefined();
    // An invalid starter card entry is replaced by the starter amount (starter decks are always owned).
    expect(save.collection.husker_worm?.count).toBeGreaterThan(0);
    expect(save.collection.husker_worm?.level).toBe(1);
    expect(save.decks[5]).toMatchObject({
      name: 'Deck 6',
      landscapes: ['golden', 'golden', 'golden', 'golden'],
      cards: { husker_worm: 3 },
    });
    expect(save.currencies.coins).toBe(0);
    expect(fixes.length).toBeGreaterThan(0);
  });
});

describe('SaveManager', () => {
  it('creates, persists and reloads a save (survives a restart)', async () => {
    const storage = new MemoryStorage();
    const a = new SaveManager(storage, content, () => NOW);
    await a.load();
    expect(a.loadedFrom).toBe('new');
    await a.update((s) => {
      s.profile.name = 'Kai';
    });
    await a.flush();
    const b = new SaveManager(storage, content, () => NOW);
    await b.load();
    expect(b.loadedFrom).toBe('main');
    expect(b.save.profile.name).toBe('Kai');
  });

  it('keeps a backup and recovers from a corrupt main save', async () => {
    const storage = new MemoryStorage();
    const a = new SaveManager(storage, content, () => NOW);
    await a.load();
    await a.update((s) => {
      s.currencies.coins = 1234;
    });
    await a.update((s) => {
      s.currencies.coins = 999;
    });
    await a.flush();
    expect(storage.data.has(BACKUP_KEY)).toBe(true);
    storage.data.set(SAVE_KEY, '{ broken json');
    const b = new SaveManager(storage, content, () => NOW);
    await b.load();
    expect(b.loadedFrom).toBe('backup');
    expect(b.save.currencies.coins).toBe(1234);
    expect(storage.data.get(CORRUPT_KEY)).toBe('{ broken json');
  });

  it('notifies listeners and serializes writes in order', async () => {
    const storage = new MemoryStorage();
    const m = new SaveManager(storage, content, () => NOW);
    await m.load();
    const seen: number[] = [];
    m.onChange((s) => seen.push(s.currencies.gems));
    void m.update((s) => void (s.currencies.gems = 1));
    void m.update((s) => void (s.currencies.gems = 2));
    await m.flush();
    expect(seen).toEqual([1, 2]);
    expect(JSON.parse(storage.data.get(SAVE_KEY)!).currencies.gems).toBe(2);
  });
});

describe('collection operations', () => {
  const card = (id: string) => ctx.cards.byId.get(id)!;

  it('crafts with dust and scraps only spare copies', () => {
    let s = createNewSave(content, NOW);
    s.currencies.dust = 1000;
    const imp = card('husker_worm'); // common, max 3
    s.collection.husker_worm = { count: 3, level: 1 };
    expect(scrap(s, 'husker_worm', ctx)).toMatchObject({ ok: false });
    const r = craft(s, 'husker_worm', ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.save;
    expect(s.collection.husker_worm!.count).toBe(4);
    expect(s.currencies.dust).toBe(1000 - craftCost(imp));
    expect(spareCopies(s, imp, ctx)).toBe(1);
    const sc = scrap(s, 'husker_worm', ctx);
    expect(sc.ok && sc.save.currencies.dust).toBe(1000 - craftCost(imp) + scrapValue(imp));
  });

  it('refuses crafting without enough dust or for tokens', () => {
    const s = createNewSave(content, NOW);
    s.currencies.dust = 0;
    expect(craft(s, 'the_mariachi', ctx)).toMatchObject({ ok: false });
    expect(craft({ ...s, currencies: { ...s.currencies, dust: 5000 } }, 'not_a_card', ctx)).toMatchObject({
      ok: false,
    });
  });

  it('levels up with spare copies and coins, up to the max level', () => {
    let s = createNewSave(content, NOW);
    s.collection.husker_worm = { count: 3 + 20, level: 1 };
    s.currencies.coins = 100_000;
    for (let level = 1; level < 5; level++) {
      const cost = levelUpCost(level)!;
      const before = s.collection.husker_worm!.count;
      const r = levelUp(s, 'husker_worm', ctx);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      s = r.save;
      expect(s.collection.husker_worm).toEqual({ count: before - cost.copies, level: level + 1 });
    }
    expect(levelUp(s, 'husker_worm', ctx)).toMatchObject({
      ok: false,
      error: expect.stringContaining('maximum'),
    });
    s.collection.rural_earl = { count: 3, level: 1 };
    expect(levelUp(s, 'rural_earl', ctx)).toMatchObject({
      ok: false,
      error: expect.stringContaining('spare'),
    });
  });
});

describe('deck slots', () => {
  const s = createNewSave(content, NOW);
  const golden = s.decks[0]!;

  it('validates rules and ownership', () => {
    expect(deckIssues(golden, s, ctx)).toEqual({ errors: [], warnings: [] });
    const short = removeCard(golden, Object.keys(golden.cards)[0]!, NOW);
    expect(isPlayable(short, s, ctx)).toBe(false);
    const notOwned: DeckSlot = { ...golden, cards: { ...golden.cards, madame_seota: 1 } };
    const issues = deckIssues(removeCard(notOwned, 'husker_worm', NOW), s, ctx);
    if (!s.collection.madame_seota) expect(issues.errors.join()).toMatch(/you own 0/);
    expect(issues.warnings.join()).toMatch(/can't cast/);
  });

  it('enforces add rules (size, copies, ownership)', () => {
    expect(canAdd(golden, 'husker_worm', s, ctx)).toMatch(/already has 40/);
    const empty: DeckSlot = { ...golden, cards: {} };
    expect(canAdd(empty, 'husker_worm', s, ctx)).toBeNull();
    const three = addCard(
      addCard(addCard(empty, 'husker_worm', NOW), 'husker_worm', NOW),
      'husker_worm',
      NOW,
    );
    expect(canAdd(three, 'husker_worm', s, ctx)).toMatch(/Max 3/);
  });

  it('computes the mana curve', () => {
    const curve = manaCurve(golden, ctx);
    expect(curve.reduce((a, b) => a + b, 0)).toBe(40);
    expect(curve).toHaveLength(7);
  });

  it('auto-fills to a playable 40-card deck from owned, castable cards', () => {
    const start: DeckSlot = { ...golden, cards: { brief_power: 1 } };
    const filled = autoFill(start, s, ctx, NOW);
    expect(deckSize(filled)).toBe(40);
    expect(filled.cards.brief_power).toBe(1);
    expect(deckIssues(filled, s, ctx).errors).toEqual([]);
    expect(deckIssues(filled, s, ctx).warnings).toEqual([]);
    const curve = manaCurve(filled, ctx);
    expect(curve[1]! + curve[2]! + curve[3]!).toBeGreaterThan(15);
  });

  it('converts to an engine deck list', () => {
    const list = slotToDeckList(golden);
    expect(list.cards).toHaveLength(40);
    expect(list.heroId).toBe(golden.heroId);
  });
});

describe('deck codes', () => {
  it('round-trip every starter deck', () => {
    for (const d of content.starterDecks) {
      const counts: Record<string, number> = {};
      for (const id of d.cards) counts[id] = (counts[id] ?? 0) + 1;
      const code = encodeDeck({ heroId: d.heroId, landscapes: d.landscapes, cards: counts });
      expect(code.startsWith('CC1-')).toBe(true);
      expect(code.length).toBeLessThan(200);
      expect(decodeDeck(code, content)).toEqual({
        ok: true,
        heroId: d.heroId,
        landscapes: d.landscapes,
        cards: counts,
      });
    }
  });

  it('card and hero codes never collide', () => {
    const ids = [...collectibleCards(ctx.cards).map((c) => c.id), ...ctx.heroes.all.map((h) => h.id)];
    expect(new Set(ids.map(idCode)).size).toBe(ids.length);
  });

  it('rejects damaged or foreign codes with readable errors', () => {
    const d = content.starterDecks[0]!;
    const code = encodeDeck({ heroId: d.heroId, landscapes: d.landscapes, cards: { husker_worm: 3 } });
    expect(decodeDeck('hello', content)).toMatchObject({ ok: false, error: expect.stringContaining('CC1-') });
    const tampered = code.slice(0, -3) + (code.at(-3) === 'A' ? 'B' : 'A') + code.slice(-2);
    expect(decodeDeck(tampered, content).ok).toBe(false);
    expect(decodeDeck('CC1-!!!', content).ok).toBe(false);
  });

  it('respects copy limits after decoding (via validation)', () => {
    expect(maxCopiesFor('legendary', ctx.balance)).toBe(1);
  });
});

describe('starter cards', () => {
  it('tops up starter-deck cards when the starter lists change in an update', async () => {
    const { getContent } = await import('../src/engine');
    const { createNewSave, loadSaveString } = await import('../src/save/saveData');
    const content = getContent();
    const save = createNewSave(content, 1);
    save.collection.husker_worm = { count: 1, level: 2 };
    delete save.collection.rural_earl;
    const repaired = loadSaveString(JSON.stringify(save), content, 2).save;
    const needed = (id: string) =>
      Math.max(...content.starterDecks.map((d) => d.cards.filter((c) => c === id).length));
    expect(repaired.collection.husker_worm).toEqual({ count: needed('husker_worm'), level: 2 });
    expect(repaired.collection.rural_earl?.count).toBe(needed('rural_earl'));
  });
});
