'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStudio } from './StudioProvider';

export function RequireAccount({ children }) {
  const { user, loading } = useStudio(), router = useRouter(), pathname = usePathname();
  const signedIn = !!user && user.role !== 'guest';
  useEffect(() => { if (!loading && !signedIn) router.replace('/login?next=' + encodeURIComponent(pathname)); }, [loading, signedIn, pathname, router]);
  return signedIn ? children : <div className="studio-page"><p role="status">계정 로그인을 확인하고 있습니다…</p></div>;
}
