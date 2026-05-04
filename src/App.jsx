import { useState, useRef, useCallback } from "react";

const COLORS = ["#7C6DFA","#34D399","#F87171","#FBBF24","#60A5FA","#F472B6","#A78BFA","#FB923C","#2DD4BF"];

const INITIAL_SUBJECTS = [
  { id:1, name:"Anglais LV1", coef:3, grades:[{v:16.5,w:2,label:""},{v:13,w:1,label:""}], obj:null, color:COLORS[0] },
  { id:2, name:"Espagnol LV2", coef:3, grades:[{v:17.5,w:0.5,label:""}], obj:null, color:COLORS[1] },
  { id:3, name:"Français", coef:3, grades:[{v:9,w:2,label:""}], obj:null, color:COLORS[2] },
  { id:4, name:"Histoire-Géo", coef:3, grades:[
    {v:15,w:0.5,label:""},{v:13,w:0.5,label:""},{v:11,w:1.5,label:""},{v:13,w:1,label:""}
  ], obj:null, color:COLORS[3] },
  { id:5, name:"SVT tronc commun", coef:1, grades:[{v:16,w:2,label:""}], obj:null, color:COLORS[4] },
  { id:6, name:"Physique-Chimie", coef:1, grades:[
    {v:15.6,w:1,label:"19.5/25"},{v:9.5,w:0.25,label:"4.75/10"},{v:16,w:2.5,label:""}
  ], obj:null, color:COLORS[5] },
  { id:7, name:"Mathématiques", coef:4, grades:[{v:18.5,w:0.1,label:""},{v:14.75,w:1,label:""},{v:19,w:1,label:""}], obj:null, color:COLORS[6] },
  { id:8, name:"NSI", coef:4, grades:[{v:19.5,w:1.5,label:""}], obj:null, color:COLORS[7] },
  { id:9, name:"SVT spécialité", coef:4, grades:[{v:5,w:1,label:"2.5/10"},{v:15.71,w:0.5,label:"11/14"}], obj:null, color:COLORS[8] },
];

function calcAvg(grades) {
  if (!grades.length) return null;
  const tot = grades.reduce((s,g)=>s+g.v*g.w,0);
  const w = grades.reduce((s,g)=>s+g.w,0);
  return tot/w;
}

function genAvg(subjects) {
  let tot=0,w=0;
  subjects.forEach(s=>{ const a=calcAvg(s.grades); if(a!==null){tot+=a*s.coef;w+=s.coef;} });
  return w?tot/w:null;
}

function sc(avg, obj) {
  if(avg===null) return "#6B6B85";
  if(obj===null) return "#7C6DFA";
  if(avg>=obj) return "#34D399";
  if(avg>=obj-2) return "#FBBF24";
  return "#F87171";
}

const S = { bg:"#0C0C10",surface:"#13131A",surface2:"#1C1C28",border:"#252535",text:"#F0EFF8",muted:"#6B6B85",accent:"#7C6DFA" };

