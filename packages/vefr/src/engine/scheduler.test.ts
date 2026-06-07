import { describe, expect, it } from "vitest";
import { TestClock } from "./clock.js";
import { Scheduler } from "./scheduler.js";
import { type Tick, TICKS_PER_BEAT } from "../domain/timing.js";

type Recorded = { tick: Tick; time: number };

function makeScheduler(): { clock: TestClock; recorded: Recorded[]; scheduler: Scheduler } {
  const clock = new TestClock();
  const recorded: Recorded[] = [];
  const scheduler = new Scheduler({
    clock,
    onTick: (tick, time) => {
      recorded.push({ tick, time });
    },
    intervalMs: 25,
    lookaheadSec: 0.1,
    startOffsetSec: 0,
  });
  return { clock, recorded, scheduler };
}

describe("Scheduler", () => {
  it("schedules ticks at constant tempo", () => {
    const { clock, recorded, scheduler } = makeScheduler();
    scheduler.start(0, 60); // 60 BPM => 1 sec per beat => 96 ticks per sec
    clock.advanceTo(0.05); // half-tick
    expect(recorded.length).toBeGreaterThan(0);
    clock.advanceTo(1); // 1 second after start
    const ticksAtOneSecond = recorded.filter((r) => r.time <= 1).length;
    // 1 second at 60 BPM = 96 ticks; allow off-by-one for boundary
    expect(ticksAtOneSecond).toBeGreaterThanOrEqual(TICKS_PER_BEAT);
    expect(ticksAtOneSecond).toBeLessThanOrEqual(TICKS_PER_BEAT + 1);
  });

  it("does not skip tick 0", () => {
    const { clock, recorded, scheduler } = makeScheduler();
    scheduler.start(0, 60);
    clock.advanceTo(0.001);
    expect(recorded[0]?.tick).toBe(0);
  });

  it("emits monotonically increasing ticks", () => {
    const { clock, recorded, scheduler } = makeScheduler();
    scheduler.start(0, 120);
    clock.advanceTo(0.5);
    for (let i = 1; i < recorded.length; i += 1) {
      const curr = recorded[i];
      const prev = recorded[i - 1];
      expect(curr).toBeDefined();
      expect(prev).toBeDefined();
      if (curr && prev) {
        expect(curr.tick).toBe(prev.tick + 1);
      }
    }
  });

  it("respects BPM doubling", () => {
    const { clock, recorded, scheduler } = makeScheduler();
    scheduler.start(0, 60);
    clock.advanceTo(0.5);
    const ticksAt60 = recorded.length;
    scheduler.setBpm(120);
    clock.advanceTo(1);
    const ticksAt120 = recorded.length - ticksAt60;
    // At 120 BPM, 0.5 sec adds ~96 ticks (2x of 60 BPM 0.5sec which is ~48)
    expect(ticksAt120).toBeGreaterThan(ticksAt60);
  });

  it("stop() returns logical position", () => {
    const { clock, scheduler } = makeScheduler();
    scheduler.start(0, 60); // 96 ticks/sec
    clock.advanceTo(0.5); // ~48 ticks elapsed
    const pos = scheduler.stop();
    expect(pos).toBeGreaterThanOrEqual(TICKS_PER_BEAT / 2 - 2);
    expect(pos).toBeLessThanOrEqual(TICKS_PER_BEAT / 2 + 2);
  });

  it("resumes from saved position", () => {
    const { clock, recorded, scheduler } = makeScheduler();
    scheduler.start(0, 60);
    clock.advanceTo(0.5);
    const pos = scheduler.stop();
    recorded.length = 0;
    clock.advanceTo(1.0); // simulate gap while paused
    scheduler.start(pos, 60);
    clock.advanceTo(1.001);
    expect(recorded[0]?.tick).toBe(pos);
  });
});
