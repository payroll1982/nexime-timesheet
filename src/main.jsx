import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Demo from './Demo.jsx'
import Login from './Login.jsx'
import { supabase } from './supabase.js'

const BLUE = "#0e8fd4", GREEN = "#3db84a", NAVY = "#1b3a5c", WHITE = "#ffffff";

// ── Set New Password screen (shown after clicking reset email link) ──
function ResetPassword({ onDone }) {
  const [password,  setPassword]  = useState("");
  const [password2, setPassword2] = useState("");
  const [loading,   setLoading]   = useState(false);
  const [msg,       setMsg]       = useState({ type:"", text:"" });

  const handle = async () => {
    if (password.length < 6) {
      setMsg({ type:"error", text:"Password must be at least 6 characters." }); return;
    }
    if (password !== password2) {
      setMsg({ type:"error", text:"Passwords do not match." }); return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMsg({ type:"error", text: error.message });
    } else {
      setMsg({ type:"success", text:"Password updated! Signing you in…" });
      setTimeout(async () => {
        await supabase.auth.signOut();
        onDone();
      }, 1500);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,${NAVY},${BLUE})`,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"24px 16px", fontFamily:"'Nunito','Segoe UI',sans-serif",
      overflowX:"hidden", width:"100%" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0} input{font-family:inherit}
        .rf{width:100%;padding:11px 14px;border:1.5px solid #b0d8e8;border-radius:9px;
           font-size:14px;color:${NAVY};outline:none;background:#fff;transition:border-color .2s}
        .rf:focus{border-color:${BLUE}}`}</style>

      {/* Logo */}
      <svg height={52} viewBox="0 0 230 56" xmlns="http://www.w3.org/2000/svg"
        style={{display:"block",marginBottom:24}}>
        <text x="2" y="36" fontFamily="'Arial Black',Arial,sans-serif" fontWeight="900"
          fontSize="32" fill={WHITE} letterSpacing="3">NEXIME</text>
        <text x="4" y="53" fontFamily="Arial,sans-serif" fontWeight="400"
          fontSize="13" fill="rgba(255,255,255,.68)" letterSpacing="5">HEALTHCARE</text>
      </svg>

      <div style={{ width:"100%", maxWidth:400, background:WHITE, borderRadius:16,
        padding:"28px 24px", boxShadow:"0 20px 60px #00000033" }}>

        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:20, fontWeight:800, color:NAVY }}>Set New Password</div>
          <div style={{ fontSize:12, color:"#7a8a9a", marginTop:4 }}>
            Choose a new password for your account
          </div>
        </div>

        {msg.text && (
          <div style={{ background: msg.type==="error"?"#fff5f5":"#e8faf0",
            border:`1.5px solid ${msg.type==="error"?"#f5a0a0":GREEN}`,
            borderRadius:9, padding:"10px 14px", fontSize:12,
            color: msg.type==="error"?"#c0392b":"#1a6b2a", marginBottom:16 }}>
            {msg.text}
          </div>
        )}

        <div style={{ display:"grid", gap:14 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:BLUE, textTransform:"uppercase",
              letterSpacing:".07em", marginBottom:4 }}>New Password</div>
            <input className="rf" type="password" placeholder="At least 6 characters"
              value={password} onChange={e=>setPassword(e.target.value)}/>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:BLUE, textTransform:"uppercase",
              letterSpacing:".07em", marginBottom:4 }}>Confirm Password</div>
            <input className="rf" type="password" placeholder="Repeat your new password"
              value={password2} onChange={e=>setPassword2(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handle()}/>
          </div>
          <button onClick={handle} disabled={loading}
            style={{ background:`linear-gradient(90deg,${NAVY},${BLUE})`,
              color:WHITE, border:"none", borderRadius:9, padding:"13px",
              fontSize:15, fontWeight:700, cursor:loading?"default":"pointer",
              opacity:loading?0.7:1, fontFamily:"inherit" }}>
            {loading ? "Updating…" : "Update Password →"}
          </button>
        </div>
      </div>

      <div style={{ marginTop:16, fontSize:11, color:"rgba(255,255,255,.4)" }}>
        Nexime Healthcare Ltd · neximehealthcare.co.uk
      </div>
    </div>
  );
}

function Root() {
  const [user,      setUser]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [resetMode, setResetMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setResetMode(true); // Show set new password screen
      } else {
        setUser(session?.user || null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:NAVY,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:"white", fontSize:16, fontFamily:"sans-serif" }}>Loading…</div>
    </div>
  );

  if (resetMode) return <ResetPassword onDone={()=>{ setResetMode(false); setUser(null); }}/>;
  if (!user)     return <Login onLogin={setUser}/>;
  return <App user={user} onLogout={handleLogout}/>;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/demo" element={<Demo />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
