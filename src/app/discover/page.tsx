'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Pagination from '../../components/Pagination';
import FilterModal, { Filters } from '../../components/FilterModal';
import { getWatchlist, toggleWatch } from '../../lib/storage';
import { fromSearchParams, parseBool, parseNumber, toQueryString } from '../../lib/url';

// ── 타입 ─────────────────────────────────────────────
type Influencer = {
  id: string;
  handle: string;
  followers: number;
  avg_feed_like: number;
  real_engagement: number;
  main_audience_age_range: string;
  main_audience_gender?: 'male' | 'female' | 'mixed';
  is_verified?: boolean;
};

// ── 환경 스위치(목/실서버) ───────────────────────────
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === '1';

// ── 목 데이터 ────────────────────────────────────────
const MOCK_ITEMS: Influencer[] = [
  { id: '1', handle: '@instagram', followers: 694391240, avg_feed_like: 3000000, real_engagement: 283311625, main_audience_age_range: '18-24', main_audience_gender: 'mixed', is_verified: true },
  { id: '2', handle: '@cristiano', followers: 663491330, avg_feed_like: 2500000, real_engagement: 175070524, main_audience_age_range: '18-24', main_audience_gender: 'male',  is_verified: true },
  { id: '3', handle: '@leomessi',  followers: 506278633, avg_feed_like: 2000000, real_engagement: 139724247, main_audience_age_range: '18-24', main_audience_gender: 'male',  is_verified: true },
  { id: '4', handle: '@selenagomez',followers: 417656566, avg_feed_like: 1500000, real_engagement: 205487030, main_audience_age_range: '18-24', main_audience_gender: 'female',is_verified: true },
  { id: '5', handle: '@kyliejenner',followers: 392960306, avg_feed_like: 1400000, real_engagement: 174474375, main_audience_age_range: '25-34', main_audience_gender: 'female',is_verified: true },
];

