import { Fragment } from 'react';
import { Icon } from './Icon';

export function Button({ children, variant = 'primary', icon, trailingIcon, className = '', ...props }) {
  return <button type="button" className={`button ${variant} ${className}`} {...props}>{icon && <Icon name={icon}/>}<span>{children}</span>{trailingIcon && <Icon name={trailingIcon}/>}</button>;
}
export function Badge({ children, tone = 'neutral', icon, className = '' }) {
  return <span className={`badge ${className}`} data-tone={tone}>{icon && <Icon name={icon}/>}{children}</span>;
}
export function PageHeading({ eyebrow, index, title, description, actions, ornament, className = '' }) {
  return <header className={`page-heading ${className}`}><div className="heading-copy"><p className="eyebrow">{eyebrow}{index && <> <span>{index}</span></>}</p><h1>{(Array.isArray(title) ? title : [title]).map((line, i) => <Fragment key={i}>{i > 0 && <br/>}{line}</Fragment>)}<span className="accent">.</span></h1><p className="subtitle">{description}</p></div><div className="heading-actions">{ornament && <VectorMark/>}{actions}</div></header>;
}
export function EmptyState({ id, title, description, eyebrow, icon = 'folder', illustration, actions, className = '' }) {
  return <div id={id} className={`empty-state seasonal-surface ${className}`}>{illustration || <span className="empty-symbol"><Icon name={icon}/></span>}{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2><p className="empty-description">{description}</p>{actions}</div>;
}
export function Field({ label, name, value, onChange, rows, options, type = 'text', ...props }) {
  const shared = { name, value: value ?? '', onChange: onChange ? e => onChange(e.target.value) : undefined, ...props };
  return <label className="field"><span>{label}</span>{options ? <select {...shared}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : rows ? <textarea rows={rows} {...shared}/> : <input type={type} {...shared}/>}</label>;
}
export function VectorMark() {
  return <svg className="vector-mark" viewBox="0 0 130 76" fill="none" aria-hidden="true"><path d="m19 52 47-34 46 40Z" stroke="currentColor" strokeDasharray="2 4"/><g stroke="currentColor" fill="var(--color-background)"><path d="M14 47h10v10H14zM61 13h10v10H61zM107 53h10v10h-10z"/></g><path d="M0 71h130" stroke="var(--color-border)"/></svg>;
}
