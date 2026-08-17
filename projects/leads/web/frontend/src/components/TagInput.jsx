import { useState } from 'react';

export default function TagInput({ tags, setTags, placeholder = 'Type and press Enter...' }) {
  const [val, setVal] = useState('');

  const commit = () => {
    const t = val.trim().replace(/,$/, '');
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setVal('');
  };

  const onKey = e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
    if (e.key === 'Backspace' && !val && tags.length) setTags(tags.slice(0, -1));
  };

  return (
    <div className="tag-wrap">
      {tags.map(t => (
        <span key={t} className="tag-item">
          {t}
          <button className="tag-remove" onClick={() => setTags(tags.filter(x => x !== t))}>✕</button>
        </span>
      ))}
      <input
        className="tag-inner"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={onKey}
        onBlur={commit}
        placeholder={tags.length ? '' : placeholder}
      />
    </div>
  );
}
