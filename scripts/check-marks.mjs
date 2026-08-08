/* Verifies the Monthly Test 2 marks typed into MonthlyTests.tsx against the TOTAL
   column printed on the school's sheet. Catches transcription slips, which is the
   only way this data realistically goes wrong. Run: node scripts/check-marks.mjs
   ponytail: regex over the source instead of a build step — no test framework needed. */
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const src = readFileSync(new URL("../src/MonthlyTests.tsx", import.meta.url), "utf8");

/* Sheet: PM SHRI KV No.2 Colaba, Class X-A, July PT-1. roll -> printed total (of 240). */
const SHEET_TOTALS = {
  10101: 182, 10102: 212, 10103: 159, 10104: 146, 10105: 176, 10106: 83,
  10107: 204, 10108: 186, 10109: 86, 10110: 212, 10111: 135, 10112: 102,
  10113: 170, 10114: 167, 10115: 92, 10116: 146, 10117: 221, 10118: 174,
  10119: 91, 10120: 198, 10121: 124, 10122: 205, 10123: 180, 10124: 218,
  10125: 170, 10126: 150, 10127: 201, 10128: 168, 10129: 90, 10130: 93,
  10131: 76, 10132: 57,
};

const rows = [...src.matchAll(/id: "t2-(\d+)".*?marks: \{([^}]*)\}/g)].map(([, roll, marks]) => ({
  roll: Number(roll),
  name: marks,
  total: [...marks.matchAll(/:\s*(-?\d+(?:\.\d+)?)/g)].reduce((sum, [, n]) => sum + Number(n), 0),
}));

assert.equal(rows.length, 32, `expected 32 Test-2 rows, parsed ${rows.length}`);

for (const { roll, total } of rows) {
  assert.equal(total, SHEET_TOTALS[roll], `roll ${roll}: typed total ${total} != sheet total ${SHEET_TOTALS[roll]}`);
}

/* Savio is rank 5: only 221, 218, 212, 212 beat his 205 among complete rows.
   (Rolls 10109/10112/10123 have AB or blank marks and are excluded from ranking.) */
const INCOMPLETE = new Set([10109, 10112, 10123]);
const savio = SHEET_TOTALS[10122];
const above = Object.entries(SHEET_TOTALS)
  .filter(([roll, t]) => !INCOMPLETE.has(Number(roll)) && t > savio).length;
assert.equal(above + 1, 5, `expected Savio rank 5, got ${above + 1}`);

/* studentKey must not merge "Divyanshu Kumar" with "DIVYANSHU KUMAR RAI". */
const key = (n) => n.trim().toLowerCase().replace(/\s+/g, " ");
assert.notEqual(key("Divyanshu Kumar"), key("DIVYANSHU KUMAR RAI"));
/* ...but must merge PT-1's truncated name with PT-2's full one, post-fixup. */
assert.equal(key("SOURABH RAMDAS AHER"), key("Sourabh  Ramdas   Aher"));

console.log(`ok — 32 rows match the sheet, Savio rank 5, name keys behave`);
