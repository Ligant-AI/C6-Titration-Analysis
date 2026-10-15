import * as D from './decimal.js';
import { roundDec } from './numfmt.js';
export const SIG_FIGS = 3;
const SUPERSCRIPT = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
function rounded3(x) {
    if (!Number.isFinite(x))
        throw new Error(`display: not finite: ${x}`);
    if (x === 0)
        return null;
    const r = roundDec(x, SIG_FIGS);
    const mag = D.abs(r);
    const scientific = D.cmp(mag, D.fromString('0.001')) < 0 || D.cmp(mag, D.fromInt(1000)) >= 0;
    return { r, scientific };
}
function mantissa(r) {
    const digits = r.mant.toString();
    const exponent = r.exp + digits.length - 1;
    return { sign: r.neg ? '-' : '', text: `${digits[0]}.${digits.slice(1, 3).padEnd(2, '0')}`, exponent };
}
export function display3(x) {
    const q = rounded3(x);
    if (!q)
        return '0.00';
    if (!q.scientific)
        return D.toString(q.r);
    const m = mantissa(q.r);
    return `${m.sign}${m.text} × 10${String(m.exponent).split('').map((ch) => SUPERSCRIPT[ch]).join('')}`;
}
export function csv3(x, decimal) {
    const q = rounded3(x);
    const mark = (t) => (decimal === ',' ? t.replace('.', ',') : t);
    if (!q)
        return mark('0.00');
    if (!q.scientific)
        return mark(D.toString(q.r));
    const m = mantissa(q.r);
    const e = Math.abs(m.exponent);
    return `${m.sign}${mark(m.text)}E${m.exponent < 0 ? '-' : '+'}${String(e).padStart(2, '0')}`;
}
export function decimalDifference(thisDec, thisDecimals, lowestDec, lowestDecimals) {
    const diff = D.sub(thisDec, lowestDec);
    const places = Math.max(thisDecimals, lowestDecimals);
    const exact = D.toString(D.roundPlaces(diff, places));
    const decimals = Math.min(thisDecimals, lowestDecimals);
    const r = D.roundPlaces(diff, decimals);
    const display = D.toString(D.isZero(r) ? { neg: false, mant: 0n, exp: r.exp } : r);
    return { exact, decimals, display };
}
