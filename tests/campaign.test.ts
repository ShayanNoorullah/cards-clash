import { describe, expect, it } from 'vitest';
import rawCampaign from '../src/data/campaign.json';
import rawDecks from '../src/data/campaign-decks.json';
import rawRules from '../src/data/match-rules.json';
import { decide } from '../src/ai/AiPlayer';
import { getProfile } from '../src/ai/profiles';
import {
  buildCampaign,
  describeObjective,
  getCampaign,
  OBJECTIVE_TYPES,
  rulesById,
  type CampaignNode,
} from '../src/campaign/config';
import {
  applyCampaignResult,
  campaignComplete,
  campaignOpponent,
  currentNode,
  evaluateStars,
  markStorySeen,
  nodeStars,
  nodeUnlocked,
  pendingStory,
  regionUnlocked,
  totalStars,
  type NodeResult,
} from '../src/campaign/progress';
import {
  applyAction,
  createGame,
  creatureAtk,
  getContent,
  playersToAct,
  type Action,
  type GameState,
  type PlayerId,
} from '../src/engine';
import { MatchController } from '../src/match/MatchController';
import { emptyMatchStats } from '../src/progression/matchRewards';
import { createNewSave, loadSaveString, type SaveData } from '../src/save/saveData';
import { Rng } from '../src/engine/rng';
import {
  lessonDecks,
  lessonRules,
  LESSONS,
  matchesExpect,
  TUTORIAL_ENEMY,
  TUTORIAL_PLAYER,
  TutorialRunner,
  validateLessons,
} from '../src/tutorial/tutorial';

const content = getContent();
const { ctx, starterDecks } = content;
const campaign = getCampaign();

function result(partial: Partial<NodeResult> = {}): NodeResult {
  return { won: true, turnsTaken: 8, heroHp: 20, stats: emptyMatchStats(), ...partial };
}

function withStars(save: SaveData, stars: Record<string, number>): SaveData {
  return { ...save, campaign: { ...save.campaign, stars: { ...save.campaign.stars, ...stars } } };
}

/** Plays a game between two AIs until it ends (or a safety cap). */
function playOut(state: GameState, difficulties: [string, string], cap = 400): GameState {
  let s = state;
  for (let i = 0; i < cap && s.phase !== 'ended'; i++) {
    const p: PlayerId = playersToAct(s)[0]!;
    const d = decide(s, p, ctx, getProfile(difficulties[p] as 'easy'));
    const r = applyAction(s, d.action, ctx);
    if (!r.ok) throw new Error(`AI action rejected: ${r.error.code}`);
    s = r.state;
  }
  return s;
}

describe('match rules in the engine', () => {
  const rules = (ids: string[]) => rulesById(campaign, ids);
  const decks = [starterDecks[0]!, starterDecks[1]!] as [(typeof starterDecks)[0], (typeof starterDecks)[1]];

  it('applies setup tweaks: hero HP, starting charge and extra cards', () => {
    const { state } = createGame(
      {
        seed: 'rules',
        decks,
        rules: [rules(['charged', 'head_start']), rules(['stronghold'])],
        firstPlayer: 0,
      },
      ctx,
    );
    expect(state.players[1].maxHp).toBe(ctx.balance.heroMaxHp + 40);
    expect(state.players[1].hp).toBe(ctx.balance.heroMaxHp + 40);
    expect(state.players[0].ultimateCharge).toBe(50);
    expect(state.players[0].hand).toHaveLength(ctx.balance.firstPlayerHandSize + 1);
    expect(state.players[1].hand).toHaveLength(ctx.balance.secondPlayerHandSize);
  });

  it('keeps stacked decks in order and honours a forced first player', () => {
    const { state } = createGame({ seed: 'stack', decks, stackedDecks: true, firstPlayer: 1 }, ctx);
    expect(state.firstPlayer).toBe(1);
    expect(state.players[0].hand.map((c) => c.cardId)).toEqual(decks[0].cards.slice(0, 6));
    expect(state.players[1].hand.map((c) => c.cardId)).toEqual(decks[1].cards.slice(0, 5));
  });

  it('rule statics and start-of-turn abilities work like a hero passive', () => {
    const c = new MatchController({
      seed: 'statics',
      seats: [
        { name: 'A', human: true, deck: decks[0] },
        { name: 'B', human: true, deck: decks[1] },
      ],
      ctx,
      setup: {
        rules: [rules(['sharp_claws']), rules(['boss_sandstorm'])],
        firstPlayer: 0,
        autoSetup: [[...decks[0].landscapes], [...decks[1].landscapes]],
      },
    });
    expect(c.state.phase).toBe('main');
    // Sharp Claws: +3 ATK on player 0's creatures.
    const iid = c.state.players[0].hand.find(
      (x) => ctx.cards.byId.get(x.cardId)?.type === 'creature' && ctx.cards.byId.get(x.cardId)!.cost <= 2,
    )?.iid;
    expect(iid).toBeDefined();
    expect(c.submit({ type: 'playCard', player: 0, iid: iid!, lane: 0 }).ok).toBe(true);
    const creature = c.state.players[0].lanes[0]!.creature!;
    const card = ctx.cards.byId.get(creature.cardId)!;
    expect(card.type === 'creature' && creatureAtk(c.state, ctx, creature, 0)).toBe(
      card.type === 'creature' && card.atk + 3,
    );
    const hpBefore = c.state.players[0].hp;
    expect(c.submit({ type: 'endTurn', player: 0 }).ok).toBe(true);
    // Endless Sandstorm: player 1's start of turn deals 3 to player 0's hero.
    expect(c.state.players[0].hp).toBe(hpBefore - 3);
  });
});

