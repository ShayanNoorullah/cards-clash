import { describe, expect, it } from 'vitest';
import { aiPolicy } from '../src/ai/policy';
import { getProfile } from '../src/ai/profiles';
import { applyAction, BALANCE, createGame, getContent, Rng, runMatch, type GameState } from '../src/engine';
import { PROGRESSION, validateProgression } from '../src/progression/config';
import { achievementStatus, claimAchievement, statValue } from '../src/progression/achievements';
import {
  addStats,
  claimLogin,
  claimQuest,
  ensureDailyQuests,
  localDay,
  loginRewardAvailable,
} from '../src/progression/daily';
import {
  deckSlotsUnlocked,
  heroUnlocked,
  levelFromXp,
  levelProgress,
  xpForLevel,
} from '../src/progression/levels';
import { accumulateMatchStats, applyMatchResult, emptyMatchStats } from '../src/progression/matchRewards';
import {
  awardVictoryChest,
  buyPack,
  claimFreeChest,
  formatOdds,
  grantReward,
  openChestSlot,
  openNowCost,
  rollCards,
  startUnlock,
} from '../src/progression/rewards';
import { slotToLeveledDeckList } from '../src/save/decks';
import { createNewSave, loadSaveString, SAVE_VERSION } from '../src/save/saveData';

const content = getContent();
const { ctx } = content;
const T0 = new Date(2026, 9, 1, 12, 0, 0).getTime();
const HOUR = 3_600_000;
const rng = () => new Rng('prog-test');

describe('card levels in matches', () => {
  function gameWithLevel(level: number): GameState {
    const deck = {
      ...content.starterDecks[5]!,
      levels: { travelin_farmer: level, blood_transfusion: level },
    };
    let s = createGame({ seed: 'lvl', decks: [deck, content.starterDecks[0]!] }, ctx).state;
    for (const p of [0, 1] as const) {
      const r = applyAction(
        s,
        { type: 'arrangeLandscapes', player: p, order: [...s.players[p].landscapePool] },
        ctx,
      );
      if (r.ok) s = r.state;
    }
    for (const p of [0, 1] as const) {
      const r = applyAction(s, { type: 'mulligan', player: p, iids: [] }, ctx);
      if (r.ok) s = r.state;
    }
    return s;
  }

  it('stores levels per player and applies stat bonuses', async () => {
    const { creatureAtk, creatureMaxDef } = await import('../src/engine');
    const s = gameWithLevel(5);
    expect(s.players[0].cardLevels).toEqual({ travelin_farmer: 5, blood_transfusion: 5 });
    const imp = {
      iid: 'x',
      cardId: 'travelin_farmer',
      owner: 0 as const,
      damage: 0,
      atkMod: 0,
      defMod: 0,
      tempAtk: 0,
      tempDef: 0,
      exhausted: false,
      summoningSick: false,
      movesThisTurn: 0,
      shield: false,
      frozen: false,
      poison: 0,
      stealth: false,
      grantedKeywords: [],
      token: false,
    };
    s.players[0].lanes[0]!.creature = imp;
    const printed = ctx.cards.byId.get('travelin_farmer') as { atk: number; def: number };
    const bonus = BALANCE.cardLevels[4]!;
    expect(creatureAtk(s, ctx, imp, 0)).toBe(printed.atk + bonus.atk);
    expect(creatureMaxDef(s, ctx, imp, 0)).toBe(printed.def + bonus.def);
  });

  it('upgrades ability amounts at level 3+', () => {
    const s = gameWithLevel(3);
    s.activePlayer = 0;
    s.players[0].mp = 6;
    s.players[0].hand.push({ iid: 'bolt', cardId: 'blood_transfusion', owner: 0 });
    const before = s.players[1].hp;
    // Blood Transfusion deals 5 to the enemy Hero; level 3 adds 1.
    const r = applyAction(s, { type: 'playCard', player: 0, iid: 'bolt' }, ctx);
    expect(r.ok && before - r.state.players[1].hp).toBe(5 + 1);
  });

  it('Ranked can force every card to a fixed level', () => {
    const { state } = createGame(
      { seed: 1, decks: [content.starterDecks[0]!, content.starterDecks[1]!], fixedCardLevel: 3 },
      ctx,
    );
    expect(Object.values(state.players[0].cardLevels).every((l) => l === 3)).toBe(true);
    expect(Object.keys(state.players[0].cardLevels).length).toBe(
      new Set(content.starterDecks[0]!.cards).size,
    );
  });

  it('saved decks carry the collection levels', () => {
    const save = createNewSave(content, T0);
    save.collection.husker_worm = { count: 3, level: 4 };
    expect(slotToLeveledDeckList(save.decks[0]!, save).levels).toEqual({ husker_worm: 4 });
  });
});

