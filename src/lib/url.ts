// src/lib/url.ts
export type Query = Record<string, string | number | boolean | undefined | null>;

export function toQueryString(q: Query) {
  const sp = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    sp.set(k, String(v));
  });
  return sp.toString();
}

export function fromSearchParams(sp: URLSearchParams) {
  const out: Record<string, string> = {};
  sp.forEach((v, k) => (out[k] = v));
  return out;
}

export function parseNumber(v?: string) {
  if (!v && v !== '0') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

export function parseBool(v?: string) {
  if (v === 'true') return true;
  if (v === 'false') return undefined; // 체크해제와 동일하게 처리
  return undefined;
}
