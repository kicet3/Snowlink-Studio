import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { companyConfig } from '../lib/config';

export const alt = 'Snowlink Team Studio — 이야기 창작과 캐릭터챗';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const artwork = await readFile(join(process.cwd(), 'public/artwork/moon-post.png'), 'base64');
  const font = await readFile(join(process.cwd(), 'assets/fonts/NanumGothic-Bold.ttf'));
  const c = companyConfig();
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#080808', color: '#f3f3ef', padding: '48px 54px', fontFamily: 'Nanum Gothic', fontWeight: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #424242', paddingBottom: 24 }}>
        <span style={{ fontSize: 25, fontWeight: 700 }}>{c.brand}</span>
        <span style={{ fontSize: 16, color: '#a7a7a2', letterSpacing: 2 }}>A PLACE FOR YOUR STORIES</span>
      </div>
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 42 }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 376 }}>
          <span style={{ fontSize: 15, letterSpacing: 2, color: '#aaa' }}>STORY & CHARACTER CHAT</span>
          <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.2, letterSpacing: -3, marginTop: 23 }}>Snowlink</span>
          <span style={{ fontSize: 51, fontWeight: 700, lineHeight: 1.2, letterSpacing: -2 }}>Team Studio</span>
          <span style={{ fontSize: 20, color: '#b7b7b2', marginTop: 26, lineHeight: 1.6 }}>Write stories. Talk to characters.</span>
        </div>
        <div style={{ display: 'flex', width: 674, padding: 7, background: '#111', border: '1px solid #444', borderRadius: 8 }}>
          <img src={`data:image/png;base64,${artwork}`} alt="" width={658} height={355} style={{ objectFit: 'cover' }}/>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 22, borderTop: '1px solid #424242', color: '#aaa', fontSize: 16 }}>
        <span>FROM AN IDEA TO YOUR NEXT SCENE</span><span>{new URL(c.service.url).hostname}</span>
      </div>
    </div>,
    { ...size, fonts: [{ name: 'Nanum Gothic', data: font, weight: 700, style: 'normal' }] },
  );
}
