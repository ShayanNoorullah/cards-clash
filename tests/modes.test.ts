import { describe, expect, it } from 'vitest';
import { getCampaign, rulesById } from '../src/campaign/config';
import { createGame, getContent, playableHeroes, validateDeck } from '../src/engine';
import { Rng } from '../src/engine/rng';
import { dailyDungeon, dailyStatus, recordDaily } from '../src/modes/daily';
import {
  claimDraft,
  draftBasics,
  draftDeck,
  draftOpponent,
  draftOver,
  draftPool,
  pickCard,
  pickHero,
  pickLandscape,
  recordDraft,
  retireDraft,
  startDraft,
} from '../src/modes/draft';
import {
  abandonGauntlet,
  claimGauntlet,
  gauntletOpponent,
  gauntletReward,
  recordGauntlet,
  startGauntlet,
} from '../src/modes/gauntlet';
import { applySandboxEdit } from '../src/modes/sandbox';
import { PROGRESSION } from '../src/progression/config';
import { createNewSave, loadSaveString, type RunDeck, type SaveData } from '../src/save/saveData';

const content = getContent();
const { ctx, starterDecks } = content;
const campaign = getCampaign();
const T0 = new Date(2026, 9, 1, 10, 0, 0).getTime();
const DAY = 24 * 60 * 60 * 1000;
const rng = () => new Rng('modes');

function runDeck(): RunDeck {
  const d = starterDecks[0]!;
  return { name: d.name, heroId: d.heroId, landscapes: [...d.landscapes], cards: [...d.cards] };
}

function rich(save: SaveData): SaveData {
  return { ...save, currencies: { coins: 10000, gems: 1000, dust: 0 } };
}

describe('mode config', () => {
  it('references real decks and rules', () => {
    const daily = PROGRESSION.modes.daily;
    for (const id of daily.decks) expect(campaign.decks.has(id), id).toBe(true);
    expect(() => rulesById(campaign, [...daily.enemyModifiers, ...daily.playerModifiers])).not.toThrow();
  });
});

describe('daily dungeon', () => {
  it('is the same for a given day and changes between days', () => {
    const a = dailyDungeon('2026-10-01', campaign, content);
    expect(dailyDungeon('2026-10-01', campaign, content)).toEqual(a);
    const week = Array.from(
      { length: 7 },
      (_, i) => dailyDungeon(`2026-10-0${i + 1}`, campaign, content).deckId,
    );
    expect(new Set(week).size).toBeGreaterThan(1);
    expect(a.rules[1]).toHaveLength(1);
    expect(() =>
      createGame({ seed: a.seed, decks: [starterDecks[0]!, a.enemyDeck], rules: a.rules }, ctx),
    ).not.toThrow();
  });

  it('pays the reward for the first win of each day only', () => {
    let save = createNewSave(content, T0);
    const gems0 = save.currencies.gems;
    let r = recordDaily(save, T0, false, content, rng());
    expect(r.reward).toBeNull();
    expect(dailyStatus(r.save, T0)).toMatchObject({ won: false, attempts: 1 });
    r = recordDaily(r.save, T0 + 1000, true, content, rng());
    expect(r.reward?.chestOpened).toBe('golden');
    expect(r.save.currencies.gems).toBeGreaterThanOrEqual(gems0 + 10);
    save = r.save;
    r = recordDaily(save, T0 + 2000, true, content, rng());
    expect(r.reward).toBeNull();
    expect(dailyStatus(r.save, T0 + DAY)).toEqual({ day: '2026-10-02', won: false, attempts: 0 });
    expect(recordDaily(r.save, T0 + DAY, true, content, rng()).reward).not.toBeNull();
  });
});

