import * as D from './decimal.js';
export const SEPARATORS = Object.freeze(['.', ',']);
export const SMALLEST_NORMAL = 2 ** -1022;
const MINUS = '−';
const OTHER_SEPARATOR = (separator) => new RegExp(`\\d${separator === '.' ? ',' : '\\.'}\\d`);
const GROUPING = /\d[ \u00a0\u202f']\d/;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const grammar = (separator) => new RegExp(`^([+\\-${MINUS}])?(\\d+)(?:${esc(separator)}(\\d+))?$`);
const exponent = (separator) => new RegExp(`^[+\\-${MINUS}]?\\d+(?:${esc(separator)}\\d+)?[eE][+\\-${MINUS}]?\\d+$`);
export function parseNumberText(text, { separator, typed }) {
    if (!SEPARATORS.includes(separator))
        throw new Error(`parseNumberText: no declared separator (${separator})`);
    if (typed && separator !== '.')
        throw new Error('parseNumberText: typed entry uses "." (Q-AB-09 default)');
    const t = String(text).trim();
    if (t === '')
        return { status: 'blank', text };
    const questions = [];
    if (!typed && GROUPING.test(t))
        questions.push('Q-AB-08');
    if (typed && t.includes(','))
        questions.push('Q-AB-09');
    if (exponent(separator).test(t))
        questions.push('Q-AB-10');
    if (!typed && OTHER_SEPARATOR(separator).test(t))
        return { status: 'invalid', text, questions };
    if (questions.length) {
        const stripped = typed ? t.replace(/,/g, '') : t.replace(/(?<=\d)[ \u00a0\u202f'](?=\d)/g, '');
        const wellFormed = grammar(separator).test(stripped) || exponent(separator).test(stripped);
        return wellFormed ? { status: 'unsupported', text, questions } : { status: 'invalid', text, questions };
    }
    const m = grammar(separator).exec(t);
    if (!m)
        return { status: 'invalid', text };
    const negative = m[1] === '-' || m[1] === MINUS;
    const frac = m[3] ?? '';
    const dec = D.fromString(`${negative ? '-' : ''}${m[2]}${frac ? `.${frac}` : ''}`);
    const value = D.toNumber(dec);
    const representable = Number.isFinite(value) && (D.isZero(dec) || Math.abs(value) >= SMALLEST_NORMAL);
    return { status: 'number', text, dec, value, decimals: frac.length, representable };
}
export function conventionOf(c) {
    if (c.entry === 'typed')
        return { separator: '.', typed: true };
    if (c.entry === 'pasted' && SEPARATORS.includes(c.decimalSeparator))
        return { separator: c.decimalSeparator, typed: false };
    return null;
}
export const ROW_COLUMNS = Object.freeze(['concentration', 'posCentral', 'negCentral', 'negSpread', 'posSpread', 'posCount', 'negCount']);
export const REQUIRED_COLUMNS = Object.freeze(ROW_COLUMNS.filter((k) => k !== 'posSpread'));
const rowText = (r, column) => (column === 'concentration' ? r.concentration?.value : r[column]);
export function parseCase(c) {
    const convention = conventionOf(c);
    if (!convention)
        return { declared: false };
    const read = (text) => (text === null || text === undefined ? { status: 'absent' } : parseNumberText(text, convention));
    const rows = c.rows.map((r) => ({
        row: r.row,
        unit: r.concentration?.unit ?? null,
        cells: Object.fromEntries(ROW_COLUMNS.map((k) => [k, read(rowText(r, k))])),
    }));
    const quantity = (q) => (q && typeof q === 'object' ? { unit: q.unit, cell: read(q.value) } : null);
    return { declared: true, convention, rows, stainingVolume: quantity(c.stainingVolume), cellNumber: quantity(c.cellNumber) };
}
export const COLUMN_LABELS = Object.freeze({
    concentration: 'concentration',
    posCentral: 'positive central value',
    negCentral: 'negative central value',
    negSpread: 'negative spread',
    posSpread: 'positive spread',
    posCount: 'positive event count',
    negCount: 'negative event count',
    stainingVolume: 'staining volume',
    cellNumber: 'cell number',
});
export const separatorName = (convention) => (convention.typed
    ? 'a full stop (.), the decimal separator for typed values'
    : convention.separator === ',' ? 'a comma (,), the declared decimal separator' : 'a full stop (.), the declared decimal separator');
export function unparseableMessage({ row, column, text }, convention) {
    const where = row === null || row === undefined ? `The ${COLUMN_LABELS[column]}` : `Row ${row}, ${COLUMN_LABELS[column]}:`;
    return `${where} "${text}" cannot be read as a number with ${separatorName(convention)}. A number here is digits with an optional sign and an optional decimal part.`;
}
