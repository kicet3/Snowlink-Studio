'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useStudio } from './StudioProvider';
import { Button, Field } from './Primitives';
import { studioAction } from '../_lib/api';
import { showcaseWorks } from '../_lib/showcase';

const publicCharacters = showcaseWorks.filter(w => w.kind === 'character').map(c => {
  const work = showcaseWorks.find(w => w.kind === 'novel' && c.relatedIds.includes(w.id));
  return { source: 'public', id: c.id, name: c.title.split(' · ')[0], image: c.image, description: c.summary, href: '/explore/' + c.id, work: { id: work.id, title: work.title, episodes: work.chapters.map(ch => ch.number) } };
});
const keyOf = c => `${c.source}:${c.id}`;
const starters = ['처음 만났네. 너는 이곳에서 어떤 일을 해?', '너에게 소중한 물건 하나를 소개해 줄래?', '내 이름은 별이야. 함께 이곳을 걸어볼까?'];

export function CharacterChat({ initialCharacter, initialSource, initialConversation }) {
  const { user, loading: sessionLoading, error: sessionError, loadSession, save } = useStudio();
  const [characters, setCharacters] = useState(publicCharacters), [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(`${initialSource}:${initialCharacter || 'character-seorin'}`);
  const [scenarioId, setScenarioId] = useState(''), [episode, setEpisode] = useState(1);
  const [conversation, setConversation] = useState(null), [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [draft, setDraft] = useState(''), [creating, setCreating] = useState(false), [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(''), [description, setDescription] = useState('');
  const pending = useRef(null), log = useRef(null), input = useRef(null), operation = useRef(false);
  const character = characters.find(c => keyOf(c) === selected);
  const linkedWork = character?.source === 'public' ? character.work : character?.works?.find(s => s.id === scenarioId);
  function address(id) { window.history.replaceState(null, '', id ? `/chat?conversation=${encodeURIComponent(id)}` : '/chat'); }
  async function refresh() {
    const [catalog, history] = await Promise.all([studioAction('studio_persona_catalog'), studioAction('studio_persona_conversations')]);
    setCharacters(catalog.characters); setConversations(history.conversations);
  }
  useEffect(() => {
    if (!user) return;
    let alive = true;
    setReady(false); setConversation(null); setConversations([]); setDraft(''); pending.current = null;
    (async () => {
      try {
        const [catalog, history] = await Promise.all([studioAction('studio_persona_catalog'), studioAction('studio_persona_conversations')]);
        if (!alive) return;
        setCharacters(catalog.characters); setConversations(history.conversations); setReady(true);
        if (initialConversation) {
          const saved = await studioAction('studio_persona_conversation', { id: initialConversation });
          if (alive) setConversation(saved);
        }
      } catch (err) { if (alive) setError(err.message); }
    })();
    return () => { alive = false; };
  }, [user?.id, initialConversation]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [conversation?.messages.length, busy]);
  function choose(c) { setSelected(keyOf(c)); setScenarioId(''); setEpisode(1); setConversation(null); if (ready) setError(''); setDraft(''); pending.current = null; setConfirmDelete(false); address(); }
  async function run(fn) {
    if (operation.current) return;
    operation.current = true; setBusy(true); setError('');
    try { await fn(); } catch (err) { setError(err.name === 'TimeoutError' ? '답변을 기다리는 시간이 길어지고 있습니다. 대화를 다시 불러오거나 같은 메시지로 재시도해주세요.' : err.message); }
    finally { setBusy(false); operation.current = false; }
  }
  function open(id) { void run(async () => { const saved = await studioAction('studio_persona_conversation', { id }); setConversation(saved); setDraft(''); pending.current = null; setConfirmDelete(false); address(saved.id); }); }
  function start() { void run(async () => {
    const saved = await studioAction('studio_persona_start', { source: character.source, characterId: character.id,
      ...(scenarioId ? { scenarioId } : {}), throughEpisode: linkedWork ? Number(episode) : 0 });
    setConversation(saved); address(saved.id); await refresh(); requestAnimationFrame(() => input.current?.focus());
  }); }
  function send(event) {
    event.preventDefault();
    if (!draft.trim() || busy || !conversation) return;
    void run(async () => {
      const message = draft.trim();
      if (!pending.current || pending.current.message !== message || pending.current.id !== conversation.id) pending.current = { id: conversation.id, revision: conversation.revision, requestId: crypto.randomUUID(), message };
      const saved = await studioAction('studio_persona_send', pending.current);
      setConversation(saved); setDraft(''); pending.current = null;
      // A history-list refresh failure must not turn a successfully saved answer into a retry.
      setConversations(items => [{ ...saved, messageCount: saved.messages.length }, ...items.filter(c => c.id !== saved.id)]);
      requestAnimationFrame(() => input.current?.focus());
    });
  }
  function reload() { void run(async () => {
    if (conversation) {
      const saved = await studioAction('studio_persona_conversation', { id: conversation.id });
      setConversation(saved);
      if (pending.current?.id === saved.id) pending.current.revision = saved.revision;
    }
    await refresh(); setReady(true);
    // A failed send can be retried safely with its original request id; keep the draft.
  }); }
  function create(event) { event.preventDefault(); void run(async () => {
    const c = await save('characters', { name: name.trim(), description: description.trim(), tags: '캐릭터챗', image: '' });
    await refresh(); choose({ ...c, source: 'workspace' }); setCreating(false); setName(''); setDescription('');
  }); }
  function remove() { void run(async () => {
    await studioAction('studio_persona_remove', { id: conversation.id, revision: conversation.revision });
    setConversations(items => items.filter(c => c.id !== conversation.id)); setConversation(null); setDraft(''); pending.current = null; setConfirmDelete(false); address();
  }); }
  const locked = busy || !ready;
  return <div className="studio-page persona-page">
    <header className="persona-intro"><p className="eyebrow">STORY → CHARACTER → CONVERSATION</p><h1>이야기 속 인물과,<br/>오늘의 대화를.</h1><p>이야기 속 대화로, 일상에 작은 연결을.<br/>공개 작품의 캐릭터를 만나거나 나만의 인물에게 편안하게 말을 건네보세요.<br/>성격과 세계관, 선택한 회차의 맥락을 바탕으로 AI가 인물을 연기합니다.</p><div className="persona-links"><Link href="/guide#chat">캐릭터챗 사용법 →</Link><Link href="/guide#experience">이 대화가 지향하는 경험 →</Link><Link href="/scenarios">내 이야기 쓰기 →</Link><Link href="/characters">시트 제작 도우미 →</Link></div></header>
    {sessionLoading && <p role="status">방문자 작업실을 연결하고 있습니다…</p>}
    {sessionError && <div role="alert">{sessionError} <Button variant="secondary" onClick={loadSession}>연결 다시 시도</Button></div>}
    <div className="persona-layout"><aside className="persona-library" aria-label="캐릭터와 대화 기록">
      <h2>만나고 싶은 캐릭터</h2><p className="small muted">작품을 읽고 그 안의 인물과 이야기하세요.</p>
      <div className="persona-choices">{characters.map(c => <button className="persona-choice" type="button" key={keyOf(c)} aria-pressed={!conversation && selected === keyOf(c)} disabled={busy} onClick={() => choose(c)}>{c.image ? <img src={c.image} alt="" loading="lazy"/> : <span className="persona-initial">{c.name.slice(0, 1)}</span>}<span><strong>{c.name}</strong><small>{c.source === 'public' ? c.work.title : '내 캐릭터'}</small></span></button>)}</div>
      <Button variant="secondary" disabled={locked} onClick={() => setCreating(!creating)} aria-expanded={creating}>나만의 캐릭터 만들기</Button>
      {!characters.some(c => c.source === 'workspace') && <p className="small muted">이름과 성격만 있으면 시작할 수 있어요. 이미지는 나중에 추가해도 됩니다.</p>}
      {creating && <form className="persona-create" onSubmit={create}><Field label="캐릭터 이름" value={name} onChange={setName} required maxLength={100}/><Field label="성격·말투·세계관" rows={5} value={description} onChange={setDescription} required maxLength={10000} placeholder="예: 길 잃은 여행자를 돕는 등대지기 루나. 따뜻한 존댓말을 쓰고, 별빛으로 길을 찾는다."/><Button type="submit" disabled={locked || !name.trim() || !description.trim()}>캐릭터 저장</Button></form>}
      <section className="persona-history" aria-labelledby="history-title"><h2 id="history-title">이어서 대화하기</h2>{conversations.length ? conversations.map(c => <button type="button" key={c.id} disabled={busy} aria-current={conversation?.id === c.id ? 'true' : undefined} onClick={() => open(c.id)}><strong>{c.name}</strong><span>{c.workTitle || '캐릭터 설정'} · {Math.floor(c.messageCount / 2)}번의 문답</span><small>{new Date(c.updatedAt).toLocaleDateString('ko-KR')}</small></button>) : <p className="small muted">첫 대화를 시작하면 여기에 기록이 남습니다.</p>}</section>
    </aside><section className="persona-room" aria-label="캐릭터 대화">
      {error && <div className="persona-error" role="alert"><p>{error}</p><Button variant="secondary" disabled={busy || !user} onClick={reload}>대화 다시 불러오기</Button></div>}
      {!conversation ? <div className="persona-setup">{character ? <><p className="eyebrow">{character.source === 'public' ? character.work.title : 'YOUR CHARACTER'}</p><h2>{character.name}에게 말 걸기</h2><p>{character.description}</p>{character.href && <Link className="text-button" href={character.href}>프로필과 원작 읽기 →</Link>}
        {character.source === 'workspace' && <Field label="참고할 작품" value={scenarioId} onChange={id => { setScenarioId(id); setEpisode(character.works?.find(s => s.id === id)?.episodes[0] || 1); }} options={[{ value: '', label: '캐릭터 설정만 사용' }, ...(character.works || []).filter(s => s.episodes.length).map(s => ({ value: s.id, label: s.title }))]}/>}
        {linkedWork && <Field label="어디까지의 이야기를 참고할까요?" value={episode} onChange={setEpisode} options={linkedWork.episodes.map(n => ({ value: n, label: `${n}화까지` }))}/>}
        <p className="small muted">{linkedWork ? '선택한 회차까지의 원고 맥락을 대화 시작 시 저장합니다. 캐릭터 프로필에 적힌 설정은 함께 참고합니다.' : '시나리오에 이 캐릭터를 출연자로 연결하고 원고·이야기 기억을 완성하면 작품도 선택할 수 있습니다.'}</p>
        <Button disabled={locked || !character.description.trim()} onClick={start}>{busy ? '준비 중…' : `${character.name} · 새 대화 시작`}</Button></> : <><h2>캐릭터를 선택해주세요</h2><p>이 작업실에 없는 캐릭터입니다. 목록에서 다른 인물을 선택하거나 직접 만들어보세요.</p></>}
      </div> : <>
        <header className="persona-room-header"><div><p className="eyebrow">AI CHARACTER CHAT</p><h2>{conversation.name}</h2><p>{conversation.workTitle ? `${conversation.workTitle} · ${conversation.throughEpisode}화까지` : '캐릭터 설정으로 대화'} · 기록 자동 저장</p></div><Button variant="quiet-button" disabled={busy} onClick={() => { setConversation(null); setDraft(''); pending.current = null; setConfirmDelete(false); address(); }}>새 대화</Button></header>
        <div className="persona-log" ref={log} role="log" aria-label={`${conversation.name} 대화 기록`} aria-live="polite" aria-relevant="additions text" aria-busy={busy}>
          {!conversation.messages.length && <div className="persona-welcome"><h3>첫 인사를 건네보세요.</h3><p>설정 문서를 만드는 도우미가 아닌, {conversation.name}의 관점으로 대화합니다.</p>{starters.map(message => <button key={message} type="button" disabled={busy} onClick={() => { setDraft(message); input.current?.focus(); }}>{message}</button>)}</div>}
          {conversation.messages.map(m => <article className={`persona-message persona-message-${m.role}`} key={m.id}><strong>{m.role === 'user' ? '나' : conversation.name}</strong><p>{m.content}</p></article>)}
          {busy && <p className="persona-thinking" role="status">답변을 준비하고 있습니다…</p>}
        </div>
        <form className="persona-composer" onSubmit={send}><label htmlFor="persona-message">{conversation.name}에게 할 말</label><textarea id="persona-message" ref={input} rows={3} maxLength={2000} value={draft} disabled={busy} onChange={e => setDraft(e.target.value)} placeholder="인물에게 인사를 건네거나 이야기에 대해 물어보세요."/><div><span>{draft.length.toLocaleString()} / 2,000</span><Button type="submit" disabled={busy || !draft.trim()}>{busy ? '답변 기다리는 중…' : '보내기'}</Button></div></form>
        <details className="persona-memory"><summary>이 대화가 참고하는 기억과 저장 안내</summary><p>시작할 때 저장한 캐릭터 설정과 선택한 회차의 맥락, 최근 최대 20개 메시지를 길이 한도 안에서 참고합니다. 전체 대화 기록을 영구히 기억하는 방식은 아닙니다. 내 작품을 연결하면 완료한 회차의 요약·사실·복선과 마지막 회차 원고 일부를 참고합니다.</p><p>대화는 원작이나 이야기 그래프에 자동 반영되지 않습니다. 설정·원고를 수정한 뒤에는 새 대화를 시작하세요. 답변은 AI의 해석이므로 원작과 다른 내용이 생길 수 있습니다.</p><Button variant="quiet-button" disabled={busy} onClick={() => setConfirmDelete(!confirmDelete)}>이 대화 기록 삭제</Button>{confirmDelete && <div><p>이 대화방의 기록을 삭제할까요? 캐릭터와 원고는 유지됩니다.</p><Button variant="secondary" disabled={busy} onClick={remove}>기록 삭제 확인</Button></div>}</details>
      </>}
    </section></div>
    <p className="persona-storage">{user?.role === 'guest' || !user ? '방문자 기록은 이 브라우저의 방문자 세션에서 다시 열 수 있습니다. 쿠키 삭제·세션 만료 후에는 접근이 어려우며 로그인 계정으로 자동 이전되지 않습니다.' : '대화 기록은 현재 로그인한 계정의 작업실에 저장됩니다.'} 캐릭터챗은 AI가 연기하는 창작 인물과의 대화입니다.</p>
  </div>;
}
