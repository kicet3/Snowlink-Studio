'use client';

import dynamic from 'next/dynamic';

const MediaStudio = dynamic(() => import('./MediaStudio').then(module => module.MediaStudio), {
  ssr: false,
  loading: () => <div className="page-loading">제작 화면을 불러오고 있어요…</div>,
});

export default function Page() {
  return <MediaStudio active={true}/>;
}
