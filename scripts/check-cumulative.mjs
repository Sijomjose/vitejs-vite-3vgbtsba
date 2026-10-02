import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/MonthlyTests.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('MonthlyTests.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = new Set(['testSubjects', 'rowStats', 'studentKey', 'compareRollNo', 'buildCumulativeRows']);
const functions = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.has(n.name?.text)).map(n => n.getText(ast)).join('\n');
const context = vm.createContext({ SUBJECTS: ['english', 'maths'].map(key => ({ key })), DEFAULT_SUBJECT_KEYS: ['english', 'maths'] });
vm.runInContext(ts.transpile(functions, { target: ts.ScriptTarget.ES2022 }), context);
const test = (id, marks, rollNo = '1') => ({ id, subjects: ['english', 'maths'], maxMarks: { english: 40, maths: 40 }, students: [{ id, name: 'Student', rollNo, marks }] });
const data = { tests: [test('a', { english: 30, maths: 20 }), test('b', { english: 35, maths: 'AB' }, '2'), test('c', { english: 0, maths: null }, '2')] };
const [row] = context.buildCumulativeRows(data);
assert.equal(row.total, 85);
assert.equal(row.max, 160); // AB/blank excluded; a recorded zero still has its maximum.
assert.equal(row.includedTests, 3);
assert.equal(row.percentage, 53.125);
const [absent] = context.buildCumulativeRows({ tests: [test('a', { english: 'AB', maths: null })] });
assert.equal(absent.max, 0);
assert.equal(absent.includedTests, 0);
assert.equal(absent.rank, undefined);
if (process.argv[2]) {
  const live = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  context.SUBJECTS = ['english','hindi','maths','science','socialScience','ai'].map(key => ({key}));
  context.DEFAULT_SUBJECT_KEYS = ['english','hindi','maths','science','socialScience'];
  const rows = context.buildCumulativeRows(live);
  const faustina = rows.find(r => r.name.startsWith('FAUSTINA'));
  const savio = rows.find(r => r.name === 'SAVIO SIJO');
  assert.equal(faustina.total, 492); assert.equal(faustina.max, 640);
  assert.equal(savio.total, 598); assert.equal(savio.max, 680);
  console.log(JSON.stringify({ faustina, savio }));
}
console.log('Cumulative checks passed: partial tests, absences, blanks, zero marks, changed roll numbers.');
