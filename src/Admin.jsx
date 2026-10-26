import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

const BLUE  = "#0e8fd4";
const NAVY  = "#1b3a5c";
const GREEN = "#3db84a";
const PALE  = "#eaf6fd";
const BORD  = "#b0d8e8";
const GRAY  = "#7a8a9a";
const WHITE = "#ffffff";
const RED   = "#e74c3c";

const ADMIN_PIN = "nexime2024";
const DAYS = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];

// Known clients — always shown in dropdown
const KNOWN_CLIENTS = ["Turner Home", "Autism Initiatives", "AFG", "Gloucester Road"];

const fmt = v => isNaN(v)||!v ? "—" : Number(v).toFixed(2);

// ── Hour calculation (mirrors App.jsx) ────────────────
const toMins = t => {
  if (!t) return null;
  const [h, m] = String(t).split(":").map(Number);
  return isNaN(h) ? null : h * 60 + (m || 0);
};
const calcH = (s, e, brk) => {
  const sm = toMins(s), em = toMins(e);
  if (sm == null || em == null) return 0;
  let diff = em - sm;
  if (diff <= 0) diff += 24 * 60;
  diff -= (parseFloat(brk) || 0);
  return diff > 0 ? diff / 60 : 0;
};

// ── Transform a drafts row into admin-display format ──
const transformDraft = (draft) => {
  const d = draft.data || {};
  const info = d.info || {};
  const rows = d.rows || {};

  // Match day keys regardless of capitalisation (app stores "MONDAY")
  const rowFor = day => {
    const key = Object.keys(rows).find(k => k.toUpperCase() === day);
    return key ? rows[key] : null;
  };

  const days = DAYS.map(day => {
    const row = rowFor(day);
    if (!row) return null;
    const legacy = !row.shifts && row.sh ? [row.sh] : null;
    const shifts = (row.shifts || legacy || []).map(sh => {
      const h = calcH(sh.start, sh.end, sh.brk);
      return h > 0 ? { ...sh, hours: h.toFixed(2) } : null;
    }).filter(Boolean);
    const slH = calcH(row.sl?.start, row.sl?.end, row.sl?.brk);
    const sleepIn = slH > 0 ? { ...(row.sl || {}), hours: slH.toFixed(2) } : null;
    if (!shifts.length && !sleepIn) return null;
    return { day, shifts, sleepIn };
  }).filter(Boolean);

  let totalHours = 0;
  days.forEach(dy => {
    dy.shifts.forEach(sh => { totalHours += parseFloat(sh.hours || 0); });
    if (dy.sleepIn) totalHours += parseFloat(dy.sleepIn.hours || 0);
  });

  const weekRaw = info.week || "";
  const weekEnding = weekRaw
    ? new Date(weekRaw).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })
    : "—";

  return {
    id:          draft.id,
    staff_id:    draft.staff_id,
    staff_name:  info.name || "",
    week_ending: weekEnding,
    week_raw:    weekRaw,
    total_hours: totalHours > 0 ? totalHours.toFixed(2) : "—",
    reference:   "—",
    created_at:  draft.updated_at,
    days,
    _source:     "draft",
  };
};

function Badge({ text, color }) {
  return (
    <span style={{ background: color+"22", color, border:`1px solid ${color}55`,
      borderRadius:12, padding:"2px 10px", fontSize:11, fontWeight:700,
      whiteSpace:"nowrap" }}>
      {text}
    </span>
  );
}

function clientColor(c) {
  if (c === "Turner Home")        return BLUE;
  if (c === "Autism Initiatives") return "#8e44ad";
  if (c === "AFG")                return GREEN;
  return GRAY;
}

