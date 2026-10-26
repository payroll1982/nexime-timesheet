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

// Known clients — always shown in dropdown
const KNOWN_CLIENTS = ["Turner Home", "Autism Initiatives", "AFG", "Gloucester Road"];

const fmt = v => isNaN(v)||!v ? "—" : Number(v).toFixed(2);

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
  if (c === "Turner Home")       return BLUE;
  if (c === "Autism Initiatives") return "#8e44ad";
  if (c === "AFG")               return GREEN;
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
  const [rlsWarning,   setRlsWarning]   = useState(false);
  const [search,       setSearch]       = useState("");
  const [searchInput,  setSearchInput]  = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterWeek,   setFilterWeek]   = useState("");
  const [expanded,     setExpanded]     = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    setRlsWarning(false);

    const { data, error: err } = await supabase
      .from("timesheets")
      .select("*")
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
    } else if (!data || data.length === 0) {
      // Could be RLS blocking reads — set warning
      setRlsWarning(true);
      setRecords([]);
    } else {
      setRecords(data);
    }
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
    const weekMatch = !filterWeek || (r.week_ending||"").includes(filterWeek);
    const clientMatch = !filterClient || (r.days||[]).some(d =>
      (d.shifts||[]).some(s=>s.client===filterClient) ||
      d.sleepIn?.client===filterClient
    );
    return nameMatch && weekMatch && clientMatch;
  });

  const doSearch = () => setSearch(searchInput);

  const clearAll = () => {
    setSearch(""); setSearchInput("");
    setFilterClient(""); setFilterWeek("");
  };

  const totalHrs = r => r.total_hours || "—";

  const downloadPDF = async (rec) => {
    try {
      const res = await fetch("/api/download-timesheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:      rec.staff_name,
          week:      rec.week_ending,
          reference: rec.reference,
          rows:      buildRows(rec.days),
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
    const headers = ["Reference","Staff Name","Week Ending","Total Hours","Submitted At","Clients","Days Worked"];
    const rows = filtered.map(r => {
      const clients = [...new Set(
        (r.days||[]).flatMap(d=>[...(d.shifts||[]).map(s=>s.client),d.sleepIn?.client].filter(Boolean))
      )].join("; ");
      const days = (r.days||[]).map(d=>d.day).join(", ");
      return [
        r.reference||"", r.staff_name||"", r.week_ending||"",
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
            { label:"Unique Staff",      value:new Set(records.map(r=>r.staff_id)).size, icon:"👥" },
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
            <button onClick={exportCSV}
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

        {/* RLS Warning */}
        {rlsWarning && !loading && (
          <div style={{ background:"#fffbea", border:`1.5px solid #f0c040`,
            borderRadius:10, padding:"16px", fontSize:13, marginBottom:16, color:"#7a5800" }}>
            <b>⚠️ No timesheets found.</b> This is usually because the database has Row Level Security (RLS) enabled.
            To fix this, go to your <b>Supabase dashboard → Table Editor → timesheets → Policies</b> and add a policy:
            <br/><br/>
            <code style={{ background:"#fff8dc", padding:"4px 8px", borderRadius:6, fontSize:12,
              display:"block", marginTop:4 }}>
              Policy name: Admin read all · Target roles: anon · Using expression: true
            </code>
            <br/>
            Or contact your developer to enable public read access on the timesheets table.
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign:"center", padding:"40px", color:GRAY, fontSize:14 }}>
            Loading timesheets…
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div style={{ background:WHITE, borderRadius:12, border:`1.5px solid ${BORD}`,
            overflow:"hidden" }}>

            <div style={{ display:"grid",
              gridTemplateColumns:"1fr 1.4fr 1fr 0.7fr 1.4fr 0.9fr 1fr",
              background:NAVY, color:WHITE, padding:"10px 16px",
              fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:".07em", gap:8 }}>
              <div>Reference</div>
              <div>Staff Name</div>
              <div>Week Ending</div>
              <div>Hours</div>
              <div className="hide-mobile">Clients</div>
              <div className="hide-mobile">Submitted</div>
              <div style={{ textAlign:"right" }}>Actions</div>
            </div>

            {filtered.length === 0 && !rlsWarning && (
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
              const submittedDate = rec.created_at
                ? new Date(rec.created_at).toLocaleDateString("en-GB",
                    {day:"2-digit",month:"short",year:"numeric"})
                : "—";
              const isOpen = expanded === rec.id;

              return (
                <div key={rec.id||i}>
                  <div className="row-card"
                    style={{ display:"grid",
                      gridTemplateColumns:"1fr 1.4fr 1fr 0.7fr 1.4fr 0.9fr 1fr",
                      padding:"12px 16px", gap:8, alignItems:"center",
                      borderTop: i===0?"none":`1px solid ${BORD}`,
                      background: i%2===0?WHITE:"#fafcfe",
                      cursor:"pointer", transition:"background .15s" }}
                    onClick={()=>setExpanded(isOpen?null:rec.id)}>

                    <div style={{ fontSize:12, fontWeight:700, color:BLUE, fontFamily:"monospace" }}>
                      {rec.reference||"—"}
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:NAVY }}>
                      {rec.staff_name||"—"}
                    </div>
                    <div style={{ fontSize:12, color:NAVY }}>
                      {rec.week_ending||"—"}
                    </div>
                    <div style={{ fontSize:13, fontWeight:800, color:GREEN }}>
                      {totalHrs(rec)}
                    </div>
                    <div className="hide-mobile" style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                      {clients.map(c=><Badge key={c} text={c} color={clientColor(c)}/>)}
                    </div>
                    <div className="hide-mobile" style={{ fontSize:11, color:GRAY }}>
                      {submittedDate}
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
