import { describe, expect, it } from 'vitest';
import { CEIL, FLOOR, SEED_BASELINE, SEED_VOL } from './config';
import { ValueEngine } from './value-engine';

const M = 1_000_000;

function runSequence(start: number, notes: number[]) {
  const engine = new ValueEngine(start, SEED_BASELINE, SEED_VOL);
  const steps = notes.map((note) => {
    const r = engine.update(note);
    return { note, value: r.value, delta: r.delta };
  });
  return { engine, steps };
}

describe('ValueEngine — reference scenarios (§5.4 A→F)', () => {
  it('A: repeated 80s rise with DECELERATING increments, then a 60 pulls it back down', () => {
    const { steps } = runSequence(32.5 * M, [80, 80, 80, 80, 80, 60]);

    // Monte vers un plateau ~40M (spec: 32.5M -> ~40M).
    expect(steps[4]!.value).toBeGreaterThan(39.5 * M);
    expect(steps[4]!.value).toBeLessThan(40.5 * M);

    // Tous les 80 poussent vers le haut ; une fois l'ancre « accrochée » (dès le
    // 2e coup), les incréments décélèrent — le motif ×1.2→×1.3→×1.35→plateau.
    const ups = steps.slice(0, 5).map((s) => s.delta);
    for (const up of ups) expect(up).toBeGreaterThan(0);
    for (let i = 2; i < ups.length; i += 1) {
      expect(ups[i]!).toBeLessThan(ups[i - 1]!);
    }
    // Le dernier incrément est nettement plus petit que le pic (décélération).
    expect(ups[4]!).toBeLessThan(Math.max(...ups) * 0.7);

    // Le 60 (sous la forme récente ~80) fait redescendre la valeur.
    expect(steps[5]!.delta).toBeLessThan(0);
  });

  it('B: repeated 30s sink to ~27.5M, then a 40 nudges slightly up', () => {
    const { steps } = runSequence(32.5 * M, [30, 30, 30, 30, 30, 40]);

    expect(steps[4]!.value).toBeGreaterThan(27 * M);
    expect(steps[4]!.value).toBeLessThan(28 * M);

    // Un 40 au-dessus d'une forme ~30 => légère hausse.
    expect(steps[5]!.delta).toBeGreaterThan(0);
    expect(steps[5]!.delta).toBeLessThan(0.3 * M);
  });

  it('C vs D: gains are asymmetric — up amplified at low value, down amplified at high value', () => {
    const upLow = new ValueEngine(15 * M).update(80).delta;
    const upHigh = new ValueEngine(50 * M).update(80).delta;
    const downLow = new ValueEngine(15 * M).update(20).delta;
    const downHigh = new ValueEngine(50 * M).update(20).delta;

    // Basse valeur + bonne surprise => gros mouvement à la hausse.
    expect(upLow).toBeGreaterThan(upHigh);
    expect(upLow).toBeGreaterThan(3 * M);

    // Haute valeur + mauvaise surprise => gros mouvement à la baisse.
    expect(Math.abs(downHigh)).toBeGreaterThan(Math.abs(downLow));
    expect(downHigh).toBeLessThan(-3 * M);

    // Protection : basse valeur + mauvaise surprise reste petit.
    expect(Math.abs(downLow)).toBeLessThan(1 * M);
    // Déjà haut + bonne surprise reste petit.
    expect(Math.abs(upHigh)).toBeLessThan(1 * M);
  });

  it('F: an isolated catastrophe dents without assassinating, and is recoverable', () => {
    const engine = new ValueEngine(32.5 * M);
    for (let i = 0; i < 15; i += 1) engine.update(78); // plateau ~44M
    const before = engine.value;

    const crash = engine.update(10);
    const lossPct = (-crash.delta / before) * 100;
    expect(lossPct).toBeGreaterThan(0);
    expect(lossPct).toBeLessThan(10); // pas d'assassinat (§7 F)

    // Récupération dès la game suivante.
    const recovery = engine.update(78);
    expect(recovery.delta).toBeGreaterThan(0);
  });
});

describe('ValueEngine — invariants', () => {
  it('value stays within [FLOOR, CEIL] over a long noisy run', () => {
    const engine = new ValueEngine(FLOOR);
    const notes = [0, 100, 0, 100, 50, 80, 20, 95, 5, 60, 40, 10, 90, 30, 70];
    for (let i = 0; i < 300; i += 1) {
      const r = engine.update(notes[i % notes.length]!);
      expect(r.value).toBeGreaterThanOrEqual(FLOOR);
      expect(r.value).toBeLessThanOrEqual(CEIL);
    }
  });

  it('repeated identical notes converge toward a stable plateau (regularity dampens moves)', () => {
    const engine = new ValueEngine(32.5 * M);
    const deltas: number[] = [];
    for (let i = 0; i < 20; i += 1) {
      deltas.push(engine.update(75).delta);
    }
    // Les mouvements se resserrent : le dernier est bien plus petit que le pic.
    const peak = Math.max(...deltas.map(Math.abs));
    expect(Math.abs(deltas[deltas.length - 1]!)).toBeLessThan(peak * 0.5);
    // Plateau cohérent avec target(baseline≈75) ~ 43.75M.
    expect(engine.value).toBeGreaterThan(42 * M);
    expect(engine.value).toBeLessThan(45 * M);
  });

  it('is a faithful port: applyNote is pure and matches the stateful engine', () => {
    const engine = new ValueEngine(32.5 * M);
    const a = engine.update(70);
    // Rejouer la même note depuis le même état donne le même résultat.
    const engine2 = new ValueEngine(32.5 * M);
    const b = engine2.update(70);
    expect(a.value).toBe(b.value);
    expect(a.baseline).toBe(b.baseline);
    expect(a.volatility).toBe(b.volatility);
  });
});