describe('gauntlet', () => {
  it('carries HP between battles, heals after wins, and ends on a loss', () => {
    const started = startGauntlet(createNewSave(content, T0), runDeck(), 'g1', content);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    let save = started.save;
    expect(startGauntlet(save, runDeck(), 'g2', content).ok).toBe(false);
    const opp = gauntletOpponent(save.modes.gauntlet!, campaign, content);
    expect(opp).toMatchObject({ battle: 0, ai: 'easy', level: 1, final: false });
    expect(opp.deck.heroId).not.toBe(runDeck().heroId);
    save = recordGauntlet(save, true, 10, content);
    expect(save.modes.gauntlet).toMatchObject({
      wins: 1,
      hp: 10 + PROGRESSION.modes.gauntlet.healBetween,
      over: false,
    });
    save = recordGauntlet(save, false, 0, content);
    expect(save.modes.gauntlet).toMatchObject({ wins: 1, over: true });
    const coins = save.currencies.coins;
    const claimed = claimGauntlet(save, content, rng());
    expect(claimed.ok).toBe(true);
    if (claimed.ok) {
      expect(claimed.save.modes.gauntlet).toBeNull();
      expect(claimed.save.currencies.coins).toBe(coins + (gauntletReward(1).coins ?? 0));
    }
  });

  it('ends after the final battle against a boss deck, and can be abandoned', () => {
    const r = startGauntlet(createNewSave(content, T0), runDeck(), 'g3', content);
    if (!r.ok) throw new Error(r.error);
    let save = r.save;
    for (let i = 0; i < PROGRESSION.modes.gauntlet.battles - 1; i++)
      save = recordGauntlet(save, true, 20, content);
    const final = gauntletOpponent(save.modes.gauntlet!, campaign, content);
    expect(final.final).toBe(true);
    expect([...campaign.bosses.values()].some((b) => b.heroId === final.deck.heroId)).toBe(true);
    save = recordGauntlet(save, true, 20, content);
    expect(save.modes.gauntlet).toMatchObject({ wins: PROGRESSION.modes.gauntlet.battles, over: true });
    const fresh = startGauntlet(createNewSave(content, T0), runDeck(), 'g4', content);
    if (!fresh.ok) throw new Error(fresh.error);
    expect(abandonGauntlet(fresh.save).modes.gauntlet?.over).toBe(true);
    expect(claimGauntlet(fresh.save, content, rng()).ok).toBe(false);
  });
});

describe('draft arena', () => {
  function draftThrough(seed: string): SaveData {
    const s = startDraft(rich(createNewSave(content, T0)), seed, content);
    if (!s.ok) throw new Error(s.error);
    let save = s.save;
    const h = pickHero(save, save.modes.draft!.heroOffer[0]!, content);
    if (!h.ok) throw new Error(h.error);
    const l = pickLandscape(h.save, h.save.modes.draft!.landscapeOffer[0]!, content);
    if (!l.ok) throw new Error(l.error);
    save = l.save;
    while (save.modes.draft!.stage === 'cards') {
      const offer = save.modes.draft!.offer;
      expect(offer).toHaveLength(3);
      expect(new Set(offer).size).toBe(3);
      const p = pickCard(save, offer[0]!, content);
      if (!p.ok) throw new Error(p.error);
      save = p.save;
    }
    return save;
  }

  it('charges the entry and offers 3 playable heroes', () => {
    const poor = createNewSave(content, T0);
    poor.currencies.coins = 0;
    expect(startDraft(poor, 'd0', content).ok).toBe(false);
    const r = startDraft(rich(createNewSave(content, T0)), 'd0', content);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.currencies.coins).toBe(10000 - (PROGRESSION.modes.draft.entry.coins ?? 0));
    const ids = playableHeroes(ctx.heroes).map((h) => h.id);
    expect(r.save.modes.draft!.heroOffer.every((id) => ids.includes(id))).toBe(true);
    expect(startDraft(r.save, 'd1', content).ok).toBe(false);
  });

  it('builds a 40-card castable deck from 30 picks and 10 basics, deterministically', () => {
    const save = draftThrough('d2');
    const run = save.modes.draft!;
    expect(run.stage).toBe('battles');
    expect(run.picks).toHaveLength(30);
    expect(draftThrough('d2').modes.draft!.picks).toEqual(run.picks);
    expect(draftBasics(run.landscapes, content)).toHaveLength(10);
    const deck = draftDeck(run, content);
    expect(deck.cards).toHaveLength(40);
    const pool = new Set(draftPool(run.landscapes, content).map((c) => c.id));
    expect(run.picks.every((id) => pool.has(id))).toBe(true);
    const errors = validateDeck(deck, ctx).filter((e) => !/copies/i.test(e));
    expect(errors).toEqual([]);
    const opp = draftOpponent(run, content);
    expect(() =>
      createGame({ seed: 'draft', decks: [deck, opp.deck], skipDeckValidation: true }, ctx),
    ).not.toThrow();
  });

  it('runs until max wins or max losses, then pays by wins', () => {
    let save = draftThrough('d3');
    const cfg = PROGRESSION.modes.draft;
    for (let i = 0; i < cfg.maxLosses; i++) save = recordDraft(save, i === 0);
    expect(save.modes.draft).toMatchObject({ wins: 1, losses: cfg.maxLosses - 1 });
    save = recordDraft(save, false);
    expect(draftOver(save.modes.draft!)).toBe(true);
    expect(recordDraft(save, true).modes.draft!.wins).toBe(1);
    const coins = save.currencies.coins;
    const claimed = claimDraft(save, content, rng());
    expect(claimed.ok).toBe(true);
    if (claimed.ok) {
      expect(claimed.save.modes.draft).toBeNull();
      expect(claimed.save.currencies.coins).toBe(coins + (cfg.rewards[1]!.coins ?? 0));
    }
    let won = draftThrough('d4');
    for (let i = 0; i < cfg.maxWins; i++) won = recordDraft(won, true);
    expect(draftOver(won.modes.draft!)).toBe(true);
    expect(retireDraft(draftThrough('d5')).modes.draft?.losses).toBe(cfg.maxLosses);
  });
});

