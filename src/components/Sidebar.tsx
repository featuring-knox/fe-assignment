'use client';

type Item = { label: string; active?: boolean };

export default function Sidebar() {
  // 좌측 메뉴 모양만 재현 (동작은 필요 최소한으로)
  const sections: { title?: string; items: Item[] }[] = [
    { items: [{ label: '대시보드' }, { label: '알림' }] },
    {
      title: '인플루언서',
      items: [
        { label: '인플루언서 찾기', active: true },
        { label: '인플루언서 관리' },
        { label: '인플루언서 랭킹' },
        { label: 'AI 리스트' },
      ],
    },
    { title: '캠페인', items: [{ label: '캠페인 관리' }] },
    { title: '기타', items: [{ label: '서비스 가이드' }, { label: '블로그/Insight' }] },
  ];

  return (
    <aside
      style={{
        position: 'sticky',
        top: 0,
        alignSelf: 'start',
        height: '100dvh',
        width: 220,
        borderRight: '1px solid #eee',
        padding: '16px 12px',
        background: '#fff',
      }}
    >
      {sections.map((sec, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          {sec.title && <div style={{ fontSize: 12, color: '#888', margin: '8px 8px' }}>{sec.title}</div>}
          {sec.items.map((it) => (
            <div
              key={it.label}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                margin: '4px 6px',
                background: it.active ? '#f2f4f7' : 'transparent',
                fontWeight: it.active ? 600 : 400,
                cursor: 'default',
              }}
            >
              {it.label}
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
}
