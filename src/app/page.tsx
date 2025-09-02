'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Pagination from '../components/Pagination';
import FilterModal, { Filters } from '../components/FilterModal';
import { getWatchlist, toggleWatch } from '../lib/storage';
import { fromSearchParams, parseBool, parseNumber, toQueryString } from '../lib/url';

/* ===================== 화면 내부 타입 ===================== */
type Influencer = {
  id: string;
  handle: string;                       // @username
  followers: number;                    // follower
  avg_feed_like: number;                // avg_feed_like
  real_engagement: number;              // real_follower (표에서는 '예상 유효 팔로워수')
  er?: number;                          // real_engagement (0~1 비율)
  last_upload_days?: number;            // 서버 스펙엔 없음 → 일단 미사용
  main_audience_age_range: string;
  main_audience_gender?: 'male' | 'female' | 'mixed';
  is_verified?: boolean;
  avatarUrl?: string | null;            // 프로필 이미지 링크 (있으면 사용)
};

type QueryParams = {
  platform?: string;                    // UI용(서버 미전송)
  q?: string;                           // username 검색어
  page?: number;
  pageSize?: number;
  sortField?: keyof Influencer | '';
  sortOrder?: 'asc' | 'desc';
} & Filters;

/* ===================== 서버 응답 타입(swagger.json) ===================== */
type ServerDiscoverItem = {
  pk?: string;
  username?: string;
  follower?: number;
  real_follower?: number;
  avg_feed_like?: number;
  avg_reach?: number;
  real_engagement?: number;             // 0~1
  main_audience_gender?: 'F' | 'M';
  main_audience_age_range?: '18-24' | '25-34' | '35-44';
  is_verified?: boolean;
  profile_img_link?: string | null;
};

type ServerDiscoverResponse = {
  total?: number;
  page?: number;
  pageSize?: number;
  data?: ServerDiscoverItem[];
};

/* ===================== 환경 ===================== */
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === '1';

/* ===================== 목 데이터 ===================== */
const MOCK_ITEMS: Influencer[] = [
  { id: '1', handle: '@instagram',   followers: 694_391_240, avg_feed_like: 3_000_000, real_engagement: 283_311_625, er: 0.002,  last_upload_days: 3, main_audience_age_range: '18-24', main_audience_gender: 'mixed',  is_verified: true,  avatarUrl: null },
  { id: '2', handle: '@cristiano',   followers: 663_491_330, avg_feed_like: 2_500_000, real_engagement: 175_070_524, er: 0.0099, last_upload_days: 3, main_audience_age_range: '18-24', main_audience_gender: 'male',   is_verified: true,  avatarUrl: null },
  { id: '3', handle: '@leomessi',    followers: 506_278_633, avg_feed_like: 2_000_000, real_engagement: 139_724_247, er: 0.0075, last_upload_days: 5, main_audience_age_range: '18-24', main_audience_gender: 'male',   is_verified: true,  avatarUrl: null },
  { id: '4', handle: '@selenagomez', followers: 417_656_566, avg_feed_like: 1_500_000, real_engagement: 205_487_030, er: 0.0068, last_upload_days: 4, main_audience_age_range: '18-24', main_audience_gender: 'female', is_verified: true,  avatarUrl: null },
  { id: '5', handle: '@kyliejenner', followers: 392_960_306, avg_feed_like: 1_400_000, real_engagement: 174_474_375, er: 0.0058, last_upload_days: 5, main_audience_age_range: '25-34', main_audience_gender: 'female', is_verified: true,  avatarUrl: null },
];

/* ===================== 유틸 ===================== */
function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function cryptoRandomId() { return Math.random().toString(36).slice(2); }