describe('sandbox', () => {
  it('edits a main-phase state without touching the original', () => {
    const { state } = createGame(
      { seed: 'sb', decks: [starterDecks[0]!, starterDecks[1]!], firstPlayer: 0 },
      ctx,
    );
    expect(applySandboxEdit(state, { type: 'refillMp', player: 0 }, ctx)).toBeNull();
    const main = { ...state, phase: 'main' as const };
    const s1 = applySandboxEdit(
      main,
      { type: 'spawnCreature', player: 1, lane: 2, cardId: 'the_mariachi' },
      ctx,
    )!;
    expect(s1.players[1].lanes[2]!.creature?.cardId).toBe('the_mariachi');
    expect(main.players[1].lanes[2]!.creature).toBeNull();
    const s2 = applySandboxEdit(s1, { type: 'addToHand', player: 0, cardId: 'legion_of_earlings' }, ctx)!;
    expect(s2.players[0].hand.at(-1)?.cardId).toBe('legion_of_earlings');
    expect(new Set([...s2.players[0].hand, ...s2.players[0].deck].map((c) => c.iid)).size).toBe(
      s2.players[0].hand.length + s2.players[0].deck.length,
    );
    const s3 = applySandboxEdit(s2, { type: 'refillMp', player: 0 }, ctx)!;
    expect(s3.players[0].mp).toBe(ctx.balance.maxMp);
    expect(
      applySandboxEdit(s3, { type: 'clearBoard', player: 1 }, ctx)!.players[1].lanes[2]!.creature,
    ).toBeNull();
    expect(
      applySandboxEdit(s3, { type: 'spawnCreature', player: 1, lane: 0, cardId: 'strawberry_butt' }, ctx),
    ).toBeNull();
  });
});

describe('save v4', () => {
  it('migrates v3 saves and drops broken runs', () => {
    const v3 = { ...createNewSave(content, 5), version: 3 } as Record<string, unknown>;
    delete v3.modes;
    expect(loadSaveString(JSON.stringify(v3), content, 10).save.modes).toEqual({
      daily: { day: null, won: false, attempts: 0 },
      gauntlet: null,
      draft: null,
    });
    const started = startGauntlet(createNewSave(content, 5), runDeck(), 'g', content);
    if (!started.ok) throw new Error(started.error);
    const kept = loadSaveString(JSON.stringify(started.save), content, 10).save;
    expect(kept.modes.gauntlet?.deck.cards).toHaveLength(40);
    const broken = {
      ...started.save,
      modes: { ...started.save.modes, gauntlet: { seed: 'x', deck: { heroId: 'nope' } } },
    };
    expect(loadSaveString(JSON.stringify(broken), content, 10).save.modes.gauntlet).toBeNull();
  });
});
