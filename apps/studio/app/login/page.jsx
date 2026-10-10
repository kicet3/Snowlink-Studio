export const dynamic = 'force-dynamic';
import { pageMetadata } from '../_lib/seo';

export const metadata = pageMetadata({'path': '/login', 'title': '계정 로그인 · Snowlink Team Studio', 'description': 'Snowlink Team Studio에 로그인해 캐릭터챗, 이야기 창작과 나의 작업실을 사용하세요.'});

import { Login } from '../_components/Login';

export default function Page() { return <Login/>; }