/* ===================== 목 쿼리 ===================== */
function mockQuery(params: QueryParams) {
  const {
    q,
    min_follower, max_follower,
    min_avg_feed_like, max_avg_feed_like,
    min_real_engagement, max_real_engagement,
    main_audience_age_range,
    is_verified,
    main_audience_gender,
    page = 1, pageSize = 20,
    sortField, sortOrder = 'desc',
  } = params;

  let arr = [...MOCK_ITEMS];

  if (q && q.trim()) {
    const kw = q.trim().toLowerCase();
    arr = arr.filter(it => it.handle.toLowerCase().includes(kw));
  }

  arr = arr.filter(it => {
    if (min_follower !== undefined      && it.followers       < min_follower) return false;
    if (max_follower !== undefined      && it.followers       > max_follower) return false;
    if (min_avg_feed_like !== undefined && it.avg_feed_like   < min_avg_feed_like) return false;
    if (max_avg_feed_like !== undefined && it.avg_feed_like   > max_avg_feed_like) return false;
    if (min_real_engagement !== undefined && it.real_engagement < min_real_engagement) return false;
    if (max_real_engagement !== undefined && it.real_engagement > max_real_engagement) return false;
    if (main_audience_age_range && it.main_audience_age_range !== main_audience_age_range) return false;
    if (is_verified !== undefined && !!it.is_verified !== !!is_verified) return false;
    if (main_audience_gender && it.main_audience_gender !== main_audience_gender) return false;
    return true;
  });

  if (sortField) {
    arr.sort((a, b) => {
      const va = a[sortField!]; const vb = b[sortField!];
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
  const start = (page - 1) * pageSize;
  const items = arr.slice(start, start + pageSize);
  return { items, total };
}

/* ===================== 서버 매핑 ===================== */
function mapSortFieldToServer(key?: keyof Influencer | ''): string | undefined {
  if (!key) return undefined;
  switch (key) {
    case 'followers':        return 'follower';
    case 'real_engagement':  return 'real_follower';
    case 'avg_feed_like':    return 'avg_feed_like';
    case 'er':               return 'real_engagement';
    default:                 return String(key);
  }
}

function mapToServerParams(params: QueryParams) {
  const {
    q, page = 1, pageSize = 20, sortField, sortOrder,
    min_follower, max_follower,
    min_avg_feed_like, max_avg_feed_like,
    min_real_engagement, max_real_engagement,
    main_audience_age_range,
    is_verified,
    main_audience_gender,
  } = params;

  const qobj: Record<string, string | number | boolean> = {
    page,
    page_size: pageSize, // 서버 키
  };

  if (q && q.trim()) qobj.username = q.trim();

  const serverSort = mapSortFieldToServer(sortField);
  if (serverSort) qobj.sort_by = serverSort;
  if (serverSort && sortOrder) qobj.order = sortOrder;

  if (min_follower !== undefined)        qobj.min_follower = min_follower;
  if (max_follower !== undefined)        qobj.max_follower = max_follower;

  if (min_avg_feed_like !== undefined)   qobj.min_avg_feed_like = min_avg_feed_like;
  if (max_avg_feed_like !== undefined)   qobj.max_avg_feed_like = max_avg_feed_like;

  if (min_real_engagement !== undefined) qobj.min_real_engagement = min_real_engagement;
  if (max_real_engagement !== undefined) qobj.max_real_engagement = max_real_engagement;

  if (main_audience_age_range)           qobj.main_audience_age_range = main_audience_age_range;

  if (main_audience_gender === 'male')   qobj.main_audience_gender = 'M';
  if (main_audience_gender === 'female') qobj.main_audience_gender = 'F';

  if (is_verified)                       qobj.is_verified = true;

  return qobj;
}

function mapServerItemToInfluencer(row: ServerDiscoverItem): Influencer {
  const gender =
    row?.main_audience_gender === 'F' ? 'female' :
    row?.main_audience_gender === 'M' ? 'male'   : undefined;

  return {
    id: String(row?.pk ?? row?.username ?? cryptoRandomId()),
    handle: row?.username ? `@${row.username}` : '@unknown',
    followers: toNum(row?.follower),
    avg_feed_like: toNum(row?.avg_feed_like),
    real_engagement: toNum(row?.real_follower),
    er: row?.real_engagement != null ? Number(row.real_engagement) : undefined,
    last_upload_days: undefined,
    main_audience_age_range: row?.main_audience_age_range ?? '',
    main_audience_gender: gender,
    is_verified: Boolean(row?.is_verified),
    avatarUrl: row?.profile_img_link ?? null,
  };
}

/* ===================== 데이터 페치 ===================== */
async function fetchRemote(params: QueryParams) {
  if (!BASE) throw new Error('BASE_URL not set');

  const url = new URL('/api/discover', BASE);
  const qobj = mapToServerParams(params);
  Object.entries(qobj).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  console.log('REQ', url.toString());
  const resp = await fetch(url.toString(), { cache: 'no-store' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const data: ServerDiscoverResponse = await resp.json();
  const items = (data.data ?? []).map(mapServerItemToInfluencer);
  const total = typeof data.total === 'number' ? data.total : items.length;
  return { items, total } as { items: Influencer[]; total: number };
}

async function fetchInfluencers(params: QueryParams) {
  if (!USE_MOCK && BASE) {
    try { return await fetchRemote(params); }
    catch (e) { console.warn('remote failed, use mock:', e); }
  }
  return mockQuery(params);
}

/* ===================== 작은 UI 컴포넌트(아이콘/아바타) ===================== */
function BookmarkIcon({ filled }: { filled?: boolean }) {
  return filled ? (
    // filled bookmark
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M6 2h12a1 1 0 0 1 1 1v18l-7-4-7 4V3a1 1 0 0 1 1-1z" fill="#111"/>
    </svg>
  ) : (
    // outline bookmark
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M6 2h12a1 1 0 0 1 1 1v18l-7-4-7 4V3a1 1 0 0 1 1-1z" fill="none" stroke="#444" strokeWidth="1.5"/>
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <circle cx="5" cy="12" r="1.6" fill="#666"/><circle cx="12" cy="12" r="1.6" fill="#666"/><circle cx="19" cy="12" r="1.6" fill="#666"/>
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M14 3h7v7h-2V6.414l-8.293 8.293-1.414-1.414L17.586 5H14V3z" fill="#666"/>
      <path d="M5 5h6v2H7v10h10v-4h2v6H5V5z" fill="#666"/>
    </svg>
  );
}

function VerifiedBadge() {
  // 인스타 느낌의 파란 체크
  return (
    <span title="Verified" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:16, height:16, borderRadius:'50%', background:'#2096F3', color:'#fff', marginRight:6, fontSize:11 }}>
      ✓
    </span>
  );
}

function CircleAvatar({ src, alt }: { src?: string | null; alt?: string }) {
  const common: React.CSSProperties = {
    width: 28, height: 28, borderRadius: '50%',
    background: '#eee', display: 'inline-block', overflow: 'hidden',
    marginRight: 8, verticalAlign: 'middle',
  };
  if (src) {
    return <img src={src} alt={alt ?? ''} style={common} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />;
  }
  return <span style={common} aria-hidden />;
}

/* ===================== 페이지 컴포넌트 ===================== */
export default function Page() {
  const router = useRouter();
  const sp = useSearchParams();
  const init = fromSearchParams(sp);

  const [platform, setPlatform] = useState<string>(init.platform || 'ig'); // 서버 미전송(UX용)
  const [q, setQ] = useState<string>(init.q || '');
  const [searchText, setSearchText] = useState<string>(q);

  const [filters, setFilters] = useState<Filters>({
    min_follower:        parseNumber(init.min_follower),
    max_follower:        parseNumber(init.max_follower),
    min_avg_feed_like:   parseNumber(init.min_avg_feed_like),
    max_avg_feed_like:   parseNumber(init.max_avg_feed_like),
    min_real_engagement: parseNumber(init.min_real_engagement),
    max_real_engagement: parseNumber(init.max_real_engagement),
    main_audience_age_range: init.main_audience_age_range || undefined,
    is_verified: parseBool(init.is_verified),
    main_audience_gender: (init.main_audience_gender as Filters['main_audience_gender']) || undefined,
  });

  const [page, setPage] = useState<number>(parseNumber(init.page) || 1);
  const [pageSize] = useState<number>(parseNumber(init.pageSize) || 20);
  const [sortField, setSortField] = useState<keyof Influencer | ''>((init.sortField as keyof Influencer) || 'followers');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((init.sortOrder as 'asc' | 'desc') || 'desc');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [watchlist, setWatchlistState] = useState<string[]>(getWatchlist());

  const [items, setItems] = useState<Influencer[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [error, setError] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    setStatus('loading'); setError('');

    const params: QueryParams = {
      platform, q,
      ...filters,
      page, pageSize,
      sortField: (sortField || undefined) as keyof Influencer | undefined,
      sortOrder: sortField ? sortOrder : undefined,
    };

    fetchInfluencers(params)
      .then((data) => {
        if (ignore) return;
        setItems(data.items ?? []);
        setTotal(data.total ?? (data.items?.length ?? 0));
        setStatus('success');
        setSelectedIds([]);
      })
      .catch((e: unknown) => {
        if (ignore) return;
        setStatus('error'); setError(e instanceof Error ? e.message : 'unknown error');
      });

    const qs = toQueryString(params);
    router.replace('?' + qs);

    return () => { ignore = true; };
  }, [platform, q, filters, page, pageSize, sortField, sortOrder, router]);

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

  const toggleSort = (key: keyof Influencer) => {
    if (sortField !== key) { setSortField(key); setSortOrder('desc'); }
    else { setSortOrder(d => (d === 'asc' ? 'desc' : 'asc')); }
  };

  const allSelected = sorted.length > 0 && selectedIds.length === sorted.length;
  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : sorted.map(x => x.id));
  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleWatchAndSync = (id: string) => setWatchlistState(toggleWatch(id));

  const platforms: { key: string; label: string }[] = [
    { key: 'ig', label: '인스타그램' },
    { key: 'yt', label: '유튜브' },
    { key: 'x',  label: '엑스' },
    { key: 'tt', label: '틱톡' },
    { key: 'nb', label: '네이버 블로그' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100dvh' }}>
      <Sidebar />
      <main style={{ padding: 24 }}>
        <h1>
          인플루언서 찾기{' '}
          <small style={{ fontSize: 12, color: '#999' }}>
            mode: {USE_MOCK || !BASE ? 'mock' : 'live'}
          </small>
        </h1>

        {/* 1행: 플랫폼 토글(UX용) */}
        <div style={{ display: 'flex', gap: 6, margin: '12px 0' }}>
          {platforms.map(p => (
            <button
              key={p.key}
              onClick={() => { setPlatform(p.key); setPage(1); }}
              style={{
                padding: '4px 8px',
                border: '1px solid #ddd',
                borderRadius: 6,
                background: platform === p.key ? '#222' : '#fff',
                color: platform === p.key ? '#fff' : '#000'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* 2행: 키워드 검색 + 고급 필터 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input
            placeholder="username 검색 (예: cristiano)"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setQ(searchText); setPage(1); } }}
            style={{ width: 320, padding: 6, border: '1px solid #ddd', borderRadius: 6 }}
          />
          <button onClick={() => { setQ(searchText); setPage(1); }}>검색</button>
          <button onClick={() => setModalOpen(true)} style={{ marginLeft: 8 }}>고급 필터 설정</button>
        </div>

        {status === 'loading' && <p>로딩 중… 인플루언서 데이터를 불러오고 있습니다.</p>}
        {status === 'error' && <p style={{ color: 'crimson' }}>에러: {error}</p>}

        {status === 'success' && (
          <>
            <div style={{ margin: '8px 0' }}>
              <button onClick={toggleSelectAll}>{allSelected ? '전체 선택 해제' : '전체 선택'}</button>
              <span style={{ marginLeft: 8 }}>선택된 {selectedIds.length} / 표시 {sorted.length}개</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#fff' }}>
                <tr>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: 8 }}>선택</th>
                  {([
                    ['handle', '계정'],
                    ['followers', '팔로워 수'],
                    ['avg_feed_like', '평균 좋아요'],
                    ['real_engagement', '예상 유효 팔로워수'],
                    ['er', 'ER'],
                    ['last_upload_days', '최근 업로드 일'],
                    ['main_audience_age_range', '주요 연령'],
                  ] as [keyof Influencer, string][]).map(([key, label]) => (
                    <th key={String(key)} style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: 8, cursor: 'pointer' }}
                        onClick={() => toggleSort(key)}>
                      {label}{sortField === key ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                  ))}
                  {/* 인증 / 나중에보기 컬럼 제거됨 */}
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

                      {/* 계정 셀: 아바타 + (인증배지) + 핸들 + 액션 3개(가운데가 북마크) */}
                      <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <CircleAvatar src={it.avatarUrl ?? undefined} alt={it.handle} />
                          {it.is_verified && <VerifiedBadge />}
                          <span style={{ fontWeight: 500, marginRight: 10 }}>{it.handle}</span>

                          <div style={{ display:'inline-flex', gap:6 }}>
                            <button title="더보기" style={iconBtnStyle} onClick={() => { /* TODO: 더보기 */ }}>
                              <DotsIcon />
                            </button>
                            <button
                              title={watched ? '나중에보기 해제' : '나중에보기 추가'}
                              style={iconBtnStyle}
                              onClick={() => toggleWatchAndSync(it.id)}
                              aria-pressed={watched}
                            >
                              <BookmarkIcon filled={watched} />
                            </button>
                            <button title="외부 열기" style={iconBtnStyle} onClick={() => { /* TODO: 외부 링크 */ }}>
                              <ExternalIcon />
                            </button>
                          </div>
                        </div>
                      </td>

                      <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{it.followers.toLocaleString()}</td>
                      <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{it.avg_feed_like.toLocaleString()}</td>
                      <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{it.real_engagement.toLocaleString()}</td>
                      <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{it.er !== undefined ? (it.er * 100).toFixed(2) + ' %' : '—'}</td>
                      <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{it.last_upload_days !== undefined ? `${it.last_upload_days}일 전` : '—'}</td>
                      <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{it.main_audience_age_range}</td>
                    </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: 16, color: '#888' }}>결과가 없습니다.</td></tr>
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
          onApply={(nextFilters: Filters) => { setPage(1); setFilters(nextFilters); }}
        />
      </main>
    </div>
  );
}

/* 아이콘 버튼 공통 스타일 */
const iconBtnStyle: React.CSSProperties = {
  width: 24, height: 24,
  display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center',
  border: '1px solid #ddd',
  borderRadius: 6,
  background: '#fff',
  padding: 0,
  cursor: 'pointer'
};
