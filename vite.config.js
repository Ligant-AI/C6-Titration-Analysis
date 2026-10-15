import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
const SCHEMA = 'schema/ligant-benchtools-c6-titration-analysis-1.0.0.schema.json';
const schemaFile = () => ({
    name: 'c6-record-schema',
    generateBundle() { this.emitFile({ type: 'asset', fileName: SCHEMA, source: readFileSync(new URL(SCHEMA, import.meta.url), 'utf8') }); },
});
export default defineConfig(({ mode }) => ({
    base: './',
    plugins: [schemaFile()],
    build: {
        modulePreload: { polyfill: false },
        target: 'es2022',
            },
    server: { port: 5176, strictPort: true },
}));
