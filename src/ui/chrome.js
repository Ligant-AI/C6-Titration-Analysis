import { renderHeader as suiteHeader, renderFooter as suiteFooter } from '@ligant/bench-chrome';
import { CONFIG } from '../config.js';
export function renderHeader() {
    return suiteHeader({ path: `/${CONFIG.slug}/`, title: CONFIG.toolTitle, description: CONFIG.tagline });
}
export function renderFooter() {
    const tail = ` (v${CONFIG.version}) [Computer software]. ${CONFIG.legalEntity}. ${CONFIG.publicBase.replace('https://', '')}${CONFIG.slug}/`;
    return suiteFooter({
        repoUrl: CONFIG.repositoryUrl,
        citations: [{ lead: `${CONFIG.citationAuthor} (${CONFIG.citationYear}). `, title: CONFIG.toolTitle, tail }],
        citationFootnote: 'No identifier (DOI) is stated for this software.',
        disclaimer: CONFIG.disclaimer,
    });
}
