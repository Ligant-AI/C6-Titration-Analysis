import { escapeHtml as esc } from '@ligant/bench-chrome';
import { TEXT } from './text.js';
import { FLAG_LEGEND } from '../engine/flags.js';
import { REGISTER, ASSUMPTIONS } from '../engine/constants.js';
import { ENGINE_VERSION } from '../engine/version.js';
const paras = (list) => list.map((t) => `<p>${esc(t)}</p>`).join('');
const table = (cols, rows, cls) => `<table class="${cls}"><thead><tr>${cols.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
const NOT_ON_PAGE = ['Invariance tolerance', 'Unit-normalisation tolerance', 'Kept-in-view height'];
export const pageConstants = () => REGISTER.filter((r) => !NOT_ON_PAGE.includes(r.item)).map((r) => [r.item, r.value, r.basis]);
export function aboutHtml() {
    const legend = Object.entries(FLAG_LEGEND).map(([code, f]) => [code, f.means, f.todo]);
    return `<h2 id="about-heading">${esc(TEXT.aboutHeading)}</h2>`
        + `<section aria-labelledby="about-what"><h3 id="about-what">What it does</h3>${paras(TEXT.whatItDoes)}</section>`
        + `<section aria-labelledby="about-how"><h3 id="about-how">How to use it</h3><ol class="steps">${TEXT.howToUse.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></section>`
        + `<section aria-labelledby="about-works"><h3 id="about-works">How it works</h3>`
        + `<h4>${esc(TEXT.stainIndexHeading)}</h4><p>${esc(TEXT.stainIndex[0])}</p><p class="formula">${esc(TEXT.stainIndex[1])}</p>${paras(TEXT.stainIndex.slice(2))}`
        + `<h4>${esc(TEXT.signalsHeading)}</h4>${paras(TEXT.signals)}`
        + `<h4>${esc(TEXT.withheldHeading)}</h4>${paras(TEXT.withheld)}`
        + `<h4>${esc(TEXT.constantsHeading)}</h4>${table(TEXT.constantsColumns, pageConstants(), 'constants')}`
        + `<p>${esc(TEXT.assumptionsLead)}</p><ul>${ASSUMPTIONS.map((a) => `<li>${esc(a.assumption)}.</li>`).join('')}</ul>`
        + `<h4>${esc(TEXT.precisionHeading)}</h4>${paras(TEXT.precision)}<p>${esc(TEXT.engineLine(ENGINE_VERSION))}</p>`
        + `<h4>${esc(TEXT.flagsHeading)}</h4><p>${esc(TEXT.flagsLead)}</p>${table(TEXT.flagsColumns, legend, 'legend')}`
        + '</section>'
        + `<section aria-labelledby="about-why"><h3 id="about-why">Why not a spreadsheet?</h3><ul>${TEXT.whyNot.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>`
        + `<section aria-labelledby="about-not"><h3 id="about-not">What it does not do</h3><p>${esc(TEXT.doesNotLead)}</p><ol>${TEXT.doesNot.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>`
        + `<p>${esc(TEXT.notADetermination)}</p></section>`;
}
