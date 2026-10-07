'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStudio } from './StudioProvider';
import { Badge, Button, PageHeading } from './Primitives';
import { Icon } from './Icon';
import { ProductionEditor, ProductionBrief } from './ProductionEditor';
import { FORMATS, STAGES } from '../_lib/api';

const GROUPS = [
  { name: '기획', stages: ['idea', 'script'], text: '떠오른 아이디어를 기록하세요', tone: 'maple' },
  { name: '제작', stages: ['production'], text: '준비된 기획을 제작으로 옮기세요', tone: 'ochre' },
  { name: '검토 · 완료', stages: ['review', 'done'], text: '완성한 콘텐츠를 모아보세요', tone: 'pine' },
];
export function Board() {
  const { workspace, openModal } = useStudio(), router = useRouter();
  const [format, setFormat] = useState('all'), [query, setQuery] = useState(''), [archived, setArchived] = useState(false);
  const edit = (item, format = 'story') => openModal(item ? '콘텐츠 기획 수정' : '새로운 이야기를 시작하세요', <ProductionEditor existing={item} format={format}/>, true);
  const items = workspace.productions.filter(p => p.archived === archived && (format === 'all' || p.format === format) && (p.title + p.story).toLowerCase().includes(query.toLowerCase()));
  return <div className="page"><PageHeading eyebrow="A LITTLE SPARK, A NEW STORY" index="01 / BOARD" title="아이디어를, 하나의 콘텐츠로" description="발견하고, 캐릭터를 고르고, 이야기를 완성하는 나의 제작 공간." ornament actions={<Button icon="plus" onClick={() => edit(null)}>새 콘텐츠</Button>}/>
    <div className="workflow-strip"><div className="workflow-intro"><span className="eyebrow">YOUR WORKFLOW</span><strong>흐름은 하나로.</strong></div>{[['trends','트렌드 발견','이야기의 시작점을 찾고'],['characters','캐릭터 선택','이야기에 어울리는 얼굴을'],['ima2','콘텐츠 제작','이미지와 영상으로 완성']].map(([tab,title,description],i)=><button key={tab} onClick={()=>router.push('/'+tab)}><span className="step-number">0{i+1}</span><span>{title}<small>{description}</small></span><Icon name="arrow"/></button>)}</div>
    <div className="section-heading"><h2>어떤 이야기를 만들까요?</h2><span className="small muted">형식을 선택해 기획을 시작하세요</span></div>
    <div className="format-grid">{Object.entries(FORMATS).map(([id,f])=><button key={id} className="surface-card action-card" data-tone={f.tone} onClick={()=>edit(null,id)}><span className="action-card-icon"><Icon name={f.icon}/></span><span className="action-card-copy"><strong>{f.label}</strong><small>{f.detail}</small></span><span className="action-card-meta">{f.channel}</span><Icon name="arrow"/></button>)}</div>
    <div className="board-toolbar"><div className="board-title"><h2>제작 보드</h2><span className="counter">{workspace.productions.filter(p=>p.archived===archived).length}</span></div><div className="filters"><select id="format-filter" aria-label="콘텐츠 형식 필터" value={format} onChange={e=>setFormat(e.target.value)}><option value="all">모든 형식</option>{Object.entries(FORMATS).map(([id,f])=><option key={id} value={id}>{f.label}</option>)}</select><label className="search-field"><Icon name="search"/><input id="board-search" aria-label="콘텐츠 검색" placeholder="콘텐츠 검색" value={query} onChange={e=>setQuery(e.target.value)}/></label><button id="archive-filter" className={`quiet-button ${archived?'selected':''}`} aria-pressed={archived} onClick={()=>setArchived(!archived)}>보관함</button></div></div>
    <div className="board-grid" id="board-grid">{GROUPS.map((group,index)=>{
      const rows=items.filter(p=>group.stages.includes(p.stage)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
      return <section key={group.name} className="board-column" data-tone={group.tone}><div className="column-heading"><span className="stage-dot"/><h3>{group.name}</h3><span>{String(rows.length).padStart(2,'0')}</span></div><div className="column-content">{rows.length?rows.map(item=>{
        const type=FORMATS[item.format],cast=item.characterIds.map(id=>workspace.characters.find(c=>c.id===id)).filter(Boolean);
        return <article key={item.id} className="surface-card production-card"><div className="card-top"><Badge tone={type.tone} icon={type.icon}>{type.label}</Badge><span className="small muted">{STAGES[item.stage]}</span></div><button className="card-title" onClick={()=>edit(item)}>{item.title}</button><p className="card-story">{item.story||'이야기나 핵심 메시지를 추가해보세요.'}</p><div className="cast-line">{cast.slice(0,3).map(c=>c.image?<img key={c.id} src={c.image} alt={c.name}/>:<span key={c.id} className="avatar">{c.name[0]}</span>)}<span>{cast.map(c=>c.name).join(', ')||'캐릭터 미선택'}</span></div><div className="card-footer"><span>{new Date(item.updatedAt).toLocaleDateString('ko-KR',{month:'short',day:'numeric'})} 수정</span><button className="text-button" onClick={()=>openModal('제작 지시서',<ProductionBrief item={item}/>)}>제작 지시서 <Icon name="arrow"/></button></div></article>;
      }):<div className="column-empty"><Icon name={index===0?'folder':index===1?'film':'check'}/><span>{group.text}</span></div>}</div>{index===0&&!archived&&<Button variant="add-row" icon="plus" onClick={()=>edit(null,format==='all'?'story':format)}>아이디어 추가</Button>}</section>;
    })}</div>
    <footer className="page-footer"><span><span className="save-dot"/> 이 Mac에 저장 · 연결된 기기에서 함께 사용</span><a href="/api/export" download="snowlink-backup.json"><Icon name="download"/> 기획 데이터 백업</a></footer>
  </div>;
}
