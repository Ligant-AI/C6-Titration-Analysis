import { parseCase, parseNumberText, ROW_COLUMNS, REQUIRED_COLUMNS, COLUMN_LABELS } from './parse.js';
import * as D from './decimal.js';
import { AXIS_FORMS, STAINING_VOLUME, CELL_NUMBER, conversion, normalise, normaliseExact, undecidedEqualities } from './units.js';
export const QUESTION_ORDER = Object.freeze(['Q-AB-06', 'Q-AB-07', 'Q-AB-08', 'Q-AB-09', 'Q-AB-10', 'Q-AB-15', 'Q-AB-17', 'Q-AB-18', 'Q-AB-23']);
export const hasUnit = (u) => typeof u === 'string' && u.trim() !== '';
const unitList = (family) => Object.keys(family.units).join(' or ');
const where = (row, column) => (row === null ? `The ${COLUMN_LABELS[column]}` : `Row ${row}, ${COLUMN_LABELS[column]}`);
const MESSAGES = {
    'Q-AB-06': ({ row, column, unit, family }) => `${where(row, column)}: the unit "${unit}" is not one this tool accepts. Enter it in ${unitList(family)}.`,
    'Q-AB-07': ({ rows }) => `Rows ${rows[0]} and ${rows[1]} have concentrations that are the same, or cannot be told apart, once converted to one unit. This tool does not decide whether they are one point or two. Enter both concentrations in the same unit and check that every point is a distinct concentration.`,
    'Q-AB-08': ({ row, column, text }) => `${where(row, column)}: "${text}" contains a space or an apostrophe between digits. This tool does not accept digit grouping. Remove it, so that the value is digits with only the declared decimal separator.`,
    'Q-AB-09': ({ row, column, text }) => `${where(row, column)}: "${text}" contains a comma. A typed value must use a full stop as the decimal separator. Type it with a full stop, or paste the table and declare a comma as its decimal separator.`,
    'Q-AB-10': ({ row, column, text }) => `${where(row, column)}: "${text}" is in exponent form, which this tool does not accept. Enter it as a plain decimal number. For example, enter 1200 for 1.2E3.`,
    'Q-AB-15': ({ text }) => `The minimum event count "${text}" is not a whole number of at least 1. Event counts are whole numbers, so the minimum is one too; and every population meets a minimum of zero or below, so it could never raise a flag. Enter a whole number of at least 1, or leave it empty for no minimum.`,
    'Q-AB-17': ({ row, reasons }) => `The working concentration is declared at row ${row}, whose stain index is withheld (${reasons.join('; ')}). A working concentration cannot be declared at a point whose stain index is withheld. Choose a point whose stain index is computed, or declare none.`,
    'Q-AB-18': ({ row, column }) => `${where(row, column)} is blank. This column cannot have blank cells. Enter a value in every row.`,
    'Q-AB-23': ({ entered, blank }) => `The positive spread is entered in ${entered} row${entered === 1 ? '' : 's'} and blank in ${blank}. The positive spread cannot be entered in only some rows. Enter it in every row, or leave the column empty in every row.`,
};
export function minEventsRefused(text) {
    if (text === null || text === undefined)
        return false;
    const r = parseNumberText(text, { separator: '.', typed: true });
    return !(r.status === 'number' && isWhole(r.dec) && D.cmp(r.dec, D.fromInt(1)) >= 0);
}
export function isWhole(dec) {
    return D.isZero(dec) || D.trimZeros(dec).exp >= 0;
}
export function screenUnsupported(c) {
    const p = parseCase(c);
    if (!p.declared)
        return { parsed: false, questions: [], messages: [] };
    const found = [];
    const add = (question, detail) => found.push({ question, text: MESSAGES[question](detail) });
    const axis = AXIS_FORMS[c.axisForm] ?? null;
    if (axis)
        for (const r of p.rows)
            if (hasUnit(r.unit) && !conversion(axis, r.unit))
                add('Q-AB-06', { row: r.row, column: 'concentration', unit: r.unit, family: axis });
    for (const [column, family] of [['stainingVolume', STAINING_VOLUME], ['cellNumber', CELL_NUMBER]]) {
        const q = p[column];
        if (q && hasUnit(q.unit) && !conversion(family, q.unit))
            add('Q-AB-06', { row: null, column, unit: q.unit, family });
    }
    if (axis) {
        const points = p.rows.filter((r) => r.cells.concentration.status === 'number' && conversion(axis, r.unit)).map((r) => {
            const conv = conversion(axis, r.unit);
            const cell = r.cells.concentration;
            return { row: r.row, unit: r.unit, dec: cell.dec, value: cell.value, normalised: normalise(cell.value, conv), normalisedExact: normaliseExact(cell.dec, conv) };
        });
        for (const rows of undecidedEqualities(points))
            add('Q-AB-07', { rows });
    }
    const cellForms = (row, column, cell) => {
        if (cell.status === 'unsupported' || (cell.status === 'invalid' && cell.questions?.length))
            for (const q of cell.questions)
                add(q, { row, column, text: cell.text });
    };
    for (const r of p.rows)
        for (const k of ROW_COLUMNS)
            cellForms(r.row, k, r.cells[k]);
    for (const column of ['stainingVolume', 'cellNumber'])
        if (p[column])
            cellForms(null, column, p[column].cell);
    if (minEventsRefused(c.minEvents))
        add('Q-AB-15', { text: c.minEvents });
    for (const r of p.rows)
        for (const k of REQUIRED_COLUMNS)
            if (['blank', 'absent'].includes(r.cells[k].status))
                add('Q-AB-18', { row: r.row, column: k });
    for (const column of ['stainingVolume', 'cellNumber'])
        if (p[column] && ['blank', 'absent'].includes(p[column].cell.status))
            add('Q-AB-18', { row: null, column });
    const filled = p.rows.filter((r) => !['blank', 'absent'].includes(r.cells.posSpread.status)).length;
    if (filled > 0 && filled < p.rows.length)
        add('Q-AB-23', { entered: filled, blank: p.rows.length - filled });
    if (found.length === 0 && c.workingPoint !== null && c.workingPoint !== undefined) {
        const wp = p.rows.find((r) => r.row === c.workingPoint);
        if (wp) {
            const zero = (k) => wp.cells[k].status === 'number' && wp.cells[k].value === 0;
            const reasons = [];
            if (zero('negSpread'))
                reasons.push('the negative spread is zero');
            if (zero('posCount'))
                reasons.push('the positive population has no events');
            if (zero('negCount'))
                reasons.push('the negative population has no events');
            if (reasons.length)
                add('Q-AB-17', { row: wp.row, reasons });
        }
    }
    const questions = QUESTION_ORDER.filter((q) => found.some((f) => f.question === q));
    const messages = questions.flatMap((q) => found.filter((f) => f.question === q));
    return { parsed: true, questions, messages };
}
