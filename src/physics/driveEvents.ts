/** Event types pushed by the drivetrain. */
export const EV_UPSHIFT = 1;
export const EV_DOWNSHIFT = 2;
/** Throttle lifted hard while boosting: value = boost at that moment (blow-off valve). */
export const EV_LIFT = 3;
/** Rev limiter cut started. */
export const EV_CUT = 4;
/** Exhaust backfire pop (deceleration at high rpm, or on a shift). value = strength 0..1. */
export const EV_BACKFIRE = 5;

const SIZE = 32;

/** A consumer's own position in the channel: several readers (audio, particles) can each see every event. */
export class EventReader {
  /** Absolute count of events this reader has consumed. */
  pos = 0;
}

/**
 * Tiny allocation-free event ring: the drivetrain pushes (type, value) pairs; readers drain them once per frame.
 * Each reader keeps its own cursor. If a reader falls more than 32 events behind it skips to the oldest kept event.
 */
export class EventChannel {
  private readonly types = new Int8Array(SIZE);
  private readonly values = new Float32Array(SIZE);
  private total = 0;
  private readonly own = new EventReader();

  push(type: number, value = 0): void {
    this.types[this.total % SIZE] = type;
    this.values[this.total % SIZE] = value;
    this.total++;
  }

  /** Call `fn` for every event the reader has not seen yet. Without a reader, a built-in one is used. */
  drain(fn: (type: number, value: number) => void, reader: EventReader = this.own): void {
    if (this.total - reader.pos > SIZE - 1) reader.pos = this.total - (SIZE - 1);
    while (reader.pos < this.total) {
      fn(this.types[reader.pos % SIZE], this.values[reader.pos % SIZE]);
      reader.pos++;
    }
  }

  clear(): void {
    this.own.pos = this.total;
  }
}
