export function splitPaste(text, headerRow) {
    const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    while (lines.length && lines[lines.length - 1].trim() === '')
        lines.pop();
    const cells = lines.map((l) => l.split('\t'));
    const columns = cells.reduce((m, r) => Math.max(m, r.length), 0);
    if (headerRow === 'yes')
        return { headers: cells[0] || [], rows: cells.slice(1), columns };
    return { headers: null, rows: cells, columns };
}
export function columnLabel(split, i) {
    const h = split.headers && split.headers[i] !== undefined ? split.headers[i].trim() : '';
    return h ? `Column ${i + 1}: ${h}` : `Column ${i + 1}`;
}
