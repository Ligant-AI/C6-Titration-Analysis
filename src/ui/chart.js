import { escapeHtml as esc } from '@ligant/bench-chrome';
import { OUT } from './text.js';
import { cellText } from './outputs.js';
import * as D from '../engine/decimal.js';
const W = 1060;
const L = 78;
const R = 30;
const MARK = 4.5;
const BIG = 7.5;
function tickLabel(m, d) {
    if (d >= 0)
        return `${m}${'0'.repeat(d)}`;
    return `0.${'0'.repeat(-d - 1)}${m}`;
}
function logTicks(lo, hi) {
    const all = [];
    for (let d = Math.floor(lo) - 1; d <= Math.ceil(hi) + 1; d++) {
        for (const m of [1, 2, 5]) {
            const v = Math.log10(m) + d;
            if (v >= lo - 1e-9 && v <= hi + 1e-9)
                all.push({ v, label: tickLabel(m, d), decade: m === 1 });
        }
    }
    const decades = all.filter((t) => t.decade);
    return decades.length >= 2 ? decades : all;
}
function linearTicks(min, max) {
    if (min === max) {
        min -= 1;
        max += 1;
    }
    const span = max - min;
    const e0 = Math.floor(Math.log10(span / 4));
    const [m, e] = [[1, e0], [2, e0], [5, e0], [1, e0 + 1]].find(([mm, ee]) => span / (mm * 10 ** ee) <= 6);
    const step = m * 10 ** e;
    const first = Math.ceil(min / step - 1e-9);
    const last = Math.floor(max / step + 1e-9);
    const ticks = [];
    for (let i = first; i <= last; i++) {
        const label = D.toString(D.trimZeros(D.shift(D.fromInt(i * m), e)));
        ticks.push({ v: Number(label), label });
    }
    return { ticks, min: Math.min(min, ticks[0].v), max: Math.max(max, ticks[ticks.length - 1].v) };
}
const CHAR_PX = 6.6;
const SPACE_PX = 3.5;
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
function placeLabels(items, bounds, points = []) {
    const placed = [];
    const marks = items.map((it) => ({ x: it.cx - BIG - 4, y: it.cy - BIG - 4, w: 2 * BIG + 8, h: 2 * BIG + 8 }));
    return items.map((it, i) => {
        const w = it.text.length * CHAR_PX;
        const h = 14;
        const candidates = [];
        for (const dy of [-10, 22, 36, 50, -24]) {
            candidates.push({ x: it.cx + 12, y: it.cy + dy - 11, anchor: 'start', ty: it.cy + dy });
            candidates.push({ x: it.cx - 12 - w, y: it.cy + dy - 11, anchor: 'end', ty: it.cy + dy });
        }
        const inside = (b) => b.x >= bounds.x0 && b.x + b.w <= bounds.x1 && b.y >= bounds.y0 && b.y + b.h <= bounds.y1;
        const padded = (q) => ({ x: q.x - SPACE_PX, y: q.y, w: q.w + 2 * SPACE_PX, h: q.h });
        const free = (b) => inside(b) && !placed.some((q) => overlaps(b, padded(q))) && !marks.some((m, j) => j !== i && overlaps(b, m));
        const ok = (b) => free(b) && !points.some((pt) => overlaps(b, pt));
        const pick = candidates.find((cnd) => ok({ x: cnd.x, y: cnd.y, w, h })) || candidates.find((cnd) => free({ x: cnd.x, y: cnd.y, w, h })) || candidates[1];
        placed.push({ x: pick.x, y: pick.y, w, h });
        return { x: pick.anchor === 'start' ? pick.x : pick.x + w, y: pick.ty, anchor: pick.anchor };
    });
}
export function chartHtml(record) {
    const pts = record.points;
    const xs = pts.map((p) => Math.log10(p.concentration.unrounded));
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    const pad = (hi - lo) * 0.04 || 0.5;
    const X = (v) => L + ((v - (lo - pad)) / ((hi + pad) - (lo - pad))) * (W - L - R);
    const ticks = logTicks(lo - pad, hi + pad);
    const unit = pts[0].concentration.unit;
    const xAxis = (B, H) => `<line class="axis" x1="${L}" y1="${B}" x2="${W - R}" y2="${B}"/>`
        + ticks.map((t) => `<line class="grid" x1="${X(t.v).toFixed(1)}" y1="14" x2="${X(t.v).toFixed(1)}" y2="${B}"/><text class="num tick" x="${X(t.v).toFixed(1)}" y="${B + 15}" text-anchor="middle">${esc(t.label)}</text>`).join('')
        + `<text class="axis-label" x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle">${esc(OUT.chartAxis(unit))}</text>`;
    const yAxis = (ticksY, Y, label, B) => `<line class="axis" x1="${L}" y1="14" x2="${L}" y2="${B}"/>`
        + ticksY.map((t) => `<line class="grid" x1="${L}" y1="${Y(t.v).toFixed(1)}" x2="${W - R}" y2="${Y(t.v).toFixed(1)}"/><text class="num tick" x="${L - 6}" y="${(Y(t.v) + 4).toFixed(1)}" text-anchor="end">${esc(t.label)}</text>`).join('')
        + `<text class="axis-label" transform="translate(14 ${(14 + B) / 2}) rotate(-90)" text-anchor="middle">${esc(label)}</text>`;
    const H1 = 280;
    const B1 = H1 - 40;
    const computed = pts.filter((p) => p.stainIndex.status === 'computed');
    const sis = computed.map((p) => p.stainIndex.unrounded);
    const t1 = linearTicks(Math.min(0, ...sis), Math.max(0, ...sis));
    const Y1 = (v) => B1 - ((v - t1.min) / (t1.max - t1.min)) * (B1 - 20);
    const segments = [];
    pts.forEach((p, i) => {
        const q = pts[i + 1];
        if (q && p.stainIndex.status === 'computed' && q.stainIndex.status === 'computed') {
            segments.push(`<line class="series" x1="${X(xs[i]).toFixed(1)}" y1="${Y1(p.stainIndex.unrounded).toFixed(1)}" x2="${X(xs[i + 1]).toFixed(1)}" y2="${Y1(q.stainIndex.unrounded).toFixed(1)}"/>`);
        }
    });
    const isMax = (p) => record.maximum.rows.includes(p.row);
    const isChosen = (p) => record.workingPoint && record.workingPoint.row === p.row;
    const labelled = pts.map((p, i) => ({ p, i })).filter(({ p }) => p.stainIndex.status === 'computed' && (isMax(p) || isChosen(p)))
        .map(({ p, i }) => ({ row: p.row, cx: X(xs[i]), cy: Y1(p.stainIndex.unrounded), text: `${[isMax(p) ? OUT.maximumMark : null, isChosen(p) ? OUT.chosenMark : null].filter(Boolean).join(', ')}: ${cellText(p.stainIndex)}` }));
    const unlabelled = pts.map((p, i) => ({ p, i })).filter(({ p }) => p.stainIndex.status === 'computed' && !isMax(p) && !isChosen(p))
        .map(({ p, i }) => ({ x: X(xs[i]) - MARK - 1, y: Y1(p.stainIndex.unrounded) - MARK - 1, w: 2 * MARK + 2, h: 2 * MARK + 2 }));
    const positions = new Map(placeLabels(labelled, { x0: L, x1: W - 2, y0: 2, y1: B1 }, unlabelled).map((pos, k) => [labelled[k].row, { ...pos, text: labelled[k].text }]));
    const marks = pts.map((p, i) => {
        if (p.stainIndex.status !== 'computed')
            return '';
        const cx = X(xs[i]);
        const cy = Y1(p.stainIndex.unrounded);
        const shown = cellText(p.stainIndex);
        const title = `<title>${esc(`${p.name}: ${OUT.chartSI.toLowerCase()} ${shown}`)}</title>`;
        const tri = `<path class="mark-max" d="M${cx.toFixed(1)},${(cy - BIG).toFixed(1)} L${(cx + BIG).toFixed(1)},${(cy + BIG * 0.8).toFixed(1)} L${(cx - BIG).toFixed(1)},${(cy + BIG * 0.8).toFixed(1)} Z"/>`;
        const dia = `<path class="mark-chosen" d="M${cx.toFixed(1)},${(cy - BIG - 3).toFixed(1)} L${(cx + BIG + 3).toFixed(1)},${cy.toFixed(1)} L${cx.toFixed(1)},${(cy + BIG + 3).toFixed(1)} L${(cx - BIG - 3).toFixed(1)},${cy.toFixed(1)} Z"/>`;
        const shape = `${isChosen(p) ? dia : ''}${isMax(p) ? tri : ''}${!isMax(p) && !isChosen(p) ? `<circle class="mark" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${MARK}"/>` : ''}`;
        const pos = positions.get(p.row);
        const label = pos ? `<text class="mark-label" x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" text-anchor="${pos.anchor}">${esc(pos.text)}</text>` : '';
        const kind = isMax(p) ? 'max' : isChosen(p) ? 'chosen' : 'point';
        return `<g data-point="mark-${esc(p.row)}" data-row="${esc(p.row)}" data-kind="${kind}" data-si="${esc(shown)}">${title}${shape}${label}</g>`;
    }).join('');
    const zero = t1.min < 0 ? `<line class="zero" x1="${L}" y1="${Y1(0).toFixed(1)}" x2="${W - R}" y2="${Y1(0).toFixed(1)}"/>` : '';
    const si = `<svg class="chart" id="chart-si" viewBox="0 0 ${W} ${H1}" role="img" aria-label="${esc(`${OUT.chartSI}, ${OUT.chartAxis(unit)}`)}">${xAxis(B1, H1)}${yAxis(t1.ticks, Y1, OUT.chartSI, B1)}${zero}${segments.join('')}${marks}</svg>`;
    const H2 = 240;
    const B2 = H2 - 40;
    const pos = pts.map((p, i) => ({ p, i, v: p.statistics.positiveCentral.unrounded, ok: p.statistics.positiveEvents.unrounded > 0 }));
    const neg = pts.map((p, i) => ({ p, i, v: p.statistics.negativeCentral.unrounded, ok: p.statistics.negativeEvents.unrounded > 0 }));
    const vals = [...pos, ...neg].filter((d) => d.ok).map((d) => d.v);
    const t2 = linearTicks(Math.min(0, ...vals), Math.max(0, ...vals));
    const Y2 = (v) => B2 - ((v - t2.min) / (t2.max - t2.min)) * (B2 - 20);
    const series = (list, cls, word) => list.map((d, k) => {
        const q = list[k + 1];
        const seg = q && d.ok && q.ok ? `<line class="${cls}-line" x1="${X(xs[d.i]).toFixed(1)}" y1="${Y2(d.v).toFixed(1)}" x2="${X(xs[q.i]).toFixed(1)}" y2="${Y2(q.v).toFixed(1)}"/>` : '';
        const mark = d.ok ? `<circle class="${cls}" data-point="${cls}-${esc(d.p.row)}" cx="${X(xs[d.i]).toFixed(1)}" cy="${Y2(d.v).toFixed(1)}" r="${MARK}"><title>${esc(`${d.p.name}: ${word} ${(cls === 'pos' ? d.p.statistics.positiveCentral : d.p.statistics.negativeCentral).entered.trim()}`)}</title></circle>` : '';
        return seg + mark;
    }).join('');
    const signals = `<svg class="chart" id="chart-signals" viewBox="0 0 ${W} ${H2}" role="img" aria-label="${esc(`${OUT.chartSignals}, ${OUT.chartAxis(unit)}`)}">${xAxis(B2, H2)}${yAxis(t2.ticks, Y2, OUT.chartSignals, B2)}${series(pos, 'pos', OUT.chartPositive)}${series(neg, 'neg', OUT.chartNegative)}</svg>`;
    const notDrawn = pts.filter((p) => p.stainIndex.status !== 'computed').map((p) => p.name);
    return `<figure class="chart-figure">${si}${signals}<figcaption><p>${esc(OUT.chartKey)}</p><p id="chart-not-drawn">${esc(notDrawn.length ? `${OUT.chartNotDrawn} ${notDrawn.join(', ')}.` : OUT.chartAllDrawn)}</p></figcaption></figure>`;
}
