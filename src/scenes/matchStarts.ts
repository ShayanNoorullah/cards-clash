/**
 * Builds the scene data for campaign and tutorial matches, so the menus, the
 * campaign map and the end screen (retry / next lesson) all start them the same way.
 */
import { getCampaign } from '../campaign/config';
import { campaignOpponent } from '../campaign/progress';
import { getContent } from '../engine/content';
import type { DeckList, MatchRule } from '../engine/types';
import { dailyDungeon } from '../modes/daily';
import { draftDeck, draftOpponent } from '../modes/draft';
import { gauntletOpponent } from '../modes/gauntlet';
import { PROGRESSION } from '../progression/config';
import { localDay } from '../progression/daily';
import type { DraftRun, GauntletRun, RunDeck } from '../save/saveData';
import { saves } from '../save';
import { isPlayable, slotToLeveledDeckList } from '../save/decks';
import { lessonDecks, lessonRules, lessonById, TUTORIAL_PLAYER } from '../tutorial/tutorial';
import type { MatchSceneData } from './MatchSetupScene';

export interface PlayerDeckChoice {
  name: string;
  deck: DeckList;
}

/** Decks the player can take into the campaign: their playable saved decks (active one first). */
export function playableDecks(): PlayerDeckChoice[] {
  const { ctx, starterDecks } = getContent();
  const save = saves().save;
  const out: PlayerDeckChoice[] = [];
  save.decks.forEach((slot, i) => {
    if (!slot || !isPlayable(slot, save, ctx)) return;
    const choice = { name: slot.name, deck: slotToLeveledDeckList(slot, save) };
    if (i === save.selectedDeck) out.unshift(choice);
    else out.push(choice);
  });
  if (out.length === 0) {
    const d = starterDecks[0]!;
    out.push({ name: d.name, deck: d });
  }
  return out;
}

export function campaignMatchData(nodeId: string, player: PlayerDeckChoice, attempt = 0): MatchSceneData {
  const campaign = getCampaign();
  const node = campaign.nodes.get(nodeId);
  if (!node) throw new Error(`Unknown campaign node ${nodeId}`);
  const opp = campaignOpponent(campaign, node, getContent());
  const name = saves().loaded ? saves().save.profile.name : 'You';
  const enemyAi: { difficulty: typeof opp.ai; hooks?: typeof opp.hooks } = { difficulty: opp.ai };
  if (opp.hooks) enemyAi.hooks = opp.hooks;
  return {
    seed: `campaign:${nodeId}:${Date.now()}:${attempt}`,
    seats: [
      { name, human: true, deck: player.deck },
      { name: opp.name, human: false, deck: opp.deck, ai: enemyAi },
    ],
    setup: { rules: opp.rules },
    context: { kind: 'campaign', nodeId },
  };
}

export function tutorialMatchData(lessonId: string): MatchSceneData {
  const lesson = lessonById(lessonId);
  if (!lesson) throw new Error(`Unknown lesson ${lessonId}`);
  const decks = lessonDecks(lesson);
  return {
    seed: `tutorial:${lesson.id}`,
    seats: [
      { name: saves().loaded ? saves().save.profile.name : lesson.player.name, human: true, deck: decks[0] },
      { name: lesson.enemy.name, human: false, deck: decks[1], ai: { difficulty: 'easy' } },
    ],
    setup: {
      rules: lessonRules(lesson, getCampaign()),
      stackedDecks: true,
      firstPlayer: TUTORIAL_PLAYER,
      skipDeckValidation: true,
      autoSetup: [[...lesson.player.landscapes], [...lesson.enemy.landscapes]],
    },
    context: { kind: 'tutorial', lessonId },
  };
}

export function runDeckFrom(choice: PlayerDeckChoice): RunDeck {
  const d = choice.deck;
  const out: RunDeck = {
    name: choice.name,
    heroId: d.heroId,
    landscapes: [...d.landscapes],
    cards: [...d.cards],
  };
  if (d.levels) out.levels = { ...d.levels };
  return out;
}

function playerName(): string {
  return saves().loaded ? saves().save.profile.name : 'You';
}

export function dailyMatchData(player: PlayerDeckChoice, now: number): MatchSceneData {
  const dungeon = dailyDungeon(localDay(now), getCampaign(), getContent());
  return {
    seed: `${dungeon.seed}:${now}`,
    seats: [
      { name: playerName(), human: true, deck: player.deck },
      { name: dungeon.enemyName, human: false, deck: dungeon.enemyDeck, ai: { difficulty: dungeon.ai } },
    ],
    setup: { rules: dungeon.rules },
    context: { kind: 'daily', day: dungeon.day },
  };
}

export function gauntletMatchData(run: GauntletRun): MatchSceneData {
  const content = getContent();
  const opp = gauntletOpponent(run, getCampaign(), content);
  return {
    seed: `${run.seed}:battle:${opp.battle}`,
    seats: [
      { name: playerName(), human: true, deck: run.deck },
      { name: opp.name, human: false, deck: opp.deck, ai: { difficulty: opp.ai } },
    ],
    setup: { startingHp: [run.hp, content.ctx.balance.heroMaxHp] },
    context: { kind: 'gauntlet' },
  };
}

export function draftMatchData(run: DraftRun): MatchSceneData {
  const content = getContent();
  const opp = draftOpponent(run, content);
  return {
    seed: `${run.seed}:battle:${run.wins + run.losses}`,
    seats: [
      { name: playerName(), human: true, deck: draftDeck(run, content) },
      { name: opp.name, human: false, deck: opp.deck, ai: { difficulty: opp.ai } },
    ],
    setup: { skipDeckValidation: true },
    context: { kind: 'draft' },
  };
}

/** The Sandbox dummy: lots of HP, never plays a card. */
export const SANDBOX_DUMMY: MatchRule = {
  id: 'sandbox_dummy',
  name: 'Practice Dummy',
  text: 'Lots of HP. Never plays cards; it just ends its turn.',
  heroHpDelta: 0,
};

export function sandboxMatchData(player: PlayerDeckChoice): MatchSceneData {
  const content = getContent();
  const dummyDeck = content.starterDecks[content.starterDecks.length - 1]!;
  const dummy: MatchRule = {
    ...SANDBOX_DUMMY,
    heroHpDelta: PROGRESSION.modes.sandbox.dummyHp - content.ctx.balance.heroMaxHp,
  };
  return {
    seed: `sandbox:${Date.now()}`,
    seats: [
      { name: playerName(), human: true, deck: player.deck },
      { name: 'Practice Dummy', human: false, deck: dummyDeck, ai: { difficulty: 'easy' } },
    ],
    setup: { rules: [[], [dummy]], firstPlayer: 0, skipDeckValidation: true },
    context: { kind: 'sandbox' },
  };
}
