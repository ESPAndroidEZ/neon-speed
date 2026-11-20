import { buildPayload, groupIban, ibanValid, validateFeedback } from '../src/core/feedbackForm.ts';
import { SUPPORT } from '../src/data/support.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
check('a normal message passes', validateFeedback('The tunnel is too bright on my phone', '') === null);
check('too short is refused', validateFeedback('hi', '') === 'short' && validateFeedback('   ab   ', '') === 'short');
check('too long is refused', validateFeedback('x'.repeat(2001), '') === 'long' && validateFeedback('x'.repeat(2000), '') === null);
check('an optional email must look like one', validateFeedback('good game!', 'a@b.co') === null && validateFeedback('good game!', 'not an email') === 'contact' && validateFeedback('good game!', 'a@b') === 'contact' && validateFeedback('good game!', '') === null);
const p = buildPayload('bug', '  it crashes  ', ' a@b.co ', { screen: '844x390' }, '') as { kind: string; message: string; contact: string; meta: object; website: string };
check('payload is trimmed and carries the honeypot', p.kind === 'bug' && p.message === 'it crashes' && p.contact === 'a@b.co' && p.website === '' && buildPayload('idea', 'hello there', '', null) !== null);
check('the donation IBAN passes the ISO checksum (mod 97)', ibanValid(SUPPORT.iban), SUPPORT.iban);
check('a mistyped IBAN fails the checksum', !ibanValid('BG41UBBS80021019866251') && !ibanValid('BG42UBBS80021019866250') && !ibanValid('nope'));
check('the IBAN is shown in groups of four', groupIban(SUPPORT.iban) === 'BG41 UBBS 8002 1019 8662 50', groupIban(SUPPORT.iban));
check('the beneficiary name is set', SUPPORT.name === 'Karlos Georgiev');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
