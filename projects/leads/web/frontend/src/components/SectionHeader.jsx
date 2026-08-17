export default function SectionHeader({ label, title, desc }) {
  return (
    <div className="sec-hd">
      {label && <div className="sec-hd-label">{label}</div>}
      <div className="sec-hd-title">{title}</div>
      {desc && <div className="sec-hd-desc">{desc}</div>}
    </div>
  );
}
