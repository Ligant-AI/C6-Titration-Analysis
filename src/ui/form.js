import { escapeHtml as esc } from '@ligant/bench-chrome';
import { TEXT } from './text.js';
import { splitPaste, columnLabel } from './paste.js';
import { AXIS_FORMS, STAINING_VOLUME, CELL_NUMBER } from '../engine/units.js';
export const GRID_COLUMNS = ['posCentral', 'negCentral', 'negSpread', 'posSpread', 'posCount', 'negCount'];
export const MAPPED = ['concentration', ...GRID_COLUMNS];
const CONC_UNITS = [...new Set(Object.values(AXIS_FORMS).flatMap((a) => Object.keys(a.units)))];
const radios = (name, options, legend, help = '') => `<fieldset class="choice" data-group="${name}"><legend>${esc(legend)}</legend>`
    + Object.entries(options).map(([v, label]) => `<label><input type="radio" name="${name}" value="${esc(v)}"> ${esc(label)}</label>`).join('')
    + (help ? `<p class="help">${esc(help)}</p>` : '') + '</fieldset>';
const select = (name, options, label, attrs = '') => `<label class="field"><span>${esc(label)}</span><select name="${name}" ${attrs}><option value="">${esc(TEXT.choose)}</option>`
    + Object.entries(options).map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('') + '</select></label>';
const quantityField = (name, label, family) => `<div class="field quantity" data-group="${name}"><span>${esc(label)}</span>`
    + `<input type="text" name="${name}Value" inputmode="decimal" autocomplete="off" aria-label="${esc(label)}">`
    + `<select name="${name}Unit" aria-label="${esc(label)}: unit"><option value="">${esc(TEXT.choose)}</option>${Object.keys(family.units).map((u) => `<option value="${esc(u)}">${esc(u)}</option>`).join('')}<option value="not-recorded">${esc(TEXT.notRecorded)}</option></select></div>`;
