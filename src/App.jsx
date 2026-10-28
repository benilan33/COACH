import { useState, useMemo, useEffect, useRef } from "react";
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

// ======== Calculs de notes ========
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
function buildLossRanking(subjects) {
  return subjects
    .map(s => {
      const a = calcAvg(s.grades);
      if (a===null || s.obj===null || s.obj===undefined) return null;
      const deficit = s.obj - a;
      if (deficit <= 0) return null;
      return { id:s.id, name:s.name, color:s.color, avg:a, obj:s.obj, coef:s.coef, deficit, weighted: deficit*s.coef };
    })
    .filter(Boolean)
    .sort((x,y)=>y.weighted-x.weighted);
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

// ======== Dates (tout en heure LOCALE, jamais en UTC) ========
const MOIS = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];

// "2026-10-26" d'après l'horloge locale (toISOString() donnerait la date UTC → veille entre 0h et 1h/2h)
function todayLocal() {
  const d = new Date();
  const p = n => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
// "2026-10-26" -> {y:2026, m:9 (0-11), d:26}, ou null si pas de date valide
function parseDate(str) {
  if (!str) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (!m) return null;
  return { y:+m[1], m:+m[2]-1, d:+m[3] };
}
// Trimestres scolaires : T1 sept-nov, T2 déc-fév, T3 mars-août. startYear = année de la rentrée.
function trimesterOf(y, m) {
  const startYear = m >= 8 ? y : y-1;
  const t = (m>=8 && m<=10) ? 1 : (m===11 || m<=1) ? 2 : 3;
  return { t, startYear };
}

const S = { bg:"#0C0C10",surface:"#13131A",surface2:"#1C1C28",border:"#252535",text:"#F0EFF8",muted:"#6B6B85",accent:"#7C6DFA" };

function inp(extra={}) {
  return { background:S.bg,border:`1px solid ${S.border}`,color:S.text,borderRadius:8,padding:"8px 10px",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none",...extra };
}

function buildSubjectCompareData(grades) {
  const sorted = [...(grades||[])].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
  return sorted.map((g,i)=>({
    label: g.label || `Note ${i+1}`,
    moi: g.v,
    classe: g.classAvg ?? null,
    meilleure: g.maxGrade ?? null,
  }));
}

// Un point par période (jour / mois / trimestre) = la moyenne à la FIN de la période.
function buildEvolutionData(subjects, granularity) {
  const all = [];
  subjects.forEach(s=>{
    (s.grades||[]).forEach(g=>all.push({...g, subjectId:s.id}));
  });
  all.sort((a,b)=>(a.date||"").localeCompare(b.date||""));
  if(!all.length) return [];

  const running = {};
  subjects.forEach(s=>running[s.id]=[]);
  const buckets = new Map(); // garde l'ordre d'insertion ; re-set d'une clé = on garde la dernière valeur

  all.forEach(g=>{
    running[g.subjectId].push(g);
    const dt = parseDate(g.date);
    if(!dt) return; // note sans date : comptée dans les moyennes, mais pas de point sur l'axe

    let tot=0,w=0;
    subjects.forEach(s=>{
      const a = calcAvg(running[s.id]);
      if(a!==null){tot+=a*s.coef;w+=s.coef;}
    });
    const avg = w ? tot/w : null;

    let key, label;
    if (granularity==="mois") {
      key = `${dt.y}-${String(dt.m).padStart(2,"0")}`;
      label = `${MOIS[dt.m]} ${String(dt.y).slice(2)}`;
    } else if (granularity==="trimestre") {
      const {t,startYear} = trimesterOf(dt.y, dt.m);
      key = `${startYear}-T${t}`;
      label = `T${t} ${String(startYear).slice(2)}-${String(startYear+1).slice(2)}`;
    } else {
      key = g.date.slice(0,10);
      label = `${String(dt.d).padStart(2,"0")} ${MOIS[dt.m]}`;
    }
    buckets.set(key, { label, avg: avg!==null?parseFloat(avg.toFixed(2)):null, date:g.date });
  });
  return Array.from(buckets.values());
}

// ======== Écart à la classe ========
function fmtGap(x) { return (x>=0?"+":"")+x.toFixed(1); }
function gapColor(x) { return x>=0?"#34D399":x>=-1?"#FBBF24":"#F87171"; }

// Écart moyen (pondéré par le coef de chaque note) entre ta note et la moyenne de classe.
// On ne garde que les notes où la moyenne de classe est renseignée.
function subjectClassGap(grades) {
  const g = (grades||[]).filter(x=>x.classAvg!=null);
  if (!g.length) return null;
  const w = g.reduce((s,x)=>s+x.w,0);
  const gap = g.reduce((s,x)=>s+(x.v-x.classAvg)*x.w,0)/w;
  const top = g.filter(x=>x.maxGrade!=null);
  const wt = top.reduce((s,x)=>s+x.w,0);
  const gapTop = wt ? top.reduce((s,x)=>s+(x.v-x.maxGrade)*x.w,0)/wt : null; // ≤ 0 : à quelle distance du meilleur
  const above = g.filter(x=>x.v>x.classAvg).length;
  return { gap, gapTop, above, n:g.length };
}
function globalClassGap(subjects) {
  let tot=0,w=0;
  subjects.forEach(s=>{ const r=subjectClassGap(s.grades); if(r){ tot+=r.gap*s.coef; w+=s.coef; } });
  return w ? tot/w : null;
}

// ======== Tendance d'une matière ========
// Moyenne des k dernières notes vs moyenne des k précédentes (k = 3 max). Il faut au moins 4 notes.
function subjectTrend(grades) {
  const sorted = [...(grades||[])].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
  const n = sorted.length;
  if (n < 4) return null;
  const k = Math.min(3, Math.floor(n/2));
  const recent = calcAvg(sorted.slice(n-k));
  const before = calcAvg(sorted.slice(n-2*k, n-k));
  return { delta: recent-before, recent, before, k };
}

// ======== Badges / XP / niveaux ========
const TIER_COLORS = ["#CD7F32","#C0C0C0","#FBBF24"]; // bronze, argent, or
const TIER_PTS = [10,25,50];
const LEVELS = [
  {xp:0,   emoji:"😴", title:"Seconde en roue libre"},
  {xp:30,  emoji:"🏃", title:"Première en échauffement"},
  {xp:80,  emoji:"📖", title:"Terminale en mode sérieux"},
  {xp:150, emoji:"🧮", title:"Matheux confirmé"},
  {xp:250, emoji:"🎓", title:"Candidat MP2I"},
  {xp:350, emoji:"🚀", title:"Futur intégré"},
  {xp:460, emoji:"👑", title:"Légende de Montaigne"},
];
const SEEN_KEY = "coach_badges_seen_v1";
function loadSeen() { try { const r = localStorage.getItem(SEEN_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
function saveSeen(levels) { try { localStorage.setItem(SEEN_KEY, JSON.stringify(levels)); } catch (e) { /* stockage indisponible : tant pis */ } }

function fmtV(v) { return Number.isInteger(v) ? String(v) : v.toFixed(1); }
// Numéro de semaine (lundi → dimanche) pour compter les semaines distinctes avec une note
function weekIndex(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return null;
  return Math.floor((Date.UTC(d.y, d.m, d.d)/86400000 + 3) / 7);
}

// Tout est recalculé depuis l'historique des notes : aucune table à créer.
function computeBadges(subjects, target) {
  const all = [];
  subjects.forEach(s=>(s.grades||[]).forEach(g=>all.push({...g, sid:s.id})));
  all.sort((a,b)=>(a.date||"").localeCompare(b.date||""));

  const avg = genAvg(subjects);
  const gGap = globalClassGap(subjects);

  // plus longue série de notes d'affilée au-dessus de la moyenne de classe
  let run=0, bestRun=0;
  all.filter(g=>g.classAvg!=null).forEach(g=>{
    if (g.v>g.classAvg) { run++; bestRun=Math.max(bestRun,run); } else run=0;
  });
  // plus gros bond d'une note à la suivante, dans une même matière
  let bestJump=0;
  subjects.forEach(s=>{
    const gs=[...(s.grades||[])].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    for (let i=1;i<gs.length;i++) bestJump=Math.max(bestJump, gs[i].v-gs[i-1].v);
  });

  const bestGrade = all.length ? Math.max(...all.map(g=>g.v)) : 0;
  const topCount = all.filter(g=>g.maxGrade!=null && g.v>=g.maxGrade).length;
  const weeks = new Set(all.map(g=>weekIndex(g.date)).filter(w=>w!==null)).size;
  const classFilled = all.filter(g=>g.classAvg!=null).length;
  const subjAvgs = subjects.map(s=>calcAvg(s.grades)).filter(a=>a!==null);
  const minAvg = subjAvgs.length>=3 ? Math.min(...subjAvgs) : 0;
  const at16 = subjects.filter(s=>(s.grades||[]).some(g=>g.v>=16)).length;
  const atObj = subjects.filter(s=>{ const a=calcAvg(s.grades); return a!==null && s.obj!=null && a>=s.obj; }).length;

  const defs = [
    {id:"collection", emoji:"📚", name:"Collectionneur", flavor:"Les notes, ça s'accumule.", value:all.length, tiers:[5,20,50],
      goal:t=>`Enregistre ${t} notes`},
    {id:"sniper", emoji:"🎯", name:"Sniper", flavor:"Droit dans le mille.", value:bestGrade, tiers:[16,18,20],
      goal:t=>`Décroche une note d'au moins ${t}/20`},
    {id:"serie", emoji:"🔥", name:"En feu", flavor:"Impossible à arrêter.", value:bestRun, tiers:[3,5,8],
      goal:t=>`${t} notes d'affilée au-dessus de la moyenne de classe`},
    {id:"remontada", emoji:"🚀", name:"Remontada", flavor:"Le bond que personne n'a vu venir.", value:bestJump, tiers:[3,5,8],
      goal:t=>`Gagne ${t} pts d'une note à la suivante (même matière)`},
    {id:"major", emoji:"👑", name:"Major", flavor:"Le haut du tableau, c'est chez toi.", value:topCount, tiers:[1,3,5],
      goal:t=>`Égale la meilleure note de la classe (${t} fois)`},
    {id:"melee", emoji:"🦅", name:"Au-dessus de la mêlée", flavor:"Tu voles plus haut que le reste.", value:gGap??0, tiers:[0.5,2,4], fmt:fmtGap,
      goal:t=>`Écart moyen à la classe d'au moins ${fmtGap(t)} pt`},
    {id:"altitude", emoji:"🏔️", name:"Altitude", flavor:"L'air est pur là-haut.", value:avg??0, tiers:[12,14,16], fmt:v=>v.toFixed(1),
      goal:t=>`Moyenne générale d'au moins ${t}`},
    {id:"cap", emoji:"🏆", name:"Cap tenu", flavor:"Promis, juré, fait.", value:avg??0, tiers:[target], fmt:v=>v.toFixed(1),
      goal:t=>`Atteins ton objectif général (${fmtV(t)}/20)`},
    {id:"mission", emoji:"🏁", name:"Mission accomplie", flavor:"Objectif coché, matière après matière.", value:atObj, tiers:[1,3,5],
      goal:t=>`${t} matière${t>1?"s":""} à leur objectif`},
    {id:"touche", emoji:"🧬", name:"Touche-à-tout", flavor:"Fort partout, ou presque.", value:at16, tiers:[2,4,6],
      goal:t=>`Un 16+ dans ${t} matières différentes`},
    {id:"metronome", emoji:"🗓️", name:"Métronome", flavor:"La régularité, ça paie.", value:weeks, tiers:[4,10,20],
      goal:t=>`Des notes sur ${t} semaines différentes`},
    {id:"plancher", emoji:"🧱", name:"Plancher solide", flavor:"Pas de maillon faible.", value:minAvg, tiers:[10,12,14], fmt:v=>v.toFixed(1),
      goal:t=>`Aucune matière sous ${t} de moyenne (3 matières notées minimum)`},
    {id:"nerd", emoji:"🤓", name:"Data nerd", flavor:"Tu mesures, donc tu progresses.", value:classFilled, tiers:[5,15,30],
      goal:t=>`Renseigne la moyenne de classe sur ${t} notes`},
  ];

  let xp=0, unlockedTiers=0, totalTiers=0;
  const badges = defs.map(d=>{
    const level = d.tiers.filter(t=>d.value>=t).length;
    const next = level < d.tiers.length ? d.tiers[level] : null;
    const pts = d.tiers.length===1 ? [50] : TIER_PTS;
    for (let i=0;i<level;i++) xp += pts[i];
    unlockedTiers += level;
    totalTiers += d.tiers.length;
    const progress = next===null ? 1 : Math.max(0, Math.min(1, d.value/next));
    return { ...d, fmt: d.fmt || fmtV, level, next, progress, colors: d.tiers.length===1 ? [TIER_COLORS[2]] : TIER_COLORS };
  });

  const trends = subjects
    .map(s=>{ const t=subjectTrend(s.grades); return t ? {id:s.id, name:s.name, color:s.color, ...t} : null; })
    .filter(Boolean)
    .sort((a,b)=>b.delta-a.delta);

  let levelIdx = 0;
  LEVELS.forEach((l,i)=>{ if (xp>=l.xp) levelIdx=i; });

  return { badges, xp, levelIdx, unlockedTiers, totalTiers, trends };
}

export default function App() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [target, setTarget] = useState(15);
  const [targetDraft, setTargetDraft] = useState("15"); // ce qui est tapé dans le champ (peut être vide un instant)

  // ---- Écritures Supabase "différées" (debounce) : évite 1 requête par lettre tapée ----
  const pendingSub = useRef({});      // { [id]: {id, patch, timer} }
  const pendingTarget = useRef({ value:null, timer:null });

  function flushSub(id) {
    const p = pendingSub.current[id];
    if (!p) return;
    clearTimeout(p.timer);
    delete pendingSub.current[id];
    supabase.from('subjects').update(p.patch).eq('id', id).then(({error}) => {
      if (error) console.error('updSub:', error);
    });
  }
  function flushTarget() {
    const p = pendingTarget.current;
    if (p.value === null) return;
    clearTimeout(p.timer);
    const v = p.value;
    p.value = null;
    supabase.from('settings').upsert({id:1, target:v}).then(({error}) => {
      if (error) console.error('updateTarget:', error);
    });
  }

  // Si l'onglet passe en arrière-plan / se ferme, on envoie tout de suite ce qui est en attente
  useEffect(() => {
    function onHide() {
      if (document.visibilityState === "hidden") {
        Object.values(pendingSub.current).forEach(p => flushSub(p.id));
        flushTarget();
      }
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  function onTargetChange(value) {
    setTargetDraft(value);
    const v = parseFloat(value);
    if (isNaN(v) || v <= 0 || v > 20) return; // champ vide ou invalide : on attend, on ne touche à rien
    setTarget(v);
    const p = pendingTarget.current;
    p.value = v;
    clearTimeout(p.timer);
    p.timer = setTimeout(flushTarget, 600);
  }

  const [tab, setTab] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [newGrade, setNewGrade] = useState({v:"",w:"1",label:"",classAvg:"",maxGrade:""});
  const [editing, setEditing] = useState(null); // {subId, idx}
  const [editDraft, setEditDraft] = useState(null);
  const [newSubName, setNewSubName] = useState("");
  const [newSubCoef, setNewSubCoef] = useState("1");
  const [simCoef, setSimCoef] = useState({});
  const [granularity, setGranularity] = useState("mois");
  const [evoSubject, setEvoSubject] = useState("global");
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [persoTab, setPersoTab] = useState("dossiers");
  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(null);

  // ---- Chargement initial depuis Supabase ----
  async function fetchAll() {
    setLoadError(false);
    let failed = false;
    try {
      const { data: subjectsData, error: e1 } = await supabase.from('subjects').select('*').order('id');
      if (e1) { console.error('subjects:', e1); failed = true; } else setSubjects(subjectsData || []);

      const { data: tasksData, error: e2 } = await supabase.from('tasks').select('*').order('id');
      if (e2) { console.error('tasks:', e2); failed = true; } else setTasks(tasksData || []);

      const { data: foldersData, error: e3 } = await supabase.from('folders').select('*').order('id');
      const { data: filesData, error: e4 } = await supabase.from('files').select('*').order('id');
      if (e3) { console.error('folders:', e3); failed = true; }
      if (e4) { console.error('files:', e4); failed = true; }
      if (foldersData) {
        setFolders(foldersData.map(f => ({
          ...f,
          files: (filesData || []).filter(file => file.folder_id === f.id)
        })));
      }

      const { data: settingsData, error: e5 } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (e5) { console.error('settings:', e5); failed = true; }
      else if (settingsData) {
        const t = settingsData.target ?? 15;
        setTarget(t);
        setTargetDraft(String(t));
      }
    } catch (err) {
      console.error('fetchAll:', err);
      failed = true;
    } finally {
      setLoadError(failed);
      setLoading(false);
    }
  }
  useEffect(() => { fetchAll(); }, []);

  const avg = genAvg(subjects);
  const avgColor = avg===null?S.muted:avg>=target?"#34D399":avg>=target-1?"#FBBF24":"#F87171";
  const pct = avg!==null?Math.min(100,(avg/target)*100):0;
  const selected = subjects.find(s=>s.id===selectedId);

  // ---- Matières / notes ----
  // Mise à jour immédiate à l'écran ; écriture Supabase différée de 600 ms (ou tout de suite avec {immediate:true})
  function updSub(id, patch, { immediate=false } = {}) {
    setSubjects(p => p.map(s => s.id === id ? {...s, ...patch} : s));
    const p = pendingSub.current[id] || { id, patch:{}, timer:null };
    p.patch = {...p.patch, ...patch};
    clearTimeout(p.timer);
    pendingSub.current[id] = p;
    if (immediate) flushSub(id);
    else p.timer = setTimeout(() => flushSub(id), 600);
  }

  function addGrade() {
    const v = parseFloat(newGrade.v), w = parseFloat(newGrade.w) || 1;
    if (isNaN(v) || v < 0 || v > 20 || !selectedId) return;
    const classAvgNum = newGrade.classAvg !== "" ? parseFloat(newGrade.classAvg) : null;
    const maxGradeNum = newGrade.maxGrade !== "" ? parseFloat(newGrade.maxGrade) : null;
    const newGrades = [...(selected.grades||[]), {
      v, w, label:newGrade.label, date:todayLocal(),
      classAvg: (classAvgNum!==null && !isNaN(classAvgNum)) ? classAvgNum : null,
      maxGrade: (maxGradeNum!==null && !isNaN(maxGradeNum)) ? maxGradeNum : null,
    }];
    updSub(selectedId, {grades:newGrades}, {immediate:true});
    setNewGrade({v:"",w:"1",label:"",classAvg:"",maxGrade:""});
  }

  function deleteGrade(index) {
    const newGrades = selected.grades.filter((_,j)=>j!==index);
    updSub(selected.id, {grades:newGrades}, {immediate:true});
  }

  function startEditGrade(subId, idx, g) {
    setEditing({subId, idx});
    setEditDraft({
      v: String(g.v ?? ""),
      w: String(g.w ?? "1"),
      label: g.label ?? "",
      date: g.date || todayLocal(),
      classAvg: g.classAvg!=null ? String(g.classAvg) : "",
      maxGrade: g.maxGrade!=null ? String(g.maxGrade) : "",
    });
  }

  function cancelEditGrade() {
    setEditing(null);
    setEditDraft(null);
  }

  function saveEditGrade() {
    if (!editing || !editDraft) return;
    const v = parseFloat(editDraft.v), w = parseFloat(editDraft.w) || 1;
    if (isNaN(v) || v < 0 || v > 20) return;
    const subject = subjects.find(s=>s.id===editing.subId);
    if (!subject) return;
    const classAvgNum = editDraft.classAvg !== "" ? parseFloat(editDraft.classAvg) : null;
    const maxGradeNum = editDraft.maxGrade !== "" ? parseFloat(editDraft.maxGrade) : null;
    const newGrades = (subject.grades||[]).map((g,j)=> j===editing.idx ? {
      v, w, label: editDraft.label,
      date: editDraft.date || g.date,
      classAvg: (classAvgNum!==null && !isNaN(classAvgNum)) ? classAvgNum : null,
      maxGrade: (maxGradeNum!==null && !isNaN(maxGradeNum)) ? maxGradeNum : null,
    } : g);
    updSub(editing.subId, {grades:newGrades}, {immediate:true});
    setEditing(null);
    setEditDraft(null);
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
    // on annule une éventuelle écriture en attente pour cette matière
    const pend = pendingSub.current[id];
    if (pend) { clearTimeout(pend.timer); delete pendingSub.current[id]; }
    setSubjects(p => p.filter(x => x.id !== id));
    setSelectedId(null);
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) console.error('deleteSubject:', error);
  }

  function setObj(id, val) {
    const v = val === "" ? null : parseFloat(val);
    updSub(id, {obj: isNaN(v) ? null : v});
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

  // ---- Badges : tout est recalculé depuis les notes ; seul "ce que tu as déjà vu" est gardé dans le navigateur ----
  const badgeData = useMemo(()=>computeBadges(subjects, target), [subjects, target]);
  const levelsNow = useMemo(()=>Object.fromEntries(badgeData.badges.map(b=>[b.id, b.level])), [badgeData]);
  const seenRef = useRef(null);            // niveaux déjà vus par toi (null = pas encore chargé)
  const [, setSeenVersion] = useState(0);  // sert juste à forcer un re-rendu quand seenRef change

  // 1er lancement : on enregistre l'état actuel pour ne pas tout marquer "NOUVEAU"
  useEffect(() => {
    if (loading || loadError || seenRef.current !== null) return;
    const stored = loadSeen();
    if (stored === null) { saveSeen(levelsNow); seenRef.current = levelsNow; }
    else seenRef.current = stored;
    setSeenVersion(v => v+1);
  }, [loading, loadError]);

  // Quand tu quittes l'onglet Badges, ce que tu viens de voir passe en "déjà vu"
  useEffect(() => {
    if (tab !== "badges" || loading) return;
    const snapshot = levelsNow;
    return () => { seenRef.current = snapshot; saveSeen(snapshot); setSeenVersion(v => v+1); };
  }, [tab, loading, levelsNow]);

  const isNewBadge = b => seenRef.current !== null && b.level > (seenRef.current[b.id] ?? 0);
  const newBadgeCount = badgeData.badges.filter(isNewBadge).length;

  const TABS=[["dashboard","📊"],["subjects","📚"],["plan","🎯"],["evolution","📈"],["badges","🏅"],["perso","📁"]];
  const TAB_LABELS={"dashboard":"Dashboard","subjects":"Matières","plan":"Plan","evolution":"Évolution","badges":"Badges","perso":"Perso"};

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
        @keyframes badgePop{0%{transform:scale(.85);opacity:0}60%{transform:scale(1.04);opacity:1}100%{transform:scale(1);opacity:1}}
        @keyframes badgeGlow{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 16px 2px var(--gc)}}
      `}</style>

      {/* Le header défile normalement (plus de sticky) : seule la barre d'onglets reste collée en haut */}
      <div style={{background:"linear-gradient(160deg,#16152A 0%,#0C0C10 100%)",borderBottom:`1px solid ${S.border}`,padding:"28px 20px 20px",textAlign:"center"}}>
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
          <input type="number" min="0" max="20" step="0.5" value={targetDraft}
            onChange={e=>onTargetChange(e.target.value)}
            onBlur={()=>setTargetDraft(String(target))}
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

      <div style={{display:"flex",borderBottom:`1px solid ${S.border}`,background:S.bg,position:"sticky",top:0,zIndex:100}}>
        {TABS.map(([t,icon])=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            flex:1,padding:"11px 2px",background:"none",border:"none",
            borderBottom:tab===t?`2px solid ${S.accent}`:"2px solid transparent",
            color:tab===t?S.accent:S.muted,fontSize:11,cursor:"pointer",
            fontFamily:"Syne,sans-serif",fontWeight:700,letterSpacing:1,transition:"all 0.2s",
            display:"flex",flexDirection:"column",alignItems:"center",gap:2
          }}>
            <span style={{fontSize:16,position:"relative"}}>
              {icon}
              {t==="badges"&&newBadgeCount>0&&(
                <span style={{position:"absolute",top:-3,right:-7,minWidth:12,height:12,borderRadius:6,background:"#F472B6",color:"#fff",fontSize:8,
                  fontFamily:"Syne,sans-serif",fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{newBadgeCount}</span>
              )}
            </span>
            <span>{TAB_LABELS[t]}</span>
          </button>
        ))}
      </div>

      <div style={{padding:16,paddingBottom:80}}>

        {loadError&&(
          <div style={{background:"#F8717118",border:"1px solid #F8717160",borderRadius:12,padding:12,marginBottom:16,fontSize:12,lineHeight:1.6}}>
            <div style={{fontFamily:"Syne,sans-serif",fontWeight:700,color:"#F87171",marginBottom:4}}>⚠️ Impossible de tout charger depuis Supabase</div>
            <div style={{color:S.muted}}>
              Projet en pause (tier gratuit, ~7 jours d'inactivité) ? Va sur supabase.com → ton projet → « Resume project », attends 1-5 min, puis réessaie.
            </div>
            <button onClick={()=>{setLoading(true);fetchAll();}}
              style={{marginTop:8,background:S.accent,border:"none",color:"#fff",borderRadius:8,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"Syne,sans-serif",fontWeight:700}}>
              Réessayer
            </button>
          </div>
        )}

        {/* DASHBOARD */}
        {tab==="dashboard"&&(
          <div>
            {subjects.length>0&&(()=>{
              const ranking = buildLossRanking(subjects);
              return (
                <div style={{background:S.surface,borderRadius:14,padding:14,marginBottom:16,border:`1px solid ${S.border}`}}>
                  <div style={{fontSize:10,color:S.muted,letterSpacing:3,marginBottom:10,fontFamily:"Syne,sans-serif"}}>OÙ TU PERDS LE PLUS DE POINTS</div>
                  {ranking.length===0?(
                    <div style={{fontSize:12,color:S.muted,fontStyle:"italic"}}>
                      Aucune matière sous son objectif — soit t'es au-dessus partout 🎉, soit aucun objectif n'est encore fixé (onglet Plan).
                    </div>
                  ):(
                    ranking.slice(0,5).map((r,i)=>(
                      <div key={r.id} onClick={()=>{setSelectedId(r.id);setTab("subjects");}}
                        style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:i===0?"none":`1px solid ${S.border}`,cursor:"pointer"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                          <span style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:13,color:S.muted,width:16,flexShrink:0}}>#{i+1}</span>
                          <div style={{minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:600,fontFamily:"Syne,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
                            <div style={{fontSize:10,color:S.muted}}>{r.avg.toFixed(2)}/20 · objectif {r.obj} · coef {r.coef}</div>
                          </div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
                          <div style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:15,color:"#F87171"}}>-{r.weighted.toFixed(1)}</div>
                          <div style={{fontSize:9,color:S.muted}}>pts pondérés</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })()}

            {subjects.length>0&&(()=>{
              const rows = subjects
                .map(s=>{ const r=subjectClassGap(s.grades); return r?{id:s.id,name:s.name,...r}:null; })
                .filter(Boolean)
                .sort((a,b)=>b.gap-a.gap);
              const total = subjects.reduce((n,s)=>n+(s.grades||[]).length,0);
              const filled = rows.reduce((n,r)=>n+r.n,0);
              const gg = globalClassGap(subjects);
              const maxAbs = Math.max(3,...rows.map(r=>Math.abs(r.gap)));
              return (
                <div style={{background:S.surface,borderRadius:14,padding:14,marginBottom:16,border:`1px solid ${S.border}`}}>
                  <div style={{fontSize:10,color:S.muted,letterSpacing:3,marginBottom:10,fontFamily:"Syne,sans-serif"}}>TON ÉCART À LA CLASSE</div>
                  {rows.length===0?(
                    <div style={{fontSize:12,color:S.muted,fontStyle:"italic",lineHeight:1.6}}>
                      Renseigne la moyenne de classe sur tes notes (onglet Matières → fiche d'une matière → « Moy. classe ») pour voir ta position réelle. Un 14 dans une classe à 8, ce n'est pas un 14 dans une classe à 13 ! 😉
                    </div>
                  ):(
                    <>
                      <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:4}}>
                        <span style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:30,color:gapColor(gg)}}>{fmtGap(gg)}</span>
                        <span style={{fontSize:12,color:S.muted}}>pts vs la moyenne de classe</span>
                      </div>
                      <div style={{fontSize:10,color:S.muted,marginBottom:6}}>
                        Pondéré par les coefs · basé sur {filled} note{filled!==1?"s":""} sur {total}
                      </div>
                      {rows.map((r,i)=>{
                        const half = Math.min(50, Math.abs(r.gap)/maxAbs*50);
                        return (
                          <div key={r.id} onClick={()=>{setSelectedId(r.id);setTab("subjects");}}
                            style={{padding:"8px 0",borderTop:`1px solid ${S.border}`,cursor:"pointer"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5,gap:8}}>
                              <span style={{fontSize:12,fontWeight:600,fontFamily:"Syne,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</span>
                              <span style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:14,color:gapColor(r.gap),flexShrink:0}}>{fmtGap(r.gap)}</span>
                            </div>
                            <div style={{position:"relative",height:6,background:S.surface2,borderRadius:3}}>
                              <div style={{position:"absolute",left:"50%",top:-2,bottom:-2,width:1,background:S.muted,opacity:0.5}} />
                              <div style={{position:"absolute",top:0,height:"100%",borderRadius:3,background:gapColor(r.gap),
                                width:`${half}%`,left:r.gap>=0?"50%":`${50-half}%`,transition:"all 0.5s"}} />
                            </div>
                            <div style={{fontSize:9,color:S.muted,marginTop:4}}>
                              {r.above}/{r.n} note{r.n!==1?"s":""} au-dessus de la classe{r.gapTop!=null?` · ${fmtGap(r.gapTop)} vs la meilleure note`:""}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })()}

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
                    <span>
                      {(s.grades||[]).length} note{(s.grades||[]).length!==1?"s":""}
                      {(()=>{ const sg=subjectClassGap(s.grades); return sg?<span style={{color:gapColor(sg.gap),marginLeft:8}}>{fmtGap(sg.gap)} vs classe</span>:null; })()}
                    </span>
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
                {(selected.grades||[]).map((g,i)=>{
                  const isEditing = editing && editing.subId===selected.id && editing.idx===i;
                  if (isEditing) {
                    return (
                      <div key={i} style={{background:S.surface2,borderRadius:8,padding:"10px 12px",marginBottom:6,border:`1px solid ${selected.color}60`}}>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                          <input type="number" placeholder="Note /20" min="0" max="20" step="0.5"
                            value={editDraft.v} onChange={e=>setEditDraft(d=>({...d,v:e.target.value}))}
                            style={{...inp(),flex:"1 1 70px"}} />
                          <input type="number" placeholder="Coef" min="0.25" step="0.25"
                            value={editDraft.w} onChange={e=>setEditDraft(d=>({...d,w:e.target.value}))}
                            style={{...inp(),flex:"1 1 60px"}} />
                          <input type="date" value={editDraft.date}
                            onChange={e=>setEditDraft(d=>({...d,date:e.target.value}))}
                            style={{...inp(),flex:"1 1 130px"}} />
                        </div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                          <input placeholder="Libellé" value={editDraft.label}
                            onChange={e=>setEditDraft(d=>({...d,label:e.target.value}))}
                            style={{...inp(),flex:"2 1 120px"}} />
                          <input type="number" placeholder="Moy. classe" min="0" max="20" step="0.1"
                            value={editDraft.classAvg} onChange={e=>setEditDraft(d=>({...d,classAvg:e.target.value}))}
                            style={{...inp(),flex:"1 1 100px"}} />
                          <input type="number" placeholder="Meilleure note" min="0" max="20" step="0.1"
                            value={editDraft.maxGrade} onChange={e=>setEditDraft(d=>({...d,maxGrade:e.target.value}))}
                            style={{...inp(),flex:"1 1 100px"}} />
                        </div>
                        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                          <button onClick={cancelEditGrade}
                            style={{background:"none",border:`1px solid ${S.border}`,color:S.muted,borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>Annuler</button>
                          <button onClick={saveEditGrade}
                            style={{background:selected.color,border:"none",color:"#fff",borderRadius:8,padding:"6px 14px",fontSize:12,cursor:"pointer",fontWeight:700,fontFamily:"Syne,sans-serif"}}>Enregistrer</button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={i} style={{background:S.surface2,borderRadius:8,padding:"8px 12px",marginBottom:6}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <span style={{fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:14}}>{g.v}/20</span>
                          <span style={{fontSize:11,color:S.muted,marginLeft:8}}>coef {g.w}{g.label?` · ${g.label}`:""}</span>
                          {g.date&&<span style={{fontSize:10,color:S.muted,marginLeft:8}}>· {g.date}</span>}
                        </div>
                        <div style={{display:"flex",gap:12,flexShrink:0,alignItems:"center"}}>
                          <button onClick={()=>startEditGrade(selected.id,i,g)}
                            style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:13}}>✏️</button>
                          <button onClick={()=>deleteGrade(i)}
                            style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:14}}>×</button>
                        </div>
                      </div>
                      {(g.classAvg!=null||g.maxGrade!=null)&&(
                        <div style={{display:"flex",gap:12,marginTop:4,fontSize:10,color:S.muted}}>
                          {g.classAvg!=null&&<span>📊 Classe {g.classAvg}/20</span>}
                          {g.maxGrade!=null&&<span>🏆 Meilleure {g.maxGrade}/20</span>}
                        </div>
                      )}
                    </div>
                  );
                })}

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
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
                  <input type="number" placeholder="Moy. classe (optionnel)" min="0" max="20" step="0.1"
                    value={newGrade.classAvg} onChange={e=>setNewGrade(g=>({...g,classAvg:e.target.value}))}
                    style={{...inp(),flex:"1 1 140px"}} />
                  <input type="number" placeholder="Meilleure note (optionnel)" min="0" max="20" step="0.1"
                    value={newGrade.maxGrade} onChange={e=>setNewGrade(g=>({...g,maxGrade:e.target.value}))}
                    style={{...inp(),flex:"1 1 140px"}} />
                </div>

                {selected.grades&&selected.grades.length>0&&(
                  <div style={{marginTop:16}}>
                    <div style={{fontSize:10,color:S.muted,letterSpacing:3,marginBottom:8,fontFamily:"Syne,sans-serif"}}>COMPARAISON AVEC LA CLASSE</div>
                    {(()=>{
                      const sg = subjectClassGap(selected.grades);
                      if (!sg) return null;
                      const chip = {background:S.surface2,borderRadius:8,padding:"6px 10px",fontSize:11,color:S.muted};
                      return (
                        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                          <span style={chip}>📊 Écart moyen : <b style={{color:gapColor(sg.gap),fontFamily:"Syne,sans-serif"}}>{fmtGap(sg.gap)} pts</b></span>
                          <span style={chip}>✅ Au-dessus de la classe : <b style={{color:S.text,fontFamily:"Syne,sans-serif"}}>{sg.above}/{sg.n}</b></span>
                          {sg.gapTop!=null&&<span style={chip}>🏆 vs meilleure note : <b style={{color:S.text,fontFamily:"Syne,sans-serif"}}>{fmtGap(sg.gapTop)} pts</b></span>}
                        </div>
                      );
                    })()}
                    {selected.grades.some(g=>g.classAvg!=null||g.maxGrade!=null)?(
                      <div style={{background:S.surface2,borderRadius:12,padding:12}}>
                        <div style={{display:"flex",gap:14,marginBottom:8,fontSize:10,color:S.muted,flexWrap:"wrap"}}>
                          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:4,background:selected.color,display:"inline-block"}}/>Moi</span>
                          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:4,background:"#FBBF24",display:"inline-block"}}/>Moyenne classe</span>
                          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:4,background:"#34D399",display:"inline-block"}}/>Meilleure note</span>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={buildSubjectCompareData(selected.grades)} margin={{top:5,right:10,left:-20,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
                            <XAxis dataKey="label" tick={{fill:S.muted,fontSize:9}} />
                            <YAxis domain={[0,20]} tick={{fill:S.muted,fontSize:10}} />
                            <Tooltip contentStyle={{background:S.bg,border:`1px solid ${S.border}`,borderRadius:8,fontSize:12}} labelStyle={{color:S.text}} />
                            <Line type="monotone" dataKey="moi" name="Moi" stroke={selected.color} strokeWidth={2.5} dot={{r:3}} connectNulls />
                            <Line type="monotone" dataKey="classe" name="Moyenne classe" stroke="#FBBF24" strokeWidth={2} dot={{r:3}} connectNulls />
                            <Line type="monotone" dataKey="meilleure" name="Meilleure note" stroke="#34D399" strokeWidth={2} dot={{r:3}} connectNulls />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ):(
                      <div style={{fontSize:11,color:S.muted,fontStyle:"italic"}}>Renseigne la moyenne de classe et/ou la meilleure note sur au moins une évaluation pour voir le graphique de comparaison.</div>
                    )}
                  </div>
                )}
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

        {/* BADGES */}
        {tab==="badges"&&(()=>{
          const { badges, xp, levelIdx, unlockedTiers, totalTiers, trends } = badgeData;
          const lv = LEVELS[levelIdx];
          const nextLv = LEVELS[levelIdx+1];
          const star = trends.length>0 && trends[0].delta>0 ? trends[0] : null;
          const others = trends.slice(star?1:0);
          const label = {fontSize:10,color:S.muted,letterSpacing:3,marginBottom:10,fontFamily:"Syne,sans-serif"};
          return (
            <div>
              {/* Niveau + XP */}
              <div style={{background:"linear-gradient(135deg,#1E1A4A 0%,#13131A 100%)",border:`1px solid ${S.accent}50`,borderRadius:16,padding:18,marginBottom:16,textAlign:"center"}}>
                <div style={{fontSize:46,lineHeight:1,marginBottom:8}}>{lv.emoji}</div>
                <div style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:18}}>{lv.title}</div>
                <div style={{fontSize:11,color:S.muted,marginTop:4}}>{xp} XP · {unlockedTiers}/{totalTiers} paliers débloqués</div>
                {nextLv?(
                  <div style={{margin:"12px auto 0",maxWidth:300}}>
                    <div style={{background:S.surface2,borderRadius:4,height:6,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:4,width:`${Math.min(100,((xp-lv.xp)/(nextLv.xp-lv.xp))*100)}%`,
                        background:`linear-gradient(90deg,${S.accent},#F472B6)`,transition:"width 0.7s"}} />
                    </div>
                    <div style={{fontSize:10,color:S.muted,marginTop:5}}>Prochain niveau : {nextLv.emoji} {nextLv.title} — encore {nextLv.xp-xp} XP</div>
                  </div>
                ):(
                  <div style={{fontSize:11,color:"#FBBF24",marginTop:10}}>Niveau max atteint, respect ! 👑</div>
                )}
              </div>

              {/* Badge du moment : meilleure progression */}
              <div style={label}>BADGE DU MOMENT</div>
              <div style={{background:S.surface,borderRadius:14,padding:14,marginBottom:16,border:`1px solid ${star?star.color+"50":S.border}`}}>
                {star?(
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{fontSize:34}}>📈</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:9,color:S.muted,letterSpacing:2,fontFamily:"Syne,sans-serif"}}>MEILLEURE PROGRESSION</div>
                      <div style={{fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:15,color:star.color,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{star.name}</div>
                      <div style={{fontSize:10,color:S.muted,lineHeight:1.5}}>
                        {star.before.toFixed(1)} → {star.recent.toFixed(1)} · moyenne des {star.k} dernières notes vs les {star.k} d'avant
                      </div>
                    </div>
                    <div style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:22,color:"#34D399",flexShrink:0}}>{fmtGap(star.delta)}</div>
                  </div>
                ):(
                  <div style={{fontSize:12,color:S.muted,fontStyle:"italic",lineHeight:1.6}}>
                    Pas encore de progression à fêter : il faut au moins 4 notes dans une matière, et que la courbe monte. 😏
                  </div>
                )}
                {others.length>0&&(
                  <div style={{marginTop:star?12:10,paddingTop:8,borderTop:`1px solid ${S.border}`}}>
                    {others.map(t=>(
                      <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",fontSize:11}}>
                        <span style={{color:S.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</span>
                        <span style={{fontFamily:"Syne,sans-serif",fontWeight:700,flexShrink:0,marginLeft:8,
                          color:t.delta>0.05?"#34D399":t.delta<-0.05?"#F87171":S.muted}}>
                          {t.delta>0.05?"▲":t.delta<-0.05?"▼":"▬"} {fmtGap(t.delta)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Grille de badges */}
              <div style={label}>TES BADGES</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
                {badges.map((b,i)=>{
                  const isNew = isNewBadge(b);
                  const col = b.level>0 ? b.colors[b.level-1] : S.border;
                  return (
                    <div key={b.id} style={{
                      position:"relative",background:S.surface,borderRadius:14,padding:12,
                      border:`1px solid ${b.level>0?col+"80":S.border}`,
                      animation:`badgePop 0.45s ease ${i*0.04}s both${isNew?", badgeGlow 1.8s ease-in-out infinite":""}`,
                      "--gc":col+"90"
                    }}>
                      {isNew&&(
                        <div style={{position:"absolute",top:-7,right:8,background:"#F472B6",color:"#fff",fontSize:8,fontFamily:"Syne,sans-serif",
                          fontWeight:800,letterSpacing:1,padding:"2px 6px",borderRadius:6}}>NOUVEAU ✨</div>
                      )}
                      <div style={{fontSize:32,lineHeight:1,filter:b.level>0?"none":"grayscale(1)",opacity:b.level>0?1:0.4}}>{b.emoji}</div>
                      <div style={{fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:12,marginTop:6}}>{b.name}</div>
                      <div style={{display:"flex",gap:4,margin:"6px 0"}}>
                        {b.tiers.map((t,j)=>(
                          <span key={j} style={{width:8,height:8,borderRadius:4,
                            background:j<b.level?b.colors[j]:S.surface2,border:`1px solid ${j<b.level?b.colors[j]:S.border}`}} />
                        ))}
                      </div>
                      {b.tiers.length>1&&(
                        <div style={{fontSize:9,color:S.muted,marginBottom:6}}>Paliers : {b.tiers.map(t=>b.fmt(t)).join(" · ")}</div>
                      )}
                      {b.level>0&&<div style={{fontSize:10,color:col,fontStyle:"italic",marginBottom:4}}>{b.flavor}</div>}
                      {b.next!==null?(
                        <>
                          <div style={{fontSize:10,color:S.muted,lineHeight:1.4,marginBottom:6}}>{b.goal(b.next)}</div>
                          <div style={{background:S.surface2,borderRadius:3,height:4,overflow:"hidden"}}>
                            <div style={{height:"100%",borderRadius:3,width:`${b.progress*100}%`,background:b.colors[b.level],transition:"width 0.6s"}} />
                          </div>
                          <div style={{fontSize:9,color:S.muted,marginTop:3,textAlign:"right"}}>{b.fmt(b.value)} / {b.fmt(b.next)}</div>
                        </>
                      ):(
                        <>
                          <div style={{fontSize:10,color:S.muted,lineHeight:1.4,marginBottom:6}}>✅ {b.goal(b.tiers[b.tiers.length-1])}</div>
                          <div style={{fontSize:10,color:"#FBBF24",fontFamily:"Syne,sans-serif",fontWeight:700}}>Palier max ✨ · actuel : {b.fmt(b.value)}</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

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
