(() => {
  let controller;
  let opener;
  const dialog = document.createElement('dialog');
  dialog.className = 'keyword-discovery';
  dialog.setAttribute('aria-labelledby', 'discovery-title');
  dialog.innerHTML = '<header><div><h2 id="discovery-title">키워드 관련 영상</h2><p data-discovery-summary></p></div><button type="button" data-discovery-close aria-label="관련 영상 닫기">닫기</button></header><div data-discovery-results aria-live="polite"></div>';
  document.body.append(dialog);
  dialog.querySelector('[data-discovery-close]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { controller?.abort(); opener?.focus(); });
  const e = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-discovery-keyword]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    opener = button;
    controller?.abort();
    const request = controller = new AbortController();
    const keyword = button.dataset.discoveryKeyword;
    const country = document.querySelector('.country.active')?.dataset.country || 'KR';
    dialog.querySelector('h2').textContent = `${keyword} · SNS 관련 영상`;
    dialog.querySelector('[data-discovery-summary]').textContent = 'YouTube·Shorts는 키워드 검색, TikTok은 수집 영상 내 검색입니다.';
    const results = dialog.querySelector('[data-discovery-results]');
    results.textContent = '관련 영상을 조회하고 있습니다…';
    dialog.showModal();
    try {
      const response = await fetch('/_studio/discovery?' + new URLSearchParams({ keyword, country }), { signal: request.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '조회에 실패했습니다.');
      if (request !== controller) return;
      results.innerHTML = data.sources.map(source => `<section><div class="discovery-source"><h3>${e(source.label)}</h3><a href="${e(source.searchUrl)}" target="_blank" rel="noopener noreferrer">직접 검색 ↗</a></div><p>${e(source.scope)}${source.note ? ' · ' + e(source.note) : ''}</p><div class="discovery-grid">${source.items.map(item => `<a class="discovery-card" href="${e(item.url)}" target="_blank" rel="noopener noreferrer">${item.thumbnail ? `<img src="/api/img?u=${encodeURIComponent(item.thumbnail)}" loading="lazy" alt="">` : ''}<strong>${e(item.title)}</strong><span>${e(item.author)}</span></a>`).join('')}</div></section>`).join('');
    } catch (error) { if (!request.signal.aborted) results.textContent = error.message; }
  });
  // Enhance original trend links; all original navigation and feed controls remain intact.
  const enhance = () => {
    for (const anchor of document.querySelectorAll('.tkw')) {
      if (anchor.parentElement.querySelector('[data-discovery-keyword]')) continue;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'discovery-trigger';
      button.textContent = 'SNS 영상'; button.dataset.discoveryKeyword = anchor.textContent.trim();
      button.setAttribute('aria-label', `${anchor.textContent.trim()} 관련 SNS 영상 보기`);
      anchor.after(button);
    }
  };
  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
  enhance();
})();
