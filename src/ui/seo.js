import { escapeHtml as esc } from '@ligant/bench-chrome';
import { CONFIG } from '../config.js';
import { ENGINE_VERSION } from '../engine/version.js';
export const CANONICAL = `${CONFIG.publicBase}${CONFIG.slug}/`;
export const SEO = Object.freeze({
    h1: 'Stain index calculator for antibody titration in flow cytometry',
    lead: 'At each concentration of an antibody titration, this tool computes the stain index from the population statistics you export, and how the positive and negative signals change along the series. It names the point with the greatest stain index and records every declaration the numbers depend on, with the working concentration you choose. It does not determine saturation and does not choose the working concentration.',
    description: 'Free stain index calculator for flow cytometry antibody titrations. Enter your population statistics and get the stain index at every point, with the formula.',
    related: { text: 'Antibody Titration Planner gives the concentration at every point of a series for your staining volume and cell number.', name: 'Antibody Titration Planner', href: '/antibody-titration-planner/' },
    faqHeading: 'Questions and answers',
    faq: Object.freeze([
        { q: 'What is the stain index?', a: "The stain index counts how many widths of the negative population separate the positive population from the negative one, where one width is twice the negative population's spread: stain index = (positive central value − negative central value) ÷ (2 × negative spread). The multiplier 2 and the form are from Maecker et al., Cytometry A 2004. The published form uses the mean, or the median, with the standard deviation; a robust standard deviation is a variant that analysis software offers." },
        { q: 'How do I calculate the stain index for one point of a titration?', a: 'A worked row: positive median 1200, negative median 100, negative robust SD 50. Stain index = (1200 − 100) ÷ (2 × 50) = 1100 ÷ 100 = 11.0.' },
        { q: 'Can I use a geometric mean or a median absolute deviation?', a: "A geometric mean (often called MFI) is not accepted: export the median. A median is accepted whatever your lab calls it. A median absolute deviation without the 1.4826 factor is not a standard deviation estimate and is not accepted: export a robust SD or SD. Use the median or mean for the central values, and a robust SD or SD for the negative population's spread. If you want both statistics equally robust, export the median with a robust SD, or the mean with an SD." },
        { q: 'What data do I need?', a: "One row per concentration, from 3 to 24 points. For each point: the concentration with its unit, the positive population's central value, the negative population's central value and spread, and the event count of each population (a count, not a percentage). Paste a table from your analysis software or a spreadsheet, or type into the grid. You also say which statistic each column is, where the negative population came from, the staining volume and cells per test (or \"not recorded\"), and how the series was stained and acquired." },
        { q: 'Which negative population should I use?', a: 'The antigen-negative events in each stained tube (an internal negative), if you have them: the same antibody at the same concentration. Only an internal negative shows the background rising as you add more antibody. An unstained or fluorescence-minus-one tube contains none of the titrated antibody, so that rise is absent from every stain index, and the true maximum may lie at a lower concentration than the one named.' },
        { q: 'Does the tool choose the best antibody concentration?', a: 'No. It names the point with the greatest stain index, but it does not determine saturation and does not choose the working concentration. Choose after reading the result: the concentration you declare is recorded with its stain index, every flag naming that point and every flag on the whole series.' },
        { q: 'Is my data uploaded anywhere?', a: 'No. Calculations run entirely in your browser, and your inputs are never transmitted, stored, or logged. The page sends an email address only if you choose to submit one in the newsletter signup, and its web analytics counts visits and sees how quickly the page loads, with further analytics only if you allow it in the banner; no analytics ever receives anything you type into this tool.' },
        { q: 'Is it free?', a: 'Yes. It is free to use and open source under the Apache 2.0 licence. Its source code is on GitHub, so you can download it and run it on your own computer.' },
    ]),
    featureList: Object.freeze([
        'Stain index at each concentration of an antibody titration',
        'Positive-signal and negative-signal change along the series',
        'Names the point with the greatest stain index, without choosing the working concentration',
        'Records every declaration the numbers depend on',
        'Notebook copy, CSV and JSON export',
    ]),
});
export function relatedHtml() {
    const { text, name, href } = SEO.related;
    return `<p class="related">${esc(text).replace(esc(name), `<a href="${href}">${esc(name)}</a>`)}</p>`;
}
export function faqHtml() {
    return SEO.faq.map(({ q, a }) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('');
}
export function softwareApplication() {
    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: `Ligant · ${CONFIG.toolTitle}`,
        url: CANONICAL,
        description: SEO.description,
        applicationCategory: 'ScientificApplication',
        operatingSystem: 'Any (runs in a web browser)',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0' },
        license: 'https://www.apache.org/licenses/LICENSE-2.0',
        softwareVersion: ENGINE_VERSION,
        codeRepository: CONFIG.repositoryUrl,
        featureList: [...SEO.featureList],
    };
}
export function faqPage() {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: SEO.faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    };
}
export function breadcrumbs() {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: CONFIG.productLine, item: CONFIG.publicBase },
            { '@type': 'ListItem', position: 2, name: CONFIG.toolTitle, item: CANONICAL },
        ],
    };
}
const block = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
export function jsonLdHtml() {
    return [softwareApplication(), faqPage(), breadcrumbs()].map(block).join('\n  ');
}
