export const dynamic = 'force-dynamic';
import { pageMetadata } from '../_lib/seo';

export const metadata = pageMetadata({'path': '/profile', 'title': '내 프로필 · 네티움 스튜디오', 'description': '네티움 스튜디오 계정 정보와 개인 프로필을 관리합니다.'});

import { Profile } from '../_components/Profile';
import { RequireAccount } from '../_components/RequireAccount';

export default function Page() { return <RequireAccount><div className="studio-page"><Profile/></div></RequireAccount>; }
