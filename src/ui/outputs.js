import { escapeHtml as esc } from '@ligant/bench-chrome';
import { TEXT, OUT } from './text.js';
import { csv3 } from '../engine/display.js';
import { declarationItems } from './block.js';
export function cellText(v) {
    if (v.status === 'withheld')
        return `${OUT.withheld}: ${v.reasonsInWords.join('; ')}`;
    if (v.status === 'not-applicable')
        return OUT.notApplicable;
    return v.display;
}
export function columns(record) {
    const d = record.declarations;
    const cols = [
        ['concentration', OUT.col.concentration, (p) => `${p.concentration.entered.value.trim()} ${p.concentration.entered.unit}`],
        ['posCentral', `${OUT.col.posCentral} (${d.positiveCentral.text})`, (p) => p.statistics.positiveCentral.entered.trim()],
        ['negCentral', `${OUT.col.negCentral} (${d.negativeCentral.text})`, (p) => p.statistics.negativeCentral.entered.trim()],
        ['negSpread', `${OUT.col.negSpread} (${d.negativeSpread.text})`, (p) => p.statistics.negativeSpread.entered.trim()],
    ];
    if (d.positiveSpread.text)
        cols.push(['posSpread', `${OUT.col.posSpread} (${d.positiveSpread.text})`, (p) => (p.statistics.positiveSpread.entered ?? '').trim()]);
    cols.push(['posCount', OUT.col.posCount, (p) => p.statistics.positiveEvents.entered.trim()], ['negCount', OUT.col.negCount, (p) => p.statistics.negativeEvents.entered.trim()], ['stainIndex', `${OUT.col.stainIndex} ${record.definition.relation}`, (p) => cellText(p.stainIndex)], ['fractionOfMax', OUT.col.fractionOfMax, (p) => cellText(p.fractionOfMax)], ['positiveSignalChange', OUT.col.positiveSignalChange, (p) => cellText(p.positiveSignalChange)], ['negativeSignalChange', OUT.col.negativeSignalChange, (p) => cellText(p.negativeSignalChange)]);
    return cols;
}
const note = (record, p) => [
    record.maximum.rows.includes(p.row) ? OUT.maximumMark : null,
    record.workingPoint && record.workingPoint.row === p.row ? OUT.chosenMark : null,
].filter(Boolean);
export function tableHtml(record) {
    const cols = columns(record);
    const derived = new Set(['stainIndex', 'fractionOfMax', 'positiveSignalChange', 'negativeSignalChange']);
    return `<table class="points" id="points"><caption>${esc(OUT.tableCaption)}</caption><thead id="points-head"><tr>${cols.map(([, h]) => `<th scope="col">${esc(h)}</th>`).join('')}<th scope="col">${esc(OUT.col.flags)}</th></tr></thead><tbody id="points-body">`
        + record.points.map((p) => `<tr data-point="row-${esc(p.row)}"${note(record, p).length ? ' class="marked"' : ''}>`
            + cols.map(([k, , f], i) => {
                const v = derived.has(k) ? p[k] : null;
                const cls = v && v.status !== 'computed' ? ' class="withheld"' : '';
                const extra = i === 0 && note(record, p).length ? ` <span class="mark-note">(${esc(note(record, p).join(', '))})</span>` : '';
                return `<td${cls} data-col="${k}">${esc(f(p))}${extra}</td>`;
            }).join('')
            + `<td data-col="flags">${esc(p.flags.join(' '))}</td></tr>`).join('')
        + '</tbody></table>';
}
export function flagsHtml(record) {
    const parts = record.flags.map((f) => `<li class="flag-names-line"${f.rows.length ? ` data-point="names-${esc(f.code)}"` : ''}><span class="code">${esc(f.code)}</span>${esc(f.statement)}</li>`);
    if (record.maximum.status === 'withheld')
        parts.push(`<li class="flag-names-line">${esc(TEXT.maximumNotEvaluated)}.</li>`);
    return parts.length ? `<ul class="flag-statements">${parts.join('')}</ul>` : `<p>${esc(OUT.noFlags)}</p>`;
}
export function workingLine(record) {
    const wp = record.workingPoint;
    if (!wp)
        return `${OUT.workingLabel}: ${TEXT.noWorkingPoint}.`;
    return `${OUT.workingLabel}: ${wp.name}. ${OUT.col.stainIndex} ${cellText(wp.stainIndex)}; ${OUT.col.fractionOfMax.toLowerCase()} ${cellText(wp.fractionOfMax)}; ${OUT.col.positiveSignalChange.toLowerCase()} ${cellText(wp.positiveSignalChange)}; ${OUT.flagsAtPoint}: ${wp.flags.length ? wp.flags.join(', ') : OUT.none}; ${OUT.seriesFlags}: ${wp.seriesFlags.length ? wp.seriesFlags.join(', ') : OUT.none}.`;
}
export function derivationHtml(record) {
    const d = record.definition;
    const max = record.maximum.status === 'computed'
        ? `${OUT.maximumIs} ${record.points.filter((p) => record.maximum.rows.includes(p.row)).map((p) => p.name).join(', ')}.`
        : `${TEXT.maximumNotEvaluated}.`;
    const excluded = record.maximum.excluded.length ? ` ${OUT.excluded} ${record.points.filter((p) => record.maximum.excluded.includes(p.row)).map((p) => p.name).join(', ')}.` : '';
    return `<dl class="derivation">`
        + `<dt>${esc(OUT.relationsLabel)}</dt><dd><p class="formula">${esc(OUT.relationSI(d.relation))}</p>${OUT.relations.map((r) => `<p>${esc(r)}</p>`).join('')}</dd>`
        + `<dt>${esc(OUT.kLabel)}</dt><dd><p>${esc(OUT.kText(d.k, d.kSource))}</p><p>${esc(OUT.publishedForm)}: ${esc(d.publishedForm)}.</p><p>${esc(OUT.formUsed)}: ${esc(d.declaredForm)}.</p><p>${esc(d.comparability)}</p></dd>`
        + `<dt>${esc(OUT.declarationsLabel)}</dt><dd><ul>${declarationItems(record).map(([, k, v]) => `<li>${esc(k)}: ${esc(v)}</li>`).join('')}</ul></dd>`
        + `<dt>${esc(OUT.maximumLabel)}</dt><dd><p>${esc(max + excluded)}</p><p>${esc(record.maximum.note)}</p></dd>`
        + `<dt>${esc(OUT.workingLabel)}</dt><dd><p id="working-line"${record.workingPoint ? ' data-point="working-point"' : ''}>${esc(workingLine(record))}</p></dd>`
        + `<dt>${esc(OUT.precisionLabel)}</dt><dd><p>${esc(record.precision)}</p><p>${esc(record.statements.arbitraryUnits)}</p><p>${esc(OUT.engine(record.tool.engineVersion))}</p></dd>`
        + '</dl>';
}
export function notebookText(record) {
    const cols = columns(record);
    const lines = [];
    lines.push(`${OUT.notebookTitle}, engine ${record.tool.engineVersion}`);
    lines.push(record.statements.scope);
    lines.push('');
    lines.push(`${OUT.declarationsLabel}:`);
    for (const [, k, v] of declarationItems(record))
        lines.push(`  ${k}: ${v}`);
    lines.push('');
    lines.push(`${OUT.relationsLabel}: ${OUT.relationSI(record.definition.relation)}`);
    lines.push(`  ${OUT.kText(record.definition.k, record.definition.kSource)}`);
    lines.push(`  ${OUT.publishedForm}: ${record.definition.publishedForm}.`);
    lines.push(`  ${OUT.formUsed}: ${record.definition.declaredForm}.`);
    lines.push(`  ${record.definition.comparability}`);
    lines.push('');
    lines.push(`${OUT.pointsLabel} (${record.statements.arbitraryUnits.replace(/\.$/, '').toLowerCase()}):`);
    lines.push(['', ...cols.map(([, h]) => h), OUT.col.flags].slice(1).join('\t'));
    for (const p of record.points) {
        const cells = cols.map(([, , f]) => f(p));
        const n = note(record, p);
        if (n.length)
            cells[0] = `${cells[0]} (${n.join(', ')})`;
        lines.push([...cells, p.flags.join(' ')].join('\t'));
    }
    lines.push('');
    lines.push(record.maximum.status === 'computed'
        ? `${OUT.maximumIs} ${record.points.filter((p) => record.maximum.rows.includes(p.row)).map((p) => p.name).join(', ')}. ${record.maximum.note}`
        : `${TEXT.maximumNotEvaluated}.`);
    lines.push('');
    lines.push(`${OUT.flagsLabel}:`);
    if (!record.flags.length)
        lines.push(`  ${OUT.noFlags}`);
    for (const f of record.flags)
        lines.push(`  ${f.code}: ${f.statement}`);
    lines.push('');
    lines.push(workingLine(record));
    lines.push('');
    lines.push(record.precision);
    lines.push(record.statements.notADetermination);
    return lines.join('\n');
}
export const seriesFlagCodes = (record) => record.flags
    .filter((f) => f.rows.length === 0 && !(f.withheldBeyondEdge || []).length && !(f.pairs || []).length)
    .map((f) => f.code).sort();
