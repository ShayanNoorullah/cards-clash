import { audio } from '../services/audio';
import Phaser from 'phaser';
import { ArtCache } from '../art/ArtCache';
import { ART_KEYS } from '../art/frames';
import { PALETTE } from '../art/palette';
import { addBackground } from '../art/proceduralTextures';
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { getContent } from '../engine/content';
import type { Action, EndTurnAction, PlayCardAction } from '../engine/actions';
import { attackingLanes } from '../engine/turn';
import { creatureAtk, creatureDef, keywordValue } from '../engine/statics';
import { moveCost, validateAction } from '../engine/validate';
import type { CardDef, LandscapeType, PlayerId, TargetRef } from '../engine/types';
import { AiClient } from '../ai/AiClient';
import { Animator } from '../match/Animator';
import { confetti, dur, wait } from '../match/fx';
import {
  actionsForDrop,
  canBuyDraw,
  canEndTurn,
  creatureOptions,
  handOptions,
  pickTarget,
  targetsOf,
  ultimateOptions,
  type HandCardOptions,
} from '../match/interaction';
import { END_TURN, LOG_BTN, MENU_BTN, TILE_H, TILE_W } from '../match/layout';
import { MatchController, type DriverResult, type MatchDriver } from '../match/MatchController';
import type { OnlineMatch } from '../online/client/OnlineMatch';
import { syncNow } from '../online/client/cloudSync';
import onlineData from '../data/online.json';
import { playersToAct } from '../engine/legal';
import type { GameEvent } from '../engine/events';
import { BoardView } from '../match/views/BoardView';
import { GoButton } from '../match/views/GoButton';
import { spinForStrike } from '../match/views/AttackSpinner';
import { aiRoll, strikesFor } from '../match/strikeTiming';
import { getSettings, updateSettings } from '../services/settings';
import { clientRng } from '../progression/client';
import { PROGRESSION } from '../progression/config';
import { questDef } from '../progression/daily';
import { levelProgress } from '../progression/levels';
import { applyMatchResult, type MatchRewardSummary, type Outcome } from '../progression/matchRewards';
import { saves } from '../save';
import { logger } from '../services/logger';
import { Button } from '../ui/Button';
import { abilityStatus, heroSummary, statView } from '../ui/cardText';
import { cardCost, floopCost } from '../engine/costs';
import { CardView } from '../ui/CardView';
import { Modal, type ModalButton } from '../ui/Modal';
import { bodySize, COLORS, hex, textStyle } from '../ui/theme';
import { showToast } from '../ui/Toast';
import { fadeIn, goToScene } from '../ui/transitions';
import { describeObjective, getCampaign } from '../campaign/config';
import { applyCampaignResult, type CampaignResultSummary } from '../campaign/progress';
import { TutorialCoach } from '../match/TutorialCoach';
import { grantReward, type RewardSummary } from '../progression/rewards';
import { LESSONS, lessonById, TutorialRunner } from '../tutorial/tutorial';
import { recordDaily } from '../modes/daily';
import { draftOver, recordDraft } from '../modes/draft';
import { recordGauntlet } from '../modes/gauntlet';
import { applySandboxEdit, type SandboxEdit } from '../modes/sandbox';
import { addTextField } from '../ui/TextField';
import { campaignMatchData, dailyMatchData, tutorialMatchData } from './matchStarts';
import type { MatchContext, MatchSceneData } from './MatchSetupScene';

const log = logger.child('Match');
const ONLINE_REWARDS = onlineData.rewards;

/** A button shown under a card's details (e.g. Floop or Move for your creature). */
interface InspectAction {
  label: string;
  caption?: string | undefined;
  enabled: boolean;
  color: number;
  shadow: number;
  onClick: () => void;
}

type Mode =
  | { kind: 'idle' }
  | { kind: 'selected'; iid: string }
  | { kind: 'targeting'; candidates: Action[] }
  | { kind: 'moving'; from: number; lanes: number[] };

/** A full local match: setup screens, turns, animations and the end screen. */
export class MatchScene extends Phaser.Scene {
  private controller!: MatchDriver;
  private online: OnlineMatch | null = null;
  private remoteChain: Promise<void> = Promise.resolve();
  private board!: BoardView;
  private animator!: Animator;
  private mode: Mode = { kind: 'idle' };
  private handOpts = new Map<string, HandCardOptions>();
  private legal: Action[] = [];
  private endTurnBtn!: GoButton;
  private cancelBtn: Button | null = null;
  private overlay: Phaser.GameObjects.Container | null = null;
  private busy = false;
  private resultRecorded = false;
  private ai!: AiClient;
  private thinking: Phaser.GameObjects.Text | null = null;
  private sceneData!: MatchSceneData;
  private context: MatchContext = { kind: 'quick' };
  private tutorial: TutorialRunner | null = null;
  private coach: TutorialCoach | null = null;

  constructor() {
    super(SCENE_KEYS.Match);
  }

