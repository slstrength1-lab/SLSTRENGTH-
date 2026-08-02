/**
 * Offline tests for the Venmo / Cash App link builders. A malformed pay link
 * means a client can't pay, so these lock the exact URL shapes.
 *
 *   npx tsx scripts/payments-test.ts
 */
import { venmoPayLink, venmoProfileLink, cashAppPayLink } from "../lib/payments";

let pass = 0;
let fail = 0;
function eq(actual: string, expected: string, msg: string) {
  if (actual === expected) {
    pass++;
    console.log(`  ✓ ${msg}`);
  } else {
    fail++;
    console.log(`  ✗ ${msg}\n      got:  ${actual}\n      want: ${expected}`);
  }
}

console.log("▸ Payment links");

// Venmo — amount is 2dp, note is URL-encoded, handle strips a leading @.
eq(
  venmoPayLink("Shane-Lanteigne", 120, "SL Strength coaching"),
  "https://venmo.com/?txn=pay&recipients=Shane-Lanteigne&amount=120.00&note=SL+Strength+coaching",
  "venmo pay link: amount + note",
);
eq(venmoPayLink("@Shane-Lanteigne"), "https://venmo.com/?txn=pay&recipients=Shane-Lanteigne", "venmo: strips @, no amount/note");
eq(venmoPayLink("Shane", 0), "https://venmo.com/?txn=pay&recipients=Shane", "venmo: zero amount omitted");
eq(venmoProfileLink("@Shane-Lanteigne"), "https://venmo.com/u/Shane-Lanteigne", "venmo profile link (QR)");

// Cash App — amount path is 2dp, cashtag strips a leading $.
eq(cashAppPayLink("shanelanteigne", 75), "https://cash.app/$shanelanteigne/75.00", "cashapp pay link: amount");
eq(cashAppPayLink("$shanelanteigne"), "https://cash.app/$shanelanteigne", "cashapp: strips $, no amount");
eq(cashAppPayLink("shane", 49.5), "https://cash.app/$shane/49.50", "cashapp: decimal amount 2dp");

console.log(`\n${"=".repeat(40)}\nPAYMENTS: ${pass}/${pass + fail} passed, ${fail} failed`);
if (fail) process.exit(1);
console.log("ALL PAYMENT TESTS PASSED ✓");
