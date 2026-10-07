'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../_lib/api';
import { Button } from './Primitives';

const Context = createContext(null);
export const useStudio = () => useContext(Context);

export async function isolateAccount(user) {
  try {
    if (localStorage.getItem('snowfall.account-id') === user.id) return;
    localStorage.clear(); sessionStorage.clear(); localStorage.setItem('snowfall.account-id', user.id);
  } catch { /* Storage may be disabled. */ }
  try { for (const db of await indexedDB.databases()) if (db.name) indexedDB.deleteDatabase(db.name); } catch { /* Optional storage. */ }
}

export function StudioProvider({ children }) {
  const [user, setUser] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [workspace, setWorkspace] = useState({ characters: [], productions: [] });
  const [connections, setConnections] = useState({}), [message, setMessage] = useState(''), [modal, setModal] = useState(null);
  const toastTimer = useRef(), dialog = useRef();
  const toast = useCallback(value => { setMessage(value); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setMessage(''), 4000); }, []);
  const refresh = useCallback(async () => {
    const data = await api('/api/workspace'); setWorkspace(data);
    document.dispatchEvent(new Event('workspace-updated')); return data;
  }, []);
  const authenticate = useCallback(async account => { await isolateAccount(account); setUser(account); }, []);
  const loadSession = useCallback(async () => {
    setLoading(true); setError('');
    try { const session = await api('/api/auth/session'); if (session.user) await authenticate(session.user); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [authenticate]);
  useEffect(() => { void loadSession(); return () => clearTimeout(toastTimer.current); }, [loadSession]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const update = async () => { try { const result = await api('/api/connections'); if (!cancelled) setConnections(result); } catch { if (!cancelled) setConnections({}); } };
    void refresh().catch(err => toast(err.message)); void update();
    const interval = setInterval(() => { if (!document.hidden) void update(); }, 20000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user, refresh, toast]);
  const closeModal = useCallback(() => setModal(null), []);
  useEffect(() => {
    if (modal && !dialog.current.open) dialog.current.showModal();
    if (!modal && dialog.current?.open) dialog.current.close();
  }, [modal]);
  const openModal = useCallback((title, content, wide = false) => setModal({ title, content, wide, key: crypto.randomUUID() }), []);
  const save = useCallback(async (kind, values, existing) => {
    const saved = await api(`/api/${kind}${existing ? '/' + existing.id : ''}`, existing ? 'PUT' : 'POST', { ...existing, ...values });
    await refresh(); return saved;
  }, [refresh]);
  async function logout() {
    try { await api('/api/auth/logout', 'POST', {}); localStorage.clear(); sessionStorage.clear(); location.reload(); }
    catch (err) { toast(err.message); }
  }
  return <Context.Provider value={{ user, loading, error, loadSession, authenticate, workspace, refresh, save, connections, toast, openModal, closeModal, logout }}>
    {children}
    <div id="toast" role="status" aria-live="polite" hidden={!message}>{message}</div>
    <dialog ref={dialog} id="editor" aria-labelledby="dialog-title" className={modal?.wide ? 'wide-dialog' : ''} onClose={closeModal}>
      {modal && <div key={modal.key} style={{display:'contents'}}><div className="dialog-heading"><div><p className="eyebrow">SNOWLINK-STUDIO</p><h2 id="dialog-title">{modal.title}</h2></div><Button variant="icon-button" icon="close" aria-label="닫기" onClick={closeModal}/></div>{modal.content}</div>}
    </dialog>
  </Context.Provider>;
}
