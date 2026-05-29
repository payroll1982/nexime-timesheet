import { useState, useRef, useCallback, useEffect } from "react";

// ── Colours ────────────────────────────────────────────
const BLUE  = "#0e8fd4";
const GREEN = "#3db84a";
const NAVY  = "#1b3a5c";
const PALE  = "#eaf6fd";
const BORD  = "#b0d8e8";
const GRAY  = "#7a8a9a";
const WHITE = "#ffffff";

// ── Constants ──────────────────────────────────────────
const DAYS    = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
const CLIENTS = ["","Turner Home","AFG","Gloucester Road"];
const BREAKS  = [
  {l:"No break",v:0},{l:"0.25 hrs",v:15},
  {l:"0.50 hrs",v:30},{l:"0.75 hrs",v:45},{l:"1.00 hrs",v:60},
];

// ── Helpers ────────────────────────────────────────────
const blank = () => ({ date:"", start:"", end:"", brk:0, client:"", unit:"", auth:"", sig:null });

function calcHrs(start, end, brk) {
  if (!start || !end) return "";
  const [sh,sm] = start.split(":").map(Number);
  const [eh,em] = end.split(":").map(Number);
  let m = (eh*60+em) - (sh*60+sm) - Number(brk);
  if (m < 0) m += 24*60; // overnight shift
  if (m <= 0) return "";
  return (Math.floor(m/60) + (m%60)/60).toFixed(2);
}
const toNum = h => { if(!h) return 0; return parseFloat(h); };
const fmt   = n => n.toFixed(2);

// ── Logo ───────────────────────────────────────────────
function Logo({ height=50, light=false }) {
  return (
    <svg height={height} viewBox="0 0 230 56" xmlns="http://www.w3.org/2000/svg" style={{display:"block"}}>
      <text x="2" y="36" fontFamily="'Arial Black',Arial,sans-serif" fontWeight="900"
        fontSize="32" fill={light?"#fff":BLUE} letterSpacing="3">NEXIME</text>
      <text x="4" y="53" fontFamily="Arial,sans-serif" fontWeight="400"
        fontSize="13" fill={light?"rgba(255,255,255,.68)":GRAY} letterSpacing="7.5">HEALTHCARE</text>
    </svg>
  );
}

