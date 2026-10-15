import { parseCase } from './parse.js';
import { AXIS_FORMS, conversion, normalise, orderByConcentration } from './units.js';
import { K } from './constants.js';
export function seriesPoints(c) {
    const p = parseCase(c);
    const axis = AXIS_FORMS[c.axisForm];
    const asEntered = p.rows.map((r) => {
        const cell = (k) => r.cells[k];
        const conv = conversion(axis, r.unit);
        return {
            row: r.row,
            entered: cell('concentration').value,
            normalised: normalise(cell('concentration').value, conv),
            unit: axis.base,
            P: cell('posCentral').value,
            N: cell('negCentral').value,
            S: cell('negSpread').value,
            posSpreadValue: cell('posSpread').status === 'number' ? cell('posSpread').value : null,
            posCount: cell('posCount').value,
            negCount: cell('negCount').value,
            negDec: cell('negCentral').dec,
            negDecimals: cell('negCentral').decimals,
        };
    });
    return { asEntered, ordered: orderByConcentration(asEntered) };
}
const sortReasons = (r) => [...r].sort();
export function relations({ asEntered, ordered }) {
    const out = ordered.map((p) => ({ row: p.row, point: p }));
    const overflow = [];
    for (const o of out) {
        const p = o.point;
        const reasons = [];
        if (p.S === 0)
            reasons.push('zero-spread');
        if (p.posCount === 0)
            reasons.push('zero-positive-events');
        if (p.negCount === 0)
            reasons.push('zero-negative-events');
        if (reasons.length) {
            o.stainIndex = { status: 'withheld', reasons: sortReasons(reasons) };
            continue;
        }
        const d = p.P - p.N;
        const w = K * p.S;
        const si = d / w;
        if (!Number.isFinite(d) || !Number.isFinite(w) || !Number.isFinite(si))
            overflow.push(p.row);
        o.stainIndex = { status: 'computed', unrounded: si };
    }
    const computed = out.filter((o) => o.stainIndex.status === 'computed');
    const excluded = out.filter((o) => o.stainIndex.status === 'withheld').map((o) => o.row);
    let maximum;
    let max = null;
    if (computed.length) {
        max = Math.max(...computed.map((o) => o.stainIndex.unrounded));
        maximum = { status: 'computed', rows: computed.filter((o) => o.stainIndex.unrounded === max).map((o) => o.row), excluded, edgeFlag: 'evaluated' };
    }
    else {
        maximum = { status: 'withheld', rows: [], excluded, edgeFlag: 'not-evaluated' };
    }
    for (const o of out) {
        const reasons = [];
        if (o.stainIndex.status === 'withheld')
            reasons.push('point-withheld');
        if (!computed.length)
            reasons.push('no-computed-point');
        if (max !== null && max <= 0)
            reasons.push('non-positive-maximum');
        if (reasons.length) {
            o.fractionOfMax = { status: 'withheld', reasons: sortReasons(reasons) };
            continue;
        }
        const f = o.stainIndex.unrounded / max;
        if (!Number.isFinite(f))
            overflow.push(o.row);
        o.fractionOfMax = { status: 'computed', unrounded: f };
    }
    for (let i = 0; i < out.length; i++) {
        const o = out[i];
        const p = o.point;
        if (i === 0) {
            o.positiveSignalChange = { status: 'not-applicable' };
            continue;
        }
        const lower = ordered[i - 1];
        const reasons = [];
        if (p.posCount === 0)
            reasons.push('zero-positive-events-this-point');
        if (lower.posCount === 0)
            reasons.push('zero-positive-events-next-lower');
        if ((p.posCount > 0 && p.P <= 0) || (lower.posCount > 0 && lower.P <= 0))
            reasons.push('non-positive-central');
        if (reasons.length) {
            o.positiveSignalChange = { status: 'withheld', reasons: sortReasons(reasons) };
            continue;
        }
        const ratio = p.P / lower.P;
        if (!Number.isFinite(ratio))
            overflow.push(o.row);
        o.positiveSignalChange = { status: 'computed', unrounded: ratio };
    }
    const lowest = ordered[0];
    for (const o of out) {
        const p = o.point;
        const reasons = [];
        if (p.negCount === 0)
            reasons.push('zero-negative-events-this-point');
        if (p !== lowest && lowest.negCount === 0)
            reasons.push('zero-negative-events-lowest-point');
        if (reasons.length) {
            o.negativeSignalChange = { status: 'withheld', reasons: sortReasons(reasons) };
            continue;
        }
        const diff = p.N - lowest.N;
        if (!Number.isFinite(diff))
            overflow.push(o.row);
        o.negativeSignalChange = { status: 'computed', unrounded: diff, lowest };
    }
    return { points: out, maximum, overflow: [...new Set(overflow)] };
}
