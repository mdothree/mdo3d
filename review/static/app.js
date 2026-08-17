"use strict";

const TABS = [
  { key: null, label: "All" },
  { key: "project", label: "Projects" },
  { key: "doc", label: "Docs" },
  { key: "social", label: "Social" },
];

// action labels read differently per lane; same backend verdicts underneath
const ACTIONS = {
  project: [["approve", "On track"], ["revise", "Needs attention"], ["reject", "Blocked"]],
  _default: [["approve", "Approve"], ["revise", "Revise"], ["reject", "Reject"]],
};

const state = { tab: null, items: [], selected: null, summary: null };

const $ = (id) => document.getElementById(id);
const esc = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function api(path, opts) {
  const r = await fetch(path, opts);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return r.json();
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

async function loadSummary() {
  state.summary = await api("/v1/review/summary");
  const s = state.summary;
  const pend = Object.values(s.by_type).reduce((a, d) => a + (d.pending || 0), 0);
  $("summary").textContent = `${pend} open · ${s.total} total`;
  renderTabs();
}

function countFor(key) {
  if (!state.summary) return "";
  if (key === null) return Object.values(state.summary.by_type).reduce((a, d) => a + (d.pending || 0), 0);
  const d = state.summary.by_type[key];
  return d ? d.pending || 0 : 0;
}

function renderTabs() {
  $("tabs").innerHTML = TABS.map((t) => {
    const active = t.key === state.tab ? " active" : "";
    return `<button class="tab${active}" data-key="${t.key === null ? "" : t.key}">${t.label}<span class="n">${countFor(t.key)}</span></button>`;
  }).join("");
  document.querySelectorAll(".tab").forEach((b) =>
    b.addEventListener("click", () => {
      state.tab = b.dataset.key || null;
      renderTabs();
      loadList();
    })
  );
}

async function loadList() {
  const qs = state.tab ? `?type=${state.tab}&status=pending` : "?status=pending";
  const data = await api("/v1/review/queue" + qs);
  state.items = data.items;
  const el = $("list");
  if (!data.items.length) {
    el.innerHTML = `<div class="empty">nothing open in this lane</div>`;
    return;
  }
  el.innerHTML = data.items.map(cardHTML).join("");
  document.querySelectorAll(".card").forEach((c) =>
    c.addEventListener("click", () => select(c.dataset.key))
  );
}

function vPill(v, type) {
  if (!v || v === "pending") return "";
  const label = { approve: "on track", revise: "attention", reject: "blocked" };
  const txt = type === "project" ? label[v] || v : v;
  return `<span class="pill v-${v}">${esc(txt)}</span>`;
}

function qcPill(it) {
  if (it.item_type !== "social" || !it.qc || it.qc === "clean") return "";
  const cls = it.qc === "block" ? "v-reject" : "v-revise";
  return `<span class="pill ${cls}" title="voice QC">QC ${(it.qc_flags || []).length}</span>`;
}

function ageStr(it) {
  if (it.item_type !== "project" || it.age_days == null) return "";
  if (it.age_days <= 1) return "today";
  if (it.age_days < 30) return `${it.age_days}d ago`;
  if (it.age_days < 365) return `${Math.round(it.age_days / 30)}mo ago`;
  return `${(it.age_days / 365).toFixed(1)}y ago`;
}

function cardHTML(it) {
  const done = it.verdict === "approve" || it.verdict === "reject";
  const type = it.item_type.toUpperCase();
  const metaBits = [it.date, it.area, it.status_file || (it.item_type === "project" ? "no status file" : ""), ageStr(it)].filter(Boolean).join(" · ");
  return `<div class="card ${done ? "done" : ""} ${state.selected === it.item_key ? "sel" : ""}" data-key="${esc(it.item_key)}">
    <div class="row1"><span class="pill">${type}</span>${vPill(it.verdict, it.item_type)}${qcPill(it)}
      ${it.item_type === "social" && it.source_status ? `<span class="pill">${esc(it.source_status)}</span>` : ""}
      ${(it.deploy_hints && it.deploy_hints.length) ? `<span class="pill">deployable</span>` : ""}
    </div>
    <h3>${esc(it.title)}</h3>
    ${metaBits ? `<div class="meta">${esc(metaBits)}</div>` : ""}
  </div>`;
}

function field(lab, val) {
  if (!val) return "";
  return `<div class="field"><div class="lab">${esc(lab)}</div><div class="val">${esc(val)}</div></div>`;
}

function chips(lab, arr) {
  if (!arr || !arr.length) return "";
  return `<div class="field"><div class="lab">${esc(lab)}</div><div class="chips">${arr.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div></div>`;
}

function qcBlock(it) {
  if (it.item_type !== "social" || !it.qc_flags || !it.qc_flags.length) return "";
  const rows = it.qc_flags.map((f) => {
    const c = f.severity === "block" ? "var(--no)" : "var(--rev)";
    return `<div style="display:flex;gap:8px;margin:4px 0"><span class="mono" style="color:${c};min-width:56px">${esc(f.severity)}</span><span>${esc(f.message)}</span></div>`;
  }).join("");
  return `<div class="field"><div class="lab">Voice QC · ${esc(it.qc)}</div>
    <div style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:12px 14px;font-size:13px">${rows}</div></div>`;
}

async function select(key) {
  state.selected = key;
  document.querySelectorAll(".card").forEach((c) => c.classList.toggle("sel", c.dataset.key === key));
  const it = await api("/v1/review/item/" + encodeURIComponent(key));
  renderDetail(it);
}

function renderDetail(it) {
  const d = $("detail");
  const kicker = [it.item_type.toUpperCase(), it.area].filter(Boolean).join(" · ");
  const sub = [it.date, it.category, it.path].filter(Boolean).join("  ·  ");
  let bodyHTML = "";

  if (it.item_type === "project") {
    const deployed = it.deploy_url
      ? `<div class="field"><div class="lab">Deployed</div>
          <a href="${esc(it.deploy_url)}" target="_blank">${esc(it.deploy_url)}</a>
          <span id="health" class="mono" style="margin-left:10px;color:var(--ink-3)">checking…</span></div>`
      : field("Deployed", "no URL found in project files");
    const commit = it.last_commit
      ? field("Last commit", it.last_commit + (it.age_days != null ? `  (${ageStr(it)})` : ""))
      : "";
    bodyHTML = `
      ${chips("Sub-tools", it.subtools)}
      ${deployed}
      ${commit}
      ${chips("Deploy hints", it.deploy_hints)}
      ${chips("Docs", it.doc_files)}
      ${it.status_file ? `<div class="field"><div class="lab">${esc(it.status_file)}</div>
        <div class="body-box">${esc(it.status_snippet || "(empty)")}</div></div>` : field("Status", "no status file in this project")}
      ${it.todo_snippet ? `<div class="field"><div class="lab">TODO.md</div><div class="body-box">${esc(it.todo_snippet)}</div></div>` : ""}
      <div class="field"><div class="lab">Path</div><a href="/v1/doc/raw?path=${encodeURIComponent(it.path)}">${esc(it.path)}</a></div>`;
  } else if (it.item_type === "social") {
    bodyHTML = `
      ${qcBlock(it)}
      ${field("Hook", it.hook)}
      ${field("Core insight", it.core_insight)}
      <div class="field"><div class="lab">Post</div><div class="body-box">${esc(it.body)}</div></div>
      ${it.cta ? field("CTA", it.cta) : ""}
      ${it.link ? `<div class="field"><div class="lab">Posted</div><a href="${esc(it.link)}" target="_blank">${esc(it.link)}</a></div>` : ""}`;
  } else {
    bodyHTML = `
      <div class="field"><div class="lab">Source · ${esc(it.ext || "")}</div>
        <a href="/v1/doc/raw?path=${encodeURIComponent(it.path)}" target="_blank">${esc(it.path)}</a></div>
      <div class="field"><div class="lab">Extract</div>
        <div class="body-box" id="docbody">${it.previewable ? "loading…" : "(open the source to review)"}</div></div>`;
  }

  const acts = (ACTIONS[it.item_type] || ACTIONS._default)
    .map(([v, label]) => `<button class="act ${v}" data-v="${v}">${label}</button>`).join("");

  d.innerHTML = `
    <div class="kicker">${esc(kicker)}</div>
    <h2>${esc(it.title)}</h2>
    <div class="sub">${esc(sub)}</div>
    ${bodyHTML}
    <div class="actions">${acts}</div>
    <textarea id="notes" placeholder="Notes (saved with the action)">${esc(it.review_notes || "")}</textarea>
    <div class="hint" style="margin-top:8px">current: ${esc(it.verdict)}</div>`;

  d.querySelectorAll(".act").forEach((b) =>
    b.addEventListener("click", () => submit(it.item_key, b.dataset.v))
  );

  if (it.item_type === "doc" && it.previewable) {
    api("/v1/doc/text?path=" + encodeURIComponent(it.path))
      .then((r) => { const b = $("docbody"); if (b) b.textContent = r.text || "(no extractable text)"; })
      .catch(() => { const b = $("docbody"); if (b) b.textContent = "(preview unavailable)"; });
  }

  if (it.item_type === "project" && it.deploy_url) {
    api("/v1/project/health?key=" + encodeURIComponent(it.item_key))
      .then((h) => {
        const el = $("health");
        if (!el) return;
        if (h.ok) { el.textContent = `● ${h.status} ok`; el.style.color = "var(--ok)"; }
        else { el.textContent = h.error ? `● ${h.error}` : `● ${h.status} down`; el.style.color = "var(--no)"; }
      })
      .catch(() => { const el = $("health"); if (el) { el.textContent = "● check failed"; el.style.color = "var(--no)"; } });
  }
}

async function submit(key, verdict) {
  const notes = ($("notes") && $("notes").value) || "";
  await api("/v1/review/item/" + encodeURIComponent(key) + "/verdict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ verdict, notes }),
  });
  toast(`${verdict} recorded`);
  await loadSummary();
  await loadList();
  const next = state.items.find((i) => i.item_key !== key && i.verdict === "pending");
  if (next) select(next.item_key);
  else $("detail").innerHTML = `<div class="empty">lane clear</div>`;
}

(async function init() {
  renderTabs();
  await loadSummary();
  await loadList();
})();
