// src/lib/storage.ts
// "나중에 보기" 목록(LocalStorage) 유틸

const KEY = 'watchlist';

/** 현재 저장된 watchlist(문자열 ID 배열)를 반환 */
export function getWatchlist(): string[] {
  if (typeof window === 'undefined') return []; // SSR 안전
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** 전체 watchlist를 교체 저장 */
export function setWatchlist(ids: string[]): void {
  if (typeof window === 'undefined') return;
  const unique = Array.from(new Set(ids)).filter((v) => typeof v === 'string');
  localStorage.setItem(KEY, JSON.stringify(unique));
}

/** 특정 ID가 watchlist에 있는지 여부 */
export function isWatched(id: string): boolean {
  return getWatchlist().includes(id);
}

/** 특정 ID 토글(추가/제거) 후 최신 목록을 반환 */
export function toggleWatch(id: string): string[] {
  const list = new Set(getWatchlist());
  if (list.has(id)) list.delete(id);
  else list.add(id);
  const next = Array.from(list);
  setWatchlist(next);
  return next;
}
