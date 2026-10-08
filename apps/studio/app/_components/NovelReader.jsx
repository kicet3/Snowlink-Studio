'use client';
import { useState } from 'react';
import { Button } from './Primitives';

export function NovelReader({ title, chapters }) {
  const [index, setIndex] = useState(0);
  const chapter = chapters[index];
  return <section className="novel-reader" aria-label={`${title} 원고 읽기`}>
    <label className="novel-chapter-picker">회차 선택<select value={index} onChange={event => setIndex(Number(event.target.value))}>{chapters.map((item, i) => <option key={item.number} value={i}>{item.number}화. {item.title}</option>)}</select></label>
    <article aria-live="polite"><p className="eyebrow">EPISODE {String(chapter.number).padStart(2, '0')}</p><h2>{chapter.title}</h2><div className="novel-body">{chapter.body.split('\n\n').map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div></article>
    <nav className="novel-reader-nav" aria-label="원고 회차 이동"><Button variant="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>이전 화</Button><span>{index + 1} / {chapters.length}</span><Button variant="secondary" disabled={index === chapters.length - 1} onClick={() => setIndex(index + 1)}>다음 화</Button></nav>
  </section>;
}
