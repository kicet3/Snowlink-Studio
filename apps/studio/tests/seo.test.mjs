import test from 'node:test';
import assert from 'node:assert/strict';
import { pageMetadata, publicMetadata, publicStructuredData, PUBLIC_PAGES, STUDIO_URL } from '../app/_lib/seo.js';
import { publicText } from '../app/_lib/public-text.js';
import { GUIDE_FAQ } from '../app/_lib/guide.js';

test('only public pages opt into indexing and query parameters do not create canonical duplicates', () => {
  for (const page of PUBLIC_PAGES) {
    const meta = publicMetadata(page.path);
    assert.equal(meta.robots.index, true);
    assert.equal(meta.alternates.canonical, new URL(page.path, STUDIO_URL).href);
    assert.equal(meta.openGraph.url, meta.alternates.canonical);
    assert.equal(meta.twitter.description, meta.description);
  }
  for (const path of ['/login?next=%2Fsettings', '/settings', '/profile', '/board', '/oauth/opaque-id', '/checkout?plan=pro&cycle=yearly', '/ima2/graph/opaque-id', '/explore/moon-post-office', '/creators/moon-writer']) {
    const meta = pageMetadata({ path, title: '개인 또는 예시 화면' });
    assert.equal(meta.robots.index, false);
    assert.equal(new URL(meta.alternates.canonical).search, '');
    assert.equal(new URL(meta.alternates.canonical).origin, STUDIO_URL);
  }
  assert.throws(() => pageMetadata({ path: '//other.invalid', title: 'wrong origin' }));
});

test('guide structured answers and public text match visible facts without invented offers', () => {
  const structured = publicStructuredData('/guide', { faq: GUIDE_FAQ });
  const faq = structured['@graph'].find(item => item['@type'] === 'FAQPage');
  assert.deepEqual(faq.mainEntity.map(item => item.acceptedAnswer.text), GUIDE_FAQ.map(item => item.answer));
  for (const item of GUIDE_FAQ) assert(publicText({ full: true }).includes(item.answer));
  assert(!JSON.stringify(structured).includes('"offers"'));
  assert(!JSON.stringify(structured).includes('aggregateRating'));
  assert(publicText({ full: true }).includes('실제 사용자 게시물이 아닙니다'));
});
