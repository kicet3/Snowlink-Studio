import { Fragment } from 'react';
import { Icon } from './Icon';

export function Button({ children, variant = 'primary', icon, trailingIcon, className = '', ...props }) {
  return <button type="button" className={`button ${variant} ${className}`} {...props}>{icon && <Icon name={icon}/>}<span>{children}</span>{trailingIcon && <Icon name={trailingIcon}/>}</button>;
}
export function Badge({ children, tone = 'neutral', icon, className = '' }) {
  return <span className={`badge ${className}`} data-tone={tone}>{icon && <Icon name={icon}/>}{children}</span>;
}
export function PageHeading({ eyebrow, index, title, description, actions, ornament, className = '' }) {
  return <header className={`page-heading ${className}`}><div className="heading-copy"><p className="eyebrow">{eyebrow}{index && <> <span>{index}</span></>}</p><h1>{(Array.isArray(title) ? title : [title]).map((line, i) => <Fragment key={i}>{i > 0 && <br/>}{line}</Fragment>)}<span className="accent">.</span></h1><p className="subtitle">{description}</p></div><div className="heading-actions">{ornament && <SeasonMark/>}{actions}</div></header>;
}
export function EmptyState({ id, title, description, eyebrow, icon = 'folder', illustration, actions, className = '' }) {
  return <div id={id} className={`empty-state seasonal-surface ${className}`}>{illustration || <span className="empty-symbol"><Icon name={icon}/></span>}{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2><p className="empty-description">{description}</p>{actions}</div>;
}
export function Field({ label, name, value, onChange, rows, options, type = 'text', ...props }) {
  const shared = { name, value: value ?? '', onChange: onChange ? e => onChange(e.target.value) : undefined, ...props };
  return <label className="field"><span>{label}</span>{options ? <select {...shared}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : rows ? <textarea rows={rows} {...shared}/> : <input type={type} {...shared}/>}</label>;
}
export function SeasonMark() {
  return <svg className="season-mark" viewBox="0 0 130 76" fill="none" aria-hidden="true"><g className="season-snow" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M33 9v53M10 22l46 26M10 48l46-26M24 13l9 9 9-9M24 58l9-9 9 9M12 31l12-3-3-12m25 39 3-12 12-3M12 40l12 3-3 12m25-39 3 12 12 3"/></g><g className="season-leaf"><path d="M76 58C54 33 76 13 113 13c-2 32-10 54-37 45Z" fill="currentColor"/><path d="M69 69 101 26m-21 30-1-15m10 2 13-1" stroke="var(--color-surface)" strokeWidth="1.4" strokeLinecap="round"/></g><circle cx="116" cy="64" r="2" fill="var(--color-accent-border)"/></svg>;
}
