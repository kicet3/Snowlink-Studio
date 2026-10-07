'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import App from '../_vendor/ima2-ui/src/App';
import { StudioBridge } from '../_vendor/ima2-ui/src/StudioBridge';
import { bootstrapLanSession } from '../_vendor/ima2-ui/src/lib/lanSession';
import { initTheme } from '../_vendor/ima2-ui/src/hooks/useTheme';
import { startStudioPreferences } from '../_vendor/ima2-ui/src/snowfall';
import { loadStudioBrief } from '../_vendor/ima2-ui/src/studio-production';
import { useAppStore } from '../_vendor/ima2-ui/src/store/useAppStore';
import { api } from '../_lib/api';
import { useStudio } from './StudioProvider';
import { CharacterEditor } from './CharacterEditor';
import '../_vendor/ima2-ui/src/index.css';
import '../_vendor/ima2-ui/src/studio-imports.css';
import '../_styles/media-theme.css';
let initialized=false;
export function MediaStudio({active}){
 const {openModal,toast}=useStudio(),pathname=usePathname(),[ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let live=true;bootstrapLanSession().then(()=>{if(!live)return;if(!initialized){initTheme();startStudioPreferences();initialized=true;}setReady(true);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[]);
 useEffect(()=>{const register=async event=>{try{const {image}=await api('/api/media','POST',{data:event.detail.dataUrl});openModal('캐릭터 등록',<CharacterEditor draft={{image,description:event.detail.prompt}}/>);}catch(e){toast(e.message);}};const load=event=>{void loadStudioBrief(event.detail).catch(e=>toast(e.message));};document.addEventListener('studio:register-character',register);document.addEventListener('studio:load-production',load);return()=>{document.removeEventListener('studio:register-character',register);document.removeEventListener('studio:load-production',load);};},[openModal,toast]);
 useEffect(()=>{if(!active||!ready)return;const match=/^\/ima2\/graph\/([\w-]+)$/.exec(pathname);if(match)useAppStore.getState().switchSession(match[1]).then(()=>useAppStore.getState().setUIMode('node')).catch(()=>toast('노드를 열지 못했습니다. 시나리오 화면에서 다시 열어주세요.'));try{const pending=sessionStorage.getItem('snowlink.pending-production');if(pending){sessionStorage.removeItem('snowlink.pending-production');void loadStudioBrief(JSON.parse(pending)).catch(e=>toast(e.message));}}catch(e){toast(e.message);}},[active,ready,pathname,toast]);
 return <div className="snowfall-media" data-theme="light"><div id="studio-media-root">{error?<p role="alert">{error}</p>:ready&&active?<><StudioBridge/><App/></>:!ready?<p role="status">제작 화면을 불러오고 있어요…</p>:null}</div></div>;
}
