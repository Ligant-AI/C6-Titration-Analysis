import { determine } from '../engine/determine.js';
import { flagStatement, shortCode, namesRow } from '../engine/flags.js';
import { K, REGISTER, ASSUMPTIONS } from '../engine/constants.js';
import { ENGINE_VERSION } from '../engine/version.js';
import { CONFIG } from '../config.js';
import { AXIS_FORMS, STAINING_VOLUME, CELL_NUMBER, conversion, normalise } from '../engine/units.js';
import { positiveSpreadEntered } from '../engine/validate.js';
import { parseCase } from '../engine/parse.js';
export const LABELS = Object.freeze({
    axisForm: { concentration: 'concentration in the staining volume', 'mass-per-test': 'mass per test', 'mass-per-1e6-cells': 'mass per 10⁶ cells' },
    statistic: { median: 'median', mean: 'mean', 'robust-sd': 'robust standard deviation', sd: 'standard deviation' },
    robustSdDefinition: { 'percentile-half-width': 'half the 15.87th-to-84.13th-percentile range', 'mad-1.4826': '1.4826 × the median absolute deviation', 'not-known': 'not known' },
    negativeSource: { internal: 'internal', 'external-per-point': 'external, one per point', 'external-shared': 'external, shared' },
    stainedAs: { alone: 'with this antibody alone', 'in-panel': 'in its panel', 'not-recorded': 'not recorded' },
    acquisition: { confirmed: 'confirmed', 'not-confirmed': 'not confirmed' },
    matrix: { cells: 'cells', 'capture-beads': 'capture beads', 'not-recorded': 'not recorded' },
    decimalSeparator: { '.': 'full stop (.)', ',': 'comma (,)' },
});
export const REASON_WORDS = Object.freeze({
    'zero-spread': 'the negative spread is zero',
    'zero-positive-events': 'the positive population has no events',
    'zero-negative-events': 'the negative population has no events',
    'point-withheld': 'this point\'s stain index is withheld',
    'no-computed-point': 'no point has a computed stain index',
    'non-positive-maximum': 'the greatest stain index is zero or negative',
    'zero-positive-events-this-point': 'the positive population has no events at this point',
    'zero-positive-events-next-lower': 'the positive population has no events at the next lower concentration',
    'non-positive-central': 'the positive central value here or at the next lower concentration is zero or negative, so the ratio cannot be read as a change in signal',
    'zero-negative-events-this-point': 'the negative population has no events at this point',
    'zero-negative-events-lowest-point': 'the negative population has no events at the lowest concentration',
});
export const SCHEMA = Object.freeze({ name: 'ligant-benchtools-c6-titration-analysis', version: '1.0.0' });
export const INCOMPLETE_WORDS = Object.freeze({
    'C6-SR-01': 'the unit of every concentration',
    'C6-SR-02': 'the series axis form',
    'C6-SR-03': 'the staining volume and cell number per test, with units, or "not recorded"',
    'C6-DA-02': 'which statistic each column is',
    'C6-DA-02/positive-spread': 'which statistic the positive spread is',
    'C6-DA-02/robust-sd-definition': 'the robust standard deviation\'s definition, or "not known"',
    'C6-DA-05': 'the decimal separator of the pasted table',
    'C6-NG-01': 'where the negative population came from',
    'C6-AC-01': 'whether the series was stained alone or in its panel, or "not recorded"',
    'C6-AC-02': 'whether every point was acquired in one session at identical settings, or "not confirmed"',
    'C6-AC-03': 'the matrix, or "not recorded"',
});
const STATEMENTS = Object.freeze({
    scope: CONFIG.disclaimer,
    notADetermination: 'This tool does not determine saturation and does not choose the working concentration. The positive-signal change is evidence a scientist reads; the working concentration is a recorded choice.',
    arbitraryUnits: 'Population statistics are in the cytometer\'s arbitrary fluorescence units.',
});
const PUBLISHED_FORM = 'the mean, or the median, of each population, with the standard deviation of the negative population, and k = 2';
const COMPARABILITY = 'Stain indices are comparable only between analyses computed under the same statistics and, for a robust standard deviation, the same definition.';
const MAXIMUM_NOTE = 'The maximum is identified on unrounded values, without regard to measurement uncertainty, which single-point statistics cannot show.';
const PRECISION = 'The stain index, the fraction of maximum and the positive-signal change are shown to 3 significant figures, as a number times a power of ten where the value rounded to 3 significant figures is 1000 or more or below 0.001; the negative-signal change to the decimal places of the less precise of its two entered values, with no minus sign on a value that rounds to zero. Every value is rounded once, half away from zero: the negative-signal change from the exact decimal difference of its two entered values, every other value from its unrounded value. This record carries both.';
const quantity = (q, parsed, family) => {
    if (q === 'not-recorded')
        return { answer: 'not recorded' };
    return { entered: { value: q.value, unit: q.unit }, unrounded: normalise(parsed.cell.value, conversion(family, q.unit)), unit: family.base };
};
export function analyse(c) {
    const result = determine(c);
    const head = { schema: { ...SCHEMA }, tool: { id: CONFIG.toolId, name: CONFIG.toolTitle, engineVersion: ENGINE_VERSION }, status: result.status, statements: STATEMENTS };
    if (result.status === 'error')
        return { result, record: { ...head, message: 'The analysis could not be run on this input.' } };
    if (result.status === 'incomplete')
        return { result, record: { ...head, incomplete: result.incomplete.map((id) => INCOMPLETE_WORDS[id]) } };
    if (result.status === 'rejected')
        return { result, record: { ...head, rejections: result.rejections.map(({ rows, message }) => ({ rows, message })) } };
    if (result.status === 'unsupported')
        return { result, record: { ...head, notSupported: result.messages } };
    const s = c.statistics;
    const parsed = parseCase(c);
    const byRow = new Map(c.rows.map((r) => [r.row, r]));
    const cellsByRow = new Map(parsed.rows.map((r) => [r.row, r.cells]));
    const cells = (row) => cellsByRow.get(row);
    const name = (row) => { const r = byRow.get(row); return `${r.concentration.value.trim()} ${r.concentration.unit}`; };
    const posEntered = positiveSpreadEntered(c);
    const robust = s.negativeSpread === 'robust-sd' || (posEntered && s.positiveSpread === 'robust-sd');
    const declaredForm = `the ${LABELS.statistic[s.positiveCentral]} of each population, with the ${LABELS.statistic[s.negativeSpread]} of the negative population${s.negativeSpread === 'robust-sd' ? ` (${LABELS.robustSdDefinition[c.robustSdDefinition]})` : ''}, and k = ${K}`;
    const declarations = {
        axisForm: { label: 'Series axis', value: c.axisForm, text: LABELS.axisForm[c.axisForm] },
        stainingVolume: { label: 'Staining volume', ...quantity(c.stainingVolume, parsed.stainingVolume, STAINING_VOLUME) },
        cellNumber: { label: 'Cells per test', ...quantity(c.cellNumber, parsed.cellNumber, CELL_NUMBER) },
        positiveCentral: { label: 'Positive central value', value: s.positiveCentral, text: LABELS.statistic[s.positiveCentral] },
        negativeCentral: { label: 'Negative central value', value: s.negativeCentral, text: LABELS.statistic[s.negativeCentral] },
        negativeSpread: { label: 'Negative spread', value: s.negativeSpread, text: LABELS.statistic[s.negativeSpread] },
        positiveSpread: posEntered ? { label: 'Positive spread', value: s.positiveSpread, text: LABELS.statistic[s.positiveSpread] } : { label: 'Positive spread', answer: 'not entered' },
        robustSdDefinition: robust ? { label: 'Robust SD definition', value: c.robustSdDefinition, text: LABELS.robustSdDefinition[c.robustSdDefinition] } : null,
        entry: c.entry === 'pasted'
            ? { label: 'Data', value: 'pasted', decimalSeparator: c.decimalSeparator, text: `pasted, decimal separator ${LABELS.decimalSeparator[c.decimalSeparator]}` }
            : { label: 'Data', value: 'typed', text: 'typed, decimal separator full stop (.)' },
        negativeSource: { label: 'Negative population', value: c.negativeSource, text: LABELS.negativeSource[c.negativeSource] },
        stainedAs: { label: 'Stained', value: c.stainedAs, text: LABELS.stainedAs[c.stainedAs] },
        acquisition: { label: 'One session, identical settings', value: c.acquisition, text: LABELS.acquisition[c.acquisition] },
        matrix: { label: 'Matrix', value: c.matrix, text: LABELS.matrix[c.matrix] },
        minEvents: c.minEvents === null || c.minEvents === undefined ? { label: 'Minimum events', answer: 'no minimum declared' } : { label: 'Minimum events', entered: c.minEvents },
        workingPoint: c.workingPoint ? { label: 'Working concentration', row: c.workingPoint, text: name(c.workingPoint) } : { label: 'Working concentration', answer: 'none declared' },
    };
    const flags = result.flags.map((f) => {
        const { code, ...rest } = f;
        return { code: shortCode(code), ...rest, statement: flagStatement(f, name) };
    });
    const namesPoint = namesRow;
    const words = (v) => ({ ...v, reasonsInWords: v.reasons.map((r) => REASON_WORDS[r]) });
    const axis = AXIS_FORMS[c.axisForm];
    const points = result.points.map((p) => {
        const r = byRow.get(p.row);
        return {
            row: p.row,
            name: name(p.row),
            concentration: { entered: { value: r.concentration.value, unit: r.concentration.unit }, unrounded: p.concentration.unrounded, unit: axis.base },
            statistics: {
                unit: 'arbitrary units',
                positiveCentral: { entered: r.posCentral, unrounded: cells(p.row).posCentral.value, identity: s.positiveCentral },
                negativeCentral: { entered: r.negCentral, unrounded: cells(p.row).negCentral.value, identity: s.negativeCentral },
                negativeSpread: { entered: r.negSpread, unrounded: cells(p.row).negSpread.value, identity: s.negativeSpread },
                positiveSpread: posEntered ? { entered: r.posSpread, unrounded: cells(p.row).posSpread.value ?? null, identity: s.positiveSpread } : null,
                positiveEvents: { entered: r.posCount, unrounded: cells(p.row).posCount.value },
                negativeEvents: { entered: r.negCount, unrounded: cells(p.row).negCount.value },
            },
            stainIndex: words(p.stainIndex),
            fractionOfMax: words(p.fractionOfMax),
            positiveSignalChange: words(p.positiveSignalChange),
            negativeSignalChange: words(p.negativeSignalChange),
            flags: flags.filter((f) => namesPoint(f, p.row)).map((f) => f.code),
        };
    });
    const wp = c.workingPoint ? points.find((p) => p.row === c.workingPoint) : null;
    const record = {
        ...head,
        definition: {
            relation: '(positive − negative) ÷ (2 × negative spread)',
            k: K,
            kSource: 'Maecker HT, Frey T, Nomura LE, Trotter J. Selecting fluorochrome conjugates for maximum sensitivity. Cytometry A 2004;62A(2):169–173. doi:10.1002/cyto.a.20092',
            publishedForm: PUBLISHED_FORM,
            declaredForm,
            comparability: COMPARABILITY,
        },
        declarations,
        precision: PRECISION,
        points,
        maximum: { ...result.maximum, note: MAXIMUM_NOTE },
        flags,
        workingPoint: wp ? { row: wp.row, name: wp.name, stainIndex: wp.stainIndex, fractionOfMax: wp.fractionOfMax, positiveSignalChange: wp.positiveSignalChange, flags: result.workingPoint.flags.map(shortCode), seriesFlags: result.workingPoint.seriesFlags.map(shortCode) } : null,
        register: REGISTER,
        assumptions: ASSUMPTIONS,
    };
    return { result, record };
}
const STATUSES = ['result', 'incomplete', 'rejected', 'unsupported', 'error'];
const REGISTER_STATUSES = ['derived', 'measured', 'characterised', 'disclosed'];
const ID_PATTERN = /\bC6-(SR|DA|NG|AC|MT|WP|UN|DT|IV|HI|FL|FC|FX|CN|ST|OUT|NF)-\d+|\bQ-(AB|NA|AD)-\d+|\bFX-\d+|\bNAD-\d{4}/;
const str = (x) => typeof x === 'string' && x.length > 0;
const finite = (x) => typeof x === 'number' && Number.isFinite(x);
function checkDerived(v, where, need, { notApplicable = false } = {}) {
    need(v && ['computed', 'withheld', 'not-applicable'].includes(v.status), `${where}: status`);
    if (!v)
        return;
    if (v.status === 'computed')
        need(finite(v.unrounded) && str(v.display) && Array.isArray(v.reasons) && v.reasons.length === 0, `${where}: computed value with its unrounded value and display`);
    if (v.status === 'withheld')
        need(v.unrounded === null && v.display === null && v.reasons.length > 0 && v.reasonsInWords.length === v.reasons.length && v.reasonsInWords.every(str), `${where}: withheld, with its reasons in words and no value`);
    if (v.status === 'not-applicable')
        need(notApplicable, `${where}: not-applicable only at the lowest concentration`);
}
export function validateRecord(r) {
    const p = [];
    const need = (cond, msg) => { if (!cond)
        p.push(msg); };
    need(r && typeof r === 'object', 'not an object');
    if (!r || typeof r !== 'object')
        return p;
    need(r.schema && r.schema.name === SCHEMA.name && r.schema.version === SCHEMA.version, 'schema name and version');
    need(r.tool && r.tool.id === 'C6' && /^\d+\.\d+\.\d+$/.test(r.tool.engineVersion || ''), 'tool and engine version');
    need(STATUSES.includes(r.status), `status ${r.status}`);
    need(r.statements && /GxP/.test(r.statements.scope || '') && /does not determine saturation/.test(r.statements.notADetermination || '') && /arbitrary/.test(r.statements.arbitraryUnits || ''), 'statements: scope, not a saturation determination, arbitrary units');
    need(!ID_PATTERN.test(JSON.stringify(r)), 'no requirement or question identifier anywhere in the object');
    if (r.status === 'error') {
        need(str(r.message), 'error message');
        return p;
    }
    if (r.status === 'incomplete') {
        need(Array.isArray(r.incomplete) && r.incomplete.length > 0 && r.incomplete.every(str), 'the missing declarations, in words');
        return p;
    }
    if (r.status === 'rejected') {
        need(Array.isArray(r.rejections) && r.rejections.length > 0 && r.rejections.every((x) => Array.isArray(x.rows) && str(x.message) && !('code' in x)), 'rejections: rows and a plain message, no code');
        return p;
    }
    if (r.status === 'unsupported') {
        need(Array.isArray(r.notSupported) && r.notSupported.length > 0 && r.notSupported.every(str), 'what is not supported, in words');
        return p;
    }
    const d = r.definition || {};
    need(d.k === 2 && str(d.relation) && str(d.kSource) && str(d.publishedForm) && str(d.declaredForm) && str(d.comparability), 'definition: relation, k with its source, published and declared forms, comparability');
    const dec = r.declarations || {};
    for (const k of ['axisForm', 'stainingVolume', 'cellNumber', 'positiveCentral', 'negativeCentral', 'negativeSpread', 'positiveSpread', 'entry', 'negativeSource', 'stainedAs', 'acquisition', 'matrix', 'minEvents', 'workingPoint'])
        need(dec[k] && str(dec[k].label), `declaration ${k} with its short label`);
    const robust = dec.negativeSpread?.value === 'robust-sd' || dec.positiveSpread?.value === 'robust-sd';
    need(robust ? dec.robustSdDefinition && str(dec.robustSdDefinition.text) : dec.robustSdDefinition === null, 'the robust-SD definition, exactly where a robust SD is declared');
    need(str(r.precision), 'displayed precision stated');
    need(Array.isArray(r.points) && r.points.length >= 3, 'points');
    const flagCodes = new Set((r.flags || []).map((f) => f.code));
    (r.points || []).forEach((pt, i) => {
        const w = `point ${pt.row}`;
        need(str(pt.row) && str(pt.name), `${w}: key and name`);
        need(pt.concentration && pt.concentration.entered && str(pt.concentration.entered.value) && str(pt.concentration.entered.unit) && finite(pt.concentration.unrounded) && str(pt.concentration.unit), `${w}: concentration entered, unrounded and unit`);
        const st = pt.statistics || {};
        need(st.unit === 'arbitrary units' && ['positiveCentral', 'negativeCentral', 'negativeSpread'].every((k) => st[k] && typeof st[k].entered === 'string' && str(st[k].identity)) && st.positiveEvents && st.negativeEvents, `${w}: statistics as entered with their identities`);
        checkDerived(pt.stainIndex, `${w} stain index`, need);
        checkDerived(pt.fractionOfMax, `${w} fraction of maximum`, need);
        checkDerived(pt.positiveSignalChange, `${w} positive-signal change`, need, { notApplicable: i === 0 });
        const n = pt.negativeSignalChange;
        need(n && ['computed', 'withheld'].includes(n.status), `${w} negative-signal change: status`);
        if (n?.status === 'computed')
            need(finite(n.unrounded) && /^-?\d+(\.\d+)?$/.test(n.exact || '') && Number.isInteger(n.decimals) && str(n.display), `${w} negative-signal change: unrounded, exact decimal difference, decimals, display`);
        if (n?.status === 'withheld')
            need(n.unrounded === null && n.exact === null && n.display === null && n.reasons.length > 0, `${w} negative-signal change: withheld with reasons`);
        need(Array.isArray(pt.flags) && pt.flags.every((c) => flagCodes.has(c)), `${w}: point-level flag codes`);
    });
    for (const f of r.flags || [])
        need(/^FL-\d\d$/.test(f.code) && str(f.statement) && Array.isArray(f.rows), `flag ${f.code}: FL-nn code, rows and words`);
    need(r.maximum && ['computed', 'withheld'].includes(r.maximum.status) && Array.isArray(r.maximum.rows) && str(r.maximum.note), 'maximum, with the uncertainty statement');
    need(r.workingPoint === null || (r.workingPoint && str(r.workingPoint.row) && r.workingPoint.stainIndex && r.workingPoint.fractionOfMax && r.workingPoint.positiveSignalChange && Array.isArray(r.workingPoint.flags)), 'working point with its evidence');
    need(Array.isArray(r.register) && r.register.length > 0 && r.register.every((x) => str(x.item) && str(x.value) && str(x.scope) && str(x.basis) && REGISTER_STATUSES.includes(x.status)), 'register: item, value, scope, basis and one status');
    need(Array.isArray(r.assumptions) && r.assumptions.length > 0, 'assumptions');
    return p;
}
