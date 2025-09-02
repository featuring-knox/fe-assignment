'use client';

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onChange: (nextPage: number) => void;
};

export default function Pagination({ page, pageSize, total, onChange }: Props) {
  const hasPrev = page > 1;
  const hasNext = page * pageSize < total;

  return (
    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
      <button disabled={!hasPrev} onClick={() => hasPrev && onChange(page - 1)}>이전</button>
      <span>페이지 {page}</span>
      <button disabled={!hasNext} onClick={() => hasNext && onChange(page + 1)}>다음</button>
      <span style={{ color: '#666' }}>(총 {total}개)</span>
    </div>
  );
}