describe('config and levels', () => {
  it('ships a valid progression config', () => {
    expect(validateProgression(PROGRESSION)).toEqual([]);
  });

  it('maps XP to levels', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(700)).toBe(5);
    expect(xpForLevel(25)).toBeGreaterThan(xpForLevel(20));
    expect(levelProgress(175)).toMatchObject({ level: 2, into: 75, needed: 150 });
  });

  it('unlocks deck slots and heroes by level', () => {
    expect(deckSlotsUnlocked(1, 10)).toBe(4);
    expect(deckSlotsUnlocked(3, 10)).toBe(6);
    expect(deckSlotsUnlocked(20, 10)).toBe(10);
    // Starter-deck heroes are free; the rest unlock with levels.
    for (const d of content.starterDecks) expect(heroUnlocked(d.heroId, 1), d.heroId).toBe(true);
    const [late] = Object.entries(PROGRESSION.unlocks.heroes).find(([, l]) => l === 6)!;
    expect(heroUnlocked(late, 5)).toBe(false);
    expect(heroUnlocked(late, 6)).toBe(true);
  });
});

describe('save v2 migration', () => {
  it('upgrades a v1 save, moving stats into lifetime counters', () => {
    const v1 = {
      ...createNewSave(content, T0),
      version: 1,
      stats: { matchesPlayed: 7, wins: 4, losses: 3 },
    } as Record<string, unknown>;
    for (const k of ['progression', 'chests', 'login', 'quests', 'achievements', 'lifetime']) delete v1[k];
    const { save } = loadSaveString(JSON.stringify(v1), content, T0);
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.lifetime).toMatchObject({ matches: 7, wins: 4, losses: 3, creaturesPlayed: 0 });
    expect(save.progression).toEqual({ xp: 0, level: 1 });
    expect(save.chests.slots).toEqual([null, null, null, null]);
  });
});

describe('rewards', () => {
  it('rolls cards with guaranteed rarity and landscape filters', () => {
    const r = rngFn();
    for (let i = 0; i < 50; i++) {
      const cards = rollCards(content, PROGRESSION.packs[1]!.odds, 5, r, { guaranteed: 'rare' });
      const rarities = cards.map((id) => ctx.cards.byId.get(id)!.rarity);
      expect(rarities.some((x) => x === 'rare' || x === 'epic' || x === 'legendary')).toBe(true);
    }
    const dune = rollCards(content, PROGRESSION.packs[0]!.odds, 20, r, { landscape: 'dune' });
    expect(dune.every((id) => ctx.cards.byId.get(id)!.landscape === 'dune')).toBe(true);
  });

  it('roll distribution roughly follows the published odds', () => {
    const r = new Rng('odds');
    const n = 4000;
    const cards = rollCards(content, PROGRESSION.packs[0]!.odds, n, r);
    const commons = cards.filter((id) => ctx.cards.byId.get(id)!.rarity === 'common').length / n;
    expect(Math.abs(commons - 0.7)).toBeLessThan(0.03);
    expect(formatOdds(PROGRESSION.packs[0]!.odds)).toContain('Common 70%');
  });

  it('grants XP with level-up rewards and unlock notices', () => {
    const save = createNewSave(content, T0);
    const { save: next, summary } = grantReward(save, { xp: 260 }, content, rng());
    expect(next.progression.level).toBe(3);
    expect(summary.levelUps).toEqual([2, 3]);
    expect(next.currencies.coins).toBe(save.currencies.coins + 2 * PROGRESSION.xp.levelUpReward.coins);
    for (const [hero, lvl] of Object.entries(PROGRESSION.unlocks.heroes)) {
      if (lvl === 2 || lvl === 3) expect(summary.unlocks).toContain(`hero:${hero}`);
    }
  });

  it('buys packs, refusing when broke', () => {
    const save = createNewSave(content, T0);
    const r = buyPack(save, 'basic', content, rng());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.save.currencies.coins).toBe(save.currencies.coins - 300);
      expect(r.summary.cards).toHaveLength(5);
      expect(r.save.lifetime.cardsOpened).toBe(5);
    }
    expect(
      buyPack({ ...save, currencies: { ...save.currencies, gems: 0 } }, 'premium', content, rng()),
    ).toMatchObject({ ok: false });
    expect(buyPack(save, 'landscape', content, rng())).toMatchObject({
      ok: false,
      error: expect.stringContaining('landscape'),
    });
    expect(buyPack(save, 'landscape', content, rng(), 'candy').ok).toBe(true);
  });
});

