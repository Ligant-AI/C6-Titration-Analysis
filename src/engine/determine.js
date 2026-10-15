import { validateCase } from './validate.js';
import { seriesPoints, relations } from './series.js';
import { display3, decimalDifference } from './display.js';
import { K } from './constants.js';
import { raiseFlags, namesRow } from './flags.js';
const derived = (v) => (v.status === 'computed'
    ? { status: 'computed', unrounded: v.unrounded, display: display3(v.unrounded), reasons: [] }
    : v.status === 'withheld'
        ? { status: 'withheld', unrounded: null, display: null, reasons: v.reasons }
        : { status: 'not-applicable', unrounded: null, display: null, reasons: [] });
function negativeSignalChange(v, p) {
    if (v.status !== 'computed')
        return { status: 'withheld', unrounded: null, exact: null, display: null, decimals: null, reasons: v.reasons };
    const { exact, decimals, display } = decimalDifference(p.negDec, p.negDecimals, v.lowest.negDec, v.lowest.negDecimals);
    return { status: 'computed', unrounded: v.unrounded, exact, display, decimals, reasons: [] };
}
const echoOf = (r) => ({ posCentral: r.posCentral, negCentral: r.negCentral, negSpread: r.negSpread, posCount: r.posCount, negCount: r.negCount, posSpread: r.posSpread ?? null });
export function determine(c) {
    if (Object.hasOwn(c, 'import'))
        return { id: c.id, status: 'error', message: 'A case with an import member is not a protocol-1 case (the import is deferred).' };
    if (c.workingPoint !== null && c.workingPoint !== undefined && !(c.rows || []).some((r) => r.row === c.workingPoint)) {
        return { id: c.id, status: 'error', message: `The working point names row "${c.workingPoint}", which the case does not have.` };
    }
    const v = validateCase(c);
    const base = { id: c.id, status: v.status, incomplete: [], rejections: [], questions: [] };
    if (v.status === 'incomplete')
        return { ...base, incomplete: v.incomplete };
    if (v.status === 'rejected')
        return { ...base, rejections: v.rejections.map(({ code, rows, message }) => ({ code, rows, message })), questions: v.questions };
    if (v.status === 'unsupported')
        return { ...base, questions: v.questions, messages: v.messages.map((m) => m.text) };
    const series = seriesPoints(c);
    const rel = relations(series);
    const { points, maximum } = rel;
    const flags = raiseFlags(c, rel);
    const byRow = new Map(c.rows.map((r) => [r.row, r]));
    return {
        ...base,
        status: 'result',
        k: K,
        flags,
        maximum,
        workingPoint: c.workingPoint === null || c.workingPoint === undefined ? null : {
            row: c.workingPoint,
            flags: flags.filter((f) => namesRow(f, c.workingPoint)).map((f) => f.code),
            seriesFlags: flags.filter((f) => f.rows.length === 0).map((f) => f.code),
        },
        points: points.map((o) => ({
            row: o.row,
            concentration: { unrounded: o.point.normalised, unit: o.point.unit },
            echo: echoOf(byRow.get(o.row)),
            stainIndex: derived(o.stainIndex),
            fractionOfMax: derived(o.fractionOfMax),
            positiveSignalChange: derived(o.positiveSignalChange),
            negativeSignalChange: negativeSignalChange(o.negativeSignalChange, o.point),
        })),
    };
}