// 목 쿼리
function mockQuery(params: Record<string, unknown>) {
  const {
    min_follower, max_follower,
    min_avg_feed_like, max_avg_feed_like,
    min_real_engagement, max_real_engagement,
    main_audience_age_range,
    is_verified,
    main_audience_gender,
    page = 1, pageSize = 20,
    sortField, sortOrder = 'asc',
  } = params as {
    min_follower?: number; max_follower?: number;
    min_avg_feed_like?: number; max_avg_feed_like?: number;
    min_real_engagement?: number; max_real_engagement?: number;
    main_audience_age_range?: string;
    is_verified?: boolean;
    main_audience_gender?: 'male'|'female';
    page?: number; pageSize?: number;
    sortField?: keyof Influencer; sortOrder?: 'asc'|'desc';
  };

  let arr = [...MOCK_ITEMS];

  // 필터
  arr = arr.filter(it => {
    if (min_follower !== undefined && it.followers < Number(min_follower)) return false;
    if (max_follower !== undefined && it.followers > Number(max_follower)) return false;
    if (min_avg_feed_like !== undefined && it.avg_feed_like < Number(min_avg_feed_like)) return false;
    if (max_avg_feed_like !== undefined && it.avg_feed_like > Number(max_avg_feed_like)) return false;
    if (min_real_engagement !== undefined && it.real_engagement < Number(min_real_engagement)) return false;
    if (max_real_engagement !== undefined && it.real_engagement > Number(max_real_engagement)) return false;
    if (main_audience_age_range && it.main_audience_age_range !== main_audience_age_range) return false;
    if (is_verified !== undefined && !!it.is_verified !== !!is_verified) return false;
    if (main_audience_gender && it.main_audience_gender !== main_audience_gender) return false;
    return true;
  });

  // 정렬
  if (sortField) {
    const key = sortField;
    arr.sort((a, b) => {
      const va = a[key]; const vb = b[key];
      if (va === vb) return 0;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortOrder === 'asc' ? va - vb : vb - va;
      }
      return sortOrder === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }

  const total = arr.length;
  const start = (Number(page) - 1) * Number(pageSize);
  const items = arr.slice(start, start + Number(pageSize));
  return { items, total };
}

// 실 서버 요청
async function fetchRemote(params: Record<string, unknown>) {
  if (!BASE) throw new Error('BASE_URL not set');
  const url = new URL('/api/discover', BASE);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === '' || v === null) return;
    url.searchParams.set(k, String(v));
  });
  const resp = await fetch(url.toString(), { cache: 'no-store' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json() as Promise<{ items: Influencer[]; total: number }>;
}

// 공용 fetch
async function fetchInfluencers(params: Record<string, unknown>) {
  if (USE_MOCK || !BASE) return mockQuery(params);
  try { return await fetchRemote(params); }
  catch (e: unknown) {
    console.warn('remote failed, fallback to mock:', e);
    return mockQuery(params);
  }
}

export default function DiscoverPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const init = fromSearchParams(sp);

  // URL 초기값을 상태에 반영
  const [filters, setFilters] = useState<Filters>({
    min_follower: parseNumber(init.min_follower),
    max_follower: parseNumber(init.max_follower),
    min_avg_feed_like: parseNumber(init.min_avg_feed_like),
    max_avg_feed_like: parseNumber(init.max_avg_feed_like),
    min_real_engagement: parseNumber(init.min_real_engagement),
    max_real_engagement: parseNumber(init.max_real_engagement),
    main_audience_age_range: init.main_audience_age_range || undefined,
    is_verified: parseBool(init.is_verified),
    main_audience_gender: (init.main_audience_gender as Filters['main_audience_gender']) || undefined,
  });

  const [page, setPage] = useState(parseNumber(init.page) || 1);
  const [pageSize] = useState(20);
  const [sortField, setSortField] = useState<keyof Influencer | ''>((init.sortField as keyof Influencer) || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((init.sortOrder as 'asc' | 'desc') || 'desc');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [watchlist, setWatchlistState] = useState<string[]>(getWatchlist());

  const [items, setItems] = useState<Influencer[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [error, setError] = useState<string>('');

  const [modalOpen, setModalOpen] = useState(false);

  // 데이터 로드 + URL 동기화
  useEffect(() => {
    let ignore = false;
    setStatus('loading'); setError('');
    const params = {
      ...filters,
      page,
      pageSize,
      sortField: sortField || undefined,
      sortOrder: sortField ? sortOrder : undefined,
    };
    fetchInfluencers(params).then((data) => {
      if (ignore) return;
      setItems(data.items ?? []);
      setTotal(data.total ?? (data.items?.length ?? 0));
      setStatus('success');
      setSelectedIds([]);
    }).catch((e: unknown) => {
      if (ignore) return;
      const msg = e instanceof Error ? e.message : 'unknown error';
      setStatus('error'); setError(msg);
    });

    const qs = toQueryString({
      ...filters,
      page,
      pageSize,
      sortField: sortField || undefined,
      sortOrder: sortField ? sortOrder : undefined,
    });
    router.replace(`/discover?${qs}`);

    return () => { ignore = true; };
  }, [filters, page, pageSize, sortField, sortOrder, router]);

  // 클라 정렬(목/폴백)
  const sorted = useMemo(() => {
    if (!sortField) return items;
    const arr = [...items];
    arr.sort((a, b) => {
      const va = a[sortField]; const vb = b[sortField];
      if (va === vb) return 0;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortOrder === 'asc' ? va - vb : vb - va;
      }
      return sortOrder === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [items, sortField, sortOrder]);

  // 정렬 토글
  const toggleSort = (key: keyof Influencer) => {
    if (sortField !== key) { setSortField(key); setSortOrder('desc'); }
    else { setSortOrder(d => (d === 'asc' ? 'desc' : 'asc')); }
  };

  // 선택
  const allSelected = sorted.length > 0 && selectedIds.length === sorted.length;
  const toggleSelectAll = () => { setSelectedIds(allSelected ? [] : sorted.map(x => x.id)); };
  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // watch
  const toggleWatchAndSync = (id: string) => { setWatchlistState(toggleWatch(id)); };

  return (
    <main style={{ padding: 24 }}>
      <h1>인플루언서 찾기</h1>

      {/* 상단 조작바 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button>인스타그램</button>
          <button disabled>유튜브</button>
          <button disabled>틱톡</button>
        </div>
        <button style={{ marginLeft: 'auto' }} onClick={() => setModalOpen(true)}>고급 필터 설정</button>
      </div>

      {status === 'loading' && <p>로딩 중…</p>}
      {status === 'error' && <p style={{ color: 'crimson' }}>에러: {error}</p>}

      {status === 'success' && (
        <>
          <div style={{ margin: '8px 0' }}>
            <button onClick={toggleSelectAll}>{allSelected ? '전체 선택 해제' : '전체 선택'}</button>
            <span style={{ marginLeft: 8 }}>선택된 {selectedIds.length} / 표시 {sorted.length}개</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: 8 }}>선택</th>
                {[
                  ['handle', '계정'] as const,
                  ['followers', '팔로워 수'] as const,
                  ['avg_feed_like', '평균 좋아요'] as const,
                  ['real_engagement', '예상 유효 팔로워수'] as const,
                  ['main_audience_age_range', '주요 연령'] as const,
                ].map(([key, label]) => (
                  <th key={key} style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: 8, cursor: 'pointer' }}
                      onClick={() => toggleSort(key as keyof Influencer)}>
                    {label}{sortField === key ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: 8 }}>인증</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: 8 }}>나중에보기</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((it) => {
                const checked = selectedIds.includes(it.id);
                const watched = watchlist.includes(it.id);
                return (
                  <tr key={it.id}>
                    <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleSelectOne(it.id)} />
                    </td>
                    <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{it.handle}</td>
                    <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{it.followers.toLocaleString()}</td>
                    <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{it.avg_feed_like.toLocaleString()}</td>
                    <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{it.real_engagement.toLocaleString()}</td>
                    <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{it.main_audience_age_range}</td>
                    <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{it.is_verified ? '✅' : '—'}</td>
                    <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>
                      <button onClick={() => toggleWatchAndSync(it.id)}>{watched ? '해제' : '추가'}</button>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 16, color: '#888' }}>결과가 없습니다.</td></tr>
              )}
            </tbody>
          </table>

          <Pagination page={page} pageSize={pageSize} total={total} onChange={(next) => setPage(next)} />
        </>
      )}

      <FilterModal
        open={modalOpen}
        initial={filters}
        onClose={() => setModalOpen(false)}
        onApply={(next) => { setPage(1); setFilters(next); }}
      />
    </main>
  );
}