function rngFn() {
  return new Rng('rolls');
}

describe('chests', () => {
  it('victory chests fill slots, unlock one at a time and open when ready', () => {
    let save = createNewSave(content, T0);
    const r = new Rng('chests');
    for (let i = 0; i < 4; i++) save = awardVictoryChest(save, r).save;
    expect(save.chests.slots.every(Boolean)).toBe(true);
    expect(awardVictoryChest(save, r).chest).toBeNull();

    const started = startUnlock(save, 0, T0);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    save = started.save;
    expect(startUnlock(save, 1, T0 + 1000)).toMatchObject({
      ok: false,
      error: expect.stringContaining('One at a time'),
    });
    expect(openChestSlot(save, 0, T0 + 1000, content, r, false)).toMatchObject({ ok: false });

    const minutes = PROGRESSION.chests.types[save.chests.slots[0]!.type].unlockMinutes;
    const opened = openChestSlot(save, 0, T0 + minutes * 60_000, content, r, false);
    expect(opened.ok).toBe(true);
    if (opened.ok) {
      expect(opened.save.chests.slots[0]).toBeNull();
      expect(opened.summary.cards.length).toBeGreaterThan(0);
      expect(opened.save.lifetime.chestsOpened).toBe(1);
    }
  });

  it('can be opened early for gems', () => {
    let save = createNewSave(content, T0);
    save.chests.slots[0] = { type: 'wooden', unlockStartedAt: null };
    expect(openNowCost(save.chests.slots[0], T0)).toBe(6);
    save = { ...save, currencies: { ...save.currencies, gems: 100 } };
    const r = openChestSlot(save, 0, T0, content, rng(), true);
    expect(r.ok && r.save.currencies.gems).toBe(94);
  });

  it('gives a free chest every 4 hours', () => {
    const save = createNewSave(content, T0);
    const a = claimFreeChest(save, T0, content, rng());
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(claimFreeChest(a.save, T0 + HOUR, content, rng()).ok).toBe(false);
    expect(claimFreeChest(a.save, T0 + 4 * HOUR, content, rng()).ok).toBe(true);
  });
});

describe('daily login and quests', () => {
  it('cycles 7 login rewards, once per day', () => {
    let save = createNewSave(content, T0);
    for (let day = 0; day < 8; day++) {
      const now = T0 + day * 24 * HOUR;
      expect(loginRewardAvailable(save, now)).toBe(true);
      const r = claimLogin(save, now, content, rng());
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      save = r.save;
      expect(claimLogin(save, now + HOUR, content, rng()).ok).toBe(false);
    }
    expect(save.login.streakIndex).toBe(1);
  });

  it('picks the same 3 quests for everyone on a day, and new ones the next day', () => {
    const a = ensureDailyQuests(createNewSave(content, T0), T0);
    const b = ensureDailyQuests(createNewSave(content, T0 + 1000), T0 + 1000);
    expect(a.quests.active.map((q) => q.id)).toEqual(b.quests.active.map((q) => q.id));
    expect(a.quests.active).toHaveLength(3);
    expect(a.quests.day).toBe(localDay(T0));
    const tomorrow = ensureDailyQuests(a, T0 + 24 * HOUR);
    expect(tomorrow.quests.day).not.toBe(a.quests.day);
  });

  it('tracks progress and pays out once', () => {
    let save = ensureDailyQuests(createNewSave(content, T0), T0);
    const q = save.quests.active[0]!;
    const def = PROGRESSION.quests.pool.find((x) => x.id === q.id)!;
    expect(claimQuest(save, q.id, content, rng()).ok).toBe(false);
    save = addStats(save, { [def.stat]: def.target + 5 });
    expect(save.quests.active[0]!.progress).toBe(def.target);
    const r = claimQuest(save, q.id, content, rng());
    expect(r.ok).toBe(true);
    if (r.ok) expect(claimQuest(r.save, q.id, content, rng()).ok).toBe(false);
  });
});

