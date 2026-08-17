import { useState } from 'react';
import Btn from '../components/Btn.jsx';
import Field from '../components/Field.jsx';
import Toggle from '../components/Toggle.jsx';
import { LOG_STEPS } from '../constants/pipeline.js';
import { runPipeline as runPipelineApi } from '../lib/api.js';

const PRESETS = [
  { label: 'Daily at 6 AM',  val: '0 6 * * *'   },
  { label: 'Twice daily',    val: '0 6,18 * * *' },
  { label: 'Weekdays 8 AM',  val: '0 8 * * 1-5'  },
  { label: 'Every 4 hours',  val: '0 */4 * * *'  },
];

export default function PipelinePage({ profileId }) {
  const [running,  setRunning]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs,     setLogs]     = useState([{ type: 'info', text: '> system ready. awaiting run command.' }]);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState(null);
  const [cronExp,  setCronExp]  = useState('0 6 * * *');
  const [cronOn,   setCronOn]   = useState(true);

  const handleRunPipeline = async () => {
    if (running) return;
    if (!profileId) {
      setError('No profile selected');
      return;
    }

    setRunning(true);
    setDone(false);
    setError(null);
    setProgress(0);
    setLogs([{ type: 'info', text: `> pipeline started — ${new Date().toLocaleTimeString()}` }]);

    try {
      await runPipelineApi(profileId);
      setLogs(l => [...l, { type: 'success', text: '> pipeline triggered successfully' }]);
      setLogs(l => [...l, { type: 'info', text: '> running in background...' }]);

      // Simulate progress since actual pipeline runs async
      LOG_STEPS.forEach(([delay, type, text]) => {
        setTimeout(() => {
          setLogs(l => [...l, { type, text }]);
          setProgress(Math.round(delay / 3000 * 100));
        }, delay);
      });
      setTimeout(() => { setRunning(false); setDone(true); setProgress(100); }, 3200);
    } catch (err) {
      setError(err.message);
      setLogs(l => [...l, { type: 'error', text: `> error: ${err.message}` }]);
      setRunning(false);
    }
  };

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="hero-eyebrow fu">Enrichment Engine</div>
          <h1 className="hero-title fu2">Pipeline Control</h1>
          <div className="hero-rule fu2" />
          <p className="hero-desc fu3">
            Trigger enrichment runs, monitor real-time progress, and configure the automated schedule.
          </p>
        </div>
      </div>

      <div className="content-wrap fu">
        <div className="g2" style={{ gap: 32, alignItems: 'start' }}>

          {/* Run panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-hd">
                <div className="card-title">Manual Run</div>
                <span className="card-tag">On-demand</span>
              </div>
              <div style={{ marginBottom: 20 }}>
                {[
                  ['Last run',        '2 hours ago'],
                  ['Leads processed', '12'],
                  ['API calls used',  '48 / 500 today'],
                  ['Next scheduled',  cronOn ? '06:00 AM daily' : 'Disabled'],
                ].map(([k, v]) => (
                  <div className="enrich-row" key={k}>
                    <span className="enrich-key">{k}</span>
                    <span className="enrich-val">{v}</span>
                  </div>
                ))}
              </div>
              <Btn
                variant="ink"
                size="lg"
                onClick={handleRunPipeline}
                disabled={running || !profileId}
                className={!running && !done ? 'pulse' : ''}
              >
                {running ? '◌  Running...' : done ? '✓  Run Again' : '▶  Run Pipeline Now'}
              </Btn>
              {error && (
                <div style={{ marginTop: 10, color: 'var(--red)', fontFamily: "'DM Mono'", fontSize: 10 }}>
                  {error}
                </div>
              )}
              {!profileId && (
                <div style={{ marginTop: 10, color: 'var(--amber)', fontFamily: "'DM Mono'", fontSize: 10 }}>
                  No profile selected. Create or activate a profile first.
                </div>
              )}
            </div>

            {/* Progress + Logs */}
            <div className="card">
              <div className="card-hd">
                <div className="card-title">Progress</div>
                <span style={{ fontFamily: "'DM Mono'", fontSize: 11, color: done ? 'var(--green)' : 'var(--mid)' }}>
                  {progress}%
                </span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              {done && (
                <div style={{ fontFamily: "'DM Mono'", fontSize: 9, color: 'var(--green)', letterSpacing: 1, marginBottom: 10 }}>
                  ✓ Pipeline completed successfully
                </div>
              )}
              <div className="log-box">
                {logs.map((l, i) => (
                  <div key={i} className={`log-${l.type}`}>{l.text}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Schedule + Config */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-hd">
                <div className="card-title">Schedule Config</div>
                <Toggle on={cronOn} onToggle={() => setCronOn(o => !o)} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <div className="enrich-key" style={{ marginBottom: 8 }}>Cron Expression</div>
                <input
                  className="cron-input"
                  value={cronExp}
                  onChange={e => setCronExp(e.target.value)}
                  disabled={!cronOn}
                />
                <div style={{ marginTop: 5, fontFamily: "'DM Mono'", fontSize: 8, color: 'var(--light)', letterSpacing: 0.5 }}>
                  {cronOn ? 'Schedule active — runs per expression above' : 'Schedule disabled — manual run only'}
                </div>
              </div>
              <div className="form-section-title">Preset Schedules</div>
              {PRESETS.map(({ label, val }) => (
                <div key={label} className="sched-row">
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--ink)', marginBottom: 2 }}>{label}</div>
                    <code style={{ fontFamily: "'DM Mono'", fontSize: 9, color: 'var(--light)' }}>{val}</code>
                  </div>
                  <Btn variant="ghost" size="sm" onClick={() => { setCronExp(val); setCronOn(true); }}>Use</Btn>
                </div>
              ))}
              <div className="form-actions">
                <Btn variant="ink" size="md">Save Schedule</Btn>
              </div>
            </div>

            <div className="card">
              <div className="card-hd">
                <div className="card-title">Pipeline Config</div>
                <span className="card-tag">Settings</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Batch Size"          type="number" value="25"  placeholder="Records per run" />
                <Field label="Max API Calls / Day" type="number" value="500" placeholder="Daily limit" />
                <Field label="Enrichment Source"   as="select"  value="Apollo" options={['Apollo', 'Hunter.io', 'Clearbit', 'Manual Only']} />
                <Field label="On Failure"          as="select"  value="Skip & Log" options={['Skip & Log', 'Retry Once', 'Retry 3x', 'Stop Pipeline']} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
