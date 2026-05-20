export const fmt$ = (v: number): string =>
    "$" + Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

export const fmtK = (v: number): string =>
    v >= 1000 ? "$" + (v / 1000).toFixed(0) + "k" : "$" + v;