// ── PIN Login ─────────────────────────────────────────────
function PinLogin({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  const attempt = () => {
    if (pin === ADMIN_PIN) { onUnlock(); }
    else { setErr("Incorrect PIN. Please try again."); setPin(""); }
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,${NAVY},${BLUE})`,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"24px 16px", fontFamily:"'Nunito','Segoe UI',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .pf{width:100%;padding:12px 14px;border:1.5px solid ${BORD};border-radius:9px;
           font-size:16px;color:${NAVY};outline:none;background:${WHITE};
           text-align:center;letter-spacing:4px;font-family:inherit}
        .pf:focus{border-color:${BLUE}}`}</style>

      <svg height={52} viewBox="0 0 230 56" xmlns="http://www.w3.org/2000/svg"
        style={{ display:"block", marginBottom:24 }}>
        <text x="2" y="36" fontFamily="'Arial Black',Arial,sans-serif" fontWeight="900"
          fontSize="32" fill={WHITE} letterSpacing="3">NEXIME</text>
        <text x="4" y="53" fontFamily="Arial,sans-serif" fontWeight="400"
          fontSize="13" fill="rgba(255,255,255,.68)" letterSpacing="5">HEALTHCARE</text>
      </svg>

      <div style={{ width:"100%", maxWidth:380, background:WHITE, borderRadius:16,
        padding:"28px 24px", boxShadow:"0 20px 60px #00000033" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:28, marginBottom:8 }}>🔒</div>
          <div style={{ fontSize:20, fontWeight:800, color:NAVY }}>Admin Portal</div>
          <div style={{ fontSize:12, color:GRAY, marginTop:4 }}>
            Enter the admin access PIN to continue
          </div>
        </div>

        {err && (
          <div style={{ background:"#fff5f5", border:`1.5px solid #f5a0a0`,
            borderRadius:9, padding:"10px 14px", fontSize:12, color:RED,
            marginBottom:16, textAlign:"center" }}>{err}</div>
        )}

        <input className="pf" type="password" placeholder="Enter PIN"
          value={pin} onChange={e=>setPin(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&attempt()}
          autoFocus/>

        <button onClick={attempt}
          style={{ width:"100%", marginTop:14,
            background:`linear-gradient(90deg,${NAVY},${BLUE})`,
            color:WHITE, border:"none", borderRadius:9, padding:"13px",
            fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          Unlock →
        </button>
      </div>

      <div style={{ marginTop:16, fontSize:11, color:"rgba(255,255,255,.4)" }}>
        Nexime Healthcare Ltd · Admin Access Only
      </div>
    </div>
  );
}

// ── Main Admin Dashboard ──────────────────────────────────
function AdminDashboard({ onExit }) {
  const [records,      setRecords]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [searchInput,  setSearchInput]  = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterWeek,   setFilterWeek]   = useState("");
  const [expanded,     setExpanded]     = useState(null);
  const [view,         setView]         = useState("shifts"); // "shifts" | "staff"

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");

    // Load from both tables in parallel
    const [draftsRes, tsRes] = await Promise.all([
      supabase.from("drafts").select("*").order("updated_at", { ascending: false }),
      supabase.from("timesheets").select("*").order("created_at", { ascending: false }),
    ]);

    if (draftsRes.error && tsRes.error) {
      setError(draftsRes.error.message);
      setLoading(false);
      return;
    }

    // Transform drafts into display format, skip blank entries
    const fromDrafts = (draftsRes.data || [])
      .map(transformDraft)
      .filter(r => r.staff_name && r.staff_name.trim() !== "");

    // Timesheets already in the right format
    const fromTimesheets = tsRes.data || [];

    // De-duplicate: if same staff + week exists in both, prefer the timesheets record
    const tsKeys = new Set(fromTimesheets.map(r => `${r.staff_name}|${r.week_ending}`));
    const dedupedDrafts = fromDrafts.filter(r => !tsKeys.has(`${r.staff_name}|${r.week_ending}`));

    const combined = [...fromTimesheets, ...dedupedDrafts].sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    setRecords(combined);
    setLoading(false);
  };

  // ── Client list: always include known clients + any extras found in data ──
  const extraClients = [...new Set(
    records.flatMap(r =>
      (r.days || []).flatMap(d => [
        ...(d.shifts||[]).map(s=>s.client),
        d.sleepIn?.client
      ].filter(Boolean))
    )
  )].filter(c => !KNOWN_CLIENTS.includes(c)).sort();
  const allClients = [...KNOWN_CLIENTS, ...extraClients];

  // ── Filter ────────────────────────────────────────────
  const filtered = records.filter(r => {
    const nameMatch = !search ||
      (r.staff_name||"").toLowerCase().includes(search.toLowerCase());
    const weekMatch = !filterWeek ||
      (r.week_raw||"").includes(filterWeek) ||
      (r.week_ending||"").toLowerCase().includes(filterWeek.toLowerCase());
    const clientMatch = !filterClient || (r.days||[]).some(d =>
      (d.shifts||[]).some(s=>s.client===filterClient) ||
      d.sleepIn?.client===filterClient
    );
    return nameMatch && weekMatch && clientMatch;
  });

  // ── Flat list: one row per shift / sleep-in ──────────
  const allShifts = filtered.flatMap(r =>
    (r.days||[]).flatMap(d => [
      ...(d.shifts||[]).map(sh => ({ ...sh, type:"Shift" })),
      ...(d.sleepIn ? [{ ...d.sleepIn, type:"Sleep-in" }] : []),
    ].map(sh => ({
      ...sh,
      day: d.day,
      staff_name: r.staff_name,
      week_ending: r.week_ending,
    })))
  ).filter(sh => !filterClient || sh.client === filterClient)
   .sort((a,b) =>
      (a.date||"").localeCompare(b.date||"") ||
      (a.start||"").localeCompare(b.start||"") ||
      (a.staff_name||"").localeCompare(b.staff_name||""));

  const shiftHoursTotal = allShifts.reduce((s,sh)=>s+(parseFloat(sh.hours)||0),0);
  const niceDate = d => d
    ? new Date(d).toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})
    : "—";

  const exportShiftsCSV = () => {
    const headers = ["Date","Day","Staff Name","Type","Start","End","Break (mins)","Client","Unit","Hours","Week Ending"];
    const rows = allShifts.map(sh => [
      sh.date||"", sh.day||"", sh.staff_name||"", sh.type, sh.start||"", sh.end||"",
      sh.brk||0, sh.client||"", sh.unit||"", sh.hours||"", sh.week_ending||"",
    ]);
    rows.push(["","","","","","","","","TOTAL",shiftHoursTotal.toFixed(2),""]);
    const csv = [headers,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`Nexime-Shifts${filterClient?"-"+filterClient.replace(/\s+/g,"-"):""}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const doSearch = () => setSearch(searchInput);

  const clearAll = () => {
    setSearch(""); setSearchInput("");
    setFilterClient(""); setFilterWeek("");
  };

  const downloadPDF = async (rec) => {
    try {
      const res = await fetch("/api/download-timesheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffName:  rec.staff_name,
          weekEnding: rec.week_ending,
          reference:  rec.reference && rec.reference !== "—" ? rec.reference : "",
          totalHours: rec.total_hours,
          days: (rec.days||[]).map(d => {
            const shiftTotal = (d.shifts||[]).reduce((s,sh)=>s+(parseFloat(sh.hours)||0),0);
            const slTotal = d.sleepIn ? (parseFloat(d.sleepIn.hours)||0) : 0;
            return { ...d, total: (shiftTotal + slTotal).toFixed(2) };
          }),
        }),
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `Timesheet-${rec.staff_name?.replace(/\s+/g,"-")}-${rec.week_ending}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) {
      alert("Could not download PDF: " + e.message);
    }
  };

  const buildRows = (days) => {
    const obj = {};
    (days||[]).forEach(d => { obj[d.day] = { shifts:d.shifts||[], sl:d.sleepIn||{} }; });
    return obj;
  };

  const exportCSV = () => {
    const headers = ["Staff Name","Week Ending","Total Hours","Saved At","Clients","Days Worked"];
    const rows = filtered.map(r => {
      const clients = [...new Set(
        (r.days||[]).flatMap(d=>[...(d.shifts||[]).map(s=>s.client),d.sleepIn?.client].filter(Boolean))
      )].join("; ");
      const days = (r.days||[]).map(d=>d.day).join(", ");
      return [
        r.staff_name||"", r.week_ending||"",
        r.total_hours||"",
        r.created_at ? new Date(r.created_at).toLocaleString("en-GB") : "",
        clients, days,
      ];
    });
    const csv = [headers,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`Nexime-Timesheets-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8",
      fontFamily:"'Nunito','Segoe UI',sans-serif", overflowX:"hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input,select,button{font-family:inherit}
        .af{width:100%;padding:9px 12px;border:1.5px solid ${BORD};border-radius:8px;
           font-size:13px;color:${NAVY};outline:none;background:${WHITE}}
        .af:focus{border-color:${BLUE}}
        .row-card:hover{background:#f0f8ff!important}
        @media(max-width:600px){.hide-mobile{display:none!important}}`}</style>

      {/* Header */}
      <div style={{ background:NAVY, color:WHITE, padding:"14px 20px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:18, letterSpacing:.5 }}>
            Nexime Admin Portal
          </div>
          <div style={{ fontSize:11, opacity:.6, marginTop:2 }}>
            Timesheet Records · {records.length} total submissions
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={load}
            style={{ background:"rgba(255,255,255,.12)", color:WHITE,
              border:"1px solid rgba(255,255,255,.25)", borderRadius:8,
              padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
            ↻ Refresh
          </button>
          <button onClick={onExit}
            style={{ background:"rgba(255,255,255,.12)", color:WHITE,
              border:"1px solid rgba(255,255,255,.25)", borderRadius:8,
              padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
            ← Exit
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"20px 16px" }}>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",
          gap:12, marginBottom:20 }}>
          {[
            { label:"Total Submissions", value:records.length, icon:"📋" },
            { label:"Unique Staff",      value:new Set(records.map(r=>r.staff_name)).size, icon:"👥" },
            { label:"This Month",        value:records.filter(r=>
                r.created_at &&
                new Date(r.created_at).getMonth()===new Date().getMonth() &&
                new Date(r.created_at).getFullYear()===new Date().getFullYear()
              ).length, icon:"📅" },
            { label:"Filtered Results",  value:filtered.length, icon:"🔍" },
          ].map(s=>(
            <div key={s.label} style={{ background:WHITE, borderRadius:12, padding:"14px 16px",
              border:`1.5px solid ${BORD}`, textAlign:"center" }}>
              <div style={{ fontSize:22 }}>{s.icon}</div>
              <div style={{ fontSize:26, fontWeight:800, color:NAVY, lineHeight:1.1 }}>{s.value}</div>
              <div style={{ fontSize:11, color:GRAY, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background:WHITE, borderRadius:12, padding:"16px",
          border:`1.5px solid ${BORD}`, marginBottom:16 }}>
          <div style={{ display:"grid",
            gridTemplateColumns:"1fr 180px 160px auto auto auto",
            gap:10, alignItems:"end" }}>

            {/* Search Staff */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:BLUE, marginBottom:4,
                textTransform:"uppercase", letterSpacing:".07em" }}>Search Staff</div>
              <input className="af" placeholder="Enter staff name…"
                value={searchInput}
                onChange={e=>setSearchInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&doSearch()}/>
            </div>

            {/* Filter by Client */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:BLUE, marginBottom:4,
                textTransform:"uppercase", letterSpacing:".07em" }}>Filter by Client</div>
              <select className="af" value={filterClient}
                onChange={e=>setFilterClient(e.target.value)}>
                <option value="">All clients</option>
                {allClients.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Week Ending */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:BLUE, marginBottom:4,
                textTransform:"uppercase", letterSpacing:".07em" }}>Week Ending</div>
              <input className="af" placeholder="e.g. 2024-11-10" type="date"
                value={filterWeek} onChange={e=>setFilterWeek(e.target.value)}/>
            </div>

            {/* Search button */}
            <button onClick={doSearch}
              style={{ padding:"9px 20px", background:NAVY, border:"none",
                borderRadius:8, fontSize:13, fontWeight:700, color:WHITE,
                cursor:"pointer", whiteSpace:"nowrap" }}>
              🔍 Search
            </button>

            {/* Clear */}
            <button onClick={clearAll}
              style={{ padding:"9px 14px", background:"#f0f4f8",
                border:`1.5px solid ${BORD}`, borderRadius:8,
                fontSize:12, fontWeight:700, color:GRAY, cursor:"pointer" }}>
              Clear
            </button>

            {/* CSV */}
            <button onClick={view==="shifts"?exportShiftsCSV:exportCSV}
              style={{ padding:"9px 14px", background:GREEN, border:"none",
                borderRadius:8, fontSize:12, fontWeight:700, color:WHITE,
                cursor:"pointer", whiteSpace:"nowrap" }}>
              ⬇ CSV
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background:"#fff5f5", border:`1.5px solid #f5a0a0`,
            borderRadius:10, padding:"12px 16px", color:RED, fontSize:13, marginBottom:16 }}>
            ⚠️ Error loading data: {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign:"center", padding:"40px", color:GRAY, fontSize:14 }}>
            Loading timesheets…
          </div>
        )}

        {/* View switch */}
        {!loading && (
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            {[["shifts","All Shifts"],["staff","By Staff"]].map(([k,l])=>(
              <button key={k} onClick={()=>setView(k)}
                style={{ padding:"8px 18px", borderRadius:8, fontSize:13, fontWeight:700,
                  cursor:"pointer", border:`1.5px solid ${view===k?NAVY:BORD}`,
                  background:view===k?NAVY:WHITE, color:view===k?WHITE:NAVY }}>
                {l}
              </button>
            ))}
          </div>
        )}

        {/* All Shifts table */}
        {!loading && view==="shifts" && (
          <div style={{ background:WHITE, borderRadius:12, border:`1.5px solid ${BORD}`,
            overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:820 }}>
              <thead>
                <tr style={{ background:NAVY, color:WHITE, textAlign:"left" }}>
                  {["Date","Staff Name","Type","Time","Break","Client","Unit","Hours"].map(h=>(
                    <th key={h} style={{ padding:"10px 12px", fontSize:11, fontWeight:700,
                      textTransform:"uppercase", letterSpacing:".07em",
                      textAlign:h==="Hours"?"right":"left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allShifts.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign:"center", padding:"40px", color:GRAY, fontSize:13 }}>
                    No shifts match your filters.
                  </td></tr>
                )}
                {allShifts.map((sh,i)=>(
                  <tr key={i} style={{ borderTop:`1px solid ${BORD}`,
                    background: sh.type==="Sleep-in" ? "#f6f4ff" : (i%2===0?WHITE:"#fafcfe") }}>
                    <td style={{ padding:"9px 12px", color:NAVY, fontWeight:700, whiteSpace:"nowrap" }}>
                      {sh.date ? niceDate(sh.date) : sh.day}
                    </td>
                    <td style={{ padding:"9px 12px", color:NAVY, fontWeight:700 }}>{sh.staff_name}</td>
                    <td style={{ padding:"9px 12px", color:sh.type==="Sleep-in"?"#6c4fc4":GRAY }}>{sh.type}</td>
                    <td style={{ padding:"9px 12px", whiteSpace:"nowrap" }}>{sh.start||"—"}–{sh.end||"—"}</td>
                    <td style={{ padding:"9px 12px", color:GRAY }}>{sh.brk?`${sh.brk} min`:"None"}</td>
                    <td style={{ padding:"9px 12px" }}>
                      {sh.client ? <Badge text={sh.client} color={clientColor(sh.client)}/> : "—"}
                    </td>
                    <td style={{ padding:"9px 12px", color:NAVY }}>{sh.unit||"—"}</td>
                    <td style={{ padding:"9px 12px", textAlign:"right", fontWeight:800, color:GREEN }}>
                      {sh.hours||"—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              {allShifts.length > 0 && (
                <tfoot>
                  <tr style={{ background:PALE, borderTop:`2px solid ${NAVY}` }}>
                    <td colSpan={7} style={{ padding:"11px 12px", fontWeight:800, color:NAVY }}>
                      {allShifts.length} shift{allShifts.length===1?"":"s"}
                      {filterClient ? ` at ${filterClient}` : ""} · Total hours
                    </td>
                    <td style={{ padding:"11px 12px", textAlign:"right", fontWeight:800, color:GREEN, fontSize:14 }}>
                      {shiftHoursTotal.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* By Staff table */}
        {!loading && view==="staff" && (
          <div style={{ background:WHITE, borderRadius:12, border:`1.5px solid ${BORD}`,
            overflow:"hidden" }}>

            <div style={{ display:"grid",
              gridTemplateColumns:"1.6fr 1fr 0.7fr 1.4fr 0.9fr 1fr",
              background:NAVY, color:WHITE, padding:"10px 16px",
              fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:".07em", gap:8 }}>
              <div>Staff Name</div>
              <div>Week Ending</div>
              <div>Hours</div>
              <div className="hide-mobile">Clients</div>
              <div className="hide-mobile">Saved</div>
              <div style={{ textAlign:"right" }}>Actions</div>
            </div>

            {filtered.length === 0 && !loading && (
              <div style={{ textAlign:"center", padding:"40px", color:GRAY, fontSize:13 }}>
                No timesheets match your filters.
              </div>
            )}

            {filtered.map((rec, i) => {
              const clients = [...new Set(
                (rec.days||[]).flatMap(d=>[
                  ...(d.shifts||[]).map(s=>s.client),
                  d.sleepIn?.client
                ].filter(Boolean))
              )];
              const savedDate = rec.created_at
                ? new Date(rec.created_at).toLocaleDateString("en-GB",
                    {day:"2-digit",month:"short",year:"numeric"})
                : "—";
              const isOpen = expanded === rec.id;

              return (
                <div key={rec.id||i}>
                  <div className="row-card"
                    style={{ display:"grid",
                      gridTemplateColumns:"1.6fr 1fr 0.7fr 1.4fr 0.9fr 1fr",
                      padding:"12px 16px", gap:8, alignItems:"center",
                      borderTop: i===0?"none":`1px solid ${BORD}`,
                      background: i%2===0?WHITE:"#fafcfe",
                      cursor:"pointer", transition:"background .15s" }}
                    onClick={()=>setExpanded(isOpen?null:rec.id)}>

                    <div style={{ fontSize:13, fontWeight:700, color:NAVY }}>
                      {rec.staff_name||"—"}
                    </div>
                    <div style={{ fontSize:12, color:NAVY }}>
                      {rec.week_ending||"—"}
                    </div>
                    <div style={{ fontSize:13, fontWeight:800, color:GREEN }}>
                      {rec.total_hours||"—"}
                    </div>
                    <div className="hide-mobile" style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                      {clients.map(c=><Badge key={c} text={c} color={clientColor(c)}/>)}
                    </div>
                    <div className="hide-mobile" style={{ fontSize:11, color:GRAY }}>
                      {savedDate}
                    </div>
                    <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}
                      onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>setExpanded(isOpen?null:rec.id)}
                        style={{ padding:"5px 10px", background:PALE,
                          border:`1.5px solid ${BORD}`, borderRadius:7,
                          fontSize:11, fontWeight:700, color:NAVY, cursor:"pointer" }}>
                        {isOpen?"▲ Hide":"▼ View"}
                      </button>
                      <button onClick={()=>downloadPDF(rec)}
                        style={{ padding:"5px 10px", background:BLUE,
                          border:"none", borderRadius:7,
                          fontSize:11, fontWeight:700, color:WHITE, cursor:"pointer" }}>
                        ⬇ PDF
                      </button>
                    </div>
                  </div>

                  {/* Expanded shifts */}
                  {isOpen && (
                    <div style={{ background:"#f8fcff", borderTop:`1.5px solid ${BORD}`,
                      padding:"16px 20px" }}>
                      <div style={{ fontSize:12, fontWeight:800, color:NAVY,
                        marginBottom:12, textTransform:"uppercase", letterSpacing:".06em" }}>
                        All Shifts — {rec.staff_name} · Week ending {rec.week_ending}
                      </div>

                      {(rec.days||[]).length === 0 && (
                        <div style={{ color:GRAY, fontSize:12 }}>No shift data recorded.</div>
                      )}

                      {(rec.days||[]).map(d => {
                        const hasShifts = (d.shifts||[]).length > 0;
                        const hasSleep  = d.sleepIn?.start;
                        if (!hasShifts && !hasSleep) return null;
                        return (
                          <div key={d.day} style={{ marginBottom:14 }}>
                            <div style={{ fontSize:12, fontWeight:800, color:BLUE,
                              textTransform:"uppercase", marginBottom:6,
                              borderBottom:`1px solid ${BORD}`, paddingBottom:4 }}>
                              {d.day}
                            </div>

                            {(d.shifts||[]).map((sh,si)=>(
                              <div key={si} style={{ background:WHITE, border:`1px solid ${BORD}`,
                                borderRadius:8, padding:"10px 14px", marginBottom:6, fontSize:12,
                                display:"grid",
                                gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",
                                gap:6 }}>
                                {sh.date && <div><span style={{color:GRAY}}>Date:</span> <b>{new Date(sh.date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</b></div>}
                                <div><span style={{color:GRAY}}>Shift:</span> <b>{sh.start||"—"}–{sh.end||"—"}</b></div>
                                <div><span style={{color:GRAY}}>Break:</span> {sh.brk?`${sh.brk} min`:"None"}</div>
                                <div><span style={{color:GRAY}}>Client:</span> <b>{sh.client||"—"}</b></div>
                                <div><span style={{color:GRAY}}>Unit:</span> {sh.unit||"—"}</div>
                                <div><span style={{color:GRAY}}>Hours:</span> <b style={{color:GREEN}}>{sh.hours||"—"}</b></div>
                                {sh.sig && <div><span style={{color:GRAY}}>Signed:</span> <span style={{color:GREEN}}>✅ Yes</span></div>}
                              </div>
                            ))}

                            {hasSleep && (
                              <div style={{ background:"#f2f0ff", border:`1px solid #c5b8f0`,
                                borderRadius:8, padding:"10px 14px", marginBottom:6, fontSize:12,
                                display:"grid",
                                gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",
                                gap:6 }}>
                                <div><span style={{color:GRAY}}>Sleep-in:</span> <b>{d.sleepIn.start}–{d.sleepIn.end}</b></div>
                                <div><span style={{color:GRAY}}>Client:</span> <b>{d.sleepIn.client||"—"}</b></div>
                                <div><span style={{color:GRAY}}>Unit:</span> {d.sleepIn.unit||"—"}</div>
                                <div><span style={{color:GRAY}}>Hours:</span> <b style={{color:GREEN}}>{d.sleepIn.hours||"—"}</b></div>
                                {d.sleepIn.sig && <div><span style={{color:GRAY}}>Signed:</span> <span style={{color:GREEN}}>✅ Yes</span></div>}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
                        <button onClick={()=>downloadPDF(rec)}
                          style={{ padding:"8px 18px", background:BLUE, border:"none",
                            borderRadius:8, fontSize:13, fontWeight:700, color:WHITE,
                            cursor:"pointer" }}>
                          ⬇ Download PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop:20, textAlign:"center", fontSize:11, color:GRAY }}>
          Nexime Healthcare Ltd · Admin Portal · Data from Supabase
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────
export default function Admin() {
  const [unlocked, setUnlocked] = useState(false);
  if (!unlocked) return <PinLogin onUnlock={()=>setUnlocked(true)}/>;
  return <AdminDashboard onExit={()=>setUnlocked(false)}/>;
}
