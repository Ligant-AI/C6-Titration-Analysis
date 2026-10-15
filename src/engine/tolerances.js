export const U = 2 ** -53;
export function unitNormalisationTolerance(a, b) {
    return 2 ** -51 * Math.max(Math.abs(a), Math.abs(b));
}
export function withinUnitNormalisation(a, b) {
    return Math.abs(a - b) <= unitNormalisationTolerance(a, b);
}
export function stainIndexErrorBound({ P, N, S, si }) {
    return 2 ** -51 * Math.abs(si) + 2 ** -52 * ((Math.abs(P) + Math.abs(N)) / (2 * Math.abs(S)));
}
export function stainIndicesAgree(a, b) {
    return Math.abs(a.si - b.si) <= stainIndexErrorBound(a) + stainIndexErrorBound(b);
}