export function csvText(record, decimal) {
    if (decimal !== '.' && decimal !== ',')
        throw new Error('csvText: a decimal convention must be declared');
    const field = decimal === ',' ? ';' : ',';
    const mark = (t) => (decimal === ',' ? t.replace(/(\d)\.(\d)/g, '$1,$2') : t.replace(/(\d),(\d)/g, '$1.$2'));
    const quote = (t) => (t.includes(field) || /["\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);
    const d = record.declarations;
    const spreadHeading = (base, decl) => (decl.value === 'robust-sd' && d.robustSdDefinition
        ? `${base} (${decl.text}, ${d.robustSdDefinition.value === 'not-known' ? OUT.definitionNotKnown : d.robustSdDefinition.text})`
        : `${base} (${decl.text})`);
    const derived = (v) => (v.status === 'computed' ? csv3(v.unrounded, decimal) : cellText(v));
    const cols = [
        [OUT.col.concentrationValue, (p) => mark(p.concentration.entered.value.trim())],
        [OUT.col.concentrationUnit, (p) => p.concentration.entered.unit],
        [`${OUT.col.posCentral} (${d.positiveCentral.text})`, (p) => mark(p.statistics.positiveCentral.entered.trim())],
        [`${OUT.col.negCentral} (${d.negativeCentral.text})`, (p) => mark(p.statistics.negativeCentral.entered.trim())],
        [spreadHeading(OUT.col.negSpread, d.negativeSpread), (p) => mark(p.statistics.negativeSpread.entered.trim())],
    ];
    if (d.positiveSpread.text)
        cols.push([spreadHeading(OUT.col.posSpread, d.positiveSpread), (p) => mark((p.statistics.positiveSpread.entered ?? '').trim())]);
    cols.push([OUT.col.posCount, (p) => mark(p.statistics.positiveEvents.entered.trim())], [OUT.col.negCount, (p) => mark(p.statistics.negativeEvents.entered.trim())], [`${OUT.col.stainIndex} ${record.definition.relation}`, (p) => derived(p.stainIndex)], [OUT.col.fractionOfMax, (p) => derived(p.fractionOfMax)], [OUT.col.positiveSignalChange, (p) => derived(p.positiveSignalChange)], [OUT.col.negativeSignalChange, (p) => (p.negativeSignalChange.status === 'computed' ? mark(p.negativeSignalChange.display) : cellText(p.negativeSignalChange))], [OUT.col.marked, (p) => [record.maximum.rows.includes(p.row) ? OUT.maximumMark : null, record.workingPoint && record.workingPoint.row === p.row ? OUT.workingMark : null].filter(Boolean).join('; ')], [OUT.col.flags, (p) => p.flags.join(' ')], [OUT.col.seriesFlags, () => seriesFlagCodes(record).join(' ')], [OUT.col.engine, () => record.tool.engineVersion]);
    const head = cols.map(([h]) => quote(h)).join(field);
    const rows = record.points.map((p) => cols.map(([, f]) => quote(f(p))).join(field));
    return `\uFEFF${[head, ...rows].join('\r\n')}\r\n`;
}