function inp(extra={}) {
  return { background:S.bg,border:`1px solid ${S.border}`,color:S.text,borderRadius:8,padding:"8px 10px",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none",...extra };
}

// Simulate avg if subject has objective
function simAvgWithObj(subjects, subId, objVal) {
  let tot=0,w=0;
  subjects.forEach(s=>{
    let a = calcAvg(s.grades);
    if(s.id===subId) a = objVal;
    if(a!==null){tot+=a*s.coef;w+=s.coef;}
  });
  return w?tot/w:null;
}

// What grade needed in 1 note of given weight to reach obj
function gradeNeeded(grades, obj, noteWeight) {
  const curTot = grades.reduce((s,g)=>s+g.v*g.w,0);
  const curW = grades.reduce((s,g)=>s+g.w,0);
  return (obj*(curW+noteWeight)-curTot)/noteWeight;
}

export default function App() {
  const [subjects, setSubjects] = useState(INITIAL_SUBJECTS);
  const [target, setTarget] = useState(15);
  const [tab, setTab] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [newGrade, setNewGrade] = useState({v:"",w:"1",label:""});
  const [newSubName, setNewSubName] = useState("");
  const [newSubCoef, setNewSubCoef] = useState("1");
  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [objInput, setObjInput] = useState({});
  const [simCoef, setSimCoef] = useState({});
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const avg = genAvg(subjects);
  const avgColor = avg===null?S.muted:avg>=target?"#34D399":avg>=target-1?"#FBBF24":"#F87171";
  const pct = avg!==null?Math.min(100,(avg/target)*100):0;
  const selected = subjects.find(s=>s.id===selectedId);

  function updSub(id,patch){ setSubjects(p=>p.map(s=>s.id===id?{...s,...patch}:s)); }
  function addGrade(){
    const v=parseFloat(newGrade.v),w=parseFloat(newGrade.w)||1;
    if(isNaN(v)||v<0||v>20||!selectedId) return;
    updSub(selectedId,{grades:[...selected.grades,{v,w,label:newGrade.label}]});
    setNewGrade({v:"",w:"1",label:""});
  }
  function addSubject(){
    const name=newSubName.trim(),coef=parseFloat(newSubCoef)||1;
    if(!name) return;
    setSubjects(p=>[...p,{id:Date.now(),name,coef,grades:[],obj:null,color:COLORS[p.length%COLORS.length]}]);
    setNewSubName("");setNewSubCoef("1");
  }

  // Objective system
  function setObj(id, val) {
    const v = val===""?null:parseFloat(val);
    updSub(id,{obj:isNaN(v)?null:v});
  }

  // Folder file upload
  function handleFileUpload(folderId, files) {
    const updated = [...folders];
    const fi = updated.findIndex(f=>f.id===folderId);
    if(fi===-1) return;
    Array.from(files).forEach(file=>{
      updated[fi].files.push({name:file.name,size:file.size,type:file.type,date:new Date().toLocaleDateString("fr-FR")});
    });
    setFolders(updated);
  }

  function addFolder(){
    if(!newFolderName.trim()) return;
    setFolders(p=>[...p,{id:Date.now(),name:newFolderName.trim(),files:[]}]);
    setNewFolderName("");
  }

  async function sendChat(){
    if(chatLoading||!chatInput.trim()) return;
    const msg=chatInput.trim(); setChatInput("");
    const newHist=[...chatHistory,{role:"user",content:msg}];
    setChatHistory(newHist); setChatLoading(true);
    const subCtx=JSON.stringify(subjects.map(s=>({id:s.id,name:s.name,coef:s.coef,avg:calcAvg(s.grades)?.toFixed(2)||"aucune",grades:s.grades.map(g=>`${g.v}/20 coef${g.w}`).join(", "),objectif:s.obj})));
    const system=`Tu es le coach scolaire d'Ilan, Première Générale, spécialités Maths/NSI. Moyenne: ${avg?.toFixed(2)||"?"}\/20, objectif: ${target}/20.\nMatières: ${subCtx}\nSi ajout note: <ACTION>{"type":"add_grade","subjectName":"...","value":X,"weight":X}</ACTION>\nSi modif objectif: <ACTION>{"type":"set_obj","subjectName":"...","value":X}</ACTION>\nFrançais, ton décontracté, max 3-4 lignes.`;
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system,messages:newHist.map(m=>({role:m.role,content:m.content}))})});
      const data=await res.json();
      let reply=data.content?.[0]?.text||"Erreur.";
      const match=reply.match(/<ACTION>(.*?)<\/ACTION>/s);
      const clean=reply.replace(/<ACTION>.*?<\/ACTION>/s,"").trim();
      if(match){try{applyAction(JSON.parse(match[1]));}catch(e){}}
      setChatHistory(h=>[...h,{role:"assistant",content:clean+(match?"\n✅ Modification appliquée !":"")}]);
    } catch(e){ setChatHistory(h=>[...h,{role:"assistant",content:"Erreur connexion."}]); }
    setChatLoading(false);
    setTimeout(()=>chatEndRef.current?.scrollIntoView({behavior:"smooth"}),50);
  }

  function applyAction(action){
    if(action.type==="add_grade") setSubjects(p=>p.map(s=>s.name.toLowerCase().includes(action.subjectName.toLowerCase())?{...s,grades:[...s.grades,{v:action.value,w:action.weight||1,label:""}]}:s));
    else if(action.type==="set_obj") setSubjects(p=>p.map(s=>s.name.toLowerCase().includes(action.subjectName.toLowerCase())?{...s,obj:action.value}:s));
  }

  const TABS=[["dashboard","📊"],["subjects","📚"],["plan","🎯"],["perso","📁"],["chat","🤖"]];
  const TAB_LABELS={"dashboard":"Dashboard","subjects":"Matières","plan":"Plan","perso":"Perso","chat":"Coach"};

  return (
    <div style={{background:S.bg,color:S.text,minHeight:"100vh",fontFamily:"'DM Mono',monospace"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#252535;border-radius:2px}
        input[type=number]::-webkit-inner-spin-button{opacity:0.3}
        textarea{resize:none}
      `}</style>

      {/* HEADER — central, big */}
      <div style={{background:"linear-gradient(160deg,#16152A 0%,#0C0C10 100%)",borderBottom:`1px solid ${S.border}`,padding:"28px 20px 20px",textAlign:"center",position:"sticky",top:0,zIndex:100}}>
        <div style={{fontSize:11,color:S.accent,letterSpacing:4,marginBottom:10,fontFamily:"Syne,sans-serif",fontWeight:700}}>
          PREMIÈRE GÉNÉRALE 5 — TRIMESTRE 3
        </div>
        <div style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:72,lineHeight:1,color:avgColor,transition:"color 0.4s",letterSpacing:-2}}>
          {avg!==null?avg.toFixed(2):"—"}
          <span style={{fontSize:24,color:S.muted,fontWeight:400,letterSpacing:0}}>/20</span>
        </div>
        <div style={{fontSize:13,color:S.muted,marginTop:6,fontFamily:"Syne,sans-serif"}}>
          Moyenne générale pondérée
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginTop:14}}>
          <span style={{fontSize:12,color:S.muted,fontFamily:"Syne,sans-serif",letterSpacing:2}}>OBJECTIF</span>
          <input type="number" min="0" max="20" step="0.5" value={target}
            onChange={e=>setTarget(parseFloat(e.target.value)||15)}
            style={{...inp(),width:64,fontSize:18,textAlign:"center",fontFamily:"Syne,sans-serif",fontWeight:700,padding:"6px 10px",background:S.surface2}} />
          <span style={{fontSize:14,color:S.muted}}>/20</span>
        </div>
        <div style={{margin:"14px auto 0",maxWidth:320}}>
          <div style={{background:S.surface2,borderRadius:4,height:5,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:4,width:`${pct}%`,background:`linear-gradient(90deg,${avgColor}70,${avgColor})`,transition:"width 0.7s cubic-bezier(.4,0,.2,1)"}} />
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontSize:11,color:S.muted}}>
            <span style={{color:avg>=target?"#34D399":S.muted}}>
              {avg===null?"":avg>=target?"✅ Objectif atteint !":`${(target-avg).toFixed(2)} pts manquants`}
            </span>
            <span>{avg!==null?Math.round(pct)+"%":""}</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{display:"flex",borderBottom:`1px solid ${S.border}`,background:S.bg,position:"sticky",top:248,zIndex:99}}>
        {TABS.map(([t,icon])=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            flex:1,padding:"11px 2px",background:"none",border:"none",
            borderBottom:tab===t?`2px solid ${S.accent}`:"2px solid transparent",
            color:tab===t?S.accent:S.muted,fontSize:11,cursor:"pointer",
            fontFamily:"Syne,sans-serif",fontWeight:700,letterSpacing:1,transition:"all 0.2s",
            display:"flex",flexDirection:"column",alignItems:"center",gap:2
          }}>
            <span style={{fontSize:16}}>{icon}</span>
            <span>{TAB_LABELS[t]}</span>
          </button>
        ))}
      </div>

      <div style={{padding:16,paddingBottom:80}}>

        {/* DASHBOARD */}
        {tab==="dashboard"&&(
          <div>
            <div style={{fontSize:10,color:S.muted,letterSpacing:3,marginBottom:12,fontFamily:"Syne,sans-serif"}}>TOUTES LES MATIÈRES</div>
            {subjects.map(s=>{
              const a=calcAvg(s.grades);
              const color=sc(a,s.obj);
              const icon=a===null?"":s.obj===null?"":a>=s.obj?"✅":a>=s.obj-2?"⚠️":"🔴";
              return (
                <div key={s.id} onClick={()=>{setSelectedId(s.id);setTab("subjects");}}
                  style={{background:S.surface,borderRadius:14,padding:14,marginBottom:10,border:`1px solid ${s.color}18`,cursor:"pointer",transition:"border-color 0.2s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=s.color+"50"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=s.color+"18"}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0,flex:1}}>
                      <span style={{fontSize:9,background:S.surface2,color:S.muted,padding:"3px 7px",borderRadius:5,fontFamily:"Syne,sans-serif",fontWeight:700,letterSpacing:1,flexShrink:0}}>COEF {s.coef}</span>
                      <span style={{fontSize:13,fontWeight:600,fontFamily:"Syne,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</span>
                    </div>
                    <div style={{fontFamily:"Syne,sans-serif",fontSize:22,fontWeight:800,color,whiteSpace:"nowrap"}}>
                      {a!==null?a.toFixed(2):"—"}<span style={{fontSize:12,color:S.muted,fontWeight:400}}>/20</span>
                    </div>
                  </div>
                  <div style={{background:S.surface2,borderRadius:3,height:3,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:3,width:`${a!==null?(a/20)*100:0}%`,background:`linear-gradient(90deg,${s.color}60,${s.color})`,transition:"width 0.5s"}} />
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:S.muted}}>
                    <span>{s.grades.length} note{s.grades.length!==1?"s":""}</span>
                    <span>{s.obj!==null?`Objectif ${s.obj}/20 ${icon}`:"Pas d'objectif fixé"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SUBJECTS */}
        {tab==="subjects"&&(
          <div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
              {subjects.map(s=>(
                <button key={s.id} onClick={()=>setSelectedId(s.id===selectedId?null:s.id)} style={{
                  background:selectedId===s.id?s.color:S.surface,border:`1px solid ${s.color}60`,
                  color:selectedId===s.id?"#fff":s.color,borderRadius:20,padding:"6px 14px",
                  fontSize:11,cursor:"pointer",fontFamily:"Syne,sans-serif",fontWeight:600,transition:"all 0.2s"
                }}>{s.name}</button>
              ))}
            </div>

            {selected&&(
              <div style={{background:S.surface,borderRadius:16,padding:16,border:`1px solid ${selected.color}30`,marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <input value={selected.name} onChange={e=>updSub(selected.id,{name:e.target.value})}
                    style={{fontFamily:"Syne,sans-serif",fontSize:16,fontWeight:700,background:"none",border:"none",borderBottom:`1px solid ${S.border}`,color:S.text,padding:"2px 0",outline:"none",width:200}} />
                  <button onClick={()=>{setSubjects(p=>p.filter(x=>x.id!==selected.id));setSelectedId(null);}}
                    style={{background:"#F8717115",border:"1px solid #F87171",color:"#F87171",borderRadius:8,padding:"5px 12px",fontSize:11,cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>
                    Supprimer
                  </button>
                </div>
                <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,color:S.muted}}>Coefficient matière</span>
                  <input type="number" min="1" max="10" step="1" value={selected.coef}
                    onChange={e=>updSub(selected.id,{coef:parseFloat(e.target.value)||1})}
                    style={{...inp(),width:60,textAlign:"center"}} />
                </div>

                <div style={{fontSize:10,color:S.muted,letterSpacing:3,marginBottom:8,fontFamily:"Syne,sans-serif"}}>NOTES</div>
                {selected.grades.length===0&&<div style={{color:S.muted,fontSize:13,fontStyle:"italic",marginBottom:12}}>Aucune note</div>}
                {selected.grades.map((g,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:S.bg,borderRadius:8,padding:"8px 12px",marginBottom:6}}>
                    <div>
                      <span style={{fontFamily:"Syne,sans-serif",fontSize:16,fontWeight:700,color:g.v>=14?"#34D399":g.v>=10?"#FBBF24":"#F87171"}}>{g.label||g.v}</span>
                      <span style={{fontSize:11,color:S.muted}}>{g.label?` → ${g.v.toFixed(2)}/20`:"/20"} · coef {g.w}</span>
                    </div>
                    <button onClick={()=>updSub(selected.id,{grades:selected.grades.filter((_,j)=>j!==i)})}
                      style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:18}}>×</button>
                  </div>
                ))}
                {calcAvg(selected.grades)!==null&&(
                  <div style={{background:selected.color+"15",borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${selected.color}30`,marginBottom:14}}>
                    <span style={{fontSize:12,color:S.muted}}>Moyenne</span>
                    <span style={{fontFamily:"Syne,sans-serif",fontSize:20,fontWeight:800,color:sc(calcAvg(selected.grades),selected.obj)}}>
                      {calcAvg(selected.grades).toFixed(2)}/20
                    </span>
                  </div>
                )}

                <div style={{fontSize:10,color:S.muted,letterSpacing:3,marginBottom:8,fontFamily:"Syne,sans-serif"}}>AJOUTER UNE NOTE</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <input type="number" placeholder="Note /20" min="0" max="20" step="0.5"
                    value={newGrade.v} onChange={e=>setNewGrade(g=>({...g,v:e.target.value}))}
                    style={{...inp(),flex:"1 1 80px"}} />
                  <input type="number" placeholder="Coef" min="0.25" step="0.25"
                    value={newGrade.w} onChange={e=>setNewGrade(g=>({...g,w:e.target.value}))}
                    style={{...inp(),flex:"1 1 60px"}} />
                  <input placeholder="Libellé (ex: DS coef 2)" value={newGrade.label}
                    onChange={e=>setNewGrade(g=>({...g,label:e.target.value}))}
                    style={{...inp(),flex:"2 1 120px"}} />
                  <button onClick={addGrade}
                    style={{background:selected.color,border:"none",color:"#fff",borderRadius:8,padding:"8px 16px",fontSize:20,cursor:"pointer"}}>+</button>
                </div>
              </div>
            )}

            <div style={{background:S.surface,borderRadius:14,padding:14,border:`1px dashed ${S.border}`}}>
              <div style={{fontSize:10,color:S.muted,letterSpacing:3,marginBottom:8,fontFamily:"Syne,sans-serif"}}>AJOUTER UNE MATIÈRE</div>
              <div style={{display:"flex",gap:8}}>
                <input placeholder="Nom" value={newSubName} onChange={e=>setNewSubName(e.target.value)} style={{...inp(),flex:3}} />
                <input type="number" placeholder="Coef" min="1" step="1" value={newSubCoef} onChange={e=>setNewSubCoef(e.target.value)} style={{...inp(),flex:1}} />
                <button onClick={addSubject} style={{background:S.accent,border:"none",color:"#fff",borderRadius:8,padding:"8px 16px",fontSize:20,cursor:"pointer"}}>+</button>
              </div>
            </div>
          </div>
        )}

        {/* PLAN / OBJECTIFS */}
        {tab==="plan"&&(
          <div>
            <div style={{fontSize:10,color:S.muted,letterSpacing:3,marginBottom:4,fontFamily:"Syne,sans-serif"}}>OBJECTIFS PAR MATIÈRE</div>
            <div style={{fontSize:11,color:S.muted,marginBottom:16,lineHeight:1.6}}>
              Saisis un objectif pour simuler l'impact sur ta moyenne générale et voir les notes nécessaires.
            </div>

            {subjects.map(s=>{
              const curAvg = calcAvg(s.grades);
              const hasObj = s.obj!==null;
              const simAvg = hasObj?simAvgWithObj(subjects,s.id,s.obj):null;
              const simDiff = simAvg!==null&&avg!==null?simAvg-avg:null;
              const coefKey = `${s.id}`;
              const simC = parseFloat(simCoef[coefKey])||1;
              const needed = hasObj&&curAvg!==null?gradeNeeded(s.grades,s.obj,simC):null;
              const needed1 = hasObj&&curAvg!==null?gradeNeeded(s.grades,s.obj,1):null;
              const needed2a = hasObj&&curAvg!==null?gradeNeeded(s.grades,s.obj,1):null;

              return (
                <div key={s.id} style={{background:S.surface,borderRadius:14,padding:14,marginBottom:12,border:`1px solid ${hasObj?s.color+"40":S.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div>
                      <span style={{fontFamily:"Syne,sans-serif",fontSize:13,fontWeight:700}}>{s.name}</span>
                      <span style={{fontSize:10,color:S.muted,marginLeft:6}}>coef {s.coef}</span>
                    </div>
                    <div style={{fontFamily:"Syne,sans-serif",fontSize:18,fontWeight:800,color:sc(curAvg,s.obj)}}>
                      {curAvg!==null?curAvg.toFixed(2):"—"}<span style={{fontSize:11,color:S.muted,fontWeight:400}}>/20</span>
                    </div>
                  </div>

                  {/* Objective input */}
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:hasObj?12:0}}>
                    <span style={{fontSize:11,color:S.muted,flexShrink:0}}>Objectif :</span>
                    <input type="number" min="0" max="20" step="0.5"
                      placeholder="Ex: 14"
                      value={s.obj!==null?s.obj:""}
                      onChange={e=>setObj(s.id,e.target.value)}
                      style={{...inp(),width:80,textAlign:"center"}} />
                    <span style={{fontSize:11,color:S.muted}}>/20</span>
                    {hasObj&&(
                      <button onClick={()=>setObj(s.id,"")}
                        style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:14,marginLeft:4}}>×</button>
                    )}
                  </div>

                  {/* Simulation */}
                  {hasObj&&(
                    <div style={{background:S.surface2,borderRadius:10,padding:12,marginTop:4}}>
                      {/* Impact on general avg */}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <span style={{fontSize:11,color:S.muted}}>Moyenne générale si objectif atteint</span>
                        <div style={{textAlign:"right"}}>
                          <span style={{fontFamily:"Syne,sans-serif",fontSize:16,fontWeight:800,color:simAvg>=target?"#34D399":"#FBBF24"}}>{simAvg?.toFixed(2)}</span>
                          <span style={{fontSize:11,color:S.muted}}>/20</span>
                          {simDiff!==null&&(
                            <span style={{fontSize:11,color:simDiff>=0?"#34D399":"#F87171",marginLeft:6}}>
                              {simDiff>=0?`+${simDiff.toFixed(2)}`:`${simDiff.toFixed(2)}`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Notes needed */}
                      {curAvg!==null&&(
                        <>
                          <div style={{fontSize:10,color:S.muted,letterSpacing:2,marginBottom:8,fontFamily:"Syne,sans-serif"}}>NOTES NÉCESSAIRES</div>

                          {/* 2 notes coef 1 */}
                          {needed2a!==null&&(
                            <div style={{marginBottom:8,background:S.bg,borderRadius:8,padding:"8px 10px"}}>
                              <div style={{fontSize:11,color:S.muted,marginBottom:2}}>Option 2 notes coef 1 :</div>
                              <span style={{fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:14,
                                color:needed2a>20?"#F87171":needed2a>16?"#FBBF24":"#34D399"}}>
                                {needed2a>20?"❌ Impossible":needed2a<=0?"✅ Déjà atteint !":
                                  `${needed2a.toFixed(2)}/20 à chaque note`}
                              </span>
                            </div>
                          )}

                          {/* Custom coef */}
                          <div style={{background:S.bg,borderRadius:8,padding:"8px 10px"}}>
                            <div style={{fontSize:11,color:S.muted,marginBottom:6}}>Simuler avec 1 note de coef :</div>
                            <div style={{display:"flex",gap:8,alignItems:"center"}}>
                              <input type="number" min="0.5" max="5" step="0.5"
                                value={simCoef[coefKey]||"1"}
                                onChange={e=>setSimCoef(p=>({...p,[coefKey]:e.target.value}))}
                                style={{...inp(),width:64,textAlign:"center"}} />
                              <div style={{flex:1}}>
                                {needed!==null&&(
                                  <span style={{fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:14,
                                    color:needed>20?"#F87171":needed>16?"#FBBF24":"#34D399"}}>
                                    → {needed>20?"❌ Impossible":needed<=0?"✅ Déjà atteint !":
                                      `${needed.toFixed(2)}/20`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      {curAvg===null&&<div style={{fontSize:12,color:S.muted,fontStyle:"italic"}}>Ajoute des notes pour voir les simulations.</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* PERSO */}
        {tab==="perso"&&(
          <div>
            <div style={{fontSize:10,color:S.muted,letterSpacing:3,marginBottom:12,fontFamily:"Syne,sans-serif"}}>MES DOSSIERS</div>

            {/* Add folder */}
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              <input placeholder="Nom du dossier (ex: Maths, Révisions EAF...)" value={newFolderName}
                onChange={e=>setNewFolderName(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&addFolder()}
                style={{...inp(),flex:1}} />
              <button onClick={addFolder} style={{background:S.accent,border:"none",color:"#fff",borderRadius:8,padding:"8px 16px",fontSize:18,cursor:"pointer"}}>+</button>
            </div>

            {folders.length===0&&(
              <div style={{textAlign:"center",padding:"40px 20px",color:S.muted}}>
                <div style={{fontSize:40,marginBottom:12}}>📁</div>
                <div style={{fontFamily:"Syne,sans-serif",fontSize:14}}>Aucun dossier créé</div>
                <div style={{fontSize:12,marginTop:6}}>Crée un dossier et importe tes fichiers</div>
              </div>
            )}

            {folders.map(folder=>(
              <div key={folder.id} style={{background:S.surface,borderRadius:14,marginBottom:12,border:`1px solid ${S.border}`,overflow:"hidden"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",
                  cursor:"pointer",borderBottom:selectedFolder===folder.id?`1px solid ${S.border}`:"none"}}
                  onClick={()=>setSelectedFolder(selectedFolder===folder.id?null:folder.id)}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:20}}>{selectedFolder===folder.id?"📂":"📁"}</span>
                    <div>
                      <div style={{fontFamily:"Syne,sans-serif",fontSize:13,fontWeight:700}}>{folder.name}</div>
                      <div style={{fontSize:10,color:S.muted,marginTop:2}}>{folder.files.length} fichier{folder.files.length!==1?"s":""}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <button onClick={e=>{e.stopPropagation();setFolders(p=>p.filter(f=>f.id!==folder.id));if(selectedFolder===folder.id)setSelectedFolder(null);}}
                      style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:16}}>×</button>
                    <span style={{color:S.muted,fontSize:14}}>{selectedFolder===folder.id?"▲":"▼"}</span>
                  </div>
                </div>

                {selectedFolder===folder.id&&(
                  <div style={{padding:14}}>
                    {/* Upload button */}
                    <input type="file" multiple ref={fileInputRef} style={{display:"none"}}
                      onChange={e=>handleFileUpload(folder.id,e.target.files)} />
                    <button onClick={()=>fileInputRef.current?.click()}
                      style={{background:S.surface2,border:`1px dashed ${S.border}`,color:S.text,borderRadius:10,
                        padding:"12px 20px",width:"100%",cursor:"pointer",fontFamily:"'DM Mono',monospace",
                        fontSize:13,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                      <span style={{fontSize:20}}>📎</span> Importer des fichiers
                    </button>

                    {folder.files.length===0&&(
                      <div style={{textAlign:"center",fontSize:12,color:S.muted,padding:"8px 0"}}>Aucun fichier importé</div>
                    )}
                    {folder.files.map((f,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                        background:S.bg,borderRadius:8,padding:"8px 12px",marginBottom:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                          <span style={{fontSize:16}}>
                            {f.type.includes("pdf")?"📄":f.type.includes("image")?"🖼️":f.type.includes("text")?"📝":"📎"}
                          </span>
                          <div style={{minWidth:0}}>
                            <div style={{fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                            <div style={{fontSize:10,color:S.muted}}>{f.date} · {f.size>1024*1024?(f.size/(1024*1024)).toFixed(1)+"MB":(f.size/1024).toFixed(0)+"KB"}</div>
                          </div>
                        </div>
                        <button onClick={()=>{
                          setFolders(p=>p.map(fo=>fo.id===folder.id?{...fo,files:fo.files.filter((_,j)=>j!==i)}:fo));
                        }} style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:16,flexShrink:0}}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CHAT */}
        {tab==="chat"&&(
          <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 360px)",minHeight:300}}>
            <div style={{flex:1,overflowY:"auto",paddingBottom:8}}>
              <div style={{background:S.surface2,borderRadius:"4px 14px 14px 14px",padding:"10px 14px",fontSize:13,lineHeight:1.7,marginBottom:12,display:"inline-block",maxWidth:"88%"}}>
                Salut Ilan ! 🎯<br/>
                Dis-moi ce que tu veux :<br/>
                <span style={{color:S.muted,fontSize:12}}>"Ajoute 16 en maths coef 2"<br/>"Qu'est-ce que je dois bosser ?"</span>
              </div>
              {chatHistory.map((m,i)=>(
                <div key={i} style={{marginBottom:12,textAlign:m.role==="user"?"right":"left"}}>
                  <div style={{display:"inline-block",maxWidth:"88%",padding:"10px 14px",
                    borderRadius:m.role==="user"?"14px 14px 4px 14px":"4px 14px 14px 14px",
                    background:m.role==="user"?S.accent:S.surface2,fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading&&(
                <div style={{marginBottom:12}}>
                  <div style={{display:"inline-block",padding:"10px 14px",borderRadius:"4px 14px 14px 14px",background:S.surface2}}>
                    <div style={{display:"flex",gap:4}}>
                      {[0,1,2].map(i=>(
                        <div key={i} style={{width:6,height:6,borderRadius:"50%",background:S.muted,
                          animation:"b 1.2s infinite",animationDelay:`${i*0.2}s`}} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <style>{`@keyframes b{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>
            <div style={{display:"flex",gap:8,paddingTop:10,borderTop:`1px solid ${S.border}`}}>
              <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat();}}}
                placeholder="Écris à ton coach..." rows={2}
                style={{...inp(),flex:1,borderRadius:12,padding:"12px 14px",lineHeight:1.5}} />
              <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()}
                style={{background:chatLoading||!chatInput.trim()?S.surface2:S.accent,border:"none",
                  color:"#fff",borderRadius:12,padding:"12px 16px",cursor:chatLoading?"not-allowed":"pointer",
                  fontSize:16,flexShrink:0,opacity:chatLoading?0.4:1,transition:"all 0.2s"}}>➤</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}