const statistic = (name, options) => `<div class="statistic" data-statistic="${name}">${select(`stat-${name}`, options, TEXT.statisticLabels[name])}<span class="header-shown" data-header-for="${name}"></span></div>`;
export function formHtml() {
    return `<section class="panel" aria-labelledby="entry-heading"><div class="panel-head"><div class="titles"><span class="step">1</span><h2 id="entry-heading">${esc(TEXT.entryHeading)}</h2></div></div><div class="panel-body stack">`
        + radios('entry', TEXT.entryOptions, TEXT.entryLegend)
        + `<div id="paste-area" class="stack" hidden>`
        + `<label class="field wide"><span>${esc(TEXT.pasteLabel)}</span><textarea name="pasteText" rows="7" spellcheck="false" autocomplete="off"></textarea></label>`
        + radios('separator', TEXT.separatorOptions, TEXT.separatorLegend, TEXT.separatorHelp)
        + radios('headerRow', TEXT.headerRowOptions, TEXT.headerRowLegend)
        + '<div id="paste-mapping"></div>'
        + `<label class="field"><span>${esc(TEXT.pasteUnitLabel)}</span><select name="pasteUnit"><option value="">${esc(TEXT.choose)}</option>${CONC_UNITS.map((u) => `<option value="${esc(u)}">${esc(u)}</option>`).join('')}</select></label>`
        + '</div>'
        + `<div id="grid-area" hidden><h3>${esc(TEXT.gridHeading)}</h3><div class="grid-frame"><table class="grid"><thead><tr><th>#</th><th>${esc(TEXT.columns.concentration)}</th><th>${esc(TEXT.columns.unit)}</th>${GRID_COLUMNS.map((k) => `<th>${esc(TEXT.columns[k])}</th>`).join('')}<th></th></tr></thead><tbody id="grid-body"></tbody></table>`
        + `<div class="table-foot"><button type="button" id="add-row" class="add">${esc(TEXT.addRow)}</button></div></div></div>`
        + '</div></section>'
        + `<section class="panel" aria-labelledby="decl-heading"><div class="panel-head"><div class="titles"><span class="step">2</span><h2 id="decl-heading">${esc(TEXT.declarationsHeading)}</h2></div></div><div class="panel-body stack">`
        + radios('axisForm', TEXT.axisOptions, TEXT.axisLegend)
        + `<div class="quantities">${quantityField('stainingVolume', TEXT.stainingVolumeLabel, STAINING_VOLUME)}${quantityField('cellNumber', TEXT.cellNumberLabel, CELL_NUMBER)}</div>`
        + `<fieldset class="statistics"><legend>${esc(TEXT.statisticsLegend)}</legend>`
        + statistic('positiveCentral', TEXT.centralOptions) + statistic('negativeCentral', TEXT.centralOptions) + statistic('negativeSpread', TEXT.spreadOptions)
        + `<div id="positive-spread-statistic" hidden>${statistic('positiveSpread', TEXT.spreadOptions)}</div>`
        + `<p class="help">${esc(TEXT.statisticHelp)}</p></fieldset>`
        + `<div id="robust-area" hidden>${radios('robustSdDefinition', TEXT.robustOptions, TEXT.robustLegend, TEXT.robustHelp)}</div>`
        + radios('negativeSource', TEXT.negativeOptions, TEXT.negativeLegend, TEXT.negativeHelp)
        + radios('stainedAs', TEXT.stainedOptions, TEXT.stainedLegend, TEXT.stainedHelp)
        + radios('matrix', TEXT.matrixOptions, TEXT.matrixLegend)
        + radios('acquisition', TEXT.acquisitionOptions, TEXT.acquisitionLegend, TEXT.acquisitionHelp)
        + `<label class="field"><span>${esc(TEXT.minEventsLabel)}</span><input type="text" name="minEvents" inputmode="numeric" autocomplete="off"></label><p class="help">${esc(TEXT.minEventsHelp)}</p>`
        + `<label class="field"><span>${esc(TEXT.workingLegend)}</span><select name="workingPoint"><option value="">${esc(TEXT.workingNone)}</option></select></label><p class="help">${esc(TEXT.workingHelp)}</p>`
        + '</div></section>';
}
export function gridRowHtml(i) {
    return `<tr data-row="${i + 1}"><td class="idx">${i + 1}</td>`
        + `<td><input type="text" data-cell="concentration" inputmode="decimal" autocomplete="off" aria-label="Row ${i + 1} ${esc(TEXT.columns.concentration)}"></td>`
        + `<td><select data-cell="unit" aria-label="Row ${i + 1} ${esc(TEXT.columns.unit)}"><option value="">${esc(TEXT.choose)}</option>${CONC_UNITS.map((u) => `<option value="${esc(u)}">${esc(u)}</option>`).join('')}</select></td>`
        + GRID_COLUMNS.map((k) => `<td><input type="text" data-cell="${k}" inputmode="decimal" autocomplete="off" aria-label="Row ${i + 1} ${esc(TEXT.columns[k])}"></td>`).join('')
        + `<td><button type="button" class="remove-row">${esc(TEXT.removeRow)}</button></td></tr>`;
}
export function mappingHtml(split, chosen) {
    const opts = (k) => {
        const none = k === 'posSpread' ? `<option value="none"${chosen[k] === 'none' ? ' selected' : ''}>${esc(TEXT.mappingNone)}</option>` : '';
        return `<option value="">${esc(TEXT.choose)}</option>${none}${Array.from({ length: split.columns }, (_, i) => `<option value="${i}"${String(chosen[k]) === String(i) ? ' selected' : ''}>${esc(columnLabel(split, i))}</option>`).join('')}`;
    };
    return `<h3>${esc(TEXT.mappingHeading)}</h3><p class="help">${esc(TEXT.mappingHelp)}</p><div class="mapping">`
        + MAPPED.map((k) => `<label class="field"><span>${esc(TEXT.columns[k])}</span><select data-map="${k}">${opts(k)}</select></label>`).join('')
        + '</div>';
}
const val = (root, sel) => root.querySelector(sel)?.value ?? '';
const radio = (root, name) => root.querySelector(`input[name="${name}"]:checked`)?.value ?? null;
const orNull = (v) => (v === '' ? null : v);
export function readForm(root) {
    const mapping = Object.fromEntries(MAPPED.map((k) => [k, orNull(val(root, `[data-map="${k}"]`))]));
    const grid = [...root.querySelectorAll('#grid-body tr')].map((tr) => Object.fromEntries(['concentration', 'unit', ...GRID_COLUMNS].map((k) => [k, tr.querySelector(`[data-cell="${k}"]`).value])));
    return {
        entry: radio(root, 'entry'),
        pasteText: val(root, 'textarea[name="pasteText"]'),
        separator: radio(root, 'separator'),
        headerRow: radio(root, 'headerRow'),
        mapping,
        pasteUnit: orNull(val(root, 'select[name="pasteUnit"]')),
        grid,
        axisForm: radio(root, 'axisForm'),
        stainingVolume: { value: val(root, 'input[name="stainingVolumeValue"]'), unit: val(root, 'select[name="stainingVolumeUnit"]') },
        cellNumber: { value: val(root, 'input[name="cellNumberValue"]'), unit: val(root, 'select[name="cellNumberUnit"]') },
        statistics: Object.fromEntries(['positiveCentral', 'negativeCentral', 'negativeSpread', 'positiveSpread'].map((k) => [k, orNull(val(root, `select[name="stat-${k}"]`))])),
        robustSdDefinition: radio(root, 'robustSdDefinition'),
        negativeSource: radio(root, 'negativeSource'),
        stainedAs: radio(root, 'stainedAs'),
        matrix: radio(root, 'matrix'),
        acquisition: radio(root, 'acquisition'),
        minEvents: orNull(val(root, 'input[name="minEvents"]')),
        workingPoint: orNull(val(root, 'select[name="workingPoint"]')),
    };
}
const quantity = (q) => (q.unit === 'not-recorded' ? 'not-recorded' : q.unit === '' && q.value.trim() === '' ? null : { value: q.value, unit: orNull(q.unit) });
const isEmptyRow = (r) => Object.values(r).every((v) => String(v).trim() === '');
export function caseOf(state) {
    const missing = [];
    let rows = [];
    let headers = null;
    if (state.entry === 'typed') {
        rows = state.grid.filter((r) => !isEmptyRow(r)).map((r, i) => ({
            row: String(i + 1),
            concentration: { value: r.concentration, unit: orNull(r.unit) },
            posCentral: r.posCentral, negCentral: r.negCentral, negSpread: r.negSpread,
            posSpread: r.posSpread.trim() === '' ? null : r.posSpread,
            posCount: r.posCount, negCount: r.negCount,
        }));
    }
    else if (state.entry === 'pasted') {
        if (!state.headerRow)
            missing.push('whether the first pasted row holds column headings');
        const split = splitPaste(state.pasteText, state.headerRow);
        if (state.pasteText.trim() === '')
            missing.push('the pasted table');
        const unmapped = MAPPED.filter((k) => state.mapping[k] === null).map((k) => TEXT.columns[k].replace(' (optional)', '').toLowerCase());
        if (unmapped.length)
            missing.push(`which column holds: ${unmapped.join(', ')}`);
        if (!state.pasteUnit)
            missing.push('the unit of the pasted concentrations');
        if (state.headerRow && !missing.length) {
            headers = split.headers;
            const cell = (r, k) => (state.mapping[k] === 'none' ? null : (r[Number(state.mapping[k])] ?? ''));
            rows = split.rows.map((r, i) => ({
                row: String(i + 1),
                concentration: { value: cell(r, 'concentration'), unit: state.pasteUnit },
                posCentral: cell(r, 'posCentral'), negCentral: cell(r, 'negCentral'), negSpread: cell(r, 'negSpread'),
                posSpread: cell(r, 'posSpread'), posCount: cell(r, 'posCount'), negCount: cell(r, 'negCount'),
            }));
        }
    }
    else {
        missing.push('how you will enter the data');
    }
    const header = (k) => (headers && state.mapping[k] !== null && state.mapping[k] !== 'none' ? (headers[Number(state.mapping[k])] ?? '').trim() || null : null);
    const columnHeaders = headers ? { posCentral: header('posCentral'), negCentral: header('negCentral'), negSpread: header('negSpread'), posSpread: header('posSpread') } : null;
    const c = {
        id: 'page',
        entry: state.entry ?? 'typed',
        decimalSeparator: state.entry === 'pasted' ? state.separator : null,
        axisForm: state.axisForm,
        stainingVolume: quantity(state.stainingVolume),
        cellNumber: quantity(state.cellNumber),
        statistics: state.statistics,
        robustSdDefinition: state.robustSdDefinition,
        negativeSource: state.negativeSource,
        stainedAs: state.stainedAs,
        acquisition: state.acquisition,
        matrix: state.matrix,
        minEvents: state.minEvents,
        workingPoint: rows.some((r) => r.row === state.workingPoint) ? state.workingPoint : null,
        columnHeaders,
        rows,
    };
    return { case: c, missing, columnHeaders };
}
