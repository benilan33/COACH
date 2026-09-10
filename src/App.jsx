import { useState, useMemo, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "./supabaseClient";

const COLORS = ["#7C6DFA","#34D399","#F87171","#FBBF24","#60A5FA","#F472B6","#A78BFA","#FB923C","#2DD4BF"];

const SLOTS = ["8h12-9h10","9h10-10h05","10h25-11h20","11h20-12h15","13h35-14h30","14h30-15h25","15h40-16h35","16h35-17h30"];
const DAYS = ["Lun","Mar","Mer","Jeu","Ven","Sam"];

const SCHEDULE_COLORS = {
  "Maths Expertes":"#7C6DFA","Hist-Géo":"#34D399","Mathématiques":"#60A5FA",
  "Anglais 12":"#F472B6","NSI":"#FB923C","Philosophie":"#A78BFA",
  "Espagnol 12":"#FBBF24","Ens. Sci. Physique-Chimie":"#2DD4BF","Ens. Sci. SVT":"#F87171",
  "Maths Spé":"#818CF8","EPS":"#4ADE80","EMC":"#FCD34D",
  "Devoir Surveillé":"#94A3B8","Vie de Classe":"#C084FC"
};

const SCHEDULE_DATA = {
  Lun: [
    {both:{subject:"Maths Expertes",teacher:"M. Falomir",room:"G13"}},
    {both:{subject:"Hist-Géo",teacher:"Mme Rault",room:"D04"}},
    {both:{subject:"Mathématiques",teacher:"M. Falomir",room:"E14"}},
    {both:{subject:"Mathématiques",teacher:"M. Falomir",room:"E14"}},
    null,
    {a:{subject:"Anglais 12",teacher:"Mme Aubijoux",room:"D04"}},
    {both:{subject:"Hist-Géo",teacher:"Mme Rault",room:"D04"}},
    null,
  ],
  Mar: [
    {both:{subject:"NSI",teacher:"",room:"G1"}},
    {both:{subject:"NSI",teacher:"",room:"G1"}},
    {both:{subject:"Philosophie",teacher:"Mme Amblard",room:"D04"}},
    {a:{subject:"Espagnol 12",teacher:"Mme Foueillassar-Baeza",room:"D04"}, b:{subject:"Philosophie",teacher:"Mme Amblard",room:"D04"}},
    {both:{subject:"Maths Spé",teacher:"",room:""}},
    {both:{subject:"Maths Spé",teacher:"",room:""}},
    {a:{subject:"Ens. Sci. SVT",teacher:"Mme Bridon",room:"D04"}, b:{subject:"Hist-Géo",teacher:"Mme Rault",room:"D04"}},
    null,
  ],
  Mer: [
    {b:{subject:"NSI",teacher:"",room:"G11"}},
    {b:{subject:"NSI",teacher:"",room:"G11"}},
    {both:{subject:"Philosophie",teacher:"Mme Amblard",room:"D04"}},
    {both:{subject:"Ens. Sci. Physique-Chimie",teacher:"M. Caumes",room:"D04"}},
    {both:{subject:"Maths Expertes",teacher:"M. Falomir",room:"G13"}},
    {both:{subject:"Maths Expertes",teacher:"M. Falomir",room:"G13"}},
    null,
    null,
  ],
  Jeu: [
    {both:{subject:"Maths Spé",teacher:"",room:""}},
    {both:{subject:"Maths Spé",teacher:"",room:""}},
    {both:{subject:"EPS",teacher:"M. Dupont",room:"Gym"}},
    {both:{subject:"EPS",teacher:"M. Dupont",room:"Gym"}},
    {a:{subject:"Anglais 12",teacher:"Mme Aubijoux",room:"D04"}, b:{subject:"Devoir Surveillé",teacher:"",room:"D04"}},
    {a:{subject:"Anglais 12",teacher:"Mme Aubijoux",room:"D04"}, b:{subject:"Devoir Surveillé",teacher:"",room:"D04"}},
    {a:{subject:"EMC",teacher:"Mme Rault",room:"D04"}, b:{subject:"Philosophie",teacher:"Mme Amblard",room:"D04"}},
    {a:{subject:"Hist-Géo",teacher:"Mme Rault",room:"D04"}, b:{subject:"Espagnol 12",teacher:"Mme Foueillassar-Baeza",room:"D04"}},
  ],
  Ven: [
    null,
    {a:{subject:"Ens. Sci. SVT",teacher:"Mme Bridon",room:"D04"}, b:{subject:"Vie de Classe",teacher:"M. Falomir",room:"D04"}},
    {both:{subject:"NSI",teacher:"",room:""}},
    {both:{subject:"NSI",teacher:"",room:""}},
    {both:{subject:"Philosophie",teacher:"Mme Amblard",room:"D04"}},
    {both:{subject:"Espagnol 12",teacher:"Mme Foueillassar-Baeza",room:"D04"}},
    {b:{subject:"Anglais 12",teacher:"Mme Aubijoux",room:"D04"}},
    null,
  ],
  Sam: [null,null,null,null,null,null,null,null],
};

function calcAvg(grades) {
  if (!grades || !grades.length) return null;
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
  if(obj===null||obj===undefined) return "#7C6DFA";
  if(avg>=obj) return "#34D399";
  if(avg>=obj-2) return "#FBBF24";
  return "#F87171";
}
function simAvgWithObj(subjects, subId, objVal) {
  let tot=0,w=0;
  subjects.forEach(s=>{
    let a = calcAvg(s.grades);
    if(s.id===subId) a = objVal;
    if(a!==null){tot+=a*s.coef;w+=s.coef;}
  });
  return w?tot/w:null;
}
function gradeNeeded(grades, obj, noteWeight) {
  const curTot = grades.reduce((s,g)=>s+g.v*g.w,0);
  const curW = grades.reduce((s,g)=>s+g.w,0);
  return (obj*(curW+noteWeight)-curTot)/noteWeight;
}

const S = { bg:"#0C0C10",surface:"#13131A",surface2:"#1C1C28",border:"#252535",text:"#F0EFF8",muted:"#6B6B85",accent:"#7C6DFA" };

function inp(extra={}) {
  return { background:S.bg,border:`1px solid ${S.border}`,color:S.text,borderRadius:8,padding:"8px 10px",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none",...extra };
}

function buildEvolutionData(subjects, granularity) {
  const allGrades = [];
  subjects.forEach(s=>{
    (s.grades||[]).forEach(g=>allGrades.push({...g, subjectId:s.id, coef:s.coef, color:s.color, subjectName:s.name}));
  });
  allGrades.sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(!allGrades.length) return [];

  const points = [];
  const runningGradesBySubject = {};
  subjects.forEach(s=>runningGradesBySubject[s.id]=[]);

  allGrades.forEach(g=>{
    runningGradesBySubject[g.subjectId].push(g);
    let tot=0,w=0;
    subjects.forEach(s=>{
      const a = calcAvg(runningGradesBySubject[s.id]);
      if(a!==null){tot+=a*s.coef;w+=s.coef;}
    });
    const avg = w?tot/w:null;
    const d = new Date(g.date);
    let label;
    if(granularity==="mois") label = d.toLocaleDateString("fr-FR",{month:"short",year:"2-digit"});
    else if(granularity==="trimestre") {
      const month = d.getMonth();
      const trim = month<=9&&month>=8?"T1":month<=11||month<=1?"T2":"T3";
      label = `${trim} ${d.getFullYear()}`;
    } else label = d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short"});
    points.push({ label, avg: avg!==null?parseFloat(avg.toFixed(2)):null, date:g.date });
  });
  return points;
}

export default function App() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(15);

  async function updateTarget(value) {
    const v = parseFloat(value) || 15;
    setTarget(v);
    const { error } = await supabase.from('settings').upsert({id:1, target:v});
    if (error) console.error('updateTarget:', error);
  }
  const [tab, setTab] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [newGrade, setNewGrade] = useState({v:"",w:"1",label:""});
  const [newSubName, setNewSubName] = useState("");
  const [newSubCoef, setNewSubCoef] = useState("1");
  const [simCoef, setSimCoef] = useState({});
  const [granularity, setGranularity] = useState("mois");
  const [evoSubject, setEvoSubject] = useState("global");
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [schedule, setSchedule] = useState({});
  const [persoTab, setPersoTab] = useState("dossiers");
  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(null);

  // ---- Chargement initial depuis Supabase ----
  useEffect(() => {
    async function fetchAll() {
      const { data: subjectsData, error: e1 } = await supabase.from('subjects').select('*').order('id');
      if (e1) console.error('subjects:', e1); else setSubjects(subjectsData || []);

      const { data: tasksData, error: e2 } = await supabase.from('tasks').select('*').order('id');
      if (e2) console.error('tasks:', e2); else setTasks(tasksData || []);

      const { data: foldersData, error: e3 } = await supabase.from('folders').select('*').order('id');
      const { data: filesData, error: e4 } = await supabase.from('files').select('*').order('id');
      if (e3) console.error('folders:', e3);
      if (e4) console.error('files:', e4);
      if (foldersData) {
        setFolders(foldersData.map(f => ({
          ...f,
          files: (filesData || []).filter(file => file.folder_id === f.id)
        })));
      }

      const { data: settingsData, error: e5 } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (e5) console.error('settings:', e5);
      else if (settingsData) setTarget(settingsData.target ?? 15);

      setLoading(false);
    }
    fetchAll();
  }, []);

  const avg = genAvg(subjects);
  const avgColor = avg===null?S.muted:avg>=target?"#34D399":avg>=target-1?"#FBBF24":"#F87171";
  const pct = avg!==null?Math.min(100,(avg/target)*100):0;
  const selected = subjects.find(s=>s.id===selectedId);

  // ---- Matières / notes ----
  async function updSub(id, patch) {
    setSubjects(p => p.map(s => s.id === id ? {...s, ...patch} : s));
    const { error } = await supabase.from('subjects').update(patch).eq('id', id);
    if (error) console.error('updSub:', error);
  }

  async function addGrade() {
    const v = parseFloat(newGrade.v), w = parseFloat(newGrade.w) || 1;
    if (isNaN(v) || v < 0 || v > 20 || !selectedId) return;
    const newGrades = [...(selected.grades||[]), {v, w, label:newGrade.label, date:new Date().toISOString().slice(0,10)}];
    await updSub(selectedId, {grades:newGrades});
    setNewGrade({v:"",w:"1",label:""});
  }

  async function deleteGrade(index) {
    const newGrades = selected.grades.filter((_,j)=>j!==index);
    await updSub(selected.id, {grades:newGrades});
  }

  async function addSubject() {
    const name = newSubName.trim(), coef = parseFloat(newSubCoef) || 1;
    if (!name) return;
    const color = COLORS[subjects.length % COLORS.length];
    const { data, error } = await supabase.from('subjects')
      .insert({name, coef, grades:[], obj:null, color})
      .select().single();
    if (error) { console.error('addSubject:', error); return; }
    setSubjects(p => [...p, data]);
    setNewSubName(""); setNewSubCoef("1");
  }

  async function deleteSubject(id) {
    setSubjects(p => p.filter(x => x.id !== id));
    setSelectedId(null);
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) console.error('deleteSubject:', error);
  }

  async function setObj(id, val) {
    const v = val === "" ? null : parseFloat(val);
    await updSub(id, {obj: isNaN(v) ? null : v});
  }

  // ---- Tâches ----
  async function addTask() {
    if (!newTask.trim()) return;
    const { data, error } = await supabase.from('tasks')
      .insert({text:newTask.trim(), done:false, alarm:null})
      .select().single();
    if (error) { console.error('addTask:', error); return; }
    setTasks(p => [...p, data]);
    setNewTask("");
  }

  async function toggleTask(id) {
    const t = tasks.find(x=>x.id===id);
    setTasks(p => p.map(x => x.id===id ? {...x, done:!x.done} : x));
    const { error } = await supabase.from('tasks').update({done: !t.done}).eq('id', id);
    if (error) console.error('toggleTask:', error);
  }

  async function deleteTask(id) {
    setTasks(p => p.filter(t => t.id !== id));
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) console.error('deleteTask:', error);
  }

  async function setTaskAlarm(id, value) {
    setTasks(p => p.map(t => t.id===id ? {...t, alarm:value} : t));
    const { error } = await supabase.from('tasks').update({alarm: value || null}).eq('id', id);
    if (error) console.error('setTaskAlarm:', error);
  }

  // ---- Emploi du temps ----
  async function setScheduleSlot(day, slot, week, value) {
    const key = `${day}_${slot}`;
    const current = schedule[key] || {a:"", b:""};
    const updated = {...current, [week]: value};
    setSchedule(p => ({...p, [key]: updated}));
    const { error } = await supabase.from('schedule')
      .upsert({day, slot, content_a:updated.a, content_b:updated.b}, {onConflict:'day,slot'});
    if (error) console.error('setScheduleSlot:', error);
  }

  // ---- Dossiers / fichiers ----
  async function addFolder() {
    if (!newFolderName.trim()) return;
    const { data, error } = await supabase.from('folders')
      .insert({name:newFolderName.trim()})
      .select().single();
    if (error) { console.error('addFolder:', error); return; }
    setFolders(p => [...p, {...data, files:[]}]);
    setNewFolderName("");
  }

  async function deleteFolder(id) {
    setFolders(p => p.filter(f => f.id !== id));
    if (selectedFolder === id) setSelectedFolder(null);
    const { error } = await supabase.from('folders').delete().eq('id', id);
    if (error) console.error('deleteFolder:', error);
  }

  async function handleFileUpload(folderId, fileList) {
    const uploaded = [];
    for (const file of Array.from(fileList)) {
      const path = `${folderId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('fichiers').upload(path, file);
      if (upErr) { console.error('upload:', upErr); continue; }
      uploaded.push({ folder_id: folderId, name: file.name, size: file.size, type: file.type, storage_path: path });
    }
    if (uploaded.length === 0) return;
    const { data, error } = await supabase.from('files').insert(uploaded).select();
    if (error) { console.error('handleFileUpload:', error); return; }
    setFolders(p => p.map(f => f.id === folderId
      ? {...f, files:[...f.files, ...data.map(d=>({...d, date:new Date(d.created_at).toLocaleDateString("fr-FR")}))]}
      : f));
  }

  function openFile(storagePath) {
    const { data } = supabase.storage.from('fichiers').getPublicUrl(storagePath);
    if (data?.publicUrl) window.open(data.publicUrl, '_blank');
  }

  async function deleteFile(folderId, fileId, storagePath) {
    setFolders(p => p.map(f => f.id === folderId
      ? {...f, files: f.files.filter(file => file.id !== fileId)}
      : f));
    if (storagePath) {
      const { error: storErr } = await supabase.storage.from('fichiers').remove([storagePath]);
      if (storErr) console.error('deleteFile storage:', storErr);
    }
    const { error } = await supabase.from('files').delete().eq('id', fileId);
    if (error) console.error('deleteFile:', error);
  }

  const evoData = useMemo(()=>{
    if(evoSubject==="global") return buildEvolutionData(subjects, granularity);
    const sub = subjects.find(s=>s.id===parseInt(evoSubject));
    if(!sub) return [];
    return buildEvolutionData([sub], granularity);
  }, [subjects, granularity, evoSubject]);

  const TABS=[["dashboard","📊"],["subjects","📚"],["plan","🎯"],["evolution","📈"],["perso","📁"]];
  const TAB_LABELS={"dashboard":"Dashboard","subjects":"Matières","plan":"Plan","evolution":"Évolution","perso":"Perso"};

  if (loading) {
    return (
      <div style={{background:S.bg,color:S.muted,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono',monospace"}}>
        Chargement...
      </div>
    );
  }

  return (
    <div style={{background:S.bg,color:S.text,minHeight:"100vh",fontFamily:"'DM Mono',monospace"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#252535;border-radius:2px}
        input[type=number]::-webkit-inner-spin-button{opacity:0.3}
      `}</style>

      <div style={{background:"linear-gradient(160deg,#16152A 0%,#0C0C10 100%)",borderBottom:`1px solid ${S.border}`,padding:"28px 20px 20px",textAlign:"center",position:"sticky",top:0,zIndex:100}}>
        <div style={{fontSize:11,color:S.accent,letterSpacing:4,marginBottom:10,fontFamily:"Syne,sans-serif",fontWeight:700}}>
          TERMINALE — ANNÉE 2026-2027
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
            onChange={e=>updateTarget(e.target.value)}
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

      <div style={{display:"flex",borderBottom:`1px solid ${S.border}`,background:S.bg,position:"sticky",top:0,zIndex:99}}>
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
            {subjects.length===0&&(
              <div style={{textAlign:"center",padding:"40px 20px",color:S.muted,fontSize:12,fontStyle:"italic"}}>
                Aucune matière — ajoute-en une dans l'onglet Matières.
              </div>
            )}
            {subjects.map(s=>{
              const a=calcAvg(s.grades);
              const color=sc(a,s.obj);
              const icon=a===null?"":(s.obj===null||s.obj===undefined)?"":a>=s.obj?"✅":a>=s.obj-2?"⚠️":"🔴";
              return (
                <div key={s.id} onClick={()=>{setSelectedId(s.id);setTab("subjects");}}
                  style={{background:S.surface,borderRadius:14,padding:14,marginBottom:10,border:`1px solid ${s.color}18`,cursor:"pointer",transition:"border-color 0.2s"}}>
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
                    <span>{(s.grades||[]).length} note{(s.grades||[]).length!==1?"s":""}</span>
                    <span>{(s.obj!==null&&s.obj!==undefined)?`Objectif ${s.obj}/20 ${icon}`:"Pas d'objectif fixé"}</span>
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
                  <button onClick={()=>deleteSubject(selected.id)}
                    style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:16}}>×</button>
                </div>

                <div style={{fontSize:10,color:S.muted,letterSpacing:3,marginBottom:8,fontFamily:"Syne,sans-serif"}}>NOTES</div>
                {(!selected.grades||selected.grades.length===0)&&<div style={{fontSize:12,color:S.muted,fontStyle:"italic",marginBottom:12}}>Aucune note pour l'instant.</div>}
                {(selected.grades||[]).map((g,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:S.surface2,borderRadius:8,padding:"8px 12px",marginBottom:6}}>
                    <div>
                      <span style={{fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:14}}>{g.v}/20</span>
                      <span style={{fontSize:11,color:S.muted,marginLeft:8}}>coef {g.w}{g.label?` · ${g.label}`:""}</span>
                    </div>
                    <button onClick={()=>deleteGrade(i)}
                      style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:14}}>×</button>
                  </div>
                ))}

                <div style={{fontSize:10,color:S.muted,letterSpacing:3,marginBottom:8,marginTop:12,fontFamily:"Syne,sans-serif"}}>AJOUTER UNE NOTE</div>
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
              const hasObj = s.obj!==null&&s.obj!==undefined;
              const simAvg = hasObj?simAvgWithObj(subjects,s.id,s.obj):null;
              const simDiff = simAvg!==null&&avg!==null?simAvg-avg:null;
              const coefKey = `${s.id}`;
              const simC = parseFloat(simCoef[coefKey])||1;
              const needed = hasObj&&curAvg!==null?gradeNeeded(s.grades,s.obj,simC):null;
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

                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:hasObj?12:0}}>
                    <span style={{fontSize:11,color:S.muted,flexShrink:0}}>Objectif :</span>
                    <input type="number" min="0" max="20" step="0.5"
                      placeholder="Ex: 14"
                      value={hasObj?s.obj:""}
                      onChange={e=>setObj(s.id,e.target.value)}
                      style={{...inp(),width:80,textAlign:"center"}} />
                    <span style={{fontSize:11,color:S.muted}}>/20</span>
                    {hasObj&&(
                      <button onClick={()=>setObj(s.id,"")}
                        style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:14,marginLeft:4}}>×</button>
                    )}
                  </div>

                  {hasObj&&(
                    <div style={{background:S.surface2,borderRadius:10,padding:12,marginTop:4}}>
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

                      {curAvg!==null&&(
                        <>
                          <div style={{fontSize:10,color:S.muted,letterSpacing:2,marginBottom:8,fontFamily:"Syne,sans-serif"}}>NOTES NÉCESSAIRES</div>
                          {needed2a!==null&&(
                            <div style={{marginBottom:8,background:S.bg,borderRadius:8,padding:"8px 10px"}}>
                              <div style={{fontSize:11,color:S.muted,marginBottom:2}}>Avec 1 note coef 1 :</div>
                              <span style={{fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:14,
                                color:needed2a>20?"#F87171":needed2a>16?"#FBBF24":"#34D399"}}>
                                {needed2a>20?"❌ Impossible":needed2a<=0?"✅ Déjà atteint !":`${needed2a.toFixed(2)}/20`}
                              </span>
                            </div>
                          )}
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
                                    → {needed>20?"❌ Impossible":needed<=0?"✅ Déjà atteint !":`${needed.toFixed(2)}/20`}
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

        {/* ÉVOLUTION */}
        {tab==="evolution"&&(
          <div>
            <div style={{fontSize:10,color:S.muted,letterSpacing:3,marginBottom:12,fontFamily:"Syne,sans-serif"}}>HISTORIQUE DE PROGRESSION</div>

            <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
              {["mois","trimestre","jour"].map(g=>(
                <button key={g} onClick={()=>setGranularity(g)} style={{
                  background:granularity===g?S.accent:S.surface,border:`1px solid ${granularity===g?S.accent:S.border}`,
                  color:granularity===g?"#fff":S.muted,borderRadius:8,padding:"6px 12px",fontSize:11,
                  cursor:"pointer",fontFamily:"Syne,sans-serif",fontWeight:700,textTransform:"capitalize"
                }}>{g==="jour"?"Détaillé":g}</button>
              ))}
            </div>

            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              <button onClick={()=>setEvoSubject("global")} style={{
                background:evoSubject==="global"?S.surface2:S.surface,border:`1px solid ${evoSubject==="global"?S.accent:S.border}`,
                color:evoSubject==="global"?S.accent:S.muted,borderRadius:20,padding:"6px 14px",fontSize:11,
                cursor:"pointer",fontFamily:"Syne,sans-serif",fontWeight:600
              }}>Global</button>
              {subjects.map(s=>(
                <button key={s.id} onClick={()=>setEvoSubject(String(s.id))} style={{
                  background:evoSubject===String(s.id)?s.color:S.surface,border:`1px solid ${s.color}60`,
                  color:evoSubject===String(s.id)?"#fff":s.color,borderRadius:20,padding:"6px 14px",fontSize:11,
                  cursor:"pointer",fontFamily:"Syne,sans-serif",fontWeight:600
                }}>{s.name}</button>
              ))}
            </div>

            <div style={{background:S.surface,borderRadius:16,padding:16,border:`1px solid ${S.border}`}}>
              {evoData.length===0?(
                <div style={{textAlign:"center",padding:"30px 0",color:S.muted,fontSize:12,fontStyle:"italic"}}>
                  Pas encore assez de notes pour tracer une évolution.
                </div>
              ):(
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={evoData} margin={{top:10,right:10,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
                    <XAxis dataKey="label" tick={{fill:S.muted,fontSize:10}} />
                    <YAxis domain={[0,20]} tick={{fill:S.muted,fontSize:10}} />
                    <Tooltip contentStyle={{background:S.surface2,border:`1px solid ${S.border}`,borderRadius:8,fontSize:12}}
                      labelStyle={{color:S.text}} />
                    <Line type="monotone" dataKey="avg" stroke={evoSubject==="global"?S.accent:subjects.find(s=>s.id===parseInt(evoSubject))?.color||S.accent}
                      strokeWidth={2.5} dot={{r:4}} activeDot={{r:6}} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* PERSO */}
        {tab==="perso"&&(
          <div>
            {/* Sous-onglets */}
            <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
              {[["dossiers","📁","Dossiers"],["emploi","🗓️","Emploi du temps"],["taches","✅","Tâches"]].map(([key,icon,label])=>(
                <button key={key} onClick={()=>setPersoTab(key)} style={{
                  flex:"1 1 100px",background:persoTab===key?S.accent:S.surface,
                  border:`1px solid ${persoTab===key?S.accent:S.border}`,
                  color:persoTab===key?"#fff":S.muted,borderRadius:10,padding:"10px 8px",
                  fontSize:11,cursor:"pointer",fontFamily:"Syne,sans-serif",fontWeight:700,
                  display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all 0.2s"
                }}>
                  <span style={{fontSize:16}}>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* DOSSIERS */}
            {persoTab==="dossiers"&&(
              <div>
                <div style={{fontSize:10,color:S.muted,letterSpacing:3,marginBottom:12,fontFamily:"Syne,sans-serif"}}>MES DOSSIERS</div>
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
                    <div style={{fontSize:12,marginTop:6}}>Crée un dossier et importe tes fichiers importants</div>
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
                        <button onClick={e=>{e.stopPropagation();deleteFolder(folder.id);}}
                          style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:16}}>×</button>
                        <span style={{color:S.muted,fontSize:14}}>{selectedFolder===folder.id?"▲":"▼"}</span>
                      </div>
                    </div>

                    {selectedFolder===folder.id&&(
                      <div style={{padding:14}}>
                        <label style={{display:"block"}}>
                          <input type="file" multiple style={{display:"none"}}
                            onChange={e=>handleFileUpload(folder.id,e.target.files)} />
                          <div style={{background:S.surface2,border:`1px dashed ${S.border}`,color:S.text,borderRadius:10,
                            padding:"12px 20px",width:"100%",cursor:"pointer",fontFamily:"'DM Mono',monospace",
                            fontSize:13,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                            <span style={{fontSize:20}}>📎</span> Importer des fichiers
                          </div>
                        </label>

                        {folder.files.length===0&&(
                          <div style={{textAlign:"center",fontSize:12,color:S.muted,padding:"8px 0"}}>Aucun fichier importé</div>
                        )}
                        {folder.files.map((f)=>(
                          <div key={f.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                            background:S.bg,borderRadius:8,padding:"8px 12px",marginBottom:6}}>
                            <div onClick={()=>openFile(f.storage_path)} style={{display:"flex",alignItems:"center",gap:8,minWidth:0,cursor:f.storage_path?"pointer":"default",flex:1}}>
                              <span style={{fontSize:16}}>
                                {f.type&&f.type.includes("pdf")?"📄":f.type&&f.type.includes("image")?"🖼️":f.type&&f.type.includes("text")?"📝":"📎"}
                              </span>
                              <div style={{minWidth:0}}>
                                <div style={{fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:f.storage_path?"underline":"none",textDecorationColor:S.border}}>{f.name}</div>
                                <div style={{fontSize:10,color:S.muted}}>{f.date||new Date(f.created_at).toLocaleDateString("fr-FR")} · {f.size>1024*1024?(f.size/(1024*1024)).toFixed(1)+"MB":(f.size/1024).toFixed(0)+"KB"}</div>
                              </div>
                            </div>
                            <button onClick={()=>deleteFile(folder.id,f.id,f.storage_path)} style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:16,flexShrink:0}}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* EMPLOI DU TEMPS */}
            {persoTab==="emploi"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontSize:10,color:S.muted,letterSpacing:3,fontFamily:"Syne,sans-serif"}}>EMPLOI DU TEMPS</div>
                  <div style={{fontSize:9,color:S.muted,display:"flex",gap:10}}>
                    <span>↗ Sem. A</span>
                    <span>↙ Sem. B</span>
                  </div>
                </div>
                <div style={{overflowX:"auto"}}>
                  <div style={{display:"grid",gridTemplateColumns:`60px repeat(${DAYS.length}, 1fr)`,gap:3,minWidth:560}}>
                    <div />
                    {DAYS.map(d=>(
                      <div key={d} style={{textAlign:"center",fontSize:10,color:S.muted,fontFamily:"Syne,sans-serif",fontWeight:700,paddingBottom:6}}>{d}</div>
                    ))}
                    {SLOTS.map((slot,i)=>(
                      <div key={slot} style={{display:"contents"}}>
                        <div style={{fontSize:9,color:S.muted,display:"flex",alignItems:"center",paddingRight:4}}>{slot}</div>
                        {DAYS.map(day=>{
                          const entry = SCHEDULE_DATA[day][i];
                          if (!entry) {
                            return <div key={day} style={{minHeight:40,borderRadius:5,border:`1px solid ${S.border}`,background:S.surface}} />;
                          }
                          if (entry.both) {
                            const c = SCHEDULE_COLORS[entry.both.subject] || S.accent;
                            return (
                              <div key={day} style={{minHeight:40,borderRadius:5,background:`${c}22`,border:`1px solid ${c}70`,
                                display:"flex",alignItems:"center",justifyContent:"center",padding:2,textAlign:"center"}}>
                                <span style={{fontSize:8,color:c,fontFamily:"Syne,sans-serif",fontWeight:700,lineHeight:1.15}}>{entry.both.subject}</span>
                              </div>
                            );
                          }
                          const ca = entry.a ? (SCHEDULE_COLORS[entry.a.subject] || S.accent) : null;
                          const cb = entry.b ? (SCHEDULE_COLORS[entry.b.subject] || S.accent) : null;
                          return (
                            <div key={day} style={{position:"relative",minHeight:40,borderRadius:5,border:`1px solid ${S.border}`,overflow:"hidden",background:S.surface}}>
                              {ca && <div style={{position:"absolute",inset:0,clipPath:"polygon(0 0, 100% 0, 100% 100%)",background:`${ca}25`}} />}
                              {cb && <div style={{position:"absolute",inset:0,clipPath:"polygon(0 0, 0 100%, 100% 100%)",background:`${cb}25`}} />}
                              <div style={{position:"absolute",top:1,right:1,maxWidth:"58%",fontSize:7,color:ca||S.muted,textAlign:"right",fontFamily:"Syne,sans-serif",fontWeight:700,lineHeight:1.1}}>{entry.a?.subject||""}</div>
                              <div style={{position:"absolute",bottom:1,left:1,maxWidth:"58%",fontSize:7,color:cb||S.muted,textAlign:"left",fontFamily:"Syne,sans-serif",fontWeight:700,lineHeight:1.1}}>{entry.b?.subject||""}</div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TÂCHES */}
            {persoTab==="taches"&&(
              <div>
                <div style={{fontSize:10,color:S.muted,letterSpacing:3,marginBottom:12,fontFamily:"Syne,sans-serif"}}>MES TÂCHES</div>
                <div style={{display:"flex",gap:8,marginBottom:16}}>
                  <input placeholder="Nouvelle tâche..." value={newTask}
                    onChange={e=>setNewTask(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&addTask()}
                    style={{...inp(),flex:1}} />
                  <button onClick={addTask} style={{background:S.accent,border:"none",color:"#fff",borderRadius:8,padding:"8px 16px",fontSize:18,cursor:"pointer"}}>+</button>
                </div>

                {tasks.length===0&&(
                  <div style={{textAlign:"center",padding:"20px",color:S.muted,fontSize:12,fontStyle:"italic"}}>Aucune tâche pour l'instant.</div>
                )}
                {tasks.map(t=>(
                  <div key={t.id} style={{background:S.surface,borderRadius:10,padding:"10px 12px",marginBottom:8,border:`1px solid ${S.border}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <button onClick={()=>toggleTask(t.id)} style={{
                        width:18,height:18,borderRadius:5,border:`2px solid ${t.done?"#34D399":S.muted}`,
                        background:t.done?"#34D399":"none",cursor:"pointer",flexShrink:0,color:"#fff",fontSize:11,
                        display:"flex",alignItems:"center",justifyContent:"center"
                      }}>{t.done?"✓":""}</button>
                      <span style={{flex:1,fontSize:13,textDecoration:t.done?"line-through":"none",color:t.done?S.muted:S.text}}>{t.text}</span>
                      <button onClick={()=>deleteTask(t.id)} style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:16}}>×</button>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,paddingLeft:28}}>
                      <span style={{fontSize:14}}>⏰</span>
                      <input type="datetime-local" value={t.alarm||""}
                        onChange={e=>setTaskAlarm(t.id,e.target.value)}
                        style={{...inp({padding:"5px 8px",fontSize:11}),flex:1}} />
                      {t.alarm&&(
                        <button onClick={()=>setTaskAlarm(t.id,"")}
                          style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:13}}>×</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}