describe('campaign content', () => {
  it('has 8 regions × 10 nodes, 8 bosses, and every node can start a match', () => {
    expect(campaign.regions).toHaveLength(8);
    expect(campaign.nodes.size).toBe(80);
    expect(campaign.bosses.size).toBe(8);
    for (const r of campaign.regions) {
      expect(r.nodes[9]!.boss).not.toBeNull();
      expect(r.nodes.slice(0, 9).every((n) => n.boss === null)).toBe(true);
    }
    const player = starterDecks[0]!;
    for (const node of campaign.nodes.values()) {
      const opp = campaignOpponent(campaign, node, content);
      expect(() =>
        createGame({ seed: node.id, decks: [player, opp.deck], rules: opp.rules }, ctx),
      ).not.toThrow();
    }
  });

  it('gives each boss a unique hero, deck and special rule', () => {
    const bosses = [...campaign.bosses.values()];
    expect(new Set(bosses.map((b) => b.heroId)).size).toBe(8);
    expect(new Set(bosses.map((b) => b.deck)).size).toBe(8);
    expect(new Set(bosses.map((b) => b.rule)).size).toBe(8);
    // Bosses are Card Wars heroes the player can also use.
    for (const b of bosses) expect(ctx.heroes.byId.get(b.heroId)?.boss, b.heroId).toBeUndefined();
  });

  it('enemy decks use the node card level', () => {
    const node = campaign.regions[7]!.nodes[5]!;
    const opp = campaignOpponent(campaign, node, content);
    expect(Object.values(opp.deck.levels ?? {}).every((l) => l === node.level)).toBe(true);
    const { state } = createGame({ seed: 'lv', decks: [starterDecks[0]!, opp.deck] }, ctx);
    expect(Object.values(state.players[1].cardLevels).every((l) => l === node.level)).toBe(true);
  });

  it('reports broken campaign data clearly', () => {
    const broken = structuredClone(rawCampaign) as unknown as {
      regions: {
        nodes: { deck?: string; enemyRules?: string[]; stars: { type: string; value: number }[] }[];
      }[];
    };
    broken.regions[0]!.nodes[0]!.deck = 'nope';
    broken.regions[0]!.nodes[1]!.enemyRules = ['missing_rule'];
    broken.regions[0]!.nodes[2]!.stars = [{ type: 'bogus', value: 1 }];
    expect(() => buildCampaign(broken, rawDecks, rawRules, content)).toThrow(
      /unknown deck nope[\s\S]*missing_rule[\s\S]*needs exactly 2/,
    );
  });

  it('describes every objective type', () => {
    for (const type of OBJECTIVE_TYPES) expect(describeObjective({ type, value: 3 })).not.toBe('');
  });

  it('an AI can finish a boss fight with the rules in place', () => {
    const node = campaign.regions[6]!.nodes[9]!; // the Rift boss: flips landscapes every turn
    const opp = campaignOpponent(campaign, node, content);
    const { state } = createGame(
      { seed: 'boss-sim', decks: [starterDecks[9]!, opp.deck], rules: opp.rules },
      ctx,
    );
    const end = playOut(state, ['normal', 'easy']);
    expect(end.phase).toBe('ended');
  });
});

describe('campaign progress', () => {
  const r1 = campaign.regions[0]!;
  const fresh = () => createNewSave(content, 1000);

  it('unlocks nodes one by one and regions after their boss', () => {
    let save = fresh();
    expect(nodeUnlocked(save, campaign, r1.nodes[0]!)).toBe(true);
    expect(nodeUnlocked(save, campaign, r1.nodes[1]!)).toBe(false);
    expect(regionUnlocked(save, campaign, 1)).toBe(false);
    expect(currentNode(save, campaign).id).toBe('r1n1');
    save = withStars(save, { r1n1: 1 });
    expect(nodeUnlocked(save, campaign, r1.nodes[1]!)).toBe(true);
    expect(currentNode(save, campaign).id).toBe('r1n2');
    save = withStars(save, Object.fromEntries(r1.nodes.map((n) => [n.id, 2])));
    expect(regionUnlocked(save, campaign, 1)).toBe(true);
    expect(nodeUnlocked(save, campaign, campaign.regions[1]!.nodes[0]!)).toBe(true);
    expect(totalStars(save, campaign)).toBe(20);
    expect(campaignComplete(save, campaign)).toBe(false);
  });

  it('awards one star for a win plus one per objective met', () => {
    const node: CampaignNode = {
      ...r1.nodes[0]!,
      stars: [
        { type: 'winWithinTurns', value: 10 },
        { type: 'heroHpAtLeast', value: 15 },
      ],
    };
    expect(evaluateStars(node, result({ won: false })).stars).toBe(0);
    expect(evaluateStars(node, result({ turnsTaken: 12, heroHp: 3 })).stars).toBe(1);
    expect(evaluateStars(node, result({ turnsTaken: 10, heroHp: 3 }))).toEqual({
      stars: 2,
      met: [true, false],
    });
    expect(evaluateStars(node, result({ turnsTaken: 9, heroHp: 15 })).stars).toBe(3);
    const stats = {
      ...emptyMatchStats(),
      ultimatesUsed: 1,
      floops: 2,
      creaturesDestroyed: 5,
      spellsCast: 3,
      creaturesPlayed: 6,
    };
    const n2: CampaignNode = {
      ...node,
      stars: [
        { type: 'noUltimate', value: 1 },
        { type: 'floops', value: 2 },
      ],
    };
    expect(evaluateStars(n2, result({ stats })).met).toEqual([false, true]);
  });

  it('records best stars and grants first-clear, new-star and boss rewards once', () => {
    let save = fresh();
    const rng = new Rng('camp');
    const coins0 = save.currencies.coins;
    const a = applyCampaignResult(
      save,
      campaign,
      'r1n1',
      result({ turnsTaken: 99, heroHp: 1 }),
      content,
      rng,
    );
    expect(a.summary).toMatchObject({ stars: 1, previousStars: 0, firstClear: true });
    expect(a.save.currencies.coins).toBe(coins0 + 40);
    expect(a.save.currencies.gems).toBe(save.currencies.gems + 2);
    expect(a.save.progression.xp).toBe(30);
    save = a.save;
    // Replaying for 3 stars pays only the 2 new stars.
    const b = applyCampaignResult(
      save,
      campaign,
      'r1n1',
      result({ turnsTaken: 1, heroHp: 100 }),
      content,
      rng,
    );
    expect(b.summary).toMatchObject({ stars: 3, previousStars: 1, firstClear: false });
    expect(b.save.currencies.gems).toBe(save.currencies.gems + 4);
    expect(b.save.currencies.coins).toBe(save.currencies.coins);
    // A worse result never lowers the record; a loss gives nothing.
    const c = applyCampaignResult(b.save, campaign, 'r1n1', result({ won: false }), content, rng);
    expect(nodeStars(c.save, 'r1n1')).toBe(3);
    expect(c.save.currencies).toEqual(b.save.currencies);
    // Boss first clear opens a chest and the next region.
    save = withStars(c.save, Object.fromEntries(r1.nodes.slice(0, 9).map((n) => [n.id, 1])));
    const boss = applyCampaignResult(
      save,
      campaign,
      'r1n10',
      result({ turnsTaken: 99, heroHp: 1 }),
      content,
      rng,
    );
    expect(boss.summary.bossCleared).toBe(true);
    expect(boss.summary.regionUnlocked).toBe(1);
    expect(boss.summary.reward.chestOpened).toBe('silver');
    expect(boss.summary.reward.cards.length).toBeGreaterThan(0);
  });

  it('shows each region intro once, and its outro after the boss', () => {
    let save = fresh();
    expect(pendingStory(save, campaign)).toMatchObject({ key: 'r1:intro', kind: 'intro' });
    save = markStorySeen(save, 'r1:intro');
    expect(pendingStory(save, campaign)).toBeNull();
    save = withStars(save, { r1n10: 1 });
    expect(pendingStory(save, campaign)?.key).toBe('r1:outro');
    save = markStorySeen(save, 'r1:outro');
    expect(pendingStory(save, campaign)?.key).toBe('r2:intro');
  });

  it('migrates v2 saves and repairs campaign data', () => {
    const v2 = { ...createNewSave(content, 5), version: 2 } as Record<string, unknown>;
    delete v2.campaign;
    delete v2.tutorial;
    const { save } = loadSaveString(JSON.stringify(v2), content, 10);
    expect(save.campaign).toEqual({ stars: {}, storySeen: [] });
    expect(save.tutorial).toEqual({ done: [], offered: true });
    const messy = {
      ...save,
      campaign: { stars: { r1n1: 9, r1n2: -1, r1n3: 'x' }, storySeen: ['a', 'a', 3] },
    };
    const repaired = loadSaveString(JSON.stringify(messy), content, 10).save;
    expect(repaired.campaign).toEqual({ stars: { r1n1: 3 }, storySeen: ['a'] });
  });
});

describe('tutorial lessons', () => {
  it('reference real cards, heroes and rules', () => {
    expect(LESSONS).toHaveLength(3);
    expect(
      validateLessons(LESSONS, {
        card: (id) => ctx.cards.byId.has(id),
        hero: (id) => ctx.heroes.byId.has(id),
        rule: (id) => campaign.rules.has(id),
      }),
    ).toEqual([]);
  });

  for (const lesson of LESSONS) {
    it(`${lesson.id}: every forced move is legal in order, and the lesson can be won`, () => {
      const decks = lessonDecks(lesson);
      const c = new MatchController({
        seed: `tutorial:${lesson.id}`,
        seats: [
          { name: 'You', human: true, deck: decks[0] },
          { name: lesson.enemy.name, human: false, deck: decks[1], ai: { difficulty: 'easy' } },
        ],
        ctx,
        setup: {
          rules: lessonRules(lesson, campaign),
          stackedDecks: true,
          firstPlayer: TUTORIAL_PLAYER,
          skipDeckValidation: true,
          autoSetup: [[...lesson.player.landscapes], [...lesson.enemy.landscapes]],
        },
      });
      const runner = new TutorialRunner(lesson);
      for (let guard = 0; guard < 600 && !c.isOver; guard++) {
        const s = c.state;
        if (s.activePlayer === TUTORIAL_ENEMY) {
          const scripted = runner.enemyAction(s);
          const action = scripted ?? decide(s, TUTORIAL_ENEMY, ctx, getProfile('easy')).action;
          const r = c.submit(action);
          expect(r.ok, `enemy ${JSON.stringify(action)} at step ${runner.stepIndex}`).toBe(true);
          continue;
        }
        const step = runner.step;
        if (step && !step.expect) {
          runner.next();
          continue;
        }
        let action: Action;
        if (step?.expect) {
          const allowed = runner.filter(s, c.legalActions(TUTORIAL_PLAYER));
          expect(
            allowed.length,
            `step ${runner.stepIndex}: "${step.text}" has no legal action`,
          ).toBeGreaterThan(0);
          action = allowed[0]!;
          expect(matchesExpect(s, action, step.expect, TUTORIAL_PLAYER)).toBe(true);
        } else {
          action = decide(s, TUTORIAL_PLAYER, ctx, getProfile('hard')).action;
        }
        const before = c.state;
        expect(c.submit(action).ok).toBe(true);
        runner.onAction(before, action);
      }
      expect(runner.finished).toBe(true);
      expect(c.state.winner).toBe(TUTORIAL_PLAYER);
    }, 60_000);
  }

  it('blocks every action during an info step and anything unexpected during an action step', () => {
    const lesson = LESSONS[0]!;
    const runner = new TutorialRunner(lesson);
    const decks = lessonDecks(lesson);
    const { state } = createGame(
      { seed: 't', decks, stackedDecks: true, firstPlayer: 0, skipDeckValidation: true },
      ctx,
    );
    const legal: Action[] = [{ type: 'endTurn', player: 0 }];
    expect(runner.filter(state, legal)).toEqual([]);
    runner.next();
    runner.next();
    expect(runner.step?.expect?.type).toBe('playCard');
    expect(runner.filter(state, legal)).toEqual([]);
  });
});
