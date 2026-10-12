/**
 * Status messages. `tone="error"` uses role=alert (announced immediately);
 * everything else is a polite status.
 */
export default function Notice({ tone = 'info', title, children, action }) {
  const role = tone === 'error' ? 'alert' : 'status';
  return (
    <div className={`notice notice-${tone}`} role={role}>
      {title && <p className="notice-title">{title}</p>}
      {children && <div className="notice-body">{children}</div>}
      {action && <div className="notice-action">{action}</div>}
    </div>
  );
}
