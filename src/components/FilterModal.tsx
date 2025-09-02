'use client';

import { useEffect, useRef, useState } from 'react';

export type Filters = {
  min_follower?: number;
  max_follower?: number;
  min_avg_feed_like?: number;
  max_avg_feed_like?: number;
  min_real_engagement?: number;
  max_real_engagement?: number;
  main_audience_age_range?: string;
  is_verified?: boolean;
  main_audience_gender?: 'male' | 'female';
};

type Props = {
  open: boolean;
  initial: Filters;
  onClose: () => void;
  onApply: (next: Filters) => void;
};

export default function FilterModal({ open, initial, onClose, onApply }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Filters>(initial);

  useEffect(() => { setDraft(initial); }, [initial]);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  const number = (v: string) => (v === '' ? undefined : Number(v));

  return (
    <dialog ref={ref} style={{ padding: 0, border: 'none', borderRadius: 12 }}>
      <form method="dialog" style={{ width: 600, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>고급 필터 설정</h3>

        {/* Range 1: followers */}
        <div style={{ display: 'flex', gap: 8 }}>
          <label>min_follower:
            <input type="number" value={draft.min_follower ?? ''} onChange={(e) => setDraft({ ...draft, min_follower: number(e.target.value) })}/>
          </label>
          <label>max_follower:
            <input type="number" value={draft.max_follower ?? ''} onChange={(e) => setDraft({ ...draft, max_follower: number(e.target.value) })}/>
          </label>
        </div>

        {/* Range 2: avg_feed_like */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <label>min_avg_feed_like:
            <input type="number" value={draft.min_avg_feed_like ?? ''} onChange={(e) => setDraft({ ...draft, min_avg_feed_like: number(e.target.value) })}/>
          </label>
          <label>max_avg_feed_like:
            <input type="number" value={draft.max_avg_feed_like ?? ''} onChange={(e) => setDraft({ ...draft, max_avg_feed_like: number(e.target.value) })}/>
          </label>
        </div>

        {/* (선택) Range 3: real_engagement */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <label>min_real_engagement:
            <input type="number" value={draft.min_real_engagement ?? ''} onChange={(e) => setDraft({ ...draft, min_real_engagement: number(e.target.value) })}/>
          </label>
          <label>max_real_engagement:
            <input type="number" value={draft.max_real_engagement ?? ''} onChange={(e) => setDraft({ ...draft, max_real_engagement: number(e.target.value) })}/>
          </label>
        </div>

        {/* Select: age range */}
        <div style={{ marginTop: 8 }}>
          <label>main_audience_age_range:{' '}
            <select value={draft.main_audience_age_range ?? ''} onChange={(e) => setDraft({ ...draft, main_audience_age_range: e.target.value || undefined })}>
              <option value="">(any)</option>
              <option value="13-17">13-17</option>
              <option value="18-24">18-24</option>
              <option value="25-34">25-34</option>
              <option value="35-44">35-44</option>
            </select>
          </label>
        </div>

        {/* Checkbox + gender select */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8 }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={draft.is_verified ?? false}
              onChange={(e) => setDraft({ ...draft, is_verified: e.target.checked ? true : undefined })}/>
            is_verified
          </label>

          <label>main_audience_gender:{' '}
            <select value={draft.main_audience_gender ?? ''} onChange={(e) => setDraft({ ...draft, main_audience_gender: (e.target.value || undefined) as Filters['main_audience_gender'] })}>
              <option value="">(any)</option>
              <option value="male">male</option>
              <option value="female">female</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" onClick={onClose}>취소</button>
          <button type="button" onClick={() => { onApply(draft); onClose(); }}>필터 적용</button>
        </div>
      </form>
    </dialog>
  );
}
