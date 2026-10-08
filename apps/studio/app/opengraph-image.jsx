import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'Snowlink Team Studio — AI 캐릭터·소설·이미지·영상 제작';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

export default async function Image() {
  const artwork = await readFile(join(process.cwd(), 'public/showcase/moon-post.png'), 'base64');
  const font = await readFile(join(process.cwd(), 'assets/fonts/NanumGothic-Bold.ttf'));
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', background: '#080808', color: '#f3f3ef', fontFamily: 'Nanum Gothic', fontWeight: 700 }}>
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: 550, padding: 48 }}>
      <span style={{ fontSize: 17, color: '#b7b7b2', letterSpacing: 2 }}>A PLACE FOR YOUR STORIES</span>
      <span style={{ fontSize: 76, fontWeight: 700, letterSpacing: -3, marginTop: 35 }}>Snowlink</span><span style={{ fontSize: 62, fontWeight: 700, letterSpacing: -2 }}>Team Studio</span>
      <span style={{ fontSize: 21, color: '#b7b7b2', marginTop: 30 }}>Characters. Stories. Scenes.</span>
      <span style={{ fontSize: 18, marginTop: 52 }}>studio.snowlink.team</span>
    </div>
    <div style={{ display: 'flex', width: 650, padding: '35px 35px 35px 0' }}><img src={`data:image/png;base64,${artwork}`} alt="" width={615} height={560} style={{ objectFit: 'cover', objectPosition: '65% center', borderRadius: 8 }}/></div>
  </div>, { ...size, fonts: [{ name: 'Nanum Gothic', data: font, weight: 700, style: 'normal' }] });
}
