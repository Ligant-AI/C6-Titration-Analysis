import { escapeHtml as esc } from '@ligant/bench-chrome';
import { TEXT } from './text.js';
import { FLAG_LEGEND } from '../engine/flags.js';
export function declarationItems(record) {
    const d = record.declarations;
    const quantity = (q) => (q.answer ? q.answer : `${q.entered.value.trim()} ${q.entered.unit}`);
    const items = [
        ['axis', d.axisForm.label, d.axisForm.text],
        ['volume', d.stainingVolume.label, quantity(d.stainingVolume)],
        ['cells', d.cellNumber.label, quantity(d.cellNumber)],
        ['pos-central', d.positiveCentral.label, d.positiveCentral.text],
        ['neg-central', d.negativeCentral.label, d.negativeCentral.text],
        ['neg-spread', d.negativeSpread.label, d.negativeSpread.text],
        ['pos-spread', d.positiveSpread.label, d.positiveSpread.text || d.positiveSpread.answer],
    ];
    if (d.robustSdDefinition)
        items.push(['rsd-definition', d.robustSdDefinition.label, d.robustSdDefinition.text]);
    items.push(['entry', d.entry.label, d.entry.text], ['negative', d.negativeSource.label, d.negativeSource.text], ['stained', d.stainedAs.label, d.stainedAs.text], ['acquisition', d.acquisition.label, d.acquisition.text], ['matrix', d.matrix.label, d.matrix.text], ['min-events', d.minEvents.label, d.minEvents.answer || d.minEvents.entered.trim()], ['working-point', d.workingPoint.label, d.workingPoint.text || d.workingPoint.answer]);
    return items;
}
const plural = (n, [one, many]) => `${n} ${n === 1 ? one : many}`;
export function flagLines(record) {
    const lines = record.flags.map((f) => {
        let count = '';
        if (f.code === 'FL-05')
            count = plural(f.populations.length, TEXT.countWord.populations);
        else if (f.code === 'FL-06')
            count = plural(f.pairs.length, TEXT.countWord.pairs);
        else if (f.rows.length)
            count = plural(f.rows.length, TEXT.countWord.points);
        return [f.code, count ? `${FLAG_LEGEND[f.code].title}: ${count}` : FLAG_LEGEND[f.code].title];
    });
    if (record.maximum.status === 'withheld')
        lines.push([null, TEXT.maximumNotEvaluated]);
    return lines;
}
export function blockHtml(record) {
    const decls = declarationItems(record).map(([id, k, v]) => `<span class="decl" data-decl="${id}"><b>${esc(k)}</b>${esc(v)}</span>`).join('');
    const lines = flagLines(record);
    const flags = lines.length
        ? lines.map(([code, text], i) => `<li data-flag="${code || `statement-${i}`}">${code ? `<span class="code">${code}</span>` : ''}${esc(text)}</li>`).join('')
        : `<li class="none" data-flag="none">${esc(TEXT.noFlags)}</li>`;
    return `<div id="declarations" class="declarations">${decls}</div><ul id="flag-summary" class="flag-summary" aria-label="flags raised">${flags}</ul>`;
}