describe('achievements', () => {
  it('reads lifetime and derived stats, and claims once', () => {
    let save = createNewSave(content, T0);
    expect(statValue(save, 'uniqueCards')).toBe(new Set(content.starterDecks.flatMap((d) => d.cards)).size);
    save = addStats(save, { wins: 1 });
    const first = achievementStatus(save).find((a) => a.def.id === 'first_win')!;
    expect(first.done).toBe(true);
    const r = claimAchievement(save, 'first_win', content, rng());
    expect(r.ok && r.save.currencies.gems).toBe(save.currencies.gems + 10);
    if (r.ok) expect(claimAchievement(r.save, 'first_win', content, rng()).ok).toBe(false);
  });
});

describe('match results', () => {
  it('counts match stats from events for the right player', () => {
    const stats = emptyMatchStats();
    accumulateMatchStats(
      stats,
      [
        { type: 'cardPlayed', player: 0, iid: 'a', cardId: 'husker_worm', lane: 0, target: null },
        { type: 'cardPlayed', player: 0, iid: 'b', cardId: 'cerebral_bloodstorm', lane: null, target: null },
        { type: 'cardPlayed', player: 1, iid: 'c', cardId: 'husker_worm', lane: 0, target: null },
        { type: 'damage', target: { kind: 'hero', player: 1 }, amount: 4, sourcePlayer: 0 },
        { type: 'damage', target: { kind: 'hero', player: 0 }, amount: 9, sourcePlayer: 1 },
        { type: 'creatureDestroyed', player: 1, iid: 'c', cardId: 'husker_worm', lane: 0 },
        { type: 'floop', player: 0, iid: 'a', lane: 0 },
      ],
      0,
      ctx,
    );
    expect(stats).toEqual({
      creaturesPlayed: 1,
      spellsCast: 1,
      heroDamage: 4,
      creaturesDestroyed: 1,
      ultimatesUsed: 0,
      floops: 1,
    });
  });

  it('a win gives XP, coins and a victory chest', () => {
    const save = createNewSave(content, T0);
    const { save: next, summary } = applyMatchResult(save, 'win', emptyMatchStats(), T0, content, rng());
    expect(summary.xp).toBe(PROGRESSION.xp.match.win);
    expect(next.currencies.coins).toBe(save.currencies.coins + PROGRESSION.matchCoins.win);
    expect(summary.victoryChest).not.toBeNull();
    expect(next.chests.slots.filter(Boolean)).toHaveLength(1);
    expect(next.lifetime).toMatchObject({ matches: 1, wins: 1 });
  });

  it('a new player reaches level 5 through normal play (real matches vs the AI)', () => {
    let save = createNewSave(content, T0);
    const r = new Rng('journey');
    const player = aiPolicy(getProfile('easy'), ctx);
    const opponent = aiPolicy(getProfile('easy'), ctx);
    let now = T0;
    let matches = 0;
    while (save.progression.level < 5 && matches < 40) {
      // One play session per "day": daily login, a few matches, claim finished quests.
      const login = claimLogin(save, now, content, r);
      if (login.ok) save = login.save;
      for (let m = 0; m < 4 && save.progression.level < 5; m++) {
        const my = slotToLeveledDeckList(save.decks[save.selectedDeck]!, save);
        const theirs = r.pick(content.starterDecks);
        const { state } = runMatch(
          { seed: `journey-${matches}`, decks: [my, theirs], policies: [player, opponent] },
          ctx,
        );
        const outcome = state.winner === 0 ? 'win' : state.winner === 'draw' ? 'draw' : 'loss';
        save = applyMatchResult(save, outcome, emptyMatchStats(), now, content, r).save;
        for (const q of save.quests.active) {
          const c = claimQuest(save, q.id, content, r);
          if (c.ok) save = c.save;
        }
        matches++;
      }
      now += 24 * HOUR;
    }
    console.info(
      `[progression] level ${save.progression.level} after ${matches} matches (${save.lifetime.wins} wins)`,
    );
    expect(save.progression.level).toBeGreaterThanOrEqual(5);
    expect(matches).toBeLessThanOrEqual(30);
  }, 120_000);
});