  create(data: MatchSceneData): void {
    fadeIn(this);
    addBackground(this);
    const { ctx } = getContent();
    this.sceneData = data;
    this.context = data.context ?? { kind: 'quick' };
    const lesson = this.context.kind === 'tutorial' ? lessonById(this.context.lessonId) : undefined;
    this.tutorial = lesson ? new TutorialRunner(lesson) : null;
    this.coach = null;
    this.online = data.online ?? null;
    this.remoteChain = Promise.resolve();
    this.controller =
      this.online ?? new MatchController({ seed: data.seed, seats: data.seats, ctx, setup: data.setup });
    if (this.online) {
      const online = this.online;
      online.onRemote = (events) => {
        this.remoteChain = this.remoteChain.then(() => this.playRemote(events));
      };
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => online.dispose());
    }
    const bossFight =
      (this.context.kind === 'campaign' && getCampaign().nodes.get(this.context.nodeId)?.boss) ||
      data.seats.some((seat) => ctx.heroes.byId.get(seat.deck.heroId)?.boss);
    audio.playMusic(bossFight ? 'boss' : 'battle');
    this.ai = new AiClient();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.ai.dispose());
    this.startMatch(this.controller);
  }

  private startMatch(controller: MatchDriver): void {
    this.controller = controller;
    this.mode = { kind: 'idle' };
    this.resultRecorded = false;
    this.overlay = null;
    this.cancelBtn = null;
    this.busy = false;
    const names: [string, string] = [controller.seats[0].name, controller.seats[1].name];
    this.board = new BoardView(
      this,
      controller.ctx,
      controller.state,
      names,
      {
        onTap: (iid) => this.onHandTap(iid),
        onLongPress: (iid) => this.inspectHandCard(iid),
        onDragStart: (iid) => this.onDragStart(iid),
        onDragMove: () => undefined,
        onDrop: (iid, x, y) => this.onDrop(iid, x, y),
        onCreatureTap: (p, lane) => this.onCreatureTap(p, lane),
        onCreatureLongPress: (p, lane) => this.inspectCreature(p, lane),
        onHeroTap: (p) => this.onHeroTap(p),
        onHeroLongPress: (p) => this.inspectHero(p),
        onDeckTap: (p) => this.onDeckTap(p),
        onLaneTap: (p, lane) => this.onLaneTap(p, lane),
        onBuildingTap: (p, lane) => this.onBuildingTap(p, lane),
        onFloopTap: (lane) => this.onFloopTap(lane),
      },
      getSettings().boardView,
    );
    this.animator = new Animator(this, this.board, controller.ctx, names);

    this.endTurnBtn = new GoButton(this, END_TURN.x, END_TURN.y, END_TURN.w / 2, () =>
      this.onEndTurn(),
    ).setDepth(150);
    new Button(this, LOG_BTN.x, LOG_BTN.y, 'Log', {
      width: 130,
      height: 70,
      fontSize: 30,
      color: COLORS.secondary,
      shadowColor: COLORS.secondaryDark,
      onClick: () => this.showLog(),
    }).setDepth(150);
    new Button(this, MENU_BTN.x, MENU_BTN.y, '≡', {
      width: 80,
      height: 70,
      fontSize: 40,
      color: COLORS.panelLight,
      shadowColor: COLORS.outline,
      onClick: () => this.showMenu(),
    }).setDepth(150);

    if (this.context.kind === 'sandbox') {
      new Button(this, LOG_BTN.x - 150, LOG_BTN.y, 'Tools', {
        width: 150,
        height: 70,
        fontSize: 30,
        color: 0x2fae6b,
        shadowColor: 0x1b6e42,
        onClick: () => this.showSandboxTools(),
      }).setDepth(150);
    } else if (this.controller.state.players.some((p) => p.rules.length > 0)) {
      new Button(this, LOG_BTN.x - 150, LOG_BTN.y, 'Rules', {
        width: 150,
        height: 70,
        fontSize: 30,
        color: 0x9b5cf0,
        shadowColor: 0x5a2aa8,
        onClick: () => this.showRules(),
      }).setDepth(150);
    }
    if (this.tutorial) {
      const runner = this.tutorial;
      this.coach = new TutorialCoach(this, this.board, runner, () => {
        runner.next();
        this.refreshAffordances();
      });
    }

    // The viewer is the first human seat (and switches between humans in hot-seat).
    const humans = ([0, 1] as const).filter((p) => controller.seats[p].human);
    const first = this.online
      ? this.online.you
      : controller.hotSeat
        ? (controller.decisionPlayer() ?? 0)
        : (humans[0] ?? 0);
    this.board.setViewer(first);
    this.board.sync(controller.state);
    this.refreshAffordances();
    void this.animator.play(controller.openingEvents, controller.state).then(() => this.advance());
    if (this.context.kind === 'campaign') this.showCampaignIntro(this.context.nodeId);
    if (this.online) this.addTurnTimer(this.online);
  }

  // -------------------------------------------------------------------------
  // Flow
  // -------------------------------------------------------------------------

  private get viewer(): PlayerId {
    return this.board.viewer;
  }

  private seatName(p: PlayerId): string {
    return this.controller.seats[p].name;
  }

  /** Decides what the match needs next and shows the right screen. */
  private async advance(): Promise<void> {
    const c = this.controller;
    this.refreshAffordances();
    if (c.isOver) {
      this.showEnd();
      return;
    }
    const phase = c.state.phase;
    if (this.online) {
      // Online: only ever act for yourself; otherwise wait for the server to push the opponent's move.
      if (!playersToAct(c.state).includes(this.viewer)) return;
      if (this.overlay && (phase === 'arrange' || phase === 'mulligan')) return;
      if (phase === 'arrange') this.showArrange(this.viewer);
      else if (phase === 'mulligan') this.showMulligan(this.viewer);
      return;
    }
    const p = c.decisionPlayer();
    if (p === null) return;
    if (!c.seats[p].human) {
      await this.runAi(p);
      return;
    }
    if (phase === 'arrange' || phase === 'mulligan' || p !== this.viewer) {
      if (c.hotSeat && (phase !== 'main' || p !== this.viewer)) await this.passDevice(p);
      if (p !== this.viewer) {
        this.board.setViewer(p);
        this.board.sync(c.state);
      }
    }
    this.refreshAffordances();
    if (phase === 'arrange') this.showArrange(p);
    else if (phase === 'mulligan') this.showMulligan(p);
  }

  /** Lets an AI seat take its decision, with a short visible pause. */
  private async runAi(p: PlayerId): Promise<void> {
    const seat = this.controller.seats[p];
    // The Sandbox dummy never plays: it only ends its turn.
    const passive =
      this.context.kind === 'sandbox' && this.controller.state.phase === 'main'
        ? ({ type: 'endTurn', player: p } as const)
        : null;
    const scripted = passive ?? this.tutorial?.enemyAction(this.controller.state);
    if (scripted) {
      this.showThinking(true);
      await wait(this, dur(700));
      this.showThinking(false);
      if (this.sys.isActive()) await this.submit(scripted);
      return;
    }
    const difficulty = seat.ai?.difficulty ?? 'normal';
    this.showThinking(true);
    const started = this.time.now;
    const decision = await this.ai.decide(this.controller.state, p, difficulty, seat.ai?.hooks);
    if (!this.sys.isActive()) return;
    // Keep AI turns readable: at least a short pause between actions.
    const minPause = dur(this.controller.state.phase === 'main' ? 450 : 150);
    const elapsed = this.time.now - started;
    if (elapsed < minPause) await wait(this, minPause - elapsed);
    this.showThinking(false);
    if (!this.sys.isActive()) return;
    let action = decision.action;
    // AI attacks are timed too: better opponents land more Perfect hits and miss less.
    if (action.type === 'endTurn' && this.timingOn()) {
      const lanes = attackingLanes(this.controller.state, this.controller.ctx, p);
      if (lanes.length > 0) action = { ...action, strikes: strikesFor(lanes, () => aiRoll(difficulty)) };
    }
    await this.submit(action);
  }

  /** Attack timing (the spinning disc) is on for local matches; online and tutorial attacks always land. */
  private timingOn(): boolean {
    return getSettings().attackTiming && !this.online && !this.tutorial;
  }

  /** Spins the timing disc for each attacker, left to right, then ends the turn with the results. */
  private async endTurn(discard?: string[]): Promise<void> {
    const base: EndTurnAction = discard
      ? { type: 'endTurn', player: this.viewer, discard }
      : { type: 'endTurn', player: this.viewer };
    const { state, ctx } = this.controller;
    const lanes = this.timingOn() ? attackingLanes(state, ctx, this.viewer) : [];
    if (lanes.length === 0 || this.busy) {
      await this.submit(base);
      return;
    }
    this.busy = true;
    this.setMode({ kind: 'idle' });
    const rolls = new Map<number, Awaited<ReturnType<typeof spinForStrike>>>();
    try {
      for (const lane of lanes) {
        const c = state.players[this.viewer].lanes[lane]!.creature!;
        const card = ctx.cards.byId.get(c.cardId);
        const token = this.board.tokenByIid(c.iid);
        const glow = token
          ? this.tweens.add({
              targets: token,
              scale: token.baseScale * 1.12,
              duration: 300,
              yoyo: true,
              repeat: -1,
            })
          : null;
        const title = `${card?.name ?? 'Creature'} · ${creatureAtk(state, ctx, c, lane)} ATK`;
        rolls.set(lane, await spinForStrike(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.46, title));
        glow?.stop();
        token?.setScale(token.baseScale);
        if (!this.sys.isActive()) return;
      }
    } finally {
      this.busy = false;
    }
    await this.submit({ ...base, strikes: strikesFor(lanes, (lane) => rolls.get(lane) ?? 'hit') });
  }

  private showThinking(on: boolean): void {
    this.thinking?.destroy();
    this.thinking = null;
    if (!on) return;
    const opp = this.board.opponentOf(this.viewer);
    const pos = this.board.heroPos(opp);
    this.thinking = this.add
      .text(
        GAME_WIDTH / 2,
        pos.y + 110,
        `${this.seatName(opp)} is thinking…`,
        textStyle(32, { color: hex(COLORS.textDim) }),
      )
      .setOrigin(0.5)
      .setDepth(700);
  }

  private async submit(action: Action): Promise<void> {
    if (this.busy) return;
    const before = this.controller.state;
    this.busy = true;
    let result: DriverResult;
    try {
      result = await this.controller.submit(action);
    } finally {
      this.busy = false;
    }
    if (!result.ok) {
      audio.play('error');
      log.warn(`Rejected ${action.type}: ${result.error.code}`);
      showToast(this, result.error.message);
      this.refreshAffordances();
      return;
    }
    if (this.tutorial && action.player === this.viewer) this.tutorial.onAction(before, action);
    this.busy = true;
    this.setMode({ kind: 'idle' });
    this.refreshAffordances();
    try {
      await this.animator.play(result.events, this.controller.state);
    } finally {
      this.busy = false;
    }
    await this.advance();
  }

  /** Animates an update pushed by the server (opponent moves, timeouts), then continues. */
  private async playRemote(events: GameEvent[]): Promise<void> {
    while (this.busy) await wait(this, 60);
    if (!this.sys.isActive()) return;
    const state = this.controller.state;
    // A setup step the server finished for us (timeout) closes its overlay.
    if (this.overlay && (state.phase === 'main' || !playersToAct(state).includes(this.viewer)))
      this.closeOverlay();
    this.busy = true;
    this.setMode({ kind: 'idle' });
    try {
      await this.animator.play(events, state);
    } finally {
      this.busy = false;
    }
    if (events.length === 0) this.board.sync(state);
    await this.advance();
  }

  /** Countdown for the online turn timer, next to the GO button. */
  private addTurnTimer(online: OnlineMatch): void {
    const text = this.add
      .text(END_TURN.x, END_TURN.y - 112, '', textStyle(30, { color: '#ffffff' }))
      .setOrigin(0.5)
      .setDepth(160);
    const update = () => {
      const left = online.secondsLeft();
      const mine = playersToAct(online.state).includes(this.viewer);
      text.setVisible(left !== null);
      if (left === null) return;
      text
        .setText(`${mine ? 'Your time' : 'Opponent'} ${left}s`)
        .setColor(mine && left <= 10 ? '#ff7a7a' : '#ffffff');
    };
    update();
    this.time.addEvent({ delay: 500, loop: true, callback: update });
  }

  private showOnlineEnd(o: Phaser.GameObjects.Container, humanWon: boolean): void {
    const online = this.online;
    const lines: string[] = [];
    if (online?.mode === 'ranked') {
      const r = online.rating;
      if (r)
        lines.push(
          `Rating ${r.before} → ${r.after}  (${r.after >= r.before ? '+' : ''}${r.after - r.before})  ·  ${r.tier}`,
        );
      const reward = humanWon ? ONLINE_REWARDS.rankedWin : ONLINE_REWARDS.rankedLoss;
      lines.push(`+${reward.coins} Coins  ·  +${reward.xp} XP  (granted by the server)`);
    } else lines.push('Friendly match: no rating change.');
    o.add(
      this.add
        .text(GAME_WIDTH / 2, 980, lines.join('\n'), textStyle(34, { align: 'center', lineSpacing: 10 }))
        .setOrigin(0.5, 0),
    );
    // Fetch the server-granted rewards into the local save.
    void syncNow().catch(() => undefined);
    this.endButton(o, 300, 1770, 'Play again', false, () => goToScene(this, SCENE_KEYS.Online));
    this.endButton(o, 780, 1770, 'Main Menu', true, () => goToScene(this, SCENE_KEYS.MainMenu));
  }

  private isMyMainPhase(): boolean {
    const s = this.controller.state;
    return s.phase === 'main' && s.activePlayer === this.viewer && !this.busy && this.overlay === null;
  }

  private refreshAffordances(): void {
    const mine = this.controller.state.phase === 'main' && this.controller.state.activePlayer === this.viewer;
    const all = mine ? this.controller.legalActions(this.viewer) : [];
    this.legal = this.tutorial ? this.tutorial.filter(this.controller.state, all) : all;
    const cards = this.controller.ctx.cards;
    const hand = this.controller.state.players[this.viewer].hand;
    const isSpell = (iid: string) =>
      cards.byId.get(hand.find((c) => c.iid === iid)?.cardId ?? '')?.type === 'spell';
    this.handOpts = handOptions(this.legal, isSpell);
    this.board.hand.setPlayable(this.handOpts.keys());
    const canEnd = canEndTurn(this.legal, this.viewer) && !this.busy;
    this.endTurnBtn.setVisible(this.controller.state.phase === 'main').setEnabled(canEnd);
    this.updateFloops();
    this.updateCoach();
  }

  /** FLOOP buttons on the viewer's lanes, only while they can be used. */
  private updateFloops(): void {
    if (!this.isMyMainPhase() || this.mode.kind !== 'idle') {
      this.board.clearFloopButtons();
      return;
    }
    const lanes = [0, 1, 2, 3].filter((lane) => creatureOptions(this.legal, lane).floops.length > 0);
    this.board.setFloopButtons(lanes);
  }

  private onFloopTap(lane: number): void {
    if (!this.isMyMainPhase()) return;
    const floops = creatureOptions(this.legal, lane).floops;
    if (floops.length > 0) this.resolveCandidates(floops);
  }

  private onBuildingTap(p: PlayerId, lane: number): void {
    if (
      this.isMyMainPhase() &&
      p === this.viewer &&
      (this.mode.kind === 'selected' || this.mode.kind === 'moving')
    ) {
      this.onLaneTap(p, lane);
      return;
    }
    this.inspectBuilding(p, lane);
  }

  private updateCoach(): void {
    this.coach?.update(
      this.controller.state,
      this.viewer,
      !this.busy && this.overlay === null && !this.controller.isOver,
      this.mode.kind !== 'idle',
    );
  }

  private setMode(mode: Mode): void {
    this.mode = mode;
    this.board.clearLaneHighlights();
    this.board.clearTargetMarkers();
    this.board.showBoardGlow(false);
    this.cancelBtn?.destroy();
    this.cancelBtn = null;
    this.board.hand.setSelected(mode.kind === 'selected' ? mode.iid : null);
    if (mode.kind === 'selected') {
      const opts = this.handOpts.get(mode.iid);
      if (opts && !opts.isSpell) this.board.highlightViewerLanes(opts.lanes);
      this.showCancel();
    } else if (mode.kind === 'targeting') {
      this.board.showTargetMarkers(targetsOf(mode.candidates as { target?: TargetRef }[]), (t) =>
        this.onTargetPicked(t),
      );
      this.showCancel();
    } else if (mode.kind === 'moving') {
      this.board.highlightViewerLanes(mode.lanes);
      this.showCancel();
    }
    this.updateFloops();
    this.updateCoach();
  }

  private showCancel(): void {
    this.cancelBtn = new Button(this, GAME_WIDTH / 2, 1375, 'Cancel', {
      width: 300,
      height: 80,
      fontSize: 34,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: () => this.setMode({ kind: 'idle' }),
    }).setDepth(420);
  }

  // -------------------------------------------------------------------------
  // Hand
  // -------------------------------------------------------------------------

  private onHandTap(iid: string): void {
    const opts = this.handOpts.get(iid);
    if (!opts || !this.isMyMainPhase()) {
      this.inspectHandCard(iid);
      return;
    }
    if (this.mode.kind === 'selected' && this.mode.iid === iid) {
      this.setMode({ kind: 'idle' });
      return;
    }
    if (opts.isSpell) {
      const card = this.cardOfHand(iid);
      if (opts.targets.length > 0) {
        this.setMode({ kind: 'targeting', candidates: opts.actions });
      } else if (card) {
        this.confirmModal(
          card.name,
          card.text,
          `Cast (${cardCost(this.controller.state, this.viewer, card)} MP)`,
          () => void this.submit(opts.actions[0]!),
        );
      }
      return;
    }
    this.setMode({ kind: 'selected', iid });
  }

  private onDragStart(iid: string): void {
    if (!this.isMyMainPhase()) return;
    const opts = this.handOpts.get(iid);
    if (!opts) return;
    this.setMode({ kind: 'idle' });
    if (opts.isSpell) this.board.showBoardGlow(true);
    else this.board.highlightViewerLanes(opts.lanes);
  }

  private onDrop(iid: string, x: number, y: number): boolean {
    this.board.clearLaneHighlights();
    this.board.showBoardGlow(false);
    const opts = this.handOpts.get(iid);
    if (!opts || !this.isMyMainPhase()) return false;
    let candidates: PlayCardAction[];
    if (opts.isSpell) {
      candidates = this.board.isOverBoard(y) ? actionsForDrop(opts, { kind: 'board' }) : [];
    } else {
      const lane = this.board.viewerLaneAt(x, y);
      candidates = lane === null ? [] : actionsForDrop(opts, { kind: 'lane', lane });
    }
    return this.resolveCandidates(candidates);
  }

  /** One candidate → play it; several (different targets) → ask for a target. */
  private resolveCandidates(candidates: Action[]): boolean {
    if (candidates.length === 0) return false;
    if (candidates.length === 1) {
      void this.submit(candidates[0]!);
      return true;
    }
    this.setMode({ kind: 'targeting', candidates });
    return false;
  }

  private onTargetPicked(t: TargetRef): void {
    if (this.mode.kind !== 'targeting') return;
    const action = pickTarget(this.mode.candidates as (Action & { target?: TargetRef })[], t);
    if (action) void this.submit(action);
  }

  // -------------------------------------------------------------------------
  // Board
  // -------------------------------------------------------------------------

  private onLaneTap(p: PlayerId, lane: number): void {
    if (!this.isMyMainPhase() || p !== this.viewer) return;
    if (this.mode.kind === 'selected') {
      const opts = this.handOpts.get(this.mode.iid);
      if (opts) this.resolveCandidates(actionsForDrop(opts, { kind: 'lane', lane }));
    } else if (this.mode.kind === 'moving' && this.mode.lanes.includes(lane)) {
      void this.submit({ type: 'moveCreature', player: this.viewer, from: this.mode.from, to: lane });
    }
  }

  private onCreatureTap(p: PlayerId, lane: number): void {
    if (
      this.isMyMainPhase() &&
      p === this.viewer &&
      (this.mode.kind === 'selected' || this.mode.kind === 'moving')
    ) {
      this.onLaneTap(p, lane);
      return;
    }
    this.inspectCreature(p, lane);
  }

  /** Floop / Move buttons for the viewer's creature during their turn (shown with its details). */
  private creatureActions(p: PlayerId, lane: number): InspectAction[] {
    if (p !== this.viewer || !this.isMyMainPhase() || this.mode.kind !== 'idle') return [];
    const creature = this.controller.state.players[p].lanes[lane]?.creature;
    const card = creature ? this.controller.ctx.cards.byId.get(creature.cardId) : undefined;
    if (!card || card.type !== 'creature') return [];
    const opts = creatureOptions(this.legal, lane);
    const actions: InspectAction[] = [];
    if (card.floop) {
      const why =
        opts.floops.length > 0
          ? null
          : validateAction(this.controller.state, { type: 'floop', player: p, lane }, this.controller.ctx);
      actions.push({
        label: `Floop (${floopCost(this.controller.state, this.controller.ctx, p, lane) ?? card.floop.cost} MP)`,
        caption: opts.floops.length > 0 ? undefined : (why?.message ?? 'Not available right now'),
        enabled: opts.floops.length > 0,
        color: 0x2fae4b,
        shadow: 0x0c3a1a,
        onClick: () => this.resolveCandidates(opts.floops),
      });
    }
    if (opts.moves.length > 0) {
      const cost = moveCost(this.controller.state, opts.moves[0]!, this.controller.ctx);
      actions.push({
        label: `Move (${cost} MP)`,
        caption: 'to an empty lane',
        enabled: true,
        color: COLORS.secondary,
        shadow: COLORS.secondaryDark,
        onClick: () => this.setMode({ kind: 'moving', from: lane, lanes: opts.moves.map((m) => m.to) }),
      });
    }
    return actions;
  }

  private onHeroTap(p: PlayerId): void {
    const ults = p === this.viewer && this.isMyMainPhase() ? ultimateOptions(this.legal) : [];
    const hero = this.controller.ctx.heroes.byId.get(this.controller.state.players[p].heroId);
    if (!hero) return;
    if (ults.length === 0) {
      this.inspectHero(p);
      return;
    }
    this.confirmModal(`${hero.name}: ${hero.ultimate.name}`, hero.ultimate.text, 'Use it!', () => {
      this.resolveCandidates(ults);
    });
  }

  private onDeckTap(p: PlayerId): void {
    if (p !== this.viewer || !this.isMyMainPhase()) return;
    const b = this.controller.ctx.balance;
    if (!canBuyDraw(this.legal)) {
      const ps = this.controller.state.players[p];
      showToast(
        this,
        ps.extraDrawsThisTurn >= b.extraDrawsPerTurn
          ? 'You already bought a draw this turn.'
          : ps.deck.length === 0
            ? 'Your deck is empty.'
            : `Drawing costs ${b.extraDrawCost} MP.`,
      );
      return;
    }
    this.confirmModal(
      'Draw a card',
      `Pay ${b.extraDrawCost} MP to draw an extra card (once per turn).`,
      'Draw',
      () => {
        void this.submit({ type: 'buyDraw', player: this.viewer });
      },
    );
  }

  private onEndTurn(): void {
    if (!this.isMyMainPhase()) return;
    const p = this.controller.state.players[this.viewer];
    const limit = this.controller.ctx.balance.maxHandSize;
    if (p.hand.length > limit) {
      this.showDiscardPicker(p.hand.length - limit);
      return;
    }
    void this.endTurn();
  }

  // -------------------------------------------------------------------------
  // Overlays
  // -------------------------------------------------------------------------

  private openOverlay(dimAlpha = 0.85): Phaser.GameObjects.Container {
    this.closeOverlay();
    const o = this.add.container(0, 0).setDepth(800);
    o.add(
      this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0820, dimAlpha).setOrigin(0).setInteractive(),
    );
    this.overlay = o;
    this.board.interactive = false;
    this.board.hand.enabled = false;
    this.updateCoach();
    return o;
  }

  private closeOverlay(): void {
    this.overlay?.destroy();
    this.overlay = null;
    this.board.interactive = true;
    this.board.hand.enabled = true;
    this.updateCoach();
  }

  private openModal(title: string, body: string, buttons: ModalButton[]): void {
    const m = new Modal(this, title, body, buttons);
    m.setDepth(850);
  }

  private confirmModal(title: string, body: string, confirm: string, onConfirm: () => void): void {
    this.openModal(title, body, [
      { label: confirm, onClick: onConfirm },
      { label: 'Cancel', color: COLORS.danger, shadowColor: COLORS.dangerDark, onClick: () => undefined },
    ]);
  }

  private passDevice(p: PlayerId): Promise<void> {
    return new Promise((resolve) => {
      const o = this.openOverlay(1);
      const hero = this.controller.ctx.heroes.byId.get(this.controller.state.players[p].heroId)!;
      o.add(ArtCache.heroImage(this, GAME_WIDTH / 2, 640, hero).setDisplaySize(360, 360));
      o.add(
        this.add
          .text(GAME_WIDTH / 2, 900, `Pass the device to`, textStyle(48, { color: hex(COLORS.textDim) }))
          .setOrigin(0.5),
      );
      o.add(
        this.add
          .text(GAME_WIDTH / 2, 990, this.seatName(p), textStyle(96, { color: hex(COLORS.accent) }))
          .setOrigin(0.5),
      );
      o.add(
        new Button(this, GAME_WIDTH / 2, 1250, "I'm ready", {
          width: 560,
          height: 150,
          fontSize: 60,
          onClick: () => {
            this.closeOverlay();
            resolve();
          },
        }),
      );
    });
  }

  private showArrange(p: PlayerId): void {
    const o = this.openOverlay(0.92);
    const order: LandscapeType[] = [...this.controller.state.players[p].landscapePool];
    let picked: number | null = null;
    o.add(
      this.add
        .text(GAME_WIDTH / 2, 260, `${this.seatName(p)}: arrange your landscapes`, textStyle(48))
        .setOrigin(0.5),
    );
    o.add(
      this.add
        .text(
          GAME_WIDTH / 2,
          340,
          'Tap two landscapes to swap them. Creatures fight the lane straight across.',
          {
            fontFamily: FONT_FAMILY,
            fontSize: '32px',
            color: hex(COLORS.textDim),
            align: 'center',
            wordWrap: { width: 900 },
          },
        )
        .setOrigin(0.5, 0),
    );
    const tiles = this.add.container(0, 0);
    o.add(tiles);
    const draw = () => {
      tiles.removeAll(true);
      order.forEach((l, i) => {
        const x = 135 + i * 270;
        const img = this.add
          .image(x, 800, ART_KEYS.tile(l))
          .setDisplaySize(TILE_W, TILE_H * 1.6)
          .setInteractive({ useHandCursor: true });
        img.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
          if (picked === null) picked = i;
          else {
            [order[picked], order[i]] = [order[i]!, order[picked]!];
            picked = null;
          }
          draw();
        });
        tiles.add(img);
        if (picked === i) {
          const g = this.add.graphics();
          g.lineStyle(10, COLORS.accent, 1);
          g.strokeRect(x - TILE_W / 2 - 6, 800 - (TILE_H * 1.6) / 2 - 6, TILE_W + 12, TILE_H * 1.6 + 12);
          tiles.add(g);
        }
        tiles.add(
          this.add
            .text(x, 960, `Lane ${i + 1}\n${PALETTE[l].name}`, textStyle(28, { strokeThickness: 5 }))
            .setOrigin(0.5, 0),
        );
      });
    };
    draw();
    o.add(
      new Button(this, GAME_WIDTH / 2, 1300, 'Ready', {
        width: 520,
        height: 140,
        fontSize: 58,
        onClick: () => {
          this.closeOverlay();
          void this.submit({ type: 'arrangeLandscapes', player: p, order });
        },
      }),
    );
  }

  private showMulligan(p: PlayerId): void {
    const o = this.openOverlay(0.92);
    const hand = this.controller.state.players[p].hand;
    const marked = new Set<string>();
    const first = this.controller.state.firstPlayer === p;
    o.add(
      this.add
        .text(GAME_WIDTH / 2, 150, `${this.seatName(p)}: your opening hand`, textStyle(48))
        .setOrigin(0.5),
    );
    o.add(
      this.add
        .text(
          GAME_WIDTH / 2,
          220,
          `${first ? 'You go first.' : 'You go second (+1 card).'} Tap cards to redraw them (once).`,
          {
            fontFamily: FONT_FAMILY,
            fontSize: '32px',
            color: hex(COLORS.textDim),
            align: 'center',
            wordWrap: { width: 960 },
          },
        )
        .setOrigin(0.5, 0),
    );
    const confirm = new Button(this, GAME_WIDTH / 2, 1760, 'Keep hand', {
      width: 560,
      height: 140,
      fontSize: 54,
      onClick: () => {
        this.closeOverlay();
        void this.submit({ type: 'mulligan', player: p, iids: [...marked] });
      },
    });
    const scale = 0.66;
    hand.forEach((inst, i) => {
      const card = this.controller.ctx.cards.byId.get(inst.cardId);
      if (!card) return;
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 190 + col * 350;
      const y = 560 + row * 470;
      const view = new CardView(this, x, y, card).setScale(scale);
      const cross = this.add
        .text(x, y, '✕', textStyle(200, { color: '#ff5f6d', strokeThickness: 20 }))
        .setOrigin(0.5)
        .setVisible(false);
      view.setInteractive({ useHandCursor: true });
      view.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        if (marked.has(inst.iid)) marked.delete(inst.iid);
        else marked.add(inst.iid);
        cross.setVisible(marked.has(inst.iid));
        view.setAlpha(marked.has(inst.iid) ? 0.55 : 1);
        confirm.setLabel(marked.size > 0 ? `Redraw ${marked.size}` : 'Keep hand');
      });
      o.add([view, cross]);
    });
    o.add(confirm);
  }

  private showDiscardPicker(count: number): void {
    const o = this.openOverlay(0.92);
    const hand = this.controller.state.players[this.viewer].hand;
    const chosen = new Set<string>();
    o.add(this.add.text(GAME_WIDTH / 2, 140, `Hand limit: discard ${count}`, textStyle(52)).setOrigin(0.5));
    const done = new Button(this, GAME_WIDTH / 2, 1800, 'Discard & End Turn', {
      width: 700,
      height: 130,
      fontSize: 44,
      onClick: () => {
        if (chosen.size !== count) {
          showToast(this, `Choose exactly ${count} card(s).`);
          return;
        }
        this.closeOverlay();
        void this.endTurn([...chosen]);
      },
    });
    hand.forEach((inst, i) => {
      const card = this.controller.ctx.cards.byId.get(inst.cardId);
      if (!card) return;
      const x = 140 + (i % 4) * 267;
      const y = 460 + Math.floor(i / 4) * 440;
      const view = new CardView(this, x, y, card).setScale(0.6);
      view.setInteractive({ useHandCursor: true });
      view.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        if (chosen.has(inst.iid)) chosen.delete(inst.iid);
        else if (chosen.size < count) chosen.add(inst.iid);
        view.setAlpha(chosen.has(inst.iid) ? 0.45 : 1);
      });
      o.add(view);
    });
    o.add(done);
    o.add(
      new Button(this, 130, 90, 'Back', {
        width: 190,
        height: 90,
        fontSize: 38,
        color: COLORS.danger,
        shadowColor: COLORS.dangerDark,
        onClick: () => this.closeOverlay(),
      }),
    );
  }

  private showInspect(
    card: CardDef,
    extraLines: string[],
    live?: Parameters<typeof statView>[1],
    actions: InspectAction[] = [],
  ): void {
    const o = this.openOverlay(0.85);
    const zone = o.list[0] as Phaser.GameObjects.Rectangle;
    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.closeOverlay());
    const scale = actions.length > 0 ? 1.95 : 2.2;
    const view = new CardView(this, GAME_WIDTH / 2, 70 + (420 * scale) / 2, card).setScale(scale);
    if (live) {
      const s = statView(card, live);
      if (s) view.setStats(s);
    }
    o.add(view);
    const lines = [...extraLines, `“${card.flavorText}”`];
    o.add(
      this.add
        .text(GAME_WIDTH / 2, 70 + 420 * scale + 30, lines.join('\n'), {
          fontFamily: FONT_FAMILY,
          fontSize: `${bodySize(30)}px`,
          color: '#ffffff',
          align: 'center',
          lineSpacing: 8,
          resolution: 2,
          wordWrap: { width: GAME_WIDTH - 120, useAdvancedWrap: true },
        })
        .setOrigin(0.5, 0),
    );
    actions.forEach((a, i) => {
      const x = actions.length === 1 ? GAME_WIDTH / 2 : GAME_WIDTH / 2 + (i === 0 ? -255 : 255);
      o.add(
        new Button(this, x, GAME_HEIGHT - 200, a.label, {
          width: 480,
          height: 130,
          fontSize: 38,
          color: a.enabled ? a.color : 0x5b5a70,
          shadowColor: a.enabled ? a.shadow : 0x33324a,
          ...(a.caption ? { caption: a.caption } : {}),
          onClick: () => {
            if (!a.enabled) {
              if (a.caption) showToast(this, a.caption);
              return;
            }
            this.closeOverlay();
            a.onClick();
          },
        }),
      );
    });
    o.add(
      this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT - 60,
          'Tap anywhere to close',
          textStyle(28, { color: hex(COLORS.textDim) }),
        )
        .setOrigin(0.5),
    );
  }

  private cardOfHand(iid: string): CardDef | undefined {
    const inst = this.controller.state.players[this.viewer].hand.find((c) => c.iid === iid);
    return inst ? this.controller.ctx.cards.byId.get(inst.cardId) : undefined;
  }

  private inspectHandCard(iid: string): void {
    const card = this.cardOfHand(iid);
    if (!card) return;
    const playable = this.handOpts.has(iid);
    this.showInspect(card, [
      playable ? 'Drag it onto the board, or tap it and then tap a lane.' : 'Not playable right now.',
    ]);
  }

  private inspectCreature(p: PlayerId, lane: number): void {
    const state = this.controller.state;
    const c = state.players[p].lanes[lane]?.creature;
    const card = c ? this.controller.ctx.cards.byId.get(c.cardId) : undefined;
    if (!c || !card) return;
    const ctx = this.controller.ctx;
    const status: string[] = [`${this.seatName(p)} · Lane ${lane + 1}`];
    if (c.damage > 0) status.push(`Damage taken: ${c.damage}`);
    if (c.frozen) status.push('Frozen: cannot attack or floop this turn.');
    if (c.poison > 0) status.push(`Poisoned: takes ${c.poison} damage at the start of its turn.`);
    if (c.shield) status.push('Shielded: the next damage is blocked.');
    if (c.stealth) status.push('Stealth: cannot be targeted by the opponent.');
    if (c.exhausted) status.push('Exhausted: will not attack this turn.');
    if (c.summoningSick && keywordValue(state, ctx, c, lane, 'rush') === 0)
      status.push('Just played: cannot attack until next turn.');
    const actions = this.creatureActions(p, lane);
    this.showInspect(
      card,
      status,
      { creature: c, atk: creatureAtk(state, ctx, c, lane), def: creatureDef(state, ctx, c, lane) },
      actions,
    );
  }

  private inspectBuilding(p: PlayerId, lane: number): void {
    const b = this.controller.state.players[p].lanes[lane]?.building;
    const card = b ? this.controller.ctx.cards.byId.get(b.cardId) : undefined;
    if (card) this.showInspect(card, [`${this.seatName(p)} · Lane ${lane + 1}`]);
  }

  private inspectHero(p: PlayerId): void {
    const ps = this.controller.state.players[p];
    const hero = this.controller.ctx.heroes.byId.get(ps.heroId);
    if (!hero) return;
    const o = this.openOverlay(0.88);
    (o.list[0] as Phaser.GameObjects.Rectangle).on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () =>
      this.closeOverlay(),
    );
    o.add(ArtCache.heroImage(this, GAME_WIDTH / 2, 420, hero).setDisplaySize(440, 440));
    o.add(
      this.add
        .text(GAME_WIDTH / 2, 700, hero.name, textStyle(64, { color: hex(COLORS.accent) }))
        .setOrigin(0.5),
    );
    o.add(
      this.add
        .text(
          GAME_WIDTH / 2,
          770,
          `${hero.title} · ${this.seatName(p)}`,
          textStyle(32, { color: hex(COLORS.textDim) }),
        )
        .setOrigin(0.5),
    );
    o.add(
      this.add
        .text(
          GAME_WIDTH / 2,
          840,
          `${heroSummary(hero)}\n\nHP ${ps.hp}/${ps.maxHp} · ${abilityStatus(hero, ps.ultimateCharge, this.controller.ctx.balance.ultimateChargeMax)}`,
          {
            fontFamily: FONT_FAMILY,
            fontSize: '36px',
            color: '#ffffff',
            align: 'center',
            resolution: 2,
            wordWrap: { width: GAME_WIDTH - 140, useAdvancedWrap: true },
          },
        )
        .setOrigin(0.5, 0),
    );
  }

  private showLog(): void {
    const o = this.openOverlay(0.92);
    const close = () => this.closeOverlay();
    o.add(
      this.add
        .text(GAME_WIDTH / 2, 110, 'Battle Log', textStyle(64, { color: hex(COLORS.accent) }))
        .setOrigin(0.5),
    );
    const lines = this.controller.log.slice(-38);
    o.add(
      this.add
        .text(60, 200, lines.join('\n'), {
          fontFamily: FONT_FAMILY,
          fontSize: `${bodySize(28)}px`,
          color: '#ffffff',
          lineSpacing: 6,
          resolution: 2,
          wordWrap: { width: GAME_WIDTH - 120, useAdvancedWrap: true },
        })
        .setOrigin(0, 0),
    );
    o.add(
      new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 110, 'Close', {
        width: 400,
        height: 110,
        onClick: close,
      }),
    );
  }

  private showMenu(): void {
    if (this.controller.isOver) return;
    const next = this.board.viewMode === '3d' ? '2d' : '3d';
    this.openModal('Menu', 'Surrendering ends the match immediately.', [
      {
        label: next === '3d' ? 'Switch to 3D board' : 'Switch to 2D board',
        color: COLORS.secondary,
        shadowColor: COLORS.secondaryDark,
        onClick: () => {
          updateSettings({ boardView: next });
          this.board.setViewMode(next);
          this.refreshAffordances();
        },
      },
      {
        label: 'Surrender',
        color: COLORS.danger,
        shadowColor: COLORS.dangerDark,
        onClick: () => {
          this.confirmModal('Surrender?', 'Your opponent will win this match.', 'Yes, surrender', () => {
            // The person holding the device surrenders (never the AI seat).
            const p = this.viewer;
            this.closeOverlay();
            void this.submit({ type: 'surrender', player: p });
          });
        },
      },
      { label: 'Resume', onClick: () => undefined },
    ]);
  }

  /** Match rules on both sides (campaign modifiers, boss rules, tutorial helpers). */
  private showRules(): void {
    const lines: string[] = [];
    for (const p of [this.viewer, this.board.opponentOf(this.viewer)]) {
      const rules = this.controller.state.players[p].rules;
      if (rules.length === 0) continue;
      lines.push(`${this.seatName(p)}:`);
      for (const r of rules) lines.push(`• ${r.name}: ${r.text}`);
      lines.push('');
    }
    this.openModal('Battle rules', lines.join('\n').trim(), [{ label: 'OK', onClick: () => undefined }]);
  }

  /** Before a campaign battle: the node, the boss's taunt, and the star objectives. */
  private showCampaignIntro(nodeId: string): void {
    const node = getCampaign().nodes.get(nodeId);
    if (!node) return;
    const lines: string[] = [];
    if (node.boss) lines.push(`“${node.boss.intro}”`, '');
    lines.push('★ Win the battle');
    for (const o of node.stars) lines.push(`★ ${describeObjective(o)}`);
    const rules = this.controller.state.players.flatMap((p) => p.rules.map((r) => `${r.name}: ${r.text}`));
    if (rules.length > 0) lines.push('', ...rules);
    this.openModal(node.boss ? `Boss: ${this.seatName(1)}` : node.name, lines.join('\n'), [
      { label: 'Fight!', onClick: () => undefined },
    ]);
  }

  /** The person holding this device (online: only your own seat counts; the opponent is human too). */
  private isLocalPlayer(p: PlayerId): boolean {
    return this.online ? p === this.online.you : this.controller.seats[p].human;
  }

  private humanSeat(): PlayerId {
    if (this.online) return this.online.you;
    return this.controller.seats[0].human ? 0 : 1;
  }

  /**
   * Applies progression once per match: vs-AI matches give XP, Coins, a victory
   * chest and quest progress. Hot-seat matches give nothing (no farming), and
   * tutorial lessons have their own one-time reward.
   */
  private recordResult(humanWon: boolean): MatchRewardSummary | null {
    if (!saves().loaded || this.controller.hotSeat || this.context.kind === 'tutorial' || this.online)
      return null;
    const human = this.humanSeat();
    const outcome: Outcome = this.controller.state.winner === 'draw' ? 'draw' : humanWon ? 'win' : 'loss';
    const { save, summary } = applyMatchResult(
      saves().save,
      outcome,
      this.controller.matchStats[human],
      Date.now(),
      getContent(),
      clientRng(),
    );
    void saves().commit(save);
    return summary;
  }

  /** Stars and campaign rewards for this node (after the regular match rewards). */
  private recordCampaign(nodeId: string, humanWon: boolean): CampaignResultSummary | null {
    if (!saves().loaded) return null;
    const human = this.humanSeat();
    const p = this.controller.state.players[human];
    const { save, summary } = applyCampaignResult(
      saves().save,
      getCampaign(),
      nodeId,
      { won: humanWon, turnsTaken: p.turnsTaken, heroHp: p.hp, stats: this.controller.matchStats[human] },
      getContent(),
      clientRng(),
    );
    void saves().commit(save);
    return summary;
  }

  /** The lesson's reward the first time it is completed; marks it done. */
  private recordTutorial(lessonId: string, humanWon: boolean): RewardSummary | null {
    if (!humanWon || !saves().loaded) return null;
    const save = saves().save;
    if (save.tutorial.done.includes(lessonId)) return null;
    const lesson = lessonById(lessonId);
    if (!lesson) return null;
    const marked = { ...save, tutorial: { ...save.tutorial, done: [...save.tutorial.done, lessonId] } };
    const granted = grantReward(marked, lesson.reward, getContent(), clientRng());
    void saves().commit(granted.save);
    return granted.summary;
  }

  /** XP bar and reward lines on the end screen. */
  private showRewards(
    o: Phaser.GameObjects.Container,
    r: MatchRewardSummary,
    y: number,
    extraLines: string[] = [],
  ): void {
    const before = levelProgress(r.xpBefore);
    const after = levelProgress(saves().save.progression.xp);
    const leveled = after.level > before.level;
    const levelText = `Level ${after.level}${leveled ? '  ▲ LEVEL UP!' : ''}`;
    o.add(
      this.add
        .text(GAME_WIDTH / 2, y, levelText, textStyle(40, { color: leveled ? '#8dff7a' : '#fff3c4' }))
        .setOrigin(0.5),
    );
    const bar = this.add.graphics();
    o.add(bar);
    const draw = (ratio: number) => {
      bar.clear();
      bar.fillStyle(0x120c2b, 1);
      bar.fillRoundedRect(GAME_WIDTH / 2 - 300, y + 40, 600, 40, 20);
      bar.fillStyle(0x6dff8a, 1);
      bar.fillRoundedRect(GAME_WIDTH / 2 - 296, y + 44, Math.max(32, 592 * Math.min(1, ratio)), 32, 16);
    };
    const start = leveled ? 0 : before.ratio;
    draw(start);
    this.tweens.addCounter({
      from: start,
      to: after.ratio,
      duration: Math.max(1, dur(900)),
      onUpdate: (t) => draw(t.getValue() ?? after.ratio),
    });
    const gems = r.gems ? `   ·   +${r.gems} Gems` : '';
    const lines = [`+${r.xp} XP   ·   +${r.coins} Coins${gems}`, ...extraLines];
    if (r.victoryChest === 'full') lines.push('Chest slots are full: open a chest to make room!');
    else if (r.victoryChest) lines.push(`Victory chest: ${PROGRESSION.chests.types[r.victoryChest].name}!`);
    for (const id of r.questsCompleted)
      lines.push(`Quest complete: ${questDef(id)?.text ?? id} (claim it in Quests)`);
    lines.push(...this.unlockLines(r.unlocks));
    o.add(
      this.add
        .text(GAME_WIDTH / 2, y + 110, lines.join('\n'), textStyle(30, { align: 'center', lineSpacing: 8 }))
        .setOrigin(0.5, 0),
    );
  }

  private unlockLines(unlocks: readonly string[]): string[] {
    return unlocks.map((u) => {
      const [kind, id] = u.split(':');
      if (kind === 'hero') return `New hero unlocked: ${getContent().ctx.heroes.byId.get(id!)?.name ?? id}`;
      if (kind === 'mode') return `New mode unlocked: ${id}`;
      return `+${id} deck slot(s) unlocked`;
    });
  }

  private rewardLine(r: RewardSummary): string | null {
    const parts = [
      r.coins ? `+${r.coins} Coins` : '',
      r.gems ? `+${r.gems} Gems` : '',
      r.xp ? `+${r.xp} XP` : '',
      r.chestOpened ? `${PROGRESSION.chests.types[r.chestOpened].name} (${r.cards.length} cards)` : '',
    ].filter(Boolean);
    return parts.length > 0 ? parts.join('   ·   ') : null;
  }

  /** Three stars (earned ones pop in) and the objective checklist. */
  private showStars(o: Phaser.GameObjects.Container, c: CampaignResultSummary): void {
    const node = getCampaign().nodes.get(c.nodeId);
    if (!node) return;
    for (let i = 0; i < 3; i++) {
      const earned = i < c.stars;
      const star = this.add
        .text(GAME_WIDTH / 2 + (i - 1) * 190, 330 - (i === 1 ? 30 : 0), '★', {
          fontFamily: FONT_FAMILY,
          fontSize: '170px',
          color: earned ? '#ffd23f' : '#3a3550',
          stroke: '#2a1f4d',
          strokeThickness: 14,
        })
        .setOrigin(0.5);
      o.add(star);
      if (earned) {
        star.setScale(0);
        this.tweens.add({
          targets: star,
          onStart: () => audio.play('star'),
          scale: 1,
          delay: dur(250 + i * 280),
          duration: dur(350),
          ease: 'Back.Out',
        });
      }
    }
    const won = c.stars > 0;
    const lines = [
      `${won ? '✓' : '✗'} Win the battle`,
      ...node.stars.map((obj, i) => `${c.met[i] ? '✓' : '✗'} ${describeObjective(obj)}`),
    ];
    o.add(
      this.add
        .text(GAME_WIDTH / 2, 920, lines.join('\n'), textStyle(32, { align: 'center', lineSpacing: 6 }))
        .setOrigin(0.5, 0),
    );
    if (node.boss && won) {
      o.add(
        this.add
          .text(GAME_WIDTH / 2, 470, `“${node.boss.defeat}”`, {
            fontFamily: FONT_FAMILY,
            fontSize: '30px',
            fontStyle: 'italic',
            color: '#fff3c4',
            align: 'center',
            wordWrap: { width: 920 },
          })
          .setOrigin(0.5, 0),
      );
    }
  }

  private showEnd(): void {
    const s = this.controller.state;
    const o = this.openOverlay(0.8);
    const winner = s.winner;
    const title = winner === 'draw' || winner === null ? 'Draw!' : `${this.seatName(winner)} wins!`;
    const reason =
      s.endReason === 'surrender'
        ? 'By surrender'
        : s.endReason === 'turnLimit'
          ? 'Turn limit reached'
          : 'Hero defeated';
    o.add(
      this.add
        .text(
          GAME_WIDTH / 2,
          600,
          winner === 'draw'
            ? 'DRAW'
            : !this.controller.hotSeat && winner !== null && !this.isLocalPlayer(winner)
              ? 'DEFEAT'
              : 'VICTORY',
          textStyle(150, { color: hex(COLORS.accent), strokeThickness: 18 }),
        )
        .setOrigin(0.5),
    );
    o.add(this.add.text(GAME_WIDTH / 2, 760, title, textStyle(70)).setOrigin(0.5));
    o.add(
      this.add
        .text(
          GAME_WIDTH / 2,
          850,
          `${reason} · Turn ${s.turn}`,
          textStyle(36, { color: hex(COLORS.textDim) }),
        )
        .setOrigin(0.5),
    );
    const humanWon = winner !== 'draw' && winner !== null && this.isLocalPlayer(winner);
    audio.silenceMusic();
    audio.play(humanWon || (this.controller.hotSeat && winner !== 'draw') ? 'victory' : 'defeat');
    if (humanWon) confetti(this);
    if (this.resultRecorded) return;
    this.resultRecorded = true;
    const ctx = this.context;
    if (ctx.kind === 'tutorial') this.showTutorialEnd(o, ctx.lessonId, humanWon);
    else if (ctx.kind === 'campaign') this.showCampaignEnd(o, ctx.nodeId, humanWon);
    else if (ctx.kind === 'daily' || ctx.kind === 'gauntlet' || ctx.kind === 'draft')
      this.showModeEnd(o, ctx.kind, humanWon);
    else if (ctx.kind === 'sandbox') this.showSandboxEnd(o);
    else if (ctx.kind === 'online') this.showOnlineEnd(o, humanWon);
    else this.showQuickEnd(o, humanWon);
  }

  /** Daily Dungeon, Gauntlet and Draft: match rewards plus the mode's own progress. */
  private showModeEnd(
    o: Phaser.GameObjects.Container,
    kind: 'daily' | 'gauntlet' | 'draft',
    humanWon: boolean,
  ): void {
    const rewards = this.recordResult(humanWon);
    const extra: string[] = [];
    const human = this.humanSeat();
    const content = getContent();
    let save = saves().save;
    if (kind === 'daily') {
      const r = recordDaily(save, Date.now(), humanWon, content, clientRng());
      save = r.save;
      const line = r.reward ? this.rewardLine(r.reward) : null;
      if (line) extra.push(`Daily Dungeon cleared! ${line}`);
      else if (humanWon) extra.push('Already cleared today: a new dungeon opens tomorrow!');
      else extra.push('The dungeon stands. Try again as often as you like.');
    } else if (kind === 'gauntlet') {
      save = recordGauntlet(save, humanWon, this.controller.state.players[human].hp, content);
      const run = save.modes.gauntlet;
      const total = PROGRESSION.modes.gauntlet.battles;
      if (run && !run.over) extra.push(`Gauntlet: ${run.wins}/${total} wins · next battle at ${run.hp} HP`);
      else if (run) extra.push(`Gauntlet over with ${run.wins}/${total} wins: claim your rewards!`);
    } else {
      save = recordDraft(save, humanWon);
      const run = save.modes.draft;
      if (run) {
        extra.push(`Draft: ${run.wins} wins · ${run.losses}/${PROGRESSION.modes.draft.maxLosses} losses`);
        if (draftOver(run)) extra.push('The run is over: claim your rewards!');
      }
    }
    void saves().commit(save);
    if (rewards) this.showRewards(o, rewards, 960, extra);
    else
      o.add(
        this.add
          .text(GAME_WIDTH / 2, 960, extra.join('\n'), textStyle(32, { align: 'center', lineSpacing: 8 }))
          .setOrigin(0.5, 0),
      );
    const seat = this.controller.seats[human];
    if (kind === 'daily') {
      this.endButton(o, 300, 1770, 'Retry', true, () =>
        this.scene.restart(dailyMatchData({ name: seat.name, deck: seat.deck }, Date.now())),
      );
    }
    const target =
      kind === 'daily' ? SCENE_KEYS.Daily : kind === 'gauntlet' ? SCENE_KEYS.Gauntlet : SCENE_KEYS.Draft;
    this.endButton(o, kind === 'daily' ? 780 : GAME_WIDTH / 2, 1770, 'Continue', false, () =>
      goToScene(this, target),
    );
  }

  private showSandboxEnd(o: Phaser.GameObjects.Container): void {
    o.add(
      this.add
        .text(
          GAME_WIDTH / 2,
          980,
          'Sandbox matches give no rewards.',
          textStyle(34, { color: hex(COLORS.textDim) }),
        )
        .setOrigin(0.5),
    );
    this.endButton(o, 300, 1770, 'Restart', false, () =>
      this.scene.restart({ ...this.sceneData, seed: `sandbox:${Date.now()}` }),
    );
    this.endButton(o, 780, 1770, 'Main Menu', true, () => goToScene(this, SCENE_KEYS.MainMenu));
  }

  // -------------------------------------------------------------------------
  // Sandbox tools
  // -------------------------------------------------------------------------

  private sandboxEdit(edit: SandboxEdit): void {
    const next = applySandboxEdit(this.controller.state, edit, this.controller.ctx);
    if (!next) {
      showToast(this, 'That edit is not possible right now.');
      return;
    }
    this.controller.replaceState(next);
    this.setMode({ kind: 'idle' });
    this.board.sync(next);
    this.refreshAffordances();
  }

  private showSandboxTools(): void {
    if (this.busy || this.controller.isOver) return;
    if (this.controller.state.phase !== 'main') {
      showToast(this, 'Tools work once the match has started.');
      return;
    }
    const me = this.viewer;
    const dummy = this.board.opponentOf(me);
    const tool = (label: string, onClick: () => void, color: number = COLORS.secondary): ModalButton => ({
      label,
      color,
      shadowColor: COLORS.outline,
      onClick,
    });
    this.openModal('Sandbox tools', 'Edit the match freely. Nothing here is recorded.', [
      tool('Refill my MP', () => this.sandboxEdit({ type: 'refillMp', player: me })),
      tool('Draw a card', () => this.sandboxEdit({ type: 'drawCard', player: me })),
      tool('Add a card to my hand…', () =>
        this.pickSandboxCard('Add to hand', false, (id) =>
          this.sandboxEdit({ type: 'addToHand', player: me, cardId: id }),
        ),
      ),
      tool('Spawn an enemy creature…', () =>
        this.pickSandboxCard('Spawn for the dummy', true, (id) =>
          this.pickSandboxLane((lane) =>
            this.sandboxEdit({ type: 'spawnCreature', player: dummy, lane, cardId: id }),
          ),
        ),
      ),
      tool('Charge my Hero Ability', () => this.sandboxEdit({ type: 'chargeUltimate', player: me })),
      tool('Ready my creatures', () => this.sandboxEdit({ type: 'readyCreatures', player: me })),
      tool('Heal both heroes', () => {
        this.sandboxEdit({ type: 'healHero', player: me });
        this.sandboxEdit({ type: 'healHero', player: dummy });
      }),
      tool(
        'Clear the enemy board',
        () => this.sandboxEdit({ type: 'clearBoard', player: dummy }),
        COLORS.danger,
      ),
    ]);
  }

  private pickSandboxLane(onPick: (lane: number) => void): void {
    this.openModal(
      'Which lane?',
      'A creature already there is replaced.',
      [0, 1, 2, 3].map((lane) => ({ label: `Lane ${lane + 1}`, onClick: () => onPick(lane) })),
    );
  }

  /** A search box plus up to 12 matching cards. */
  private pickSandboxCard(title: string, creaturesOnly: boolean, onPick: (cardId: string) => void): void {
    const o = this.openOverlay(0.94);
    const cards = this.controller.ctx.cards.all.filter(
      (c) => !c.token && (!creaturesOnly || c.type === 'creature'),
    );
    o.add(
      this.add.text(GAME_WIDTH / 2, 110, title, textStyle(56, { color: hex(COLORS.accent) })).setOrigin(0.5),
    );
    const results = this.add.container(0, 0);
    o.add(results);
    let field: Phaser.GameObjects.DOMElement | null = null;
    const close = () => {
      field?.destroy();
      this.closeOverlay();
    };
    const render = (query: string) => {
      results.removeAll(true);
      const q = query.trim().toLowerCase();
      const list = cards.filter((c) => !q || c.name.toLowerCase().includes(q)).slice(0, 12);
      list.forEach((c, i) => {
        const x = GAME_WIDTH / 2 + (i % 2 === 0 ? -255 : 255);
        const y = 400 + Math.floor(i / 2) * 170;
        results.add(
          new Button(this, x, y, c.name, {
            width: 480,
            height: 140,
            fontSize: c.name.length > 18 ? 26 : 32,
            color: PALETTE[c.landscape].dark,
            shadowColor: COLORS.outline,
            caption: `${c.cost} MP · ${c.type}`,
            onClick: () => {
              close();
              onPick(c.id);
            },
          }),
        );
      });
      if (list.length === 0)
        results.add(this.add.text(GAME_WIDTH / 2, 420, 'No cards match.', textStyle(36)).setOrigin(0.5));
    };
    field = addTextField(this, GAME_WIDTH / 2, 230, {
      width: 800,
      height: 80,
      placeholder: 'Search cards…',
      fontSize: 36,
      onChange: (q) => render(q),
    }).setDepth(900);
    render('');
    o.add(
      new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 110, 'Cancel', {
        width: 400,
        height: 110,
        color: COLORS.danger,
        shadowColor: COLORS.dangerDark,
        onClick: close,
      }),
    );
  }

  private endButton(
    o: Phaser.GameObjects.Container,
    x: number,
    y: number,
    label: string,
    secondary: boolean,
    onClick: () => void,
    width = 440,
  ): void {
    o.add(
      new Button(this, x, y, label, {
        width,
        height: 140,
        fontSize: label.length > 12 ? 40 : 48,
        color: secondary ? COLORS.secondary : COLORS.primary,
        shadowColor: secondary ? COLORS.secondaryDark : COLORS.primaryDark,
        onClick,
      }),
    );
  }

  private showQuickEnd(o: Phaser.GameObjects.Container, humanWon: boolean): void {
    const rewards = this.recordResult(humanWon);
    if (rewards) this.showRewards(o, rewards, 960);
    this.endButton(
      o,
      GAME_WIDTH / 2,
      1500,
      'Rematch',
      false,
      () => {
        const data: MatchSceneData = {
          ...this.sceneData,
          seed: `${String(this.controller.seed)}:rematch`,
        };
        this.scene.restart(data);
      },
      560,
    );
    this.endButton(
      o,
      GAME_WIDTH / 2,
      1690,
      'Main Menu',
      true,
      () => goToScene(this, SCENE_KEYS.MainMenu),
      560,
    );
  }

  private showCampaignEnd(o: Phaser.GameObjects.Container, nodeId: string, humanWon: boolean): void {
    const rewards = this.recordResult(humanWon);
    const camp = this.recordCampaign(nodeId, humanWon);
    const extra: string[] = [];
    if (camp) {
      this.showStars(o, camp);
      const line = this.rewardLine(camp.reward);
      if (line) extra.push(`Campaign: ${line}`);
      extra.push(...this.unlockLines(camp.reward.unlocks));
      if (camp.regionUnlocked !== null)
        extra.push(`New region unlocked: ${getCampaign().regions[camp.regionUnlocked]?.name ?? ''}!`);
    }
    if (rewards) this.showRewards(o, rewards, 1110, extra);
    const seat = this.controller.seats[this.humanSeat()];
    this.endButton(o, 300, 1770, 'Retry', true, () => {
      const data = campaignMatchData(nodeId, { name: seat.name, deck: seat.deck }, Date.now());
      this.scene.restart(data);
    });
    this.endButton(o, 780, 1770, 'Continue', false, () =>
      goToScene(this, SCENE_KEYS.Campaign, { focus: nodeId }),
    );
  }

  private showTutorialEnd(o: Phaser.GameObjects.Container, lessonId: string, humanWon: boolean): void {
    const reward = this.recordTutorial(lessonId, humanWon);
    const lines: string[] = [];
    if (humanWon) {
      lines.push('Lesson complete!');
      const line = reward ? this.rewardLine(reward) : null;
      if (line) lines.push(line);
      if (reward) lines.push(...this.unlockLines(reward.unlocks));
    } else {
      lines.push('Not this time. Give it another go!');
    }
    o.add(
      this.add
        .text(GAME_WIDTH / 2, 980, lines.join('\n'), textStyle(40, { align: 'center', lineSpacing: 12 }))
        .setOrigin(0.5, 0),
    );
    const index = LESSONS.findIndex((l) => l.id === lessonId);
    const next = LESSONS[index + 1];
    if (!humanWon) {
      this.endButton(
        o,
        GAME_WIDTH / 2,
        1500,
        'Try again',
        false,
        () => this.scene.restart(tutorialMatchData(lessonId)),
        560,
      );
    } else if (next) {
      this.endButton(
        o,
        GAME_WIDTH / 2,
        1500,
        `Next: ${next.name}`,
        false,
        () => this.scene.restart(tutorialMatchData(next.id)),
        760,
      );
    } else {
      this.endButton(
        o,
        GAME_WIDTH / 2,
        1500,
        'Start the Campaign',
        false,
        () => goToScene(this, SCENE_KEYS.Campaign),
        640,
      );
    }
    this.endButton(
      o,
      GAME_WIDTH / 2,
      1690,
      'Main Menu',
      true,
      () => goToScene(this, SCENE_KEYS.MainMenu),
      560,
    );
  }
}
