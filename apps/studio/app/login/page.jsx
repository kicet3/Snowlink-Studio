export const dynamic = 'force-dynamic';
import { pageMetadata } from '../_lib/seo';

export const metadata = pageMetadata({'path': '/login', 'title': '계정 로그인 · 네티움 스튜디오', 'description': '네티움 스튜디오 계정에 로그인해 개인 설정과 프로필을 관리하고 MCP 연결을 승인합니다.'});

import { Login } from '../_components/Login';

export default function Page() { return <Login/>; }
