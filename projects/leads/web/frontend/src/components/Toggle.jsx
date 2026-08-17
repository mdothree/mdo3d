export default function Toggle({ on, onToggle }) {
  return (
    <button className={`toggle ${on ? 'on' : ''}`} onClick={onToggle} type="button">
      <div className="toggle-knob" />
    </button>
  );
}
