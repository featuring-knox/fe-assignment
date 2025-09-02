'use client';

import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>FE Jr 과제 – 홈</h1>
      <p>아래 버튼을 눌러 Discover 페이지로 이동하세요.</p>
      <Link href="/discover" style={{ display: 'inline-block', padding: 10, border: '1px solid #ddd', borderRadius: 6 }}>
        Go to /discover
      </Link>
    </main>
  );
}
