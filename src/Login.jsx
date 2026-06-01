import { useState } from "react";
import { supabase } from "./supabase.js";

const BLUE = "#0e8fd4", GREEN = "#3db84a", NAVY = "#1b3a5c";
const BORD = "#b0d8e8", GRAY = "#7a8a9a", WHITE = "#ffffff";

function Logo() {
  return (
    <svg height={52} viewBox="0 0 230 56" xmlns="http://www.w3.org/2000/svg" style={{display:"block"}}>
      <text x="2" y="36" fontFamily="'Arial Black',Arial,sans-serif" fontWeight="900"
        fontSize="32" fill={WHITE} letterSpacing="3">NEXIME</text>
      <text x="4" y="53" fontFamily="Arial,sans-serif" fontWeight="400"
        fontSize="13" fill="rgba(255,255,255,.68)" letterSpacing="5">HEALTHCARE</text>
    </svg>
  );
}

export default function Login({ onLogin }) {
  const [mode,     setMode]     = useState("login"); // login | signup | reset
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState({ type:"", text:"" });

  const handle = async () => {
    setLoading(true); setMsg({ type:"", text:"" });
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLogin(data.user);

      } else if (mode === "signup") {
        if (!name.trim()) throw new Error("Please enter your full name.");
        const { data, error } = await supabase.auth.signUp({ email, password,
          options: { data: { full_name: name } }
        });
        if (error) throw error;
        // Create profile row
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id, full_name: name
          });
        }
        setMsg({ type:"success", text:"Account created! Please check your email to verify then log in." });
        setMode("login");

      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: "https://timesheet.neximehealthcare.co.uk"
        });
        if (error) throw error;
        setMsg({ type:"success", text:"Password reset email sent! Check your inbox." });
        setMode("login");
      }
    } catch(e) {
      setMsg({ type:"error", text: e.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,${NAVY},${BLUE})`,
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"24px 16px",
      fontFamily:"'Nunito','Segoe UI',sans-serif", overflowX:"hidden", width:"100%" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0} html,body{overflow-x:hidden;width:100%} input{font-family:inherit}
        .f{width:100%;padding:11px 14px;border:1.5px solid ${BORD};border-radius:9px;
           font-size:14px;color:${NAVY};outline:none;background:#fff;transition:border-color .2s}
        .f:focus{border-color:${BLUE}}`}</style>

      <Logo/>

      <div style={{ marginTop:28, width:"100%", maxWidth:400,
        background:WHITE, borderRadius:16, padding:"28px 24px",
        boxShadow:"0 20px 60px #00000033" }}>

        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:20, fontWeight:800, color:NAVY }}>
            {mode==="login"  && "Staff Login"}
            {mode==="signup" && "Create Account"}
            {mode==="reset"  && "Reset Password"}
          </div>
          <div style={{ fontSize:12, color:GRAY, marginTop:4 }}>
            {mode==="login"  && "Sign in to access your timesheet"}
            {mode==="signup" && "Register to start submitting timesheets"}
            {mode==="reset"  && "We'll send you a reset link"}
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
          {mode==="signup" && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:BLUE,
                textTransform:"uppercase", letterSpacing:".07em", marginBottom:4 }}>Full Name</div>
              <input className="f" placeholder="e.g. Sarah Johnson"
                value={name} onChange={e=>setName(e.target.value)}/>
            </div>
          )}

          <div>
            <div style={{ fontSize:11, fontWeight:700, color:BLUE,
              textTransform:"uppercase", letterSpacing:".07em", marginBottom:4 }}>Email Address</div>
            <input className="f" type="email" placeholder="your@email.com"
              value={email} onChange={e=>setEmail(e.target.value)}/>
          </div>

          {mode !== "reset" && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:BLUE,
                textTransform:"uppercase", letterSpacing:".07em", marginBottom:4 }}>Password</div>
              <input className="f" type="password" placeholder="••••••••"
                value={password} onChange={e=>setPassword(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handle()}/>
            </div>
          )}

          <button onClick={handle} disabled={loading}
            style={{ background:`linear-gradient(90deg,${NAVY},${BLUE})`,
              color:WHITE, border:"none", borderRadius:9, padding:"13px",
              fontSize:15, fontWeight:700, cursor:loading?"default":"pointer",
              opacity:loading?0.7:1, fontFamily:"inherit" }}>
            {loading ? "Please wait…" :
              mode==="login"  ? "Sign In →" :
              mode==="signup" ? "Create Account →" : "Send Reset Link →"}
          </button>
        </div>

        <div style={{ marginTop:20, textAlign:"center", display:"grid", gap:8 }}>
          {mode==="login" && <>
            <div style={{ fontSize:12, color:GRAY }}>
              Don't have an account?{" "}
              <span onClick={()=>{setMode("signup");setMsg({type:"",text:""});}}
                style={{ color:BLUE, fontWeight:700, cursor:"pointer" }}>Register here</span>
            </div>
            <div style={{ fontSize:12, color:GRAY }}>
              Forgot password?{" "}
              <span onClick={()=>{setMode("reset");setMsg({type:"",text:""});}}
                style={{ color:BLUE, fontWeight:700, cursor:"pointer" }}>Reset it</span>
            </div>
          </>}
          {mode !== "login" && (
            <div style={{ fontSize:12, color:GRAY }}>
              <span onClick={()=>{setMode("login");setMsg({type:"",text:""});}}
                style={{ color:BLUE, fontWeight:700, cursor:"pointer" }}>← Back to login</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop:20, fontSize:11, color:"rgba(255,255,255,.4)", textAlign:"center" }}>
        Nexime Healthcare Ltd · neximehealthcare.co.uk
      </div>
    </div>
  );
}