// ── Signature Pad ──────────────────────────────────────
function SigPad({ label, onSave, onClose }) {
  const cv  = useRef(null);
  const dn  = useRef(false);
  const lp  = useRef(null);
  const [ok, setOk] = useState(false);

  const pt = e => {
    const r=cv.current.getBoundingClientRect();
    const sx=cv.current.width/r.width, sy=cv.current.height/r.height;
    const s=e.touches?e.touches[0]:e;
    return { x:(s.clientX-r.left)*sx, y:(s.clientY-r.top)*sy };
  };
  const down   = useCallback(e=>{e.preventDefault();dn.current=true;lp.current=pt(e);},[]);
  const move   = useCallback(e=>{
    if(!dn.current)return; e.preventDefault();
    const ctx=cv.current.getContext("2d"), p=pt(e);
    ctx.beginPath(); ctx.moveTo(lp.current.x,lp.current.y); ctx.lineTo(p.x,p.y);
    ctx.strokeStyle=NAVY; ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.stroke();
    lp.current=p; setOk(true);
  },[]);
  const up   = useCallback(()=>{dn.current=false;},[]);
  const clear = ()=>{ cv.current.getContext("2d").clearRect(0,0,560,200); setOk(false); };

  return (
    <div style={{position:"fixed",inset:0,background:"#000a",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:WHITE,borderRadius:"20px 20px 0 0",padding:"24px 20px 36px",width:"100%",maxWidth:540}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:11,color:BLUE,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em"}}>Client Sign-Off</div>
            <div style={{fontSize:15,fontWeight:700,color:NAVY}}>{label}</div>
          </div>
          <button onClick={onClose} style={{background:"#f0f0f0",border:"none",borderRadius:20,width:32,height:32,cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        <div style={{position:"relative"}}>
          <canvas ref={cv} width={560} height={200}
            style={{width:"100%",height:160,border:`2px dashed ${BLUE}`,borderRadius:10,background:PALE,touchAction:"none",cursor:"crosshair",display:"block"}}
            onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
            onTouchStart={down} onTouchMove={move} onTouchEnd={up}/>
          {!ok&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",color:BLUE,fontSize:14,pointerEvents:"none",textAlign:"center"}}>✍ Sign here</div>}
        </div>
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <button onClick={clear} style={{flex:1,padding:"11px",background:"#f4f4f4",border:`1.5px solid ${BORD}`,borderRadius:8,fontFamily:"inherit",fontSize:14,cursor:"pointer"}}>Clear</button>
          <button onClick={()=>ok&&onSave(cv.current.toDataURL())}
            style={{flex:2,padding:"11px",background:ok?GREEN:"#ccc",color:WHITE,border:"none",borderRadius:8,fontFamily:"inherit",fontSize:14,fontWeight:700,cursor:ok?"pointer":"default"}}>
            Confirm Signature ✓
          </button>
        </div>
        <div style={{fontSize:11,color:"#999",textAlign:"center",marginTop:10}}>By signing I confirm these hours are accurate and authorised.</div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────
export default function App() {
  const [step,   setStep]   = useState("info");
  const [info,   setInfo]   = useState({ name:"", week:"" });
  const [rows,   setRows]   = useState(() => Object.fromEntries(DAYS.map(d=>[d,{sh:blank(),sl:blank()}])));
  const [modal,  setModal]  = useState(null);
  const [errors, setErrors] = useState({});
  const [refNo]             = useState(()=>"NX-"+Math.random().toString(36).substring(2,8).toUpperCase());
  const [sendStatus, setSendStatus] = useState("idle"); // idle | sending | sent | error


  const upd = (day,type,field,val) =>
    setRows(p=>({...p,[day]:{...p[day],[type]:{...p[day][type],[field]:val}}}));

  const grand = DAYS.reduce((s,d)=>
    s + toNum(calcHrs(rows[d].sh.start,rows[d].sh.end,rows[d].sh.brk))
      + toNum(calcHrs(rows[d].sl.start,rows[d].sl.end,rows[d].sl.brk)), 0);

  const weekLabel = () => info.week
    ? new Date(info.week).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";

  const validate = () => {
    const e={};
    if(!info.name.trim()) e.name=true;
    if(!info.week)        e.week=true;
    setErrors(e); return !Object.keys(e).length;
  };


  // ── Auto-send PDF via serverless function ──────────
  const handleSubmit = async () => {
    setStep("done");
    setSendStatus("sending");
    try {
      const payload = {
        staffName:  info.name,
        weekEnding: weekLabel(),
        reference:  refNo,
        totalHours: fmt(grand),
        days: DAYS.map(day => {
          const r  = rows[day];
          const sh = calcHrs(r.sh.start, r.sh.end, r.sh.brk);
          const sl = calcHrs(r.sl.start, r.sl.end, r.sl.brk);
          if (!sh && !sl) return null;
          return {
            day,
            shift:   sh ? { ...r.sh, hours: sh } : null,
            sleepIn: sl ? { ...r.sl, hours: sl } : null,
            total:   fmt(toNum(sh) + toNum(sl)),
          };
        }).filter(Boolean),
      };
      const res = await fetch("/api/send-timesheet", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (res.ok) { setSendStatus("sent"); }
      else        { setSendStatus("error"); }
    } catch(e) {
      console.error(e);
      setSendStatus("error");
    }
  };

  const HDRS = [
    `linear-gradient(90deg,${NAVY},${BLUE})`,
    `linear-gradient(90deg,#1257a0,${BLUE})`,
    `linear-gradient(90deg,${BLUE},#0fa8c8)`,
    `linear-gradient(90deg,#0b6e99,${BLUE})`,
    `linear-gradient(90deg,${NAVY},#0fa8c8)`,
    `linear-gradient(90deg,#0d6e1c,${GREEN})`,
    `linear-gradient(90deg,${GREEN},#0b9a88)`,
  ];

  // ── Render a shift or sleep-in row ─────────────────
  const renderRow = (day, type) => {
    const d       = rows[day][type];
    const isShift = type === "sh";
    const label   = isShift ? "Shift" : "Sleep In";
    const rowHrs  = calcHrs(d.start, d.end, d.brk);
    const needSign = d.start && d.end && !d.sig;

    return (
      <div key={type} style={{background: isShift ? WHITE : "#f2f9ff", borderTop:`2px solid ${BORD}`}}>

        {/* Row label */}
        <div style={{padding:"10px 16px 8px"}}>
          <span style={{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".06em",
            borderRadius:5,padding:"4px 12px",
            background:isShift?"#d0f0d8":"#bee8ff",
            color:isShift?"#1a6b2a":"#094f80"}}>
            {isShift?"⚡  Shift":"🌙  Sleep In"}
          </span>
        </div>

        {/* Date / Start / End / Break */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,padding:"0 16px 10px"}}>
          <div>
            <div className="lbl">Date</div>
            <input type="date" className="f" style={{fontSize:12,padding:"7px 6px"}}
              value={d.date} onChange={e=>upd(day,type,"date",e.target.value)}/>
          </div>
          <div>
            <div className="lbl">Start</div>
            <input type="time" className="f" value={d.start} onChange={e=>upd(day,type,"start",e.target.value)}/>
          </div>
          <div>
            <div className="lbl">End</div>
            <input type="time" className="f" value={d.end} onChange={e=>upd(day,type,"end",e.target.value)}/>
          </div>
          <div>
            <div className="lbl">Break</div>
            <select className="f" style={{fontSize:12}} value={d.brk} onChange={e=>upd(day,type,"brk",Number(e.target.value))}>
              {BREAKS.map(b=><option key={b.v} value={b.v}>{b.l}</option>)}
            </select>
          </div>
        </div>

        {/* Hours badge — appears as soon as start + end entered */}
        {rowHrs && (
          <div style={{margin:"0 16px 12px"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,
              background:"#e8faf0",border:`2px solid ${GREEN}`,borderRadius:12,padding:"10px 16px"}}>
              <span style={{fontSize:26}}>🕐</span>
              <div>
                <div style={{fontWeight:800,fontSize:20,color:"#1a6b2a",lineHeight:1.1}}>{rowHrs} hrs</div>
                <div style={{fontSize:13,color:"#2e8b50",marginTop:2}}>
                  {label} hours{d.brk>0?` · ${(d.brk/60).toFixed(2)} hrs break deducted`:""}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Client / Unit */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:"0 16px 10px"}}>
          <div>
            <div className="lbl">Client</div>
            <select className="f" value={d.client} onChange={e=>upd(day,type,"client",e.target.value)}
              style={{color:d.client?NAVY:GRAY}}>
              {CLIENTS.map(c=><option key={c} value={c}>{c||"Select client…"}</option>)}
            </select>
          </div>
          <div>
            <div className="lbl">Unit</div>
            <input className="f" value={d.unit}
              placeholder={d.client?`Unit at ${d.client}`:"Select client first"}
              disabled={!d.client}
              onChange={e=>upd(day,type,"unit",e.target.value)}
              style={{background:d.client?WHITE:"#f0f0f0",color:d.client?NAVY:GRAY}}/>
          </div>
        </div>

        {/* Auth + Sign — Turner Home only */}
        {d.client==="Turner Home" && (
          <div style={{padding:"0 16px 8px"}}>
            <input className="f" placeholder="Authorising Name" style={{fontSize:13}}
              value={d.auth} onChange={e=>upd(day,type,"auth",e.target.value)}/>
          </div>
        )}

        <div style={{padding:"0 16px 16px"}}>
          {d.client==="Turner Home" ? (
            d.sig
              ? <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#e8faf0",
                  border:`2px solid ${GREEN}`,borderRadius:20,padding:"7px 16px",
                  fontSize:13,fontWeight:700,color:"#1a6b2a"}}>✅ Signed</div>
              : <div onClick={()=>d.start&&d.end&&setModal({day,type,label:`${day} ${label} · ${d.start}–${d.end}`})}
                  style={{display:"inline-flex",alignItems:"center",gap:6,
                    background:needSign?"#fff5f5":d.start&&d.end?PALE:"#f5f5f5",
                    border:`2px solid ${needSign?"#f5a0a0":d.start&&d.end?BLUE:"#ddd"}`,
                    borderRadius:20,padding:"7px 16px",fontSize:13,fontWeight:700,
                    color:needSign?"#c0392b":d.start&&d.end?NAVY:GRAY,
                    cursor:d.start&&d.end?"pointer":"default",
                    animation:needSign?"pulse 2s infinite":"none"}}>
                  ✍ {d.start&&d.end?"Sign Now":"Enter times first"}
                </div>
          ) : (d.client==="AFG"||d.client==="Gloucester Road") ? (
            <div style={{display:"inline-flex",alignItems:"center",gap:6,
              background:"#f0f8ff",border:`1.5px solid ${BORD}`,
              borderRadius:20,padding:"7px 14px",fontSize:12,color:GRAY}}>
              ℹ️ No signature required for {d.client}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div style={{minHeight:"100vh",background:"#f4faff",fontFamily:"'Nunito','Segoe UI',sans-serif",color:NAVY}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input,select{font-family:inherit}
        .f{width:100%;padding:9px 12px;border:1.5px solid ${BORD};border-radius:8px;font-size:14px;
           color:${NAVY};outline:none;background:#fff;transition:border-color .2s;
           -webkit-appearance:none;appearance:none}
        .f:focus{border-color:${BLUE}}
        .btn{background:${BLUE};color:#fff;border:none;border-radius:9px;padding:13px 24px;
             font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:background .2s}
        .btn:hover{background:#0b7ab8}
        .ghost{background:transparent;color:${NAVY};border:1.5px solid ${BORD};
               border-radius:9px;padding:12px 22px;font-size:14px;cursor:pointer;font-family:inherit}
        .lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:${BLUE};margin-bottom:4px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
      `}</style>

      {/* HEADER */}
      <div style={{background:`linear-gradient(135deg,${NAVY},${BLUE})`,padding:"18px 20px 0"}}>
        <div style={{maxWidth:580,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <Logo height={52} light/>
            {step==="shifts"&&(
              <div style={{background:"rgba(255,255,255,.15)",borderRadius:12,padding:"8px 16px",textAlign:"center"}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,.7)",fontWeight:700,letterSpacing:".08em"}}>TOTAL HRS</div>
                <div style={{fontSize:26,color:WHITE,fontWeight:800,lineHeight:1}}>{fmt(grand)}</div>
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:6,paddingBottom:16}}>
            {["info","shifts","done"].map((s,i)=>{
              const cur=["info","shifts","done"].indexOf(step);
              return <div key={s} style={{height:4,flex:1,borderRadius:2,
                background:i<cur?"#3db84a":i===cur?"#fff":"rgba(255,255,255,.25)",transition:"background .3s"}}/>;
            })}
          </div>
        </div>
      </div>

      <div style={{maxWidth:580,margin:"0 auto",padding:"24px 16px 60px"}}>

        {/* ── STEP 1: Info ── */}
        {step==="info"&&(
          <div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>Staff Details</div>
              <div style={{fontSize:13,color:GRAY}}>Enter your details to begin your weekly timesheet.</div>
            </div>
            <div style={{background:WHITE,borderRadius:14,border:`2px solid ${BORD}`,padding:"20px 18px",display:"grid",gap:16}}>
              <div>
                <div className="lbl">Staff Name</div>
                <input className="f" placeholder="e.g. Sarah Johnson"
                  style={{borderColor:errors.name?"#e05252":undefined}}
                  value={info.name}
                  onChange={e=>{setInfo(p=>({...p,name:e.target.value}));setErrors(p=>({...p,name:false}));}}/>
                {errors.name&&<div style={{fontSize:11,color:"#e05252",marginTop:3}}>⚠ Required</div>}
              </div>
              <div>
                <div className="lbl">Week Ending Sunday Date</div>
                <input type="date" className="f"
                  style={{borderColor:errors.week?"#e05252":undefined}}
                  value={info.week}
                  onChange={e=>{setInfo(p=>({...p,week:e.target.value}));setErrors(p=>({...p,week:false}));}}/>
                {errors.week&&<div style={{fontSize:11,color:"#e05252",marginTop:3}}>⚠ Required</div>}
              </div>
            </div>
            <div style={{background:PALE,border:`1.5px solid ${BORD}`,borderRadius:10,
              padding:"12px 16px",marginTop:16,display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:18}}>⚠️</span>
              <div style={{fontSize:12,color:NAVY,lineHeight:1.6}}>
                <strong>Important:</strong> Employees must record their actual arrival time, not a rounded or scheduled start time.
                Timesheet submission deadline is every <strong>Sunday by 18:00 (6:00 PM)</strong>. Late submissions may delay payroll processing.
              </div>
            </div>
            <button className="btn" style={{width:"100%",marginTop:20}}
              onClick={()=>{if(validate())setStep("shifts");}}>
              Start Logging Shifts →
            </button>
          </div>
        )}

        {/* ── STEP 2: Shifts ── */}
        {step==="shifts"&&(
          <div>
            {/* Staff bar */}
            <div style={{background:WHITE,borderRadius:12,border:`2px solid ${BORD}`,
              padding:"12px 16px",marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div className="lbl">Staff Member</div>
                <div style={{fontWeight:800,fontSize:15}}>{info.name}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div className="lbl">Week Ending</div>
                <div style={{fontWeight:700,fontSize:13}}>{weekLabel()}</div>
              </div>
            </div>

            {DAYS.map((day,di)=>{
              const r  = rows[day];
              const sh = calcHrs(r.sh.start,r.sh.end,r.sh.brk);
              const sl = calcHrs(r.sl.start,r.sl.end,r.sl.brk);
              const tot = toNum(sh)+toNum(sl);
              return (
                <div key={day} style={{background:WHITE,borderRadius:14,border:`2px solid ${BORD}`,
                  marginBottom:14,overflow:"hidden",boxShadow:"0 2px 12px #0e8fd414"}}>
                  {/* Day header */}
                  <div style={{background:HDRS[di],padding:"12px 16px",
                    display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{color:WHITE,fontWeight:800,fontSize:16,letterSpacing:".04em"}}>{day}</div>
                    {tot>0&&<div style={{background:"rgba(255,255,255,.22)",color:WHITE,
                      borderRadius:8,padding:"4px 14px",fontSize:13,fontWeight:700}}>
                      {fmt(tot)} hrs total
                    </div>}
                  </div>
                  {renderRow(day,"sh")}
                  {renderRow(day,"sl")}
                </div>
              );
            })}

            {/* Grand total */}
            <div style={{background:`linear-gradient(135deg,${NAVY},${BLUE})`,borderRadius:12,
              padding:"16px 20px",display:"flex",justifyContent:"space-between",
              alignItems:"center",margin:"8px 0 16px"}}>
              <div>
                <div style={{color:"rgba(255,255,255,.7)",fontSize:11,fontWeight:700,letterSpacing:".08em",marginBottom:2}}>
                  TOTAL HOURS FOR WEEK
                </div>
                <div style={{color:"rgba(255,255,255,.5)",fontSize:11}}>Shift + Sleep In combined</div>
              </div>
              <div style={{color:WHITE,fontSize:32,fontWeight:800}}>{fmt(grand)}</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10}}>
              <button className="ghost" onClick={()=>setStep("info")}>← Back</button>
              <button className="btn" onClick={handleSubmit}>Submit Timesheet ✓</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Done ── */}
        {step==="done"&&(
          <div style={{textAlign:"center"}}>
            <div style={{width:80,height:80,background:`linear-gradient(135deg,${GREEN},${BLUE})`,
              borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
              margin:"0 auto 20px",fontSize:36,color:WHITE}}>✓</div>
            <div style={{fontSize:24,fontWeight:800,color:NAVY,marginBottom:6}}>Timesheet Submitted!</div>
            <div style={{fontSize:13,color:GRAY,marginBottom:20,lineHeight:1.7}}>
              Thank you <strong>{info.name}</strong>. Week ending <strong>{weekLabel()}</strong>.
            </div>

            {/* Email status */}
            <div style={{background:PALE,border:`1.5px solid ${BLUE}`,borderRadius:10,
              padding:"13px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
              <span style={{fontSize:22}}>📧</span>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:NAVY}}>
                  {emailStatus==="opened"
                    ? "Email app opened — tap Send to deliver to payroll"
                    : "Your email app is opening…"}
                </div>
                <div style={{fontSize:11,color:GRAY,marginTop:2}}>To: payroll@neximehealthcare.co.uk</div>
              </div>
            </div>

            {/* Summary */}
            <div style={{background:WHITE,borderRadius:14,border:`2px solid ${BORD}`,
              padding:18,marginBottom:16,textAlign:"left"}}>
              <div style={{display:"flex",justifyContent:"space-between",
                borderBottom:`1px solid ${PALE}`,paddingBottom:12,marginBottom:12}}>
                <div>
                  <div style={{fontWeight:800,fontSize:15}}>{info.name}</div>
                  <div style={{fontSize:12,color:GRAY}}>Week ending: {weekLabel()}</div>
                  <div style={{fontSize:11,color:GRAY}}>Ref: {refNo}</div>
                </div>
                <div style={{background:`linear-gradient(135deg,${BLUE},${GREEN})`,
                  borderRadius:10,padding:"8px 16px",textAlign:"center"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.8)",fontWeight:700}}>TOTAL</div>
                  <div style={{fontSize:22,color:WHITE,fontWeight:800}}>{fmt(grand)}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.7)"}}>hrs</div>
                </div>
              </div>
              {DAYS.map(day=>{
                const r=rows[day];
                const sh=calcHrs(r.sh.start,r.sh.end,r.sh.brk);
                const sl=calcHrs(r.sl.start,r.sl.end,r.sl.brk);
                if(!sh&&!sl) return null;
                return (
                  <div key={day} style={{padding:"7px 0",borderBottom:`1px solid ${PALE}`,fontSize:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                      <div style={{fontWeight:800,fontSize:13}}>{day.slice(0,3)}</div>
                      <div style={{fontWeight:700,color:BLUE}}>{fmt(toNum(sh)+toNum(sl))} hrs</div>
                    </div>
                    {sh&&<div style={{color:GRAY}}>⚡ Shift: {r.sh.start}–{r.sh.end} = <strong>{sh}</strong>
                      {r.sh.brk>0&&` (${(r.sh.brk/60).toFixed(2)} hrs break)`}
                      {r.sh.client&&<span style={{color:BLUE}}> · {r.sh.client}</span>}
                      {r.sh.sig&&" ✅"}
                    </div>}
                    {sl&&<div style={{color:GRAY,marginTop:1}}>🌙 Sleep In: {r.sl.start}–{r.sl.end} = <strong>{sl}</strong>
                      {r.sl.brk>0&&` (${(r.sl.brk/60).toFixed(2)} hrs break)`}
                      {r.sl.client&&<span style={{color:BLUE}}> · {r.sl.client}</span>}
                      {r.sl.sig&&" ✅"}
                    </div>}
                  </div>
                );
              })}
            </div>

            <div style={{background:"#e8f8ee",border:`1px solid ${GREEN}44`,borderRadius:10,
              padding:"10px 14px",fontSize:12,color:"#1a6b2a",marginBottom:16}}>
              Reference: <strong>{refNo}</strong> · Nexime Healthcare Digital Timesheet
            </div>

            {/* Retry button if failed */}
            {sendStatus==="error" && (
              <div style={{marginBottom:12}}>
                <button onClick={handleSubmit}
                  style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,
                    background:`linear-gradient(90deg,${NAVY},${BLUE})`,
                    color:WHITE,border:"none",borderRadius:10,padding:"14px 20px",
                    width:"100%",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  <span style={{fontSize:20}}>🔄</span> Retry Sending
                </button>
              </div>
            )}

            <button className="ghost" style={{width:"100%"}} onClick={()=>{
              setStep("info");
              setInfo({name:"",week:""});
              setRows(Object.fromEntries(DAYS.map(d=>[d,{sh:blank(),sl:blank()}])));
              setErrors({});
              setSendStatus("idle");
            }}>Start New Timesheet</button>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{background:NAVY,padding:"18px 20px",textAlign:"center"}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:10}}>
          <Logo height={38} light/>
        </div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>
          📞 0151 673 1899 · payroll@neximehealthcare.co.uk · neximehealthcare.co.uk
        </div>
        <div style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:4}}>
          Nexime Healthcare Ltd · Registered in England & Wales · Co. Reg: 11008626
        </div>
      </div>

      {modal&&(
        <SigPad label={modal.label}
          onSave={url=>{upd(modal.day,modal.type,"sig",url);setModal(null);}}
          onClose={()=>setModal(null)}/>
      )}
    </div>
  );
}
