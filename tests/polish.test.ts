import { describe, expect, it } from 'vitest';
import { CARD_BACK_STYLES } from '../src/art/frames';
import { getCampaign } from '../src/campaign/config';
import { getContent } from '../src/engine';
import type { GameEvent } from '../src/engine/events';
import { LANGUAGES, t, TIP_KEYS } from '../src/i18n/strings';
import { sfxForEvent } from '../src/match/sfx';
import {
  avatarStatus,
  cardBackStatus,
  setAvatar,
  setCardBack,
  setProfileName,
} from '../src/progression/cosmetics';
import { PROGRESSION } from '../src/progression/config';
import { audio, degreeToMidi, MUSIC_IDS, SFX, SFX_IDS, TRACKS } from '../src/services/audio';
import { sanitizeSettings } from '../src/services/settings';
import { CARD_BACK_IDS, createNewSave, loadSaveString, type SaveData } from '../src/save/saveData';

const content = getContent();
const { ctx } = content;

describe('audio', () => {
  it('has a recipe for every sound effect and a track for every context', () => {
    for (const id of SFX_IDS) {
      expect(SFX[id].length, id).toBeGreaterThan(0);
      for (const v of SFX[id]) {
        expect(v.dur, id).toBeGreaterThan(0);
        expect(v.gain, id).toBeGreaterThan(0);
        expect(v.gain, id).toBeLessThanOrEqual(0.5);
      }
    }
    for (const id of MUSIC_IDS) expect(TRACKS[id].chords.length).toBeGreaterThan(0);
  });

  it('maps scale degrees to notes across octaves', () => {
    const track = TRACKS.menu; // C major from MIDI 60
    expect(degreeToMidi(track, 0)).toBe(60);
    expect(degreeToMidi(track, 2)).toBe(64);
    expect(degreeToMidi(track, 7)).toBe(72);
    expect(degreeToMidi(track, -1)).toBe(59);
  });

  it('is a silent no-op without Web Audio (tests, old browsers)', () => {
    expect(() => {
      audio.play('click');
      audio.playMusic('battle');
      audio.silenceMusic();
    }).not.toThrow();
  });

  it('gives game events fitting sounds', () => {
    const ev = (e: GameEvent) => sfxForEvent(e, 0, ctx.cards);
    expect(ev({ type: 'cardPlayed', player: 0, iid: 'a', cardId: 'cerebral_bloodstorm' } as GameEvent)).toBe(
      'spell',
    );
    expect(ev({ type: 'cardPlayed', player: 0, iid: 'a', cardId: 'legion_of_earlings' } as GameEvent)).toBe(
      'play',
    );
    expect(ev({ type: 'damage', target: { kind: 'hero', player: 1 }, amount: 2, sourcePlayer: 0 })).toBe(
      'heroHit',
    );
    expect(
      ev({ type: 'damage', target: { kind: 'creature', player: 1, lane: 0 }, amount: 2, sourcePlayer: 0 }),
    ).toBe('hit');
    expect(ev({ type: 'turnStarted', player: 1, turn: 2, mp: 2 })).toBeNull();
    expect(ev({ type: 'turnStarted', player: 0, turn: 2, mp: 2 })).toBe('turnStart');
    expect(
      ev({ type: 'creatureDestroyed', player: 1, iid: 'x', cardId: 'legion_of_earlings', lane: 0 }),
    ).toBe('destroy');
  });
});

describe('string table', () => {
  it('every language has exactly the English keys', () => {
    const keys = Object.keys(LANGUAGES[0]!.table).sort();
    for (const l of LANGUAGES) expect(Object.keys(l.table).sort()).toEqual(keys);
  });

  it('looks strings up and fills placeholders', () => {
    expect(t('menu.play')).toBe('PLAY');
    expect(TIP_KEYS.length).toBeGreaterThanOrEqual(10);
    for (const k of TIP_KEYS) expect(t(k).length).toBeGreaterThan(10);
  });

  it('keeps settings valid', () => {
    expect(sanitizeSettings({ language: 'fr' }).language).toBe('fr');
    expect(sanitizeSettings({ language: '../x' }).language).toBe('en');
    expect(sanitizeSettings({ textScale: 2 }).textScale).toBe(1);
    expect(sanitizeSettings({ textScale: 1.15 }).textScale).toBe(1.15);
  });
});

