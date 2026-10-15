import '@ligant/bench-chrome/chrome.css';
import { bindCopy, escapeHtml as esc } from '@ligant/bench-chrome';
import { renderHeader, renderFooter } from './chrome.js';
import { formHtml, gridRowHtml, mappingHtml, readForm, caseOf, MAPPED } from './form.js';
import { splitPaste } from './paste.js';
import { resultHtml, summaryHtml } from './render.js';
import { csvText } from './outputs.js';
import { aboutHtml } from './sections.js';
import { TEXT, OUT } from './text.js';
import { analyse } from '../shared/result-object.js';
import { incompleteDeclarations, positiveSpreadEntered } from '../engine/validate.js';
import { parseNumberText } from '../engine/parse.js';
const $ = (id) => document.getElementById(id);
const form = () => $('tool-form');
function previewHtml(state) {
    if (!state.separator || state.pasteText.trim() === '' || !state.headerRow)
        return '';
    const split = splitPaste(state.pasteText, state.headerRow);
    const first = split.rows[0];
    if (!first)
        return '';
    const read = (t) => {
        const r = parseNumberText(t, { separator: state.separator, typed: false });
        return r.status === 'number' ? String(r.value) : r.status === 'blank' ? '(blank)' : 'not read as a number';
    };
    return `<div class="preview"><h3>${esc(TEXT.previewHeading)}</h3><table><tr>${first.map((t) => `<td>${esc(t)}</td>`).join('')}</tr><tr>${first.map((t) => `<td class="read">${esc(read(t))}</td>`).join('')}</tr></table></div>`;
}
let lastPasteKey = null;
function syncPasteMapping(state) {
    const key = JSON.stringify([state.pasteText, state.headerRow, state.separator]);
    if (key === lastPasteKey)
        return;
    lastPasteKey = key;
    const box = $('paste-mapping');
    if (state.pasteText.trim() === '' || !state.headerRow) {
        box.innerHTML = previewHtml(state);
        return;
    }
    const split = splitPaste(state.pasteText, state.headerRow);
    const chosen = Object.fromEntries(MAPPED.map((k) => [k, state.mapping[k] !== null && (state.mapping[k] === 'none' || Number(state.mapping[k]) < split.columns) ? state.mapping[k] : null]));
    box.innerHTML = previewHtml(state) + mappingHtml(split, chosen);
}
function syncConditional(state, c, columnHeaders) {
    $('paste-area').hidden = state.entry !== 'pasted';
    $('grid-area').hidden = state.entry !== 'typed';
    const posEntered = positiveSpreadEntered(c);
    $('positive-spread-statistic').hidden = !posEntered;
    const robust = state.statistics.negativeSpread === 'robust-sd' || (posEntered && state.statistics.positiveSpread === 'robust-sd');
    $('robust-area').hidden = !robust;
    const COLUMN = { positiveCentral: 'posCentral', negativeCentral: 'negCentral', negativeSpread: 'negSpread', positiveSpread: 'posSpread' };
    for (const el of document.querySelectorAll('[data-header-for]')) {
        const h = columnHeaders ? columnHeaders[COLUMN[el.dataset.headerFor]] : null;
        el.textContent = h ? TEXT.headerShown(h) : '';
    }
    for (const k of ['stainingVolume', 'cellNumber']) {
        const unit = form().querySelector(`select[name="${k}Unit"]`);
        form().querySelector(`input[name="${k}Value"]`).disabled = unit.value === 'not-recorded';
    }
    const sel = form().querySelector('select[name="workingPoint"]');
    const keep = sel.value;
    const options = c.rows.filter((r) => String(r.concentration.value ?? '').trim() !== '').map((r) => [r.row, `${r.concentration.value.trim()} ${r.concentration.unit ?? ''}`.trim()]);
    sel.innerHTML = `<option value="">${esc(TEXT.workingNone)}</option>${options.map(([v, t]) => `<option value="${esc(v)}">${esc(`Row ${v}: ${t}`)}</option>`).join('')}`;
    sel.value = options.some(([v]) => v === keep) ? keep : '';
}
let current = null;
let lastResultHtml = null;
function save(text, name, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
function onResultClick(e) {
    if (!current || current.status !== 'result')
        return;
    if (e.target.id === 'copy-notebook') {
        const text = $('notebook-text').value;
        navigator.clipboard.writeText(text).then(() => { $('copy-status').textContent = OUT.copied; }, () => { $('copy-status').textContent = OUT.copyFailed; $('notebook-text').closest('details').open = true; });
    }
    if (e.target.id === 'save-csv') {
        const chosen = document.querySelector('input[name="csvDecimal"]:checked')?.value;
        const decimal = current.declarations.entry.value === 'pasted' ? current.declarations.entry.decimalSeparator : chosen;
        if (decimal)
            save(csvText(current, decimal), 'titration-analysis.csv', 'text/csv;charset=utf-8');
    }
    if (e.target.id === 'save-json')
        save(`${JSON.stringify(current, null, 2)}\n`, 'titration-analysis.json', 'application/json');
}
function onResultChange(e) {
    if (e.target.name === 'csvDecimal')
        $('save-csv').disabled = false;
}
export function update() {
    let state = readForm(form());
    if (state.entry === 'pasted') {
        syncPasteMapping(state);
        state = readForm(form());
    }
    let built = caseOf(state);
    syncConditional(state, built.case, built.columnHeaders);
    state = readForm(form());
    built = caseOf(state);
    const view = built.missing.length
        ? { record: null, missing: built.missing, engineIncomplete: incompleteDeclarations(built.case) }
        : { record: analyse(built.case).record, missing: [], engineIncomplete: [] };
    const html = resultHtml({ ...view, typed: built.case.entry === 'typed' });
    if (html !== lastResultHtml) {
        $('result').innerHTML = html;
        $('summary').innerHTML = summaryHtml(view);
        $('result-panel').hidden = !(view.record && view.record.status === 'result');
        lastResultHtml = html;
    }
    current = view.record;
    keepInView();
}
function keepInView() {
    const block = $('bounded-block');
    if (!block)
        return;
    const h = Math.ceil(block.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--block-h', `${h}px`);
    $('keep-spacer').style.height = `${h + 24}px`;
}
function addRow() {
    const body = $('grid-body');
    body.insertAdjacentHTML('beforeend', gridRowHtml(body.children.length));
}
function renumber() {
    [...$('grid-body').children].forEach((tr, i) => { tr.dataset.row = String(i + 1); tr.querySelector('.idx').textContent = String(i + 1); });
}
export function init() {
    $('site-header').innerHTML = renderHeader();
    const footer = $('site-footer');
    footer.innerHTML = renderFooter();
    bindCopy(footer);
    $('tool-form').innerHTML = formHtml();
    $('about').innerHTML = aboutHtml();
    for (let i = 0; i < 3; i++)
        addRow();
    form().addEventListener('input', update);
    form().addEventListener('change', update);
    form().addEventListener('click', (e) => {
        if (e.target.id === 'add-row') {
            addRow();
            update();
        }
        if (e.target.classList.contains('remove-row')) {
            e.target.closest('tr').remove();
            renumber();
            update();
        }
    });
    $('result').addEventListener('click', onResultClick);
    $('result').addEventListener('change', onResultChange);
    new ResizeObserver(keepInView).observe(document.body);
    update();
}
