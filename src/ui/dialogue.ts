import { SPEAKERS, type ChoiceOption, type Line, type Speaker } from '../data/story';
import { portraitEl } from './portraits';
import { Voice } from './subtitles';
import { h, injectCss } from './uiKit';

export { Subtitles, Voice, type Caption } from './subtitles';

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/**
 * Speaker card with a portrait (mood changes the face), typewriter text, click / Enter / Space to advance and Esc to skip.
 * A line with a `choice` stops on two buttons: skipping jumps to the question but never answers it.
 * `onChoose` applies the answer (story flags, relationships) and returns the reply lines to play next.
 */
/** True while a dialogue line is on screen (the cast animates the speaker's talk gestures from it). */
export const DIALOGUE = { active: false };

export class DialogueBox {
  /** Called with the picked option; returns the lines to play next (default: the option's own reply). */
  onChoose: ((opt: ChoiceOption) => readonly Line[]) | null = null;
  private readonly voice: Voice;
  private layer: HTMLElement | null = null;
  private lines: readonly Line[] = [];
  private idx = 0;
  private done: (() => void) | null = null;
  private typing: number | null = null;
  private full = '';
  private textEl: HTMLElement | null = null;
  private asking = false;
  private readonly answered = new Set<Line>();

  constructor(voice: Voice) {
    injectCss();
    this.voice = voice;
    window.addEventListener('keydown', (e) => {
      if (!this.layer || e.repeat) return;
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.advance();
      } else if (e.code === 'Escape') this.skip();
    });
  }

  get active(): boolean {
    return this.layer !== null;
  }

  play(lines: readonly Line[], done: () => void): void {
    if (lines.length === 0) {
      done();
      return;
    }
    this.close();
    this.lines = lines;
    this.idx = 0;
    this.done = done;
    this.layer = h('div', 'rb-layer');
    this.layer.style.justifyContent = 'flex-end';
    this.layer.style.paddingBottom = 'max(24px,4vh)';
    this.layer.style.background = 'linear-gradient(transparent 55%,#05060dcc)';
    this.layer.addEventListener('click', () => this.advance());
    document.body.appendChild(this.layer);
    this.show();
  }

  private show(): void {
    DIALOGUE.active = true;
    const l = this.lines[this.idx];
    const sp: { name: string; color: number } = SPEAKERS[l.who as Speaker];
    this.asking = false;
    const card = h('div', 'rb-card');
    card.style.cssText += `;cursor:pointer;display:flex;gap:16px;align-items:center;text-align:left;width:min(720px,92vw);box-sizing:border-box;border-color:${hex(sp.color)}88`;
    const body = h('div');
    const head = h('div', 'rb-sub', l.phone ? `\u{1F4DE} ${sp.name} (phone)` : sp.name);
    head.style.color = hex(sp.color);
    this.textEl = h('div');
    this.textEl.style.cssText = 'font-size:18px;line-height:1.4;min-height:50px';
    const hint = h('div', 'rb-sub', l.choice ? 'Enter to answer' : 'Enter / click to continue · Esc to skip');
    hint.style.cssText += ';font-size:11px;opacity:.5;margin-top:6px';
    body.append(head, this.textEl, hint);
    if (l.who !== 'narrator') card.append(portraitEl(l.who, l.mood ?? 'neutral', 76));
    card.append(body);
    this.layer?.replaceChildren(card);
    if (l.who === 'switch') this.voice.say(l.text);
    this.type(l.text);
  }

  private type(text: string): void {
    this.full = text;
    let n = 0;
    if (this.typing !== null) clearInterval(this.typing);
    this.typing = window.setInterval(() => {
      n += 2;
      if (this.textEl) this.textEl.textContent = text.slice(0, n);
      if (n >= text.length && this.typing !== null) {
        clearInterval(this.typing);
        this.typing = null;
      }
    }, 18);
  }

  private advance(): void {
    if (this.asking) return;
    if (this.typing !== null) {
      clearInterval(this.typing);
      this.typing = null;
      if (this.textEl) this.textEl.textContent = this.full;
      return;
    }
    const l = this.lines[this.idx];
    if (l.choice && !this.answered.has(l)) {
      this.ask(l);
      return;
    }
    if (++this.idx >= this.lines.length) this.finish();
    else this.show();
  }

  /** Two answer buttons under the question; a pick plays the reply and carries on. */
  private ask(l: Line): void {
    const c = l.choice;
    if (!c) return;
    this.asking = true;
    const row = h('div', 'rb-row');
    row.style.cssText += ';margin-top:10px;justify-content:flex-start';
    c.options.forEach((opt, k) => {
      const b = h('button', `rb-btn${k === 0 ? ' hot' : ''}`, opt.label);
      b.style.minWidth = '0';
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const reply = this.onChoose?.(opt) ?? opt.reply;
        this.answered.add(l);
        this.lines = [...this.lines.slice(0, this.idx + 1), ...reply, ...this.lines.slice(this.idx + 1)];
        this.asking = false;
        this.advance();
      });
      row.append(b);
    });
    this.layer?.firstElementChild?.lastElementChild?.append(h('div', 'rb-sub', c.prompt), row);
  }

  /** Esc: skip ahead, but stop at the next unanswered question. */
  private skip(): void {
    if (this.asking) return;
    const q = this.lines.findIndex((x, i) => i >= this.idx && x.choice && !this.answered.has(x));
    if (q < 0) this.finish();
    else if (q > this.idx) {
      this.idx = q;
      this.show();
    }
  }

  private finish(): void {
    const cb = this.done;
    this.close();
    this.voice.stop();
    cb?.();
  }

  private close(): void {
    DIALOGUE.active = false;
    if (this.typing !== null) clearInterval(this.typing);
    this.typing = null;
    this.layer?.remove();
    this.layer = null;
    this.done = null;
    this.asking = false;
  }
}
