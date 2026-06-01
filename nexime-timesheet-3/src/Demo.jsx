import { useState, useEffect, useRef } from "react";

const BLUE  = "#0e8fd4";
const GREEN = "#3db84a";
const NAVY  = "#1b3a5c";
const WHITE = "#ffffff";
const GRAY  = "#7a8a9a";
const PALE  = "#eaf6fd";

// Each step of the demo
const STEPS = [
  { id:"intro",    duration:3000 },
  { id:"page1",    duration:4500 },
  { id:"typing",   duration:3500 },
  { id:"weekdate", duration:3000 },
  { id:"page2",    duration:3000 },
  { id:"shift",    duration:4000 },
  { id:"hours",    duration:3000 },
  { id:"client",   duration:3000 },
  { id:"sign",     duration:4000 },
  { id:"submit",   duration:3000 },
  { id:"done",     duration:4000 },
  { id:"end",      duration:5000 },
];

function useTypewriter(text, active, speed=45) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!active) { setDisplayed(""); return; }
    setDisplayed("");
    let i = 0;
    const t = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [active, text]);
  return displayed;
}

// Phone frame wrapper
function Phone({ children, scale=1 }) {
  return (
    <div style={{
      width: 300, height: 580,
      background: "#0a0a0a",
      borderRadius: 44,
      padding: "10px 6px",
      boxShadow: "0 40px 80px #00000088, 0 0 0 1px #333, inset 0 0 0 2px #1a1a1a",
      transform: `scale(${scale})`,
      transformOrigin: "top center",
      position: "relative",
      flexShrink: 0,
    }}>
      {/* Notch */}
      <div style={{position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",
        width:80,height:22,background:"#0a0a0a",borderRadius:12,zIndex:10}}/>
      {/* Screen */}
      <div style={{width:"100%",height:"100%",borderRadius:36,overflow:"hidden",background:WHITE}}>
        {children}
      </div>
    </div>
  );
}

// Animated cursor dot
function Cursor({ x, y, clicking, visible }) {
  return (
    <div style={{
      position:"absolute", left:x, top:y,
      width:20, height:20,
      borderRadius:"50%",
      background: clicking ? `${BLUE}dd` : `${BLUE}88`,
      border: `2px solid ${BLUE}`,
      transform:"translate(-50%,-50%)",
      transition:"left 0.6s cubic-bezier(.4,0,.2,1), top 0.6s cubic-bezier(.4,0,.2,1), background 0.1s",
      zIndex:100,
      pointerEvents:"none",
      opacity: visible ? 1 : 0,
      boxShadow: clicking ? `0 0 0 8px ${BLUE}33` : "none",
    }}/>
  );
}

