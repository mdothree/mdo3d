export default function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled,
  as = 'input',
  options = [],
}) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {as === 'select' ? (
        <select className="field-input" value={value} onChange={onChange} disabled={disabled}>
          {options.map(o => (
            <option key={o.value || o} value={o.value || o}>
              {o.label || o}
            </option>
          ))}
        </select>
      ) : as === 'textarea' ? (
        <textarea
          className="field-input"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
        />
      ) : (
        <input
          className="field-input"
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
    </div>
  );
}
