import { escapeHtml as esc } from '@ligant/bench-chrome';
import { TEXT, OUT } from './text.js';
import { tableHtml, flagsHtml, derivationHtml, notebookText } from './outputs.js';
import { chartHtml } from './chart.js';
import { INCOMPLETE_WORDS } from '../shared/result-object.js';
import { blockHtml, flagLines } from './block.js';
const list = (items) => `<ul>${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
function copiesHtml(record, typed) {
    const sep = record.declarations.entry.decimalSeparator;
    const csv = typed
        ? `<fieldset class="choice" data-group="csvDecimal"><legend>${esc(OUT.csvLegend)}</legend>${Object.entries(TEXT.separatorOptions).map(([v, l]) => `<label><input type="radio" name="csvDecimal" value="${esc(v)}"> ${esc(l)}</label>`).join('')}<p class="help">${esc(OUT.csvTypedHelp)}</p></fieldset>`
        : `<p class="help">${esc(OUT.csvPastedHelp(TEXT.separatorOptions[sep]))}</p>`;
    return `<div class="copies"><button type="button" id="copy-notebook">${esc(OUT.copyNotebook)}</button> <span id="copy-status" role="status" aria-live="polite"></span>`
        + `<details><summary>${esc(OUT.notebookShow)}</summary><textarea id="notebook-text" data-point="notebook" readonly rows="16" spellcheck="false">${esc(notebookText(record))}</textarea></details>`
        + `${csv}<button type="button" id="save-csv"${typed ? ' disabled' : ''}>${esc(OUT.csvButton)}</button> `
        + `<button type="button" id="save-json">${esc(OUT.jsonButton)}</button><p class="help">${esc(OUT.jsonHelp)}</p></div>`;
}
export function resultHtml({ record, missing, engineIncomplete, typed = false }) {
    if (missing.length || !record) {
        const words = [...missing, ...engineIncomplete.map((id) => INCOMPLETE_WORDS[id])];
        return `<div class="state state-incomplete" data-state="incomplete"><p>${esc(TEXT.waiting)}</p>${words.length ? `<p>${esc(TEXT.incompleteLead)}</p>${list(words)}` : ''}</div>`;
    }
    switch (record.status) {
        case 'incomplete': return `<div class="state state-incomplete" data-state="incomplete"><p>${esc(TEXT.waiting)}</p><p>${esc(TEXT.incompleteLead)}</p>${list(record.incomplete)}</div>`;
        case 'rejected': return `<div class="state state-rejected" data-state="rejected" role="alert"><p>${esc(TEXT.rejectedLead)}</p>${list(record.rejections.map((r) => r.message))}</div>`;
        case 'unsupported': return `<div class="state state-unsupported" data-state="unsupported" role="alert"><p>${esc(TEXT.unsupportedLead)}</p>${list(record.notSupported)}</div>`;
        case 'error': return `<div class="state state-error" data-state="error" role="alert"><p>${esc(TEXT.errorLead)}</p></div>`;
        default:
            return `<div id="kept-region" data-state="result"><div class="kept-block" id="bounded-block" aria-label="${esc(TEXT.blockLabel)}">${blockHtml(record)}</div>`
                + `<div id="outputs">`
                + `<section class="chart-section" aria-labelledby="chart-heading"><h3 id="chart-heading">${esc(OUT.chartHeading)}</h3>${chartHtml(record)}</section>`
                + tableHtml(record)
                + `<section class="subsection" aria-labelledby="flags-words"><h3 id="flags-words">${esc(OUT.flagsHeading)}</h3>${flagsHtml(record)}</section>`
                + `<section class="subsection" aria-labelledby="derivation-heading"><h3 id="derivation-heading">${esc(OUT.derivationHeading)}</h3>${derivationHtml(record)}</section>`
                + `<section class="subsection" aria-labelledby="copies-heading"><h3 id="copies-heading">${esc(OUT.copiesHeading)}</h3>${copiesHtml(record, typed)}</section>`
                + '</div><div id="keep-spacer" aria-hidden="true"></div></div>';
    }
}
export function summaryHtml(view) {
    const { record, missing } = view;
    if (missing.length || !record || record.status !== 'result') {
        return resultHtml(view).replace(/ data-state="[^"]*"/g, '').replace(/ role="alert"/g, '');
    }
    const flags = flagLines(record).map(([code, text]) => `<li>${code ? `<span class="code">${code}</span>` : ''}${esc(text)}</li>`).join('')
        || `<li class="none">${esc(TEXT.noFlags)}</li>`;
    return `<ul class="flag-summary summary-flags" aria-label="flags raised">${flags}</ul>`;
}