// App header
function AppHeader({ step }) {
  return (
    <div style={{background:`linear-gradient(135deg,${NAVY},${BLUE})`,padding:"14px 16px 0"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div>
          <div style={{color:WHITE,fontWeight:900,fontSize:18,letterSpacing:2,fontFamily:"Arial Black"}}>NEXIME</div>
          <div style={{color:"rgba(255,255,255,.65)",fontSize:9,letterSpacing:5,fontFamily:"Arial"}}>HEALTHCARE</div>
        </div>
      </div>
      {/* Progress bars */}
      <div style={{display:"flex",gap:4,paddingBottom:10}}>
        {["info","shifts","done"].map((s,i) => {
          const steps = ["intro","page1","typing","weekdate"];
          const midSteps = ["page2","shift","hours","client","sign","submit"];
          const doneSteps = ["done","end"];
          const filled = i===0 ? (!steps.includes(step)) :
                         i===1 ? (midSteps.includes(step)||doneSteps.includes(step)) :
                         doneSteps.includes(step);
          const active = i===0 ? steps.includes(step) :
                         i===1 ? midSteps.includes(step) : false;
          return (
            <div key={s} style={{height:3,flex:1,borderRadius:2,
              background: filled?"#3db84a":active?"#fff":"rgba(255,255,255,.25)",
              transition:"background 0.5s"}}/>
          );
        })}
      </div>
    </div>
  );
}

export default function Demo() {
  const [stepIdx, setStepIdx]     = useState(0);
  const [playing, setPlaying]     = useState(true);
  const [cursor, setCursor]       = useState({ x:150, y:300, clicking:false, visible:false });
  const [showSign, setShowSign]   = useState(false);
  const [signed, setSigned]       = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const timerRef  = useRef(null);
  const ctxRef    = useRef(null);

  const step = STEPS[stepIdx]?.id || "end";

  const name  = useTypewriter("Sarah Johnson", step==="typing");
  const week  = useTypewriter("2026-06-07",    step==="weekdate");

  // ── Sounds: whoosh on each step, chime on done ────────
  const getCtx = () => {
    if (!ctxRef.current)
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctxRef.current;
  };

  const whoosh = (dir="fwd") => {
    if (!audioOn) return;
    try {
      const ctx = getCtx();
      const dur = 0.6;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate*dur), ctx.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type   = "bandpass";
      f.Q.value = 2.2;
      if (dir==="fwd") {
        f.frequency.setValueAtTime(60,   ctx.currentTime);
        f.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime+dur);
      } else {
        f.frequency.setValueAtTime(4000, ctx.currentTime);
        f.frequency.exponentialRampToValueAtTime(60,   ctx.currentTime+dur);
      }
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001,  ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.5,   ctx.currentTime+dur*0.2);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+dur);
      src.connect(f); f.connect(g); g.connect(ctx.destination);
      src.start(); src.stop(ctx.currentTime+dur+0.05);
    } catch(e){}
  };

  const chime = () => {
    if (!audioOn) return;
    try {
      const ctx = getCtx();
      [523.25,659.25,783.99,1046.50].forEach((freq,i)=>{
        const osc=ctx.createOscillator(), g=ctx.createGain();
        osc.type="sine"; osc.frequency.value=freq;
        const t=ctx.currentTime+i*0.14;
        g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(0.28-i*0.05,t+0.06);
        g.gain.exponentialRampToValueAtTime(0.001,t+1.8);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t); osc.stop(t+2);
      });
    } catch(e){}
  };

  // Whoosh every step change
  useEffect(()=>{ whoosh("fwd"); },[stepIdx]);

  // Success chime 2s after done, then silence
  useEffect(()=>{
    if (step==="done") {
      setTimeout(()=>chime(), 400);
    }
  },[step]);

  const toggleAudio = () => {
    setAudioOn(a => {
      if (!a) whoosh("fwd"); // confirm sound is on
      return !a;
    });
  };

  useEffect(()=>()=>{ try{ctxRef.current?.close();}catch(e){} },[]);


  useEffect(() => {
    if (!playing) return;
    timerRef.current = setTimeout(() => {
      setStepIdx(i => Math.min(i+1, STEPS.length-1));
    }, STEPS[stepIdx]?.duration || 3000);
    return () => clearTimeout(timerRef.current);
  }, [stepIdx, playing]);

  // Cursor animations per step
  useEffect(() => {
    const animations = {
      page1:    [{ x:150, y:280, v:true, c:false, delay:300 }],
      typing:   [{ x:150, y:220, v:true, c:true,  delay:200 }, { x:150, y:220, v:true, c:false, delay:600 }],
      weekdate: [{ x:150, y:300, v:true, c:true,  delay:200 }, { x:150, y:300, v:true, c:false, delay:600 }],
      page2:    [{ x:150, y:200, v:true, c:false, delay:200 }],
      shift:    [{ x:100, y:260, v:true, c:true,  delay:300 }, { x:200, y:260, v:true, c:true, delay:800 }],
      client:   [{ x:100, y:370, v:true, c:true,  delay:300 }],
      sign:     [{ x:200, y:420, v:true, c:true,  delay:400 }, { x:150, y:480, v:true, c:false, delay:1000 }],
      submit:   [{ x:150, y:520, v:true, c:true,  delay:500 }, { x:150, y:520, v:true, c:false, delay:900 }],
    };
    const frames = animations[step] || [];
    frames.forEach(({ x, y, v, c, delay }) => {
      setTimeout(() => setCursor({ x, y, clicking:c, visible:v }), delay);
    });
  }, [step]);

  // Trigger sign animation
  useEffect(() => {
    if (step === "sign") {
      setTimeout(() => setShowSign(true), 1200);
      setTimeout(() => setSigned(true), 2800);
    } else if (step !== "done" && step !== "end") {
      setShowSign(false);
      setSigned(false);
    }
  }, [step]);

  useEffect(() => {
    if (step === "done") setTimeout(() => setSubmitted(true), 500);
    else setSubmitted(false);
  }, [step]);

  const restart = () => {
    setStepIdx(0);
    setPlaying(true);
    setSigned(false);
    setShowSign(false);
    setSubmitted(false);
  };

  return (
    <div style={{
      minHeight:"100vh",
      background:`linear-gradient(135deg, #0a1628 0%, #1b3a5c 50%, #0e5a8a 100%)`,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      fontFamily:"'Nunito','Segoe UI',sans-serif", padding:"20px 16px",
      position:"relative", overflow:"hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        @keyframes draw   { from{stroke-dashoffset:200} to{stroke-dashoffset:0} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes pop    { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
        @keyframes glow   { 0%,100%{box-shadow:0 0 20px ${BLUE}44} 50%{box-shadow:0 0 40px ${BLUE}88} }
        .step { animation: fadeIn 0.4s ease both; }
      `}</style>

      {/* Background decoration */}
      <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        {[...Array(6)].map((_,i) => (
          <div key={i} style={{
            position:"absolute",
            width: 200+i*100, height: 200+i*100,
            borderRadius:"50%",
            border:`1px solid rgba(14,143,212,${0.08-i*0.01})`,
            top:"50%", left:"50%",
            transform:`translate(-50%,-50%)`,
          }}/>
        ))}
      </div>

      {/* Title */}
      <div style={{textAlign:"center",marginBottom:28,zIndex:1}}>
        <div style={{fontSize:12,color:`${BLUE}`,letterSpacing:4,fontWeight:700,
          textTransform:"uppercase",marginBottom:6}}>
          How to use
        </div>
        <div style={{fontSize:26,color:WHITE,fontWeight:900,lineHeight:1.2}}>
          Nexime Healthcare
        </div>
        <div style={{fontSize:26,color:BLUE,fontWeight:900,lineHeight:1.2,marginBottom:4}}>
          Timesheet App
        </div>
        <div style={{fontSize:12,color:"rgba(255,255,255,.5)"}}>
          Watch the full walkthrough below
        </div>
      </div>

      {/* Step label */}
      <div style={{
        background:"rgba(14,143,212,0.2)",border:`1px solid ${BLUE}44`,
        borderRadius:20,padding:"5px 16px",fontSize:11,color:BLUE,
        fontWeight:700,letterSpacing:2,textTransform:"uppercase",
        marginBottom:20,zIndex:1,
      }}>
        {step==="intro"    && "Welcome"}
        {step==="page1"    && "Step 1 — Enter Staff Details"}
        {step==="typing"   && "Step 2 — Type Your Name"}
        {step==="weekdate" && "Step 3 — Select Week Ending Date"}
        {step==="page2"    && "Step 4 — View Your Shifts"}
        {step==="shift"    && "Step 5 — Enter Start & End Times"}
        {step==="hours"    && "Step 6 — Hours Auto-Calculate!"}
        {step==="client"   && "Step 7 — Select Client & Unit"}
        {step==="sign"     && "Step 8 — Client Signs Off"}
        {step==="submit"   && "Step 9 — Submit Timesheet"}
        {step==="done"     && "Step 10 — Done! PDF Sent to Payroll"}
        {step==="end"      && "✅ That's it — Simple & Easy!"}
      </div>

      {/* Phone */}
      <div style={{position:"relative",zIndex:1}}>
        <Phone>
          <div style={{height:"100%",overflowY:"hidden",position:"relative",background:"#f4faff"}}>
            <AppHeader step={step}/>

            {/* ── INTRO ── */}
            {step==="intro" && (
              <div className="step" style={{padding:24,textAlign:"center",paddingTop:40}}>
                <div style={{fontSize:48,marginBottom:16}}>👋</div>
                <div style={{fontWeight:900,fontSize:18,color:NAVY,marginBottom:8}}>
                  Welcome to Nexime Healthcare Timesheet
                </div>
                <div style={{fontSize:12,color:GRAY,lineHeight:1.6}}>
                  Submit your weekly timesheet in minutes — directly from your phone.
                </div>
                <div style={{marginTop:24,background:WHITE,borderRadius:12,
                  border:`2px solid ${BLUE}33`,padding:16}}>
                  {["Log shifts & sleep-ins","Auto-calculate hours","Submit & email payroll"].map((t,i) => (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                      padding:"7px 0",borderBottom:i<2?`1px solid #f0f0f0`:"none",fontSize:12,color:NAVY}}>
                      <span style={{color:GREEN,fontSize:16}}>✓</span> {t}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── PAGE 1 — Staff details ── */}
            {(step==="page1"||step==="typing"||step==="weekdate") && (
              <div className="step" style={{padding:16}}>
                <div style={{fontWeight:800,fontSize:15,color:NAVY,marginBottom:4}}>Staff Details</div>
                <div style={{fontSize:11,color:GRAY,marginBottom:14}}>Enter your details to begin.</div>

                <div style={{background:WHITE,borderRadius:12,border:`2px solid #b0d8e8`,padding:14,display:"grid",gap:12}}>
                  <div>
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",
                      letterSpacing:".07em",color:BLUE,marginBottom:4}}>Staff Name</div>
                    <div style={{padding:"9px 12px",border:`1.5px solid ${step==="typing"?BLUE:"#b0d8e8"}`,
                      borderRadius:8,fontSize:13,color:NAVY,minHeight:36,background:WHITE,
                      transition:"border-color .3s"}}>
                      {name || <span style={{color:"#ccc"}}>e.g. Sarah Johnson</span>}
                      {step==="typing" && name.length < "Sarah Johnson".length && (
                        <span style={{borderRight:`2px solid ${BLUE}`,animation:"pulse 1s infinite"}}/>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",
                      letterSpacing:".07em",color:BLUE,marginBottom:4}}>Week Ending Sunday Date</div>
                    <div style={{padding:"9px 12px",border:`1.5px solid ${step==="weekdate"?BLUE:"#b0d8e8"}`,
                      borderRadius:8,fontSize:13,color:NAVY,minHeight:36,background:WHITE,
                      transition:"border-color .3s"}}>
                      {step==="weekdate" && week ? "07/06/2026" : 
                       step==="weekdate" ? <span style={{color:"#ccc"}}>Select date…</span> : 
                       (step==="typing"||step==="page1") ? <span style={{color:"#ccc"}}>Select date…</span> : "07/06/2026"}
                    </div>
                  </div>
                </div>

                <div style={{background:PALE,border:`1.5px solid #b0d8e8`,borderRadius:10,
                  padding:"10px 12px",marginTop:12,display:"flex",gap:8,alignItems:"flex-start"}}>
                  <span style={{fontSize:14}}>⚠️</span>
                  <div style={{fontSize:10,color:NAVY,lineHeight:1.5}}>
                    Record your <strong>actual arrival time</strong>. Deadline: Sunday 18:00.
                  </div>
                </div>

                <div style={{marginTop:14,background:BLUE,color:WHITE,borderRadius:9,
                  padding:"12px",textAlign:"center",fontWeight:700,fontSize:14,
                  opacity: step==="weekdate" && week.length > 5 ? 1 : 0.4,
                  transition:"opacity .5s"}}>
                  Start Logging Shifts →
                </div>
              </div>
            )}

            {/* ── PAGE 2 — Shifts ── */}
            {(step==="page2"||step==="shift"||step==="hours"||step==="client"||step==="sign"||step==="submit") && (
              <div className="step" style={{padding:12,overflowY:"hidden"}}>
                {/* Staff bar */}
                <div style={{background:WHITE,borderRadius:10,border:`1.5px solid #b0d8e8`,
                  padding:"8px 12px",marginBottom:10,display:"flex",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:8,fontWeight:700,color:BLUE,textTransform:"uppercase"}}>Staff</div>
                    <div style={{fontWeight:800,fontSize:12,color:NAVY}}>Sarah Johnson</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:8,fontWeight:700,color:BLUE,textTransform:"uppercase"}}>Week Ending</div>
                    <div style={{fontWeight:700,fontSize:11,color:NAVY}}>07/06/2026</div>
                  </div>
                </div>

                {/* Monday card */}
                <div style={{background:WHITE,borderRadius:12,border:`2px solid #b0d8e8`,
                  overflow:"hidden",marginBottom:8,
                  boxShadow: step==="shift"||step==="hours"||step==="client"||step==="sign"
                    ? `0 0 0 2px ${BLUE}` : "none",
                  transition:"box-shadow .4s"}}>
                  {/* Day header */}
                  <div style={{background:`linear-gradient(90deg,${NAVY},${BLUE})`,
                    padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{color:WHITE,fontWeight:800,fontSize:13}}>MONDAY</div>
                    {(step==="hours"||step==="client"||step==="sign"||step==="submit") && (
                      <div style={{background:"rgba(255,255,255,.2)",color:WHITE,
                        borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>
                        8.00 hrs total
                      </div>
                    )}
                  </div>

                  {/* Shift row */}
                  <div style={{padding:"8px 12px",borderBottom:`1px solid #eaf6fd`}}>
                    <span style={{fontSize:9,fontWeight:800,textTransform:"uppercase",
                      background:"#d0f0d8",color:"#1a6b2a",borderRadius:4,padding:"2px 8px"}}>
                      ⚡ Shift
                    </span>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",
                      gap:4,marginTop:6}}>
                      {[
                        {l:"Date", v:"02/06/2026"},
                        {l:"Start", v: step==="page2" ? "" : "08:00"},
                        {l:"End",   v: step==="page2" ? "" : "16:00"},
                        {l:"Break", v:"No break"},
                      ].map(({l,v},i) => (
                        <div key={i}>
                          <div style={{fontSize:8,color:BLUE,fontWeight:700,textTransform:"uppercase",marginBottom:2}}>{l}</div>
                          <div style={{padding:"5px 6px",border:`1.5px solid ${
                            (i===1||i===2) && step==="shift" ? BLUE : "#b0d8e8"
                          }`,borderRadius:6,fontSize:10,color:v?NAVY:"#ccc",background:WHITE,
                            transition:"border-color .3s",minHeight:24}}>
                            {v || "—"}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Hours badge */}
                    {(step==="hours"||step==="client"||step==="sign"||step==="submit") && (
                      <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8,
                        background:"#e8faf0",border:`2px solid ${GREEN}`,borderRadius:8,padding:"6px 10px",
                        animation:"fadeIn .4s ease"}}>
                        <span style={{fontSize:18}}>🕐</span>
                        <div>
                          <div style={{fontWeight:800,fontSize:14,color:"#1a6b2a"}}>8.00 hrs</div>
                          <div style={{fontSize:9,color:"#2e8b50"}}>Shift hours</div>
                        </div>
                      </div>
                    )}

                    {/* Client / unit */}
                    {(step==="client"||step==="sign"||step==="submit") && (
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:8,
                        animation:"fadeIn .4s ease"}}>
                        <div>
                          <div style={{fontSize:8,color:BLUE,fontWeight:700,textTransform:"uppercase",marginBottom:2}}>Client</div>
                          <div style={{padding:"5px 6px",border:`1.5px solid ${BLUE}`,
                            borderRadius:6,fontSize:10,color:NAVY,background:WHITE}}>
                            Turner Home
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize:8,color:BLUE,fontWeight:700,textTransform:"uppercase",marginBottom:2}}>Unit</div>
                          <div style={{padding:"5px 6px",border:`1.5px solid #b0d8e8`,
                            borderRadius:6,fontSize:10,color:NAVY,background:WHITE}}>
                            Floor
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Auth + Sign */}
                    {(step==="sign"||step==="submit") && (
                      <div style={{marginTop:8,animation:"fadeIn .4s ease"}}>
                        <div style={{padding:"5px 8px",border:`1.5px solid #b0d8e8`,
                          borderRadius:6,fontSize:10,color:NAVY,background:WHITE,marginBottom:6}}>
                          Jane Smith — Team Leader
                        </div>
                        {signed ? (
                          <div style={{display:"inline-flex",alignItems:"center",gap:6,
                            background:"#e8faf0",border:`2px solid ${GREEN}`,
                            borderRadius:16,padding:"5px 12px",fontSize:11,fontWeight:700,
                            color:"#1a6b2a",animation:"pop .3s ease"}}>
                            ✅ Signed
                          </div>
                        ) : showSign ? (
                          <div style={{background:PALE,border:`2px solid ${BLUE}`,
                            borderRadius:8,padding:8,position:"relative",height:50}}>
                            <svg width="100%" height="100%" style={{position:"absolute",inset:0}}>
                              <path d="M10,35 Q40,10 70,30 Q100,50 130,20 Q160,5 190,25"
                                fill="none" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round"
                                strokeDasharray="200" strokeDashoffset="0"
                                style={{animation:"draw 1.2s ease forwards"}}/>
                            </svg>
                          </div>
                        ) : (
                          <div style={{display:"inline-flex",alignItems:"center",gap:6,
                            background:"#fff5f5",border:`2px solid #f5a0a0`,
                            borderRadius:16,padding:"5px 12px",fontSize:11,fontWeight:700,
                            color:"#c0392b",animation:"pulse 2s infinite"}}>
                            ✍ Sign Now
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit button */}
                <div style={{marginTop:6,background:step==="submit"?GREEN:BLUE,
                  color:WHITE,borderRadius:9,padding:"11px",textAlign:"center",
                  fontWeight:700,fontSize:13,transition:"background .3s",
                  animation:step==="submit"?"pulse .5s ease":"none"}}>
                  {step==="submit" ? "✓ Submitting…" : "Submit Timesheet ✓"}
                </div>
              </div>
            )}

            {/* ── DONE ── */}
            {(step==="done"||step==="end") && (
              <div className="step" style={{padding:20,textAlign:"center"}}>
                <div style={{width:64,height:64,background:`linear-gradient(135deg,${GREEN},${BLUE})`,
                  borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                  margin:"16px auto 14px",fontSize:28,color:WHITE,
                  animation:"pop .5s ease"}}>✓</div>

                <div style={{fontSize:18,fontWeight:800,color:NAVY,marginBottom:4}}>
                  Timesheet Submitted!
                </div>
                <div style={{fontSize:11,color:GRAY,marginBottom:14}}>
                  Week ending 07/06/2026
                </div>

                <div style={{background:PALE,border:`1.5px solid ${BLUE}`,borderRadius:10,
                  padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",
                  gap:10,textAlign:"left"}}>
                  <span style={{fontSize:18}}>✅</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:11,color:NAVY}}>
                      PDF sent to payroll@neximehealthcare.co.uk
                    </div>
                    <div style={{fontSize:9,color:GRAY,marginTop:1}}>Reference: NX-AB12CD</div>
                  </div>
                </div>

                <div style={{background:WHITE,borderRadius:10,border:`1.5px solid #b0d8e8`,
                  padding:12,marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    borderBottom:`1px solid ${PALE}`,paddingBottom:8,marginBottom:8}}>
                    <div style={{fontWeight:800,fontSize:12,color:NAVY}}>Sarah Johnson</div>
                    <div style={{background:`linear-gradient(135deg,${BLUE},${GREEN})`,
                      borderRadius:8,padding:"4px 10px",color:WHITE,fontSize:13,fontWeight:800}}>
                      8.00 hrs
                    </div>
                  </div>
                  <div style={{fontSize:10,color:GRAY,textAlign:"left"}}>
                    ⚡ Mon Shift: 08:00–16:00 = <strong>8.00</strong> · Turner Home ✅
                  </div>
                </div>

                <div style={{background:NAVY,color:WHITE,borderRadius:9,padding:"11px",
                  fontWeight:700,fontSize:12,marginBottom:8}}>
                  📄 Download My Timesheet PDF
                </div>
                <div style={{color:GRAY,fontSize:10,borderRadius:9,padding:"10px",
                  border:`1.5px solid #b0d8e8`,background:WHITE}}>
                  Start New Timesheet
                </div>
              </div>
            )}

            {/* Cursor */}
            <Cursor {...cursor}/>
          </div>
        </Phone>
      </div>

      {/* Step dots */}
      <div style={{display:"flex",gap:6,marginTop:24,zIndex:1}}>
        {STEPS.map((s,i) => (
          <div key={s.id}
            onClick={()=>{ setStepIdx(i); setPlaying(false); }}
            style={{width: i===stepIdx?20:6, height:6, borderRadius:3,
              background: i===stepIdx?BLUE : i<stepIdx?"#3db84a":"rgba(255,255,255,.2)",
              transition:"all .3s", cursor:"pointer"}}/>
        ))}
      </div>

      {/* Controls */}
      <div style={{display:"flex",gap:12,marginTop:16,zIndex:1,flexWrap:"wrap",justifyContent:"center"}}>
        <button onClick={()=>setStepIdx(i=>Math.max(i-1,0))}
          style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",
            color:WHITE,borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
          ← Prev
        </button>
        <button onClick={()=>{ setPlaying(p=>!p); }}
          style={{background:playing?`${BLUE}33`:`${GREEN}33`,
            border:`1px solid ${playing?BLUE:GREEN}`,
            color:playing?BLUE:GREEN,borderRadius:8,padding:"8px 20px",
            cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:700}}>
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
        <button onClick={()=>setStepIdx(i=>Math.min(i+1,STEPS.length-1))}
          style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",
            color:WHITE,borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
          Next →
        </button>
        <button onClick={toggleAudio}
          style={{background: audioOn?"rgba(61,184,74,.25)":"rgba(255,255,255,.1)",
border:`1px solid ${audioOn?GREEN:"rgba(255,255,255,.2)"}`,
color: audioOn?GREEN:WHITE,
            borderRadius:8,padding:"8px 16px",cursor:"pointer",
            fontSize:13,fontFamily:"inherit",fontWeight:700,
            animation:"none"}}>
          {audioOn ? "🔊 Sound On" : "🔇 Sound Off"}
        </button>
      </div>

      <button onClick={restart}
        style={{marginTop:10,background:"transparent",border:"none",
          color:"rgba(255,255,255,.4)",fontSize:12,cursor:"pointer",fontFamily:"inherit",zIndex:1}}>
        ↺ Restart from beginning
      </button>

      {/* Footer */}
      <div style={{marginTop:12,fontSize:10,
        color:"rgba(255,255,255,.3)",textAlign:"center",zIndex:1,paddingBottom:8}}>
        timesheet.neximehealthcare.co.uk
      </div>
    </div>
  );
}
