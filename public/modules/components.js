import { escape as e, icon } from './ui.js';

// Only app-owned markup belongs in *Html slots. User text goes through escaped props.
function attributes(values = {}) {
  return Object.entries(values).map(([key, value]) => {
    if (!/^(id|type|disabled|name|value|required|maxlength|min|max|step|aria-[\w-]+|data-[\w-]+)$/.test(key)) throw new Error(`Unsupported component attribute: ${key}`);
    if (value == null) return '';
    if (['disabled', 'required'].includes(key)) return value ? ` ${key}` : '';
    return ` ${key}="${e(value)}"`;
  }).join('');
}
export function button(label, { variant = 'primary', iconName, trailingIcon, attrs = {} } = {}) {
  if (!['primary', 'secondary', 'quiet-button', 'text-button', 'icon-button', 'add-row'].includes(variant)) throw new Error('Unknown button variant');
  return `<button class="button ${variant}"${attributes({ type: 'button', ...attrs })}>${iconName ? icon(iconName) : ''}<span>${e(label)}</span>${trailingIcon ? icon(trailingIcon) : ''}</button>`;
}
export function badge(label, { tone = 'neutral', iconName, className = '' } = {}) {
  return `<span class="badge ${e(className)}" data-tone="${e(tone)}">${iconName ? icon(iconName) : ''}${e(label)}</span>`;
}
export function pageHeading({ eyebrow, index, title, description, actionsHtml = '', ornament = false, className = '' }) {
  const titleHtml = (Array.isArray(title) ? title : [title]).map(e).join('<br>');
  return `<header class="page-heading ${e(className)}"><div class="heading-copy"><p class="eyebrow">${e(eyebrow)}${index ? ` <span>${e(index)}</span>` : ''}</p><h1>${titleHtml}<span class="accent">.</span></h1><p class="subtitle">${e(description)}</p></div><div class="heading-actions">${ornament ? seasonMark() : ''}${actionsHtml}</div></header>`;
}
export function emptyState({ id, title, description, eyebrow = '', iconName = 'folder', illustrationHtml, actionsHtml = '', className = '' }) {
  return `<div class="empty-state seasonal-surface ${e(className)}"${id ? ` id="${e(id)}"` : ''}>${illustrationHtml || `<span class="empty-symbol">${icon(iconName)}</span>`}${eyebrow ? `<p class="eyebrow">${e(eyebrow)}</p>` : ''}<h2>${e(title)}</h2><p class="empty-description">${e(description)}</p>${actionsHtml}</div>`;
}
export function actionCard({ title, description, meta, iconName, tone = 'maple', attrs }) {
  return `<button class="surface-card action-card" data-tone="${e(tone)}"${attributes({ type: 'button', ...attrs })}><span class="action-card-icon">${icon(iconName)}</span><span class="action-card-copy"><strong>${e(title)}</strong><small>${e(description)}</small></span><span class="action-card-meta">${e(meta)}</span>${icon('arrow')}</button>`;
}
export function field({ label, name, value = '', type = 'text', placeholder = '', rows, options, attrs = {} }) {
  const props = attributes({ name, ...attrs });
  let control;
  if (options) control = `<select${props}>${options.map(option => `<option value="${e(option.value)}" ${option.value === value ? 'selected' : ''}>${e(option.label)}</option>`).join('')}</select>`;
  else if (rows) control = `<textarea${props} rows="${Number(rows)}" placeholder="${e(placeholder)}">${e(value)}</textarea>`;
  else control = `<input${props} type="${e(type)}" value="${e(value)}" placeholder="${e(placeholder)}">`;
  return `<label class="field"><span>${e(label)}</span>${control}</label>`;
}
export function dialogHeading(title) {
  return `<div class="dialog-heading"><div><p class="eyebrow">Snowframe Studio</p><h2 id="dialog-title">${e(title)}</h2></div>${button('', { variant: 'icon-button', iconName: 'close', attrs: { 'data-close': true, 'aria-label': '닫기' } })}</div>`;
}
function seasonMark() {
  return `<svg class="season-mark" viewBox="0 0 130 76" fill="none" aria-hidden="true"><g class="season-snow" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M33 9v53M10 22l46 26M10 48l46-26M24 13l9 9 9-9M24 58l9-9 9 9M12 31l12-3-3-12m25 39 3-12 12-3M12 40l12 3-3 12m25-39 3 12 12 3"/></g><g class="season-leaf"><path d="M76 58C54 33 76 13 113 13c-2 32-10 54-37 45Z" fill="currentColor"/><path d="M69 69 101 26m-21 30-1-15m10 2 13-1" stroke="var(--color-surface)" stroke-width="1.4" stroke-linecap="round"/></g><circle cx="116" cy="64" r="2" fill="var(--color-accent-border)"/></svg>`;
}
