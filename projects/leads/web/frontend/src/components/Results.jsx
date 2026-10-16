/**
 * Filing results: a table at >=768px, cards below (CSS switches which one is
 * displayed; the hidden one is display:none, so assistive tech reads only one).
 */

const dash = '—';

function formatAddress(a) {
  if (!a) return '';
  const cityLine = [a.city, [a.state, a.zip_code].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [a.line1, a.line2, cityLine].filter(Boolean).join(', ');
}

function formatDate(d) {
  if (!d) return dash;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (!m) return d;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

const titleCase = (s) => (s ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s);
const county = (c) => (c && c.toUpperCase() === 'DADE' ? 'Miami-Dade' : titleCase(c));

function Contacts({ contacts }) {
  const verified = (contacts || []).filter((c) => c.verified === true);
  if (!verified.length) return <span className="muted">None verified</span>;
  return (
    <ul className="contacts">
      {verified.map((c) => (
        <li key={`${c.kind}:${c.value}`}>
          {c.kind === 'website' ? (
            <a href={/^https?:\/\//.test(c.value) ? c.value : `https://${c.value}`} rel="noopener noreferrer nofollow" target="_blank">
              {c.value.replace(/^https?:\/\//, '')}
            </a>
          ) : c.kind === 'phone' ? (
            <a href={`tel:${c.value.replace(/[^\d+]/g, '')}`}>{c.value}</a>
          ) : (
            <a href={`mailto:${c.value}`}>{c.value}</a>
          )}
        </li>
      ))}
    </ul>
  );
}

function Industry({ f }) {
  if (!f.naics_guess) return <span className="muted">{dash}</span>;
  return (
    <span title={f.naics_basis || undefined}>
      {f.naics_guess} <span className="muted">(est.)</span>
    </span>
  );
}

export default function Results({ filings, caption }) {
  return (
    <>
      <div className="table-region" role="region" aria-label="Filings table" tabIndex={0}>
        <table className="results-table">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Entity</th>
              <th scope="col">Type</th>
              <th scope="col">Filed</th>
              <th scope="col">Status</th>
              <th scope="col">Registered agent</th>
              <th scope="col">Principal address</th>
              <th scope="col">Industry</th>
              <th scope="col">Verified contacts</th>
            </tr>
          </thead>
          <tbody>
            {filings.map((f) => (
              <tr key={`${f.state}:${f.source_id}`}>
                <th scope="row">
                  <span className="entity">{f.entity}</span>
                  <span className="mono muted">{f.state} #{f.source_id}</span>
                </th>
                <td className="mono">{f.filing_type || dash}</td>
                <td className="nowrap">{formatDate(f.filed_date)}</td>
                <td>{f.status ? <span className={`status status-${f.status.toLowerCase()}`}>{titleCase(f.status)}</span> : dash}</td>
                <td>{f.registered_agent || dash}</td>
                <td>{formatAddress(f.principal_address) || dash}</td>
                <td><Industry f={f} /></td>
                <td><Contacts contacts={f.contacts} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="result-cards" aria-label={caption}>
        {filings.map((f) => (
          <li key={`${f.state}:${f.source_id}`} className="card">
            <h3 className="card-title">{f.entity}</h3>
            <p className="mono muted card-id">{f.state} #{f.source_id}{f.filing_type ? ` · ${f.filing_type}` : ''}</p>
            <dl className="card-dl">
              <div><dt>Filed</dt><dd>{formatDate(f.filed_date)}</dd></div>
              <div><dt>Status</dt><dd>{f.status ? <span className={`status status-${f.status.toLowerCase()}`}>{titleCase(f.status)}</span> : dash}</dd></div>
              {f.county && <div><dt>County</dt><dd>{county(f.county)}</dd></div>}
              <div><dt>Registered agent</dt><dd>{f.registered_agent || dash}</dd></div>
              <div><dt>Principal address</dt><dd>{formatAddress(f.principal_address) || dash}</dd></div>
              <div><dt>Industry</dt><dd><Industry f={f} /></dd></div>
              <div><dt>Verified contacts</dt><dd><Contacts contacts={f.contacts} /></dd></div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
