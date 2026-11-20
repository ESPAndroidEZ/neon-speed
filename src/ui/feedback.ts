import { buildPayload, MAX_MESSAGE, validateFeedback, type FeedbackKind } from '../core/feedbackForm';
import { groupIban } from '../core/feedbackForm';
import { SUPPORT } from '../data/support';
import { button, h, toast } from './uiKit';
import { t } from '../i18n';

const API = (import.meta.env.VITE_FEEDBACK_URL as string | undefined) ?? './api/feedback.php';
const KINDS = [['idea', 'fb.idea'], ['bug', 'fb.bug'], ['other', 'fb.other']] as const;
let lastSent = 0;

const field = (el: HTMLElement): HTMLElement => {
  el.style.cssText += ';width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid #18d8ff55;background:#0b1024;color:#e8f6ff;font:600 15px system-ui,sans-serif;user-select:text;-webkit-user-select:text';
  return el;
};

/** Small, non-identifying device facts that help with bug reports (only sent if the player leaves the box ticked). */
function deviceInfo(): Record<string, string | number> {
  return { screen: `${innerWidth}x${innerHeight}`, dpr: Math.round(devicePixelRatio * 10) / 10, lang: navigator.language, touch: matchMedia('(pointer: coarse)').matches ? 'yes' : 'no', agent: navigator.userAgent.slice(0, 100) };
}

function feedbackPane(close: () => void): HTMLElement {
  const pane = h('div');
  pane.style.cssText = 'display:flex;flex-direction:column;gap:10px;align-items:stretch;text-align:left';
  let kind: FeedbackKind = 'idea';
  const chips = h('div', 'rb-row');
  chips.style.justifyContent = 'center';
  const mark = (): void => chips.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.dataset.k === kind));
  for (const [k, key] of KINDS) {
    const b = button(t(key), () => { kind = k; mark(); });
    b.dataset.k = k;
    b.style.minWidth = '90px';
    chips.append(b);
  }
  mark();
  const msg = field(h('textarea')) as HTMLTextAreaElement;
  msg.rows = 5;
  msg.maxLength = MAX_MESSAGE;
  msg.placeholder = t('fb.msg');
  const contact = field(h('input')) as HTMLInputElement;
  contact.type = 'email';
  contact.placeholder = t('fb.contact');
  contact.autocomplete = 'email';
  const trap = h('input') as HTMLInputElement; // honeypot: hidden from people, bots fill it
  trap.tabIndex = -1;
  trap.autocomplete = 'off';
  trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
  const dev = h('label', 'rb-row', `<span class="rb-lbl" style="font-size:13px">${t('fb.device')}</span>`);
  const devBox = h('input') as HTMLInputElement;
  devBox.type = 'checkbox';
  devBox.checked = true;
  dev.append(devBox);
  const status = h('div', 'rb-sub', '');
  const send = button(t('fb.send'), () => void submit(), 'hot');
  const submit = async (): Promise<void> => {
    const err = validateFeedback(msg.value, contact.value);
    if (err) return void (status.textContent = t(err === 'short' ? 'fb.short' : err === 'long' ? 'fb.long' : 'fb.badContact'));
    if (Date.now() - lastSent < 30000) return void (status.textContent = t('fb.wait'));
    send.disabled = true;
    status.textContent = t('fb.sending');
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload(kind, msg.value, contact.value, devBox.checked ? deviceInfo() : null, trap.value)) });
      if (res.ok) {
        lastSent = Date.now();
        msg.value = '';
        status.textContent = t('fb.thanks');
        toast(t('fb.thanks'));
      } else status.textContent = t(res.status === 429 ? 'fb.rate' : res.status === 404 || res.status === 405 ? 'fb.noApi' : 'fb.fail');
    } catch {
      status.textContent = t('fb.fail');
    }
    send.disabled = false;
  };
  const row = h('div', 'rb-row');
  row.style.justifyContent = 'center';
  row.append(send, button(t('fb.close'), close));
  pane.append(h('div', '', t('fb.intro')), chips, msg, contact, trap, dev, status, row);
  return pane;
}

function supportPane(close: () => void): HTMLElement {
  const pane = h('div');
  pane.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center';
  const iban = h('b', '', groupIban(SUPPORT.iban));
  iban.style.cssText = 'font-family:ui-monospace,monospace;font-size:clamp(16px,4.6vw,22px);letter-spacing:1px;user-select:text;-webkit-user-select:text;padding:10px 14px;border:1px dashed #18d8ff88;border-radius:10px';
  const row = h('div', 'rb-row');
  row.style.justifyContent = 'center';
  row.append(button(t('sup.copy'), () => { void navigator.clipboard?.writeText(SUPPORT.iban).then(() => toast(t('sup.copied')), () => undefined); }, 'hot'), button(t('fb.close'), close));
  pane.append(h('div', '', t('sup.intro')), h('div', 'rb-sub', t('sup.name')), h('b', '', SUPPORT.name), h('div', 'rb-sub', t('sup.iban')), iban, h('div', 'rb-sub', t('sup.ref')), h('div', '', t('sup.thanks')), row);
  return pane;
}

/** "Feedback & support": a message form (stored on the server, emailed to the owner) and the voluntary donation details. */
export function openSupport(tab: 'feedback' | 'support' = 'feedback'): void {
  if (document.querySelector('.rb-feedback')) return;
  const root = h('div', 'rb-layer dim rb-feedback');
  root.style.cssText += ';z-index:4000;overflow:auto;justify-content:flex-start;padding-top:max(16px,3vh)';
  const close = (): void => root.remove();
  const card = h('div', 'rb-panel rb-tabs');
  card.style.cssText += ';width:min(560px,94vw);gap:12px';
  const fb = feedbackPane(close), sp = supportPane(close);
  const bar = h('div', 'rb-tabbar');
  const tabs = { feedback: button(t('fb.tabFeedback'), () => show('feedback')), support: button(t('fb.tabSupport'), () => show('support')) };
  const show = (k: 'feedback' | 'support'): void => {
    fb.hidden = k !== 'feedback';
    sp.hidden = k !== 'support';
    tabs.feedback.classList.toggle('hot', k === 'feedback');
    tabs.support.classList.toggle('hot', k === 'support');
  };
  bar.append(tabs.feedback, tabs.support);
  card.append(h('h2', 'rb-title', t('fb.title')), bar, fb, sp);
  root.append(card);
  document.body.append(root);
  show(tab);
}
