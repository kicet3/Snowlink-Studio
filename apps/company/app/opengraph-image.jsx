import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { companyConfig } from '../lib/config';

export const alt = 'Snowlink Studio — AI 캐릭터 시트, 스토리와 영상 제작 작업실';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const screenshot = await readFile(join(process.cwd(), 'public/screenshots/explore.jpg'), 'base64');
  const c = companyConfig();
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#080808', color: '#f3f3ef', padding: '48px 54px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #424242', paddingBottom: 24 }}>
        <span style={{ fontSize: 25, fontWeight: 700 }}>SnowLink</span>
        <span style={{ fontSize: 16, color: '#a7a7a2', letterSpacing: 2 }}>A PLACE FOR YOUR STORIES</span>
      </div>
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 42 }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 376 }}>
          <span style={{ fontSize: 15, letterSpacing: 2, color: '#aaa' }}>AI CONTENT WORKSPACE</span>
          <span style={{ fontSize: 69, fontWeight: 700, lineHeight: 1.08, letterSpacing: -3, marginTop: 23 }}>Snowlink</span>
          <span style={{ fontSize: 69, fontWeight: 700, lineHeight: 1.08, letterSpacing: -3 }}>Studio.</span>
          <span style={{ fontSize: 20, color: '#b7b7b2', marginTop: 26, lineHeight: 1.6 }}>Characters. Stories. Scenes.</span>
        </div>
        <div style={{ display: 'flex', width: 674, padding: 7, background: '#111', border: '1px solid #444', borderRadius: 8 }}>
          <img src={`data:image/jpeg;base64,${screenshot}`} alt="" width={658} height={355}/>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 22, borderTop: '1px solid #424242', color: '#aaa', fontSize: 16 }}>
        <span>FROM AN IDEA TO YOUR NEXT SCENE</span><span>{new URL(c.service.url).hostname}</span>
      </div>
    </div>,
    size,
  );
}
