/**
 * State picker: a labelled native <select> is the primary control (works on
 * every device and screen reader). On wider screens a tile-grid map of the US
 * is shown as an enhancement. Only states the backend reports as live are
 * selectable; the rest are marked "coming" and carry no data.
 */
export default function StatePicker({ states, value, onChange }) {
  const live = states.filter((s) => s.status === 'live');
  const coming = states.filter((s) => s.status !== 'live');
  return (
    <div className="state-picker">
      <div className="field">
        <label htmlFor="f-state">State</label>
        <select id="f-state" value={value} onChange={(e) => onChange(e.target.value)} aria-describedby="f-state-hint">
          <optgroup label="Available">
            {live.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </optgroup>
          <optgroup label="Coming">
            {coming.map((s) => (
              <option key={s.code} value={s.code} disabled>{s.name} (coming)</option>
            ))}
          </optgroup>
        </select>
        <p id="f-state-hint" className="hint">
          {live.length === 0 ? 'No state is available yet.' : `Available now: ${live.map((s) => s.name).join(', ')}.`} More states are coming.
        </p>
      </div>

      <div className="tile-map" role="group" aria-label="State map">
        {states.map((s) => {
          const isLive = s.status === 'live';
          return (
            <button
              key={s.code}
              type="button"
              className={`tile${isLive ? ' tile-live' : ''}`}
              style={{ gridColumn: s.col + 1, gridRow: s.row + 1 }}
              disabled={!isLive}
              aria-pressed={isLive ? value === s.code : undefined}
              title={isLive ? s.name : `${s.name} — coming`}
              onClick={() => isLive && onChange(s.code)}
            >
              <span aria-hidden="true">{s.code}</span>
              <span className="sr-only">{isLive ? s.name : `${s.name}, coming`}</span>
            </button>
          );
        })}
        <p className="tile-legend" aria-hidden="true">
          <span className="swatch swatch-live" /> available <span className="swatch swatch-coming" /> coming
        </p>
      </div>
    </div>
  );
}