describe('profile cosmetics', () => {
  const fresh = () => createNewSave(content, 1);
  const withLevel = (s: SaveData, level: number): SaveData => ({
    ...s,
    progression: { ...s.progression, level },
  });

  it('card back ids agree between the art, the save and the config', () => {
    expect([...CARD_BACK_IDS]).toEqual([...CARD_BACK_STYLES]);
    expect(PROGRESSION.cosmetics.cardBacks.map((b) => b.id)).toEqual([...CARD_BACK_IDS]);
  });

  it('unlocks card backs by level and stars only', () => {
    let save = fresh();
    expect(cardBackStatus(save).map((b) => b.unlocked)).toEqual([true, false, false]);
    expect(setCardBack(save, 'starry').ok).toBe(false);
    save = withLevel(save, 5);
    const r = setCardBack(save, 'starry');
    expect(r.ok && r.save.profile.cardBack).toBe('starry');
    const campaign = getCampaign();
    const stars = Object.fromEntries([...campaign.nodes.keys()].slice(0, 10).map((id) => [id, 3]));
    save = { ...save, campaign: { ...save.campaign, stars } };
    expect(cardBackStatus(save).find((b) => b.id === 'checker')?.unlocked).toBe(true);
  });

  it('hero avatars unlock with the hero, or by beating that hero as a campaign boss', () => {
    const save = fresh();
    const status = avatarStatus(save, content);
    expect(status).toHaveLength(content.ctx.heroes.all.length);
    expect(new Set(status.map((a) => a.id)).size).toBe(status.length);
    expect(status.find((a) => a.id === content.starterDecks[0]!.heroId)?.unlocked).toBe(true);
    const boss = getCampaign().bosses.get('haybale')!.heroId;
    expect(status.find((a) => a.id === boss)?.unlocked).toBe(false);
    expect(setAvatar(save, boss, content).ok).toBe(false);
    const beaten = { ...save, campaign: { ...save.campaign, stars: { r1n10: 1 } } };
    const r = setAvatar(beaten, boss, content);
    expect(r.ok && r.save.profile.avatar).toBe(boss);
    expect(setAvatar(save, 'nobody', content).ok).toBe(false);
  });

  it('validates profile names', () => {
    const save = fresh();
    expect(
      setProfileName(save, '  Ada   Lovelace ').ok && setProfileName(save, '  Ada   Lovelace '),
    ).toMatchObject({
      save: { profile: { name: 'Ada Lovelace' } },
    });
    expect(setProfileName(save, 'x').ok).toBe(false);
    expect(setProfileName(save, '<script>').ok).toBe(false);
    const long = setProfileName(save, 'A'.repeat(40));
    expect(long.ok && long.save.profile.name.length).toBe(16);
  });

  it('migrates v4 saves and repairs bad cosmetics', () => {
    const v4 = { ...createNewSave(content, 1), version: 4, profile: { name: 'Old' } } as Record<
      string,
      unknown
    >;
    const s = loadSaveString(JSON.stringify(v4), content, 2).save;
    expect(s.profile).toEqual({ name: 'Old', avatar: 'finn', cardBack: 'classic' });
    const bad = { ...s, profile: { name: 'Bad', avatar: 'nope', cardBack: 'gold' } };
    expect(loadSaveString(JSON.stringify(bad), content, 2).save.profile).toEqual({
      name: 'Bad',
      avatar: 'finn',
      cardBack: 'classic',
    });
  });
});
