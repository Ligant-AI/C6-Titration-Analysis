export const shortCode = (code) => code.replace(/^C6-/, '');
export const namesRow = (f, row) => f.rows.includes(row)
    || (f.withheldBeyondEdge || []).includes(row)
    || (f.pairs || []).some((p) => p.higher === row || p.lower === row);
export function raiseFlags(c, rel) {
    const pts = rel.points;
    const order = pts.map((o) => o.row);
    const inOrder = (rows) => order.filter((r) => rows.includes(r));
    const flags = [];
    const s = c.statistics || {};
    if (c.negativeSource === 'external-shared')
        flags.push({ code: 'C6-FL-01', rows: [] });
    if (c.negativeSource === 'external-per-point')
        flags.push({ code: 'C6-FL-02', rows: [] });
    const fl3 = pts.filter((o) => o.point.posCount > 0 && o.point.negCount > 0 && o.point.P <= o.point.N).map((o) => o.row);
    if (fl3.length)
        flags.push({ code: 'C6-FL-03', rows: fl3 });
    if (rel.maximum.status === 'computed') {
        const computed = pts.filter((o) => o.stainIndex.status === 'computed').map((o) => o.row);
        const lowest = computed[0];
        const highest = computed[computed.length - 1];
        const fewer = computed.length < 3;
        const atEdge = rel.maximum.rows.filter((r) => r === lowest || r === highest);
        if (atEdge.length || fewer) {
            const beyond = [];
            const withheld = pts.filter((o) => o.stainIndex.status === 'withheld').map((o) => o.row);
            if (atEdge.includes(lowest))
                beyond.push(...withheld.filter((r) => order.indexOf(r) < order.indexOf(lowest)));
            if (atEdge.includes(highest))
                beyond.push(...withheld.filter((r) => order.indexOf(r) > order.indexOf(highest)));
            flags.push({ code: 'C6-FL-04', rows: inOrder(atEdge), withheldBeyondEdge: inOrder(beyond), fewerThanThreeComputed: fewer });
        }
    }
    if (c.minEvents !== null && c.minEvents !== undefined) {
        const min = Number(String(c.minEvents).trim());
        const populations = [];
        for (const o of pts) {
            if (o.point.posCount < min)
                populations.push({ row: o.row, population: 'positive' });
            if (o.point.negCount < min)
                populations.push({ row: o.row, population: 'negative' });
        }
        if (populations.length)
            flags.push({ code: 'C6-FL-05', rows: inOrder(populations.map((p) => p.row)), populations });
    }
    const pairs = [];
    pts.forEach((o, i) => {
        if (o.positiveSignalChange.status === 'computed' && o.positiveSignalChange.unrounded < 1)
            pairs.push({ higher: o.row, lower: pts[i - 1].row });
    });
    if (pairs.length)
        flags.push({ code: 'C6-FL-06', rows: pairs.map((p) => p.higher), pairs });
    if (c.acquisition === 'not-confirmed')
        flags.push({ code: 'C6-FL-07', rows: [] });
    if (s.positiveCentral === s.negativeCentral) {
        if (s.positiveCentral === 'median' && s.negativeSpread === 'sd')
            flags.push({ code: 'C6-FL-08', rows: [], cases: ['median-sd'] });
        if (s.positiveCentral === 'mean' && s.negativeSpread === 'robust-sd')
            flags.push({ code: 'C6-FL-08', rows: [], cases: ['mean-robust-sd'] });
    }
    const fl9 = [];
    if (c.stainedAs === 'alone')
        fl9.push('alone');
    if (c.matrix === 'capture-beads')
        fl9.push('capture-beads');
    if (c.stainedAs === 'not-recorded')
        fl9.push('stained-not-recorded');
    if (c.matrix === 'not-recorded')
        fl9.push('matrix-not-recorded');
    if (fl9.length)
        flags.push({ code: 'C6-FL-09', rows: [], cases: fl9 });
    const fl10 = [];
    if (c.stainingVolume === 'not-recorded')
        fl10.push('staining-volume');
    if (c.cellNumber === 'not-recorded')
        fl10.push('cell-number');
    if (fl10.length)
        flags.push({ code: 'C6-FL-10', rows: [], cases: fl10 });
    return flags;
}
const FL09_CASES = {
    alone: 'A stain index measured with this antibody alone does not include the spreading error of the panel, so its maximum may not hold when the antibody is used in the panel.',
    'capture-beads': 'A titration on capture beads does not establish the optimum on cells.',
    'stained-not-recorded': 'Whether the series was stained alone or in its panel is not recorded, and an unrecorded condition cannot be interpreted.',
    'matrix-not-recorded': 'The matrix is not recorded, and an unrecorded condition cannot be interpreted.',
};
const FL08_CASES = {
    'median-sd': 'The central statistic and the spread statistic differ in robustness: the median with the standard deviation. This is the variant Maecker et al. (2004) allow when the median replaces the mean. The stain index is computed as declared; it is comparable only with stain indices computed under the same pairing.',
    'mean-robust-sd': 'The central statistic and the spread statistic differ in robustness: the mean with a robust standard deviation. This pairing has no published source. The stain index is computed as declared; it is comparable only with stain indices computed under the same pairing.',
};
export function flagStatement(f, name = (r) => r) {
    const list = (rows) => rows.map(name).join(', ');
    switch (f.code) {
        case 'C6-FL-01': return 'The negative population is the same at every point, so the rise in background with antibody concentration is absent from every stain index. The stain index may continue to rise at concentrations where the true separation has fallen.';
        case 'C6-FL-02': return 'The negative population at each point is from a tube containing none of the titrated antibody, so the rise in background with antibody concentration is absent from every stain index. The stain index may continue to rise at concentrations where the true separation has fallen.';
        case 'C6-FL-03': return `No separation at ${list(f.rows)}: the positive central value is at or below the negative's. Where the stain index is computed it is zero or negative.`;
        case 'C6-FL-04': {
            const parts = [`The maximum is at the edge of the computed series (${list(f.rows)}), so the series does not bracket it. The true maximum may lie beyond the range computed.`];
            if (f.withheldBeyondEdge.length)
                parts.push(`The edge is next to points whose stain index is withheld: ${list(f.withheldBeyondEdge)}.`);
            if (f.fewerThanThreeComputed)
                parts.push('Fewer than three points are computed, so no maximum can lie inside the series.');
            return parts.join(' ');
        }
        case 'C6-FL-05': return `Fewer events than the declared minimum: ${f.populations.map((p) => `the ${p.population} population at ${name(p.row)}`).join('; ')}. Their statistics are less reliable, and so is any stain index computed from them.`;
        case 'C6-FL-06': return `The positive signal falls with increasing concentration between ${f.pairs.map((p) => `${name(p.lower)} and ${name(p.higher)}`).join('; ')} (higher ÷ next lower below one). Causes include scatter between points, gating, target internalisation or modulation during staining, and detector non-linearity interacting with compensation; the tool cannot tell which. The flag fires on any decrease, however small, so near a plateau it can fire on measurement scatter alone.`;
        case 'C6-FL-07': return 'Whether every point was acquired at identical settings is not confirmed. Stain indices from points acquired differently are not comparable.';
        case 'C6-FL-08': return f.cases.map((k) => FL08_CASES[k]).join(' ');
        case 'C6-FL-09': return f.cases.map((k) => FL09_CASES[k]).join(' ');
        case 'C6-FL-10': return `The conditions the series was stained under are not recorded (${f.cases.map((k) => (k === 'staining-volume' ? 'the staining volume' : 'the cell number')).join(' and ')}), so the result cannot be transferred to another staining volume or cell number.`;
        default: throw new Error(`flagStatement: unknown flag ${f.code}`);
    }
}
export const FLAG_LEGEND = Object.freeze({
    'FL-01': { title: 'Shared negative: the background rise with concentration is not seen', means: 'One unstained or fluorescence-minus-one tube was used as the negative for every point. It contains none of the titrated antibody, so the rise in background with concentration is absent from every stain index, which may keep rising where the true separation has fallen.', todo: 'Use the antigen-negative events in each stained tube (an internal negative) if you have them. If not, read the maximum with care: the background rise this negative cannot show would lower the stain index most at the highest concentrations, so the true maximum may lie at a lower concentration than the one named.' },
    'FL-02': { title: 'External negative at each point: the background rise is not seen', means: 'A separate unstained or fluorescence-minus-one tube was used at each point. None contains the titrated antibody, so the rise in background with concentration is absent from every stain index.', todo: 'Use the antigen-negative events in each stained tube (an internal negative) if you have them. If not, read the maximum with care: the background rise this negative cannot show would lower the stain index most at the highest concentrations, so the true maximum may lie at a lower concentration than the one named.' },
    'FL-03': { title: 'No separation at some points', means: 'At the named points the positive central value is at or below the negative\'s, so the stain index there is zero or negative.', todo: 'Check the gates and the column mapping at those points. Low concentrations often separate poorly.' },
    'FL-04': { title: 'Maximum at the edge of the series', means: 'The greatest stain index is at the highest or lowest computed concentration, so the series does not bracket it; the true maximum may lie outside the range you titrated.', todo: 'Extend the series past that end before choosing a working concentration.' },
    'FL-05': { title: 'Fewer events than your declared minimum', means: 'The named populations have fewer events than the minimum you declared, so their statistics, and any stain index from them, are less reliable.', todo: 'Acquire more events at those points, or read them with care.' },
    'FL-06': { title: 'Positive signal falls between points', means: 'The positive central value falls from one concentration to the next higher one. Scatter, gating, internalisation or modulation of the target, and detector non-linearity can each cause it, and the tool cannot tell them apart.', todo: 'Check those points\' gates and acquisition; near a plateau, a small fall may be scatter.' },
    'FL-07': { title: 'Same session and settings not confirmed', means: 'It is not confirmed that every point was acquired in one session at identical instrument settings. Stain indices from points acquired differently are not comparable.', todo: 'Acquire the series in one session at identical settings, or treat the comparison between points with care.' },
    'FL-08': { title: 'Central and spread statistics differ in robustness', means: 'A median is paired with a standard deviation, or a mean with a robust standard deviation. The median with the standard deviation is the variant the published source allows; the mean with a robust standard deviation has no published source. Either way the stain index is computed as declared and compares only with stain indices computed with the same pairing.', todo: 'Compare this result only with stain indices computed with the same pairing. If you want both statistics equally robust, export the median with a robust SD, or the mean with an SD.' },
    'FL-09': { title: 'Result may not transfer to your assay', means: 'The series was stained with this antibody alone, on capture beads, or with that condition not recorded. A titration alone omits the panel\'s spreading error; beads do not establish the optimum on cells; an unrecorded condition cannot be interpreted.', todo: 'Titrate in the panel, on cells, if that is how the antibody will be used, and record both conditions.' },
    'FL-10': { title: 'Staining conditions not recorded', means: 'The staining volume or the cell number per test is not recorded, so the result cannot be transferred to another staining volume or cell number.', todo: 'Record the staining volume and the cell number the series was stained under.' },
});
