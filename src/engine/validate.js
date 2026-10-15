import * as D from './decimal.js';
import { parseCase, unparseableMessage, COLUMN_LABELS, ROW_COLUMNS, SMALLEST_NORMAL } from './parse.js';
import { MAX_POINTS } from './constants.js';
import { AXIS_FORMS, STAINING_VOLUME, CELL_NUMBER, conversion, normalise } from './units.js';
import { screenUnsupported, hasUnit, isWhole } from './refusals.js';
import { seriesPoints, relations } from './series.js';
const nonBlank = (t) => t !== null && t !== undefined && String(t).trim() !== '';
export const positiveSpreadEntered = (c) => (c.rows || []).some((r) => nonBlank(r.posSpread));
export function incompleteDeclarations(c) {
    const s = c.statistics || {};
    const quantityMissing = (q) => q === null || q === undefined || (typeof q === 'object' && !hasUnit(q.unit));
    const list = [];
    if ((c.rows || []).some((r) => !hasUnit(r.concentration?.unit)))
        list.push('C6-SR-01');
    if (c.axisForm === null || c.axisForm === undefined)
        list.push('C6-SR-02');
    if (quantityMissing(c.stainingVolume) || quantityMissing(c.cellNumber))
        list.push('C6-SR-03');
    if ([s.positiveCentral, s.negativeCentral, s.negativeSpread].some((x) => x === null || x === undefined))
        list.push('C6-DA-02');
    if (positiveSpreadEntered(c) && (s.positiveSpread === null || s.positiveSpread === undefined))
        list.push('C6-DA-02/positive-spread');
    const positiveRobust = positiveSpreadEntered(c) && s.positiveSpread === 'robust-sd';
    if ((s.negativeSpread === 'robust-sd' || positiveRobust) && (c.robustSdDefinition === null || c.robustSdDefinition === undefined))
        list.push('C6-DA-02/robust-sd-definition');
    if (c.entry === 'pasted' && (c.decimalSeparator === null || c.decimalSeparator === undefined))
        list.push('C6-DA-05');
    if (c.negativeSource === null || c.negativeSource === undefined)
        list.push('C6-NG-01');
    if (c.stainedAs === null || c.stainedAs === undefined)
        list.push('C6-AC-01');
    if (c.acquisition === null || c.acquisition === undefined)
        list.push('C6-AC-02');
    if (c.matrix === null || c.matrix === undefined)
        list.push('C6-AC-03');
    return list;
}
export const REJECTION_ORDER = Object.freeze(['C6-HI-01', 'C6-HI-02', 'C6-HI-03', 'C6-HI-04', 'C6-HI-05', 'C6-HI-06', 'C6-HI-08', 'C6-HI-09', 'C6-HI-10']);
const STATISTIC_NAMES = Object.freeze({
    median: 'the median', mean: 'the mean', 'geometric-mean': 'the geometric mean',
    'robust-sd': 'the robust standard deviation', sd: 'the standard deviation', 'mad-unscaled': 'the median absolute deviation without the 1.4826 factor',
});
const rowList = (rows) => (rows.length === 1 ? `Row ${rows[0]}` : `Rows ${rows.slice(0, -1).join(', ')} and ${rows[rows.length - 1]}`);
const byRow = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const uniqueSorted = (rows) => [...new Set(rows)].sort(byRow);
export function rejections(c) {
    const p = parseCase(c);
    const out = [];
    const reject = (code, rows, sentences) => out.push({ code, rows: uniqueSorted(rows), message: sentences.join(' ') });
    const s = c.statistics || {};
    const rows = p.declared ? p.rows : [];
    const num = (cell) => cell.status === 'number';
    const n = (c.rows || []).length;
    if (n < 3)
        reject('C6-HI-01', [], [`There ${n === 1 ? 'is 1 point' : `are ${n} points`}. A titration needs at least three points to show a profile.`]);
    if (n > MAX_POINTS)
        reject('C6-HI-10', [], [`There are ${n} points. This tool analyses at most 24 points in one series, the most its chart can draw clearly. Enter at most 24 points.`]);
    const offered = (r) => { const ax = AXIS_FORMS[c.axisForm]; return !!ax && !!conversion(ax, r.unit); };
    const nonPositive = rows.filter((r) => num(r.cells.concentration) && offered(r) && D.sign(r.cells.concentration.dec) <= 0);
    if (nonPositive.length) {
        reject('C6-HI-02', nonPositive.map((r) => r.row), nonPositive.map((r) => `Row ${r.row}: the concentration is ${r.cells.concentration.text.trim()} ${r.unit}. A concentration cannot be zero or negative.`));
    }
    const axis = AXIS_FORMS[c.axisForm] ?? null;
    const groups = new Map();
    for (const r of rows) {
        if (!num(r.cells.concentration) || !axis || !conversion(axis, r.unit))
            continue;
        const key = `${r.unit}|${D.toString(D.trimZeros(r.cells.concentration.dec))}`;
        groups.set(key, [...(groups.get(key) || []), r]);
    }
    const sets = [...groups.values()].filter((g) => g.length > 1);
    if (sets.length) {
        reject('C6-HI-03', sets.flatMap((g) => g.map((r) => r.row)), sets.map((g) => {
            const names = uniqueSorted(g.map((r) => r.row));
            return `${rowList(names)} are at the same concentration, ${g[0].cells.concentration.text.trim()} ${g[0].unit}. Each point must be a distinct concentration.`;
        }));
    }
    const hi4 = [];
    for (const r of rows) {
        const spread = (k, entered) => {
            const cell = r.cells[k];
            if (entered && num(cell) && D.sign(cell.dec) < 0)
                hi4.push({ row: r.row, text: `Row ${r.row}: the ${COLUMN_LABELS[k]} is ${cell.text.trim()}. A spread measures the width of a population and cannot be below zero.` });
        };
        spread('negSpread', true);
        spread('posSpread', positiveSpreadEntered(c));
        for (const k of ['posCount', 'negCount']) {
            const cell = r.cells[k];
            if (!num(cell))
                continue;
            if (D.sign(cell.dec) < 0)
                hi4.push({ row: r.row, text: `Row ${r.row}: the ${COLUMN_LABELS[k]} is ${cell.text.trim()}. An event count is a number of events and cannot be below zero.` });
            else if (!isWhole(cell.dec))
                hi4.push({ row: r.row, text: `Row ${r.row}: the ${COLUMN_LABELS[k]} is ${cell.text.trim()}. An event count is a number of events and must be a whole number.` });
        }
    }
    if (hi4.length)
        reject('C6-HI-04', hi4.map((h) => h.row), hi4.map((h) => h.text));
    const hi5 = [];
    for (const r of rows)
        for (const k of ROW_COLUMNS)
            if (r.cells[k].status === 'invalid')
                hi5.push({ row: r.row, column: k, text: r.cells[k].text });
    for (const k of ['stainingVolume', 'cellNumber'])
        if (p[k] && p[k].cell.status === 'invalid')
            hi5.push({ row: null, column: k, text: p[k].cell.text });
    if (hi5.length)
        reject('C6-HI-05', hi5.filter((h) => h.row !== null).map((h) => h.row), hi5.map((h) => unparseableMessage(h, p.convention)));
    if (s.positiveCentral && s.negativeCentral && s.positiveCentral !== s.negativeCentral) {
        reject('C6-HI-06', [], [`The positive central value is declared as ${STATISTIC_NAMES[s.positiveCentral]} and the negative central value as ${STATISTIC_NAMES[s.negativeCentral]}. A stain index subtracts one statistic from the same statistic of the other population, so both must be declared as the same statistic.`]);
    }
    const NEEDED = ['concentration', 'posCentral', 'negCentral', 'negSpread', 'posCount', 'negCount'];
    const tooSmall = (where, text, tail = '') => `${where} "${text}"${tail} is not zero, but it is too small to be represented as a number at full precision (below about 2.2 × 10⁻³⁰⁸), so it cannot be used.`;
    const tooLarge = (where, text, tail = '') => `${where} "${text}"${tail} is too large to be represented as a number, so it cannot be used.`;
    const hi8 = [];
    const checkEntered = (row, where, cell) => {
        if (!num(cell) || cell.representable)
            return;
        hi8.push({ row, text: (Number.isFinite(cell.value) ? tooSmall : tooLarge)(where, cell.text.trim()) });
    };
    const checkConverted = (row, where, cell, unit, family) => {
        const conv = family && conversion(family, unit);
        if (!num(cell) || !cell.representable || !conv || D.isZero(cell.dec))
            return;
        const v = normalise(cell.value, conv);
        const tail = ` ${unit} once converted to ${family.base}`;
        if (!Number.isFinite(v))
            hi8.push({ row, text: tooLarge(where, cell.text.trim(), tail) });
        else if (Math.abs(v) < SMALLEST_NORMAL)
            hi8.push({ row, text: tooSmall(where, cell.text.trim(), tail) });
    };
    for (const r of rows) {
        for (const k of NEEDED)
            checkEntered(r.row, `Row ${r.row}, ${COLUMN_LABELS[k]}:`, r.cells[k]);
        if (positiveSpreadEntered(c))
            checkEntered(r.row, `Row ${r.row}, ${COLUMN_LABELS.posSpread}:`, r.cells.posSpread);
    }
    for (const [k, family] of [['stainingVolume', STAINING_VOLUME], ['cellNumber', CELL_NUMBER]]) {
        if (!p[k])
            continue;
        checkEntered(null, `The ${COLUMN_LABELS[k]}:`, p[k].cell);
        checkConverted(null, `The ${COLUMN_LABELS[k]}:`, p[k].cell, p[k].unit, family);
    }
    for (const r of rows)
        if (offered(r))
            checkConverted(r.row, `Row ${r.row}, concentration:`, r.cells.concentration, r.unit, AXIS_FORMS[c.axisForm]);
    if (hi8.length)
        reject('C6-HI-08', hi8.filter((h) => h.row !== null).map((h) => h.row), hi8.map((h) => h.text));
    const hi9 = [];
    for (const [k, name] of [['positiveCentral', 'positive'], ['negativeCentral', 'negative']]) {
        if (s[k] === 'geometric-mean')
            hi9.push(`The ${name} central value is declared as a geometric mean. A geometric mean is computed on a transformed display scale and is not the linear-scale central value the stain index subtracts. Export the median or the mean instead.`);
    }
    if (s.negativeSpread === 'mad-unscaled')
        hi9.push('The negative spread is declared as the median absolute deviation without the 1.4826 factor. That is not a standard-deviation estimate: as the negative spread it would make every stain index 1.4826 times too large. Export the robust SD or the SD instead.');
    if (positiveSpreadEntered(c) && s.positiveSpread === 'mad-unscaled')
        hi9.push('The positive spread is declared as the median absolute deviation without the 1.4826 factor. That is not a standard-deviation estimate: as the positive spread it would be reported in the table as an estimate it is not. Export the robust SD or the SD instead.');
    if (hi9.length)
        reject('C6-HI-09', [], hi9);
    return out.sort((a, b) => REJECTION_ORDER.indexOf(a.code) - REJECTION_ORDER.indexOf(b.code));
}
export function validateCase(c) {
    const incomplete = incompleteDeclarations(c);
    if (incomplete.length)
        return { status: 'incomplete', incomplete };
    const rej = rejections(c);
    const u = screenUnsupported(c);
    if (!rej.length && !u.questions.some((q) => ['Q-AB-06', 'Q-AB-08', 'Q-AB-09', 'Q-AB-10', 'Q-AB-18'].includes(q))) {
        const { overflow } = relations(seriesPoints(c));
        if (overflow.length) {
            const names = overflow.map((r) => `Row ${r}`);
            rej.push({ code: 'C6-HI-08', rows: [...overflow].sort(), message: `${names.join(', ')}: a value computed from the entered numbers (a stain index, a ratio or a difference) is too large to be represented as a number, so the result cannot be shown. Check the entered values at ${overflow.length === 1 ? 'that point' : 'those points'}.` });
        }
    }
    if (rej.length)
        return { status: 'rejected', rejections: rej, questions: u.questions.filter((q) => q !== 'Q-AB-17') };
    if (u.questions.length)
        return { status: 'unsupported', questions: u.questions, messages: u.messages };
    return { status: 'valid' };
}
