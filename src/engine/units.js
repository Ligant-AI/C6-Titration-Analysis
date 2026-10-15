import * as D from './decimal.js';
const SAME = Object.freeze({ op: 'none', factor: 1, exp: 0 });
export const AXIS_FORMS = Object.freeze({
    concentration: Object.freeze({ label: 'concentration in the staining volume', base: 'µg/mL', units: Object.freeze({ 'µg/mL': SAME, 'ng/mL': Object.freeze({ op: 'divide', factor: 1000, exp: -3 }) }) }),
    'mass-per-test': Object.freeze({ label: 'mass per test', base: 'µg', units: Object.freeze({ µg: SAME }) }),
    'mass-per-1e6-cells': Object.freeze({ label: 'mass per 10⁶ cells', base: 'µg/10⁶ cells', units: Object.freeze({ 'µg/10⁶ cells': SAME }) }),
});
export const STAINING_VOLUME = Object.freeze({ base: 'µL', units: Object.freeze({ µL: SAME, mL: Object.freeze({ op: 'multiply', factor: 1000, exp: 3 }) }) });
export const CELL_NUMBER = Object.freeze({ base: 'cells', units: Object.freeze({ cells: SAME, '× 10⁶ cells': Object.freeze({ op: 'multiply', factor: 1e6, exp: 6 }) }) });
export function conversion(family, unit) {
    return Object.hasOwn(family.units, unit) ? family.units[unit] : null;
}
export function normalise(value, conv) {
    if (conv.op === 'divide')
        return value / conv.factor;
    if (conv.op === 'multiply')
        return value * conv.factor;
    return value;
}
export function normaliseExact(dec, conv) {
    return D.shift(dec, conv.exp);
}
export function orderByConcentration(points) {
    return [...points].sort((a, b) => (a.normalised - b.normalised) || (a.row < b.row ? -1 : a.row > b.row ? 1 : 0));
}
export function undecidedEqualities(points) {
    const pairs = [];
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const a = points[i], b = points[j];
            const undecided = a.unit !== b.unit
                ? a.normalised === b.normalised || D.eq(a.normalisedExact, b.normalisedExact)
                : !D.eq(a.dec, b.dec) && a.value === b.value;
            if (undecided)
                pairs.push([a.row, b.row].sort());
        }
    }
    return pairs;
}
