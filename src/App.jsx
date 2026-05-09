import { useState, useEffect, useRef } from "react";

const S = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
function generateId() { return Math.random().toString(36).substr(2, 9); }
const PLANS_KEY   = "wt_plans";
const HISTORY_KEY = "wt_history";
const WEIGHT_KEY  = "wt_bodyweight";
const defaultPlans = { A: { name:"A", exercises:[] }, B: { name:"B", exercises:[] }, C: { name:"C", exercises:[] } };
const fmt2 = (n) => String(n).padStart(2,"0");
const fmtTime = (s) => `${fmt2(Math.floor(s/60))}:${fmt2(s%60)}`;
function todayStr() { const d=new Date(); return `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`; }
function dateLabel(iso) { try { return new Date(iso).toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"long",year:"numeric"}); } catch { return iso; } }

/* ─── Set Row ─────────────────────────────────────────────── */
function SetRow({ set, onUpdate, onDelete, setNum }) {
  return (
    <div className="set-row" dir="rtl">
      <span className="set-num">{setNum}</span>
      <input className="set-input" type="number" placeholder="קג" value={set.weight||""} onChange={e=>onUpdate({...set,weight:e.target.value})} />
      <span className="unit-label">ק"ג</span>
      <input className="set-input" type="number" placeholder="חז'" value={set.reps||""} onChange={e=>onUpdate({...set,reps:e.target.value})} />
      <span className="unit-label">חז׳</span>
      <button className="badge-btn">RPE</button>
      <button className="badge-btn">RIR</button>
      <button className="icon-btn" onClick={onDelete}>✕</button>
    </div>
  );
}

/* ─── Exercise Card ───────────────────────────────────────── */
function ExerciseCard({ exercise, onUpdate, onDelete }) {
  const addSet = () => onUpdate({...exercise, sets:[...exercise.sets,{id:generateId(),weight:"",reps:exercise.defaultReps||""}]});
  const updateSet = (i,u) => { const s=[...exercise.sets]; s[i]=u; onUpdate({...exercise,sets:s}); };
  const deleteSet = (i) => onUpdate({...exercise, sets:exercise.sets.filter((_,j)=>j!==i)});
  const upd = (f,v) => onUpdate({...exercise,[f]:v});
  return (
    <div className="exercise-card" dir="rtl">
      <div className="exercise-header">
        <div className="exercise-title-row">
          <div className="play-circle">▶</div>
          <div className="exercise-info">
            <input className="exercise-name-input" value={exercise.name} onChange={e=>upd("name",e.target.value)} placeholder="שם התרגיל" />
            <div className="exercise-meta">
              <input className="meta-input" type="number" value={exercise.defaultReps||""} onChange={e=>upd("defaultReps",e.target.value)} placeholder="מינ׳" style={{width:42}} />
              <span className="meta-sep">–</span>
              <input className="meta-input" type="number" value={exercise.maxReps||""} onChange={e=>upd("maxReps",e.target.value)} placeholder="מקס׳" style={{width:42}} />
              <span className="meta-text">חז׳, {exercise.sets.length} סטים</span>
            </div>
          </div>
          <button className="icon-btn" style={{color:"#e74c3c"}} onClick={onDelete}>🗑</button>
        </div>
        <input className="exercise-note-input" value={exercise.note||""} onChange={e=>upd("note",e.target.value)} placeholder="הערה לתרגיל..." />
      </div>
      <div className="sets-container">
        {exercise.sets.map((set,i) => <SetRow key={set.id} set={set} setNum={i+1} onUpdate={u=>updateSet(i,u)} onDelete={()=>deleteSet(i)} />)}
      </div>
      <button className="add-set-btn" onClick={addSet}>+ הוסף סט</button>
    </div>
  );
}

/* ─── Add Exercise Modal ──────────────────────────────────── */
function AddExerciseModal({ onAdd, onClose }) {
  const [name,setName]=useState(""); const [dr,setDr]=useState("10"); const [mr,setMr]=useState(""); const [ns,setNs]=useState(3);
  const handle = () => {
    if(!name.trim()) return;
    onAdd({id:generateId(),name:name.trim(),defaultReps:dr,maxReps:mr,note:"",
      sets:Array.from({length:parseInt(ns)||3},()=>({id:generateId(),weight:"",reps:dr}))});
    onClose();
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" dir="rtl" onClick={e=>e.stopPropagation()}>
        <h2 className="modal-title">הוסף תרגיל</h2>
        <label className="modal-label">שם התרגיל</label>
        <input className="modal-input" value={name} onChange={e=>setName(e.target.value)} placeholder="לדוגמה: לחיצת חזה" autoFocus onKeyDown={e=>e.key==="Enter"&&handle()} />
        <div className="modal-row">
          <div><label className="modal-label">חזרות מינ׳</label><input className="modal-input" type="number" value={dr} onChange={e=>setDr(e.target.value)} /></div>
          <div><label className="modal-label">חזרות מקס׳</label><input className="modal-input" type="number" value={mr} onChange={e=>setMr(e.target.value)} placeholder="אופציונלי" /></div>
          <div><label className="modal-label">סטים</label><input className="modal-input" type="number" value={ns} onChange={e=>setNs(e.target.value)} min={1} max={10} /></div>
        </div>
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>ביטול</button>
          <button className="modal-confirm" onClick={handle}>הוסף</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WORKOUT SCREEN
══════════════════════════════════════════════════════════ */
function WorkoutScreen({ plans, setPlans, onFinishWorkout }) {
  const [activeTab,setActiveTab]=useState(Object.keys(plans)[0]||"A");
  const [showAddEx,setShowAddEx]=useState(false);
  const [showAddPlan,setShowAddPlan]=useState(false);
  const [newPlan,setNewPlan]=useState("");
  const [active,setActive]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const startRef=useRef(null);
  useEffect(()=>{ let t; if(active) t=setInterval(()=>setElapsed(e=>e+1),1000); return ()=>clearInterval(t); },[active]);

  const cur = plans[activeTab]||{name:activeTab,exercises:[]};
  const updateEx=(i,u)=>{ const exs=[...cur.exercises]; exs[i]=u; setPlans({...plans,[activeTab]:{...cur,exercises:exs}}); };
  const deleteEx=(i)=>setPlans({...plans,[activeTab]:{...cur,exercises:cur.exercises.filter((_,j)=>j!==i)}});
  const addEx=(ex)=>setPlans({...plans,[activeTab]:{...cur,exercises:[...cur.exercises,ex]}});
  const addPlan=()=>{ const k=newPlan.trim().toUpperCase(); if(!k||plans[k]) return; setPlans({...plans,[k]:{name:k,exercises:[]}}); setActiveTab(k); setNewPlan(""); setShowAddPlan(false); };
  const delPlan=(k)=>{ if(Object.keys(plans).length<=1) return; const np={...plans}; delete np[k]; setPlans(np); setActiveTab(Object.keys(np)[0]); };

  const toggleTraining=()=>{
    if(!active){ startRef.current=new Date(); setActive(true); setElapsed(0); }
    else{
      setActive(false);
      onFinishWorkout({planKey:activeTab,plan:plans[activeTab],duration:elapsed,date:todayStr(),startedAt:startRef.current?.toISOString()});
      setElapsed(0);
    }
  };

  return (
    <div className="screen">
      <div className="header">
        <div className="header-top">
          <div className="logo"><span style={{fontSize:26}}>🏋️</span><div><div className="logo-text">WORKOUT</div><div className="logo-sub">FITNESS TRACKER</div></div></div>
        </div>
        <div className="tabs">
          {Object.keys(plans).map(k=>(
            <button key={k} className={`tab ${activeTab===k?"active":""}`} onClick={()=>setActiveTab(k)}>
              {k}
              {activeTab===k&&Object.keys(plans).length>1&&<span className="tab-del" onClick={e=>{e.stopPropagation();delPlan(k);}}>✕</span>}
            </button>
          ))}
          <button className="tab-add" onClick={()=>setShowAddPlan(true)}>+</button>
        </div>
      </div>
      <div className="start-bar">
        <button className={`start-btn ${active?"active-training":""}`} onClick={toggleTraining}>
          {active?`⏹ סיום אימון — ${fmtTime(elapsed)}`:"▶ התחלת אימון"}
        </button>
      </div>
      <div className="content">
        {cur.exercises.length===0
          ? <div className="empty-state"><span style={{fontSize:48}}>💪</span><div className="es-title">תוכנית {activeTab} ריקה</div><div className="es-sub">לחץ + כדי להוסיף תרגיל</div></div>
          : cur.exercises.map((ex,i)=><ExerciseCard key={ex.id} exercise={ex} onUpdate={u=>updateEx(i,u)} onDelete={()=>deleteEx(i)} />)
        }
      </div>
      <button className="fab" onClick={()=>setShowAddEx(true)}>+ הוסף תרגיל לתוכנית {activeTab}</button>
      {showAddEx&&<AddExerciseModal onAdd={addEx} onClose={()=>setShowAddEx(false)} />}
      {showAddPlan&&(
        <div className="modal-overlay" onClick={()=>setShowAddPlan(false)}>
          <div className="modal" dir="rtl" onClick={e=>e.stopPropagation()}>
            <h2 className="modal-title">הוסף תוכנית</h2>
            <label className="modal-label">שם (A–Z, עד 6 תווים)</label>
            <input className="modal-input" value={newPlan} onChange={e=>setNewPlan(e.target.value.toUpperCase())} placeholder="D / חזה / רגליים" maxLength={6} autoFocus onKeyDown={e=>e.key==="Enter"&&addPlan()} />
            <div className="modal-actions"><button className="modal-cancel" onClick={()=>setShowAddPlan(false)}>ביטול</button><button className="modal-confirm" onClick={addPlan}>הוסף</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HISTORY SCREEN
══════════════════════════════════════════════════════════ */
function AddHistoryModal({ plans, onAdd, onClose }) {
  const [date,setDate]=useState(todayStr());
  const [pk,setPk]=useState(Object.keys(plans)[0]||"A");
  const [dur,setDur]=useState("");
  const [note,setNote]=useState("");
  const handle=()=>{ onAdd({id:generateId(),date,planKey:pk,plan:plans[pk]||{name:pk,exercises:[]},duration:parseInt(dur)||0,note,manual:true}); onClose(); };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" dir="rtl" onClick={e=>e.stopPropagation()}>
        <h2 className="modal-title">הוסף אימון ידנית</h2>
        <label className="modal-label">תאריך</label>
        <input className="modal-input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
        <label className="modal-label">תוכנית אימון</label>
        <select className="modal-input" value={pk} onChange={e=>setPk(e.target.value)}>
          {Object.keys(plans).map(k=><option key={k} value={k}>תוכנית {k}</option>)}
        </select>
        <label className="modal-label">משך (דקות)</label>
        <input className="modal-input" type="number" value={dur} onChange={e=>setDur(e.target.value)} placeholder="לדוגמה: 60" />
        <label className="modal-label">הערה</label>
        <input className="modal-input" value={note} onChange={e=>setNote(e.target.value)} placeholder="איך הלך האימון..." />
        <div className="modal-actions"><button className="modal-cancel" onClick={onClose}>ביטול</button><button className="modal-confirm" onClick={handle}>שמור</button></div>
      </div>
    </div>
  );
}

const PLAN_COLORS = { A:"#E8711A", B:"#3498db", C:"#2ecc71", D:"#9b59b6", E:"#e74c3c" };
const getColor = (k) => PLAN_COLORS[k]||"#E8711A";

function HistoryScreen({ history, plans, onDelete, onAdd }) {
  const [showAdd,setShowAdd]=useState(false);
  const [expanded,setExpanded]=useState(null);
  const sorted=[...history].sort((a,b)=>b.date.localeCompare(a.date));

  // Stats
  const thisMonth=history.filter(h=>h.date.startsWith(todayStr().slice(0,7))).length;
  const totalMins=Math.round(history.reduce((a,h)=>a+(h.duration||0),0)/60);

  return (
    <div className="screen">
      <div className="page-header" dir="rtl">
        <h1 className="page-title">היסטוריה</h1>
        <span className="page-count">{history.length} אימונים</span>
      </div>

      {history.length>0&&(
        <div className="stats-row" dir="rtl">
          <div className="stat-chip"><div className="stat-val">{thisMonth}</div><div className="stat-lbl">החודש</div></div>
          <div className="stat-chip"><div className="stat-val">{totalMins}</div><div className="stat-lbl">דקות סה"כ</div></div>
          <div className="stat-chip"><div className="stat-val">{Math.round(history.length/Math.max(1,(new Date()-new Date(sorted[sorted.length-1]?.date||todayStr()))/(1000*60*60*24*7)))}</div><div className="stat-lbl">אימונים/שבוע</div></div>
        </div>
      )}

      <div className="content">
        {sorted.length===0
          ? <div className="empty-state"><span style={{fontSize:48}}>📋</span><div className="es-title">אין אימונים עדיין</div><div className="es-sub">סיים אימון או הוסף ידנית</div></div>
          : sorted.map(entry=>{
            const isOpen=expanded===entry.id;
            const color=getColor(entry.planKey);
            const mins=Math.round((entry.duration||0)/60);
            const totalSets=(entry.plan?.exercises||[]).reduce((a,ex)=>a+ex.sets.length,0);
            return (
              <div key={entry.id} className="history-card" style={{borderColor:isOpen?color+"88":"#2a2a2a"}}>
                <div className="history-card-top" dir="rtl" onClick={()=>setExpanded(isOpen?null:entry.id)}>
                  <div className="plan-badge" style={{background:color}}>{entry.planKey}</div>
                  <div className="history-info">
                    <div className="history-date">{dateLabel(entry.date)}</div>
                    <div className="history-meta">
                      {mins>0&&<span>⏱ {mins} דק׳</span>}
                      {totalSets>0&&<span>• {totalSets} סטים</span>}
                      {(entry.plan?.exercises||[]).length>0&&<span>• {(entry.plan?.exercises||[]).length} תרגילים</span>}
                      {entry.manual&&<span className="manual-tag">ידני</span>}
                    </div>
                    {entry.note&&<div className="history-note">"{entry.note}"</div>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:"#555",fontSize:16}}>{isOpen?"▲":"▼"}</span>
                    <button className="icon-btn" style={{color:"#e74c3c"}} onClick={e=>{e.stopPropagation();onDelete(entry.id);}}>🗑</button>
                  </div>
                </div>
                {isOpen&&(
                  <div className="history-detail" dir="rtl">
                    {(entry.plan?.exercises||[]).length===0
                      ? <p style={{color:"#555",fontSize:13}}>אין פרטי תרגילים שמורים</p>
                      : (entry.plan?.exercises||[]).map(ex=>(
                        <div key={ex.id} className="hist-exercise">
                          <div className="hist-ex-name">{ex.name}</div>
                          {ex.sets.map((set,i)=>(
                            <div key={set.id} className="hist-set-row">
                              <span className="hist-set-num">סט {i+1}</span>
                              {set.weight&&<span className="hist-set-val">{set.weight} ק"ג</span>}
                              {set.reps&&<span className="hist-set-val">× {set.reps} חז׳</span>}
                            </div>
                          ))}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            );
          })
        }
      </div>
      <button className="fab" onClick={()=>setShowAdd(true)}>+ הוסף אימון ידנית</button>
      {showAdd&&<AddHistoryModal plans={plans} onAdd={e=>{onAdd(e);setShowAdd(false);}} onClose={()=>setShowAdd(false)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WEIGHT / CALENDAR SCREEN
══════════════════════════════════════════════════════════ */
function WeightScreen({ weights, setWeights, history }) {
  const [vy,setVy]=useState(new Date().getFullYear());
  const [vm,setVm]=useState(new Date().getMonth());
  const [sel,setSel]=useState(todayStr());
  const [iw,setIw]=useState("");
  const [inote,setInote]=useState("");

  const MONTHS=["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  const DAYS=["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
  const firstDay=new Date(vy,vm,1).getDay();
  const daysInMonth=new Date(vy,vm+1,0).getDate();
  const cells=[];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);
  const dayKey=d=>`${vy}-${fmt2(vm+1)}-${fmt2(d)}`;
  const workoutDays=new Set(history.map(h=>h.date));
  const selData=weights[sel]||{};
  const prevM=()=>{ if(vm===0){setVy(y=>y-1);setVm(11);}else setVm(m=>m-1); };
  const nextM=()=>{ if(vm===11){setVy(y=>y+1);setVm(0);}else setVm(m=>m+1); };
  const saveWeight=()=>{
    if(!iw&&!inote) return;
    setWeights({...weights,[sel]:{weight:iw||selData.weight,note:inote||selData.note}});
    setIw(""); setInote("");
  };

  // Chart
  const entries=Object.entries(weights).filter(([,v])=>v.weight).sort(([a],[b])=>a.localeCompare(b)).slice(-30);
  const vals=entries.map(([,v])=>parseFloat(v.weight)||0);
  const maxW=vals.length?Math.max(...vals):100; const minW=vals.length?Math.min(...vals):50; const rng=maxW-minW||1;
  const W=Math.max(entries.length*32,300); const H=130;
  const px=(i)=>i*(W/Math.max(entries.length-1,1));
  const py=(v)=>H-10-((v-minW)/rng)*(H-20);

  return (
    <div className="screen">
      <div className="page-header" dir="rtl">
        <h1 className="page-title">מעקב משקל</h1>
        {selData.weight&&<span className="page-count">⚖️ {selData.weight} ק"ג</span>}
      </div>
      <div className="content">

        {/* Calendar nav */}
        <div className="cal-nav" dir="rtl">
          <button className="cal-arrow" onClick={nextM}>‹</button>
          <span className="cal-month-label">{MONTHS[vm]} {vy}</span>
          <button className="cal-arrow" onClick={prevM}>›</button>
        </div>

        <div className="cal-grid">
          {DAYS.map(d=><div key={d} className="cal-day-header">{d}</div>)}
          {cells.map((d,i)=>{
            if(!d) return <div key={`e${i}`}/>;
            const k=dayKey(d); const isToday=k===todayStr(); const isSel=k===sel;
            const hasW=!!weights[k]?.weight; const hasWO=workoutDays.has(k);
            return (
              <div key={k} className={`cal-day ${isToday?"today":""} ${isSel?"selected":""}`} onClick={()=>setSel(k)}>
                <span className="cal-day-num">{d}</span>
                <div className="cal-dots">
                  {hasWO&&<span className="dot dot-workout"/>}
                  {hasW&&<span className="dot dot-weight"/>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Day panel */}
        <div className="day-panel" dir="rtl">
          <div className="day-panel-title">{dateLabel(sel)}</div>
          <div className="day-panel-row">
            <div style={{flex:1}}>
              <label className="modal-label">משקל גוף (ק"ג)</label>
              <input className="modal-input" type="number" step="0.1" placeholder={selData.weight||"78.5"} value={iw} onChange={e=>setIw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveWeight()} />
            </div>
            <div style={{flex:2}}>
              <label className="modal-label">הערה</label>
              <input className="modal-input" placeholder={selData.note||"לדוגמה: אחרי ארוחת בוקר"} value={inote} onChange={e=>setInote(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveWeight()} />
            </div>
          </div>
          {(selData.weight||selData.note)&&(
            <div className="saved-day-data">
              {selData.weight&&<span className="saved-tag">⚖️ {selData.weight} ק"ג</span>}
              {selData.note&&<span className="saved-tag">📝 {selData.note}</span>}
              <button className="icon-btn" style={{color:"#e74c3c",marginRight:"auto"}} onClick={()=>{const w={...weights};delete w[sel];setWeights(w);}}>✕ מחק</button>
            </div>
          )}
          <button className="modal-confirm" style={{width:"100%",marginTop:10,padding:12}} onClick={saveWeight}>💾 שמור</button>
          {history.filter(h=>h.date===sel).map(h=>(
            <div key={h.id} className="hist-workout-chip">
              <div className="plan-badge" style={{background:getColor(h.planKey),width:30,height:30,fontSize:12}}>{h.planKey}</div>
              <span style={{color:"#aaa",fontSize:13}}>אימון {h.planKey} — {Math.round((h.duration||0)/60)} דקות</span>
            </div>
          ))}
        </div>

        {/* Weight graph */}
        {entries.length>1&&(
          <div className="weight-chart-wrap" dir="rtl">
            <div className="weight-chart-title">📈 גרף משקל ({entries.length} מדידות)</div>
            <div className="weight-chart">
              <svg width="100%" height={H+10} viewBox={`0 0 ${W} ${H+10}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E8711A" stopOpacity="0.35"/>
                    <stop offset="100%" stopColor="#E8711A" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <polygon fill="url(#wg)" points={[...entries.map(([,v],i)=>`${px(i)},${py(parseFloat(v.weight))}`),`${px(entries.length-1)},${H}`,`0,${H}`].join(" ")} />
                <polyline fill="none" stroke="#E8711A" strokeWidth="2.5" strokeLinejoin="round"
                  points={entries.map(([,v],i)=>`${px(i)},${py(parseFloat(v.weight))}`).join(" ")} />
                {entries.map(([,v],i)=>{
                  const x=px(i); const y=py(parseFloat(v.weight));
                  return <g key={i}><circle cx={x} cy={y} r="4" fill="#E8711A" stroke="#111" strokeWidth="2"/>
                    <text x={x} y={y-8} textAnchor="middle" fill="#aaa" fontSize="9">{v.weight}</text></g>;
                })}
              </svg>
            </div>
            <div className="chart-range-label"><span>מינ׳: {minW} ק"ג</span><span>מקס׳: {maxW} ק"ג</span></div>
          </div>
        )}

        {/* Weight log */}
        {entries.length>0&&(
          <div className="weight-log" dir="rtl">
            <div className="weight-chart-title">📋 יומן משקל</div>
            {[...entries].reverse().slice(0,15).map(([k,v])=>(
              <div key={k} className="weight-log-row">
                <span className="wl-date">{dateLabel(k)}</span>
                <span className="wl-weight">{v.weight} ק"ג</span>
                {v.note&&<span className="wl-note">{v.note}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════ */
export default function App() {
  const [plans,  setPlansRaw]  = useState(()=>S.get(PLANS_KEY,defaultPlans));
  const [history,setHistRaw]   = useState(()=>S.get(HISTORY_KEY,[]));
  const [weights,setWeightsRaw]= useState(()=>S.get(WEIGHT_KEY,{}));
  const [page,   setPage]      = useState("workout");

  const setPlans   = v => { setPlansRaw(v);   S.set(PLANS_KEY,v); };
  const setHistory = v => { setHistRaw(v);    S.set(HISTORY_KEY,v); };
  const setWeights = v => { setWeightsRaw(v); S.set(WEIGHT_KEY,v); };

  const finishWorkout = entry => setHistory([...history,{...entry,id:generateId()}]);
  const deleteHistory = id => setHistory(history.filter(h=>h.id!==id));
  const addHistory    = e  => setHistory([...history,e]);

  const nav=[
    {id:"workout",icon:"🏋️",label:"אימון"},
    {id:"history",icon:"📋",label:"היסטוריה"},
    {id:"weight", icon:"⚖️", label:"משקל"},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0f0f0f;font-family:'Heebo',sans-serif;color:#fff;}

        .app-shell{max-width:480px;margin:0 auto;min-height:100vh;background:#111;display:flex;flex-direction:column;position:relative;}
        .screen{flex:1;display:flex;flex-direction:column;overflow:hidden;}

        /* Header */
        .header{background:#181818;padding:14px 16px 0;border-bottom:1px solid #252525;}
        .header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
        .logo{display:flex;align-items:center;gap:8px;}
        .logo-text{font-size:19px;font-weight:900;color:#E8711A;letter-spacing:1px;}
        .logo-sub{font-size:10px;color:#666;font-weight:700;letter-spacing:2px;text-transform:uppercase;}

        /* Page header */
        .page-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#181818;border-bottom:1px solid #252525;}
        .page-title{font-size:20px;font-weight:900;}
        .page-count{font-size:13px;color:#E8711A;font-weight:700;background:#E8711A22;padding:4px 12px;border-radius:20px;}

        /* Stats row */
        .stats-row{display:flex;gap:8px;padding:10px 12px;background:#161616;border-bottom:1px solid #222;direction:rtl;}
        .stat-chip{flex:1;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:12px;padding:10px 8px;text-align:center;}
        .stat-val{font-size:20px;font-weight:900;color:#E8711A;}
        .stat-lbl{font-size:11px;color:#666;font-weight:600;margin-top:2px;}

        /* Tabs */
        .tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:10px;scrollbar-width:none;direction:rtl;}
        .tabs::-webkit-scrollbar{display:none;}
        .tab{flex-shrink:0;padding:7px 16px;border-radius:10px;border:2px solid #333;background:transparent;color:#aaa;font-family:'Heebo',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all .15s;}
        .tab.active{background:#E8711A;border-color:#E8711A;color:#fff;}
        .tab:hover:not(.active){border-color:#E8711A55;color:#E8711A;}
        .tab-add{flex-shrink:0;padding:7px 12px;border-radius:10px;border:2px dashed #444;background:transparent;color:#666;font-size:18px;cursor:pointer;transition:all .15s;}
        .tab-add:hover{border-color:#E8711A;color:#E8711A;}
        .tab-del{font-size:10px;color:#fff9;cursor:pointer;margin-right:4px;}

        /* Start bar */
        .start-bar{padding:10px 14px;background:#181818;border-bottom:1px solid #222;}
        .start-btn{width:100%;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#E8711A,#c9580f);color:#fff;font-family:'Heebo',sans-serif;font-size:18px;font-weight:800;cursor:pointer;box-shadow:0 4px 20px #E8711A33;transition:all .15s;letter-spacing:.5px;}
        .start-btn:hover{transform:scale(1.01);box-shadow:0 6px 28px #E8711A55;}
        .start-btn.active-training{background:linear-gradient(135deg,#2ecc71,#27ae60);box-shadow:0 4px 20px #2ecc7133;}

        /* Content */
        .content{flex:1;overflow-y:auto;padding:12px 12px 90px;display:flex;flex-direction:column;gap:12px;}

        /* Exercise card */
        .exercise-card{background:#1d1d1d;border:1.5px solid #2a2a2a;border-radius:16px;overflow:hidden;}
        .exercise-card:hover{border-color:#E8711A33;}
        .exercise-header{padding:12px 14px 8px;border-bottom:1px solid #252525;}
        .exercise-title-row{display:flex;align-items:flex-start;gap:10px;direction:rtl;}
        .play-circle{width:36px;height:36px;border-radius:50%;border:2px solid #E8711A;display:flex;align-items:center;justify-content:center;color:#E8711A;font-size:13px;flex-shrink:0;cursor:pointer;transition:all .15s;}
        .play-circle:hover{background:#E8711A;color:#fff;}
        .exercise-info{flex:1;}
        .exercise-name-input{background:transparent;border:none;border-bottom:1.5px solid #333;color:#fff;font-family:'Heebo',sans-serif;font-size:15px;font-weight:700;width:100%;padding:2px 0;direction:rtl;outline:none;transition:border-color .15s;}
        .exercise-name-input:focus{border-bottom-color:#E8711A;}
        .exercise-meta{display:flex;align-items:center;gap:4px;margin-top:4px;direction:rtl;flex-wrap:wrap;}
        .meta-input{background:#252525;border:1px solid #333;border-radius:6px;color:#bbb;font-family:'Heebo',sans-serif;font-size:12px;padding:2px 4px;text-align:center;outline:none;}
        .meta-sep,.meta-text{color:#666;font-size:12px;}
        .exercise-note-input{width:100%;background:transparent;border:none;border-bottom:1px dashed #2a2a2a;color:#777;font-family:'Heebo',sans-serif;font-size:12px;padding:6px 0 2px;direction:rtl;outline:none;margin-top:6px;}

        /* Sets */
        .set-row{display:flex;align-items:center;gap:6px;padding:7px 14px;border-bottom:1px solid #222;direction:rtl;}
        .set-row:hover{background:#222;}
        .set-num{width:18px;text-align:center;font-size:12px;font-weight:700;color:#777;flex-shrink:0;}
        .set-input{background:#252525;border:1.5px solid #333;border-radius:10px;color:#fff;font-family:'Heebo',sans-serif;font-size:14px;font-weight:600;padding:5px 6px;width:58px;text-align:center;outline:none;transition:border-color .15s;}
        .set-input:focus{border-color:#E8711A;}
        .unit-label{color:#555;font-size:11px;flex-shrink:0;}
        .badge-btn{padding:4px 8px;border-radius:8px;border:1.5px solid #333;background:transparent;color:#888;font-family:'Heebo',sans-serif;font-size:10px;font-weight:700;cursor:pointer;flex-shrink:0;transition:all .15s;}
        .badge-btn:hover{border-color:#E8711A;color:#E8711A;}
        .icon-btn{background:none;border:none;cursor:pointer;padding:4px;font-size:14px;transition:all .15s;flex-shrink:0;color:#777;}
        .icon-btn:hover{transform:scale(1.15);}
        .add-set-btn{width:100%;padding:10px;background:transparent;border:none;border-top:1px solid #222;color:#E8711A;font-family:'Heebo',sans-serif;font-size:14px;font-weight:700;cursor:pointer;direction:rtl;transition:background .15s;}
        .add-set-btn:hover{background:#E8711A11;}

        /* FAB */
        .fab{position:fixed;bottom:72px;left:50%;transform:translateX(-50%);width:calc(100% - 28px);max-width:452px;padding:13px;border-radius:14px;border:2px dashed #E8711A66;background:#1a1a1a;color:#E8711A;font-family:'Heebo',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all .2s;z-index:10;}
        .fab:hover{background:#E8711A18;border-color:#E8711A;}

        /* Empty state */
        .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:50px 20px;gap:10px;text-align:center;direction:rtl;}
        .es-title{font-size:17px;font-weight:700;color:#666;}
        .es-sub{font-size:13px;color:#444;}

        /* Modal */
        .modal-overlay{position:fixed;inset:0;background:#000000cc;display:flex;align-items:flex-end;justify-content:center;z-index:200;backdrop-filter:blur(4px);}
        .modal{background:#1a1a1a;border-radius:20px 20px 0 0;padding:24px 20px 36px;width:100%;max-width:480px;border:1.5px solid #2a2a2a;border-bottom:none;animation:slideUp .22s ease;}
        @keyframes slideUp{from{transform:translateY(50px);opacity:0;}to{transform:translateY(0);opacity:1;}}
        .modal-title{font-size:19px;font-weight:800;color:#fff;margin-bottom:18px;text-align:right;}
        .modal-label{display:block;font-size:12px;color:#999;font-weight:600;margin-bottom:5px;text-align:right;}
        .modal-input{width:100%;background:#252525;border:1.5px solid #333;border-radius:10px;color:#fff;font-family:'Heebo',sans-serif;font-size:14px;padding:10px 12px;margin-bottom:12px;direction:rtl;outline:none;transition:border-color .15s;-webkit-appearance:none;}
        .modal-input:focus{border-color:#E8711A;}
        select.modal-input{cursor:pointer;}
        .modal-row{display:flex;gap:10px;direction:rtl;}
        .modal-row>div{flex:1;}
        .modal-actions{display:flex;gap:10px;direction:rtl;margin-top:4px;}
        .modal-cancel{flex:1;padding:12px;border-radius:12px;border:2px solid #333;background:transparent;color:#aaa;font-family:'Heebo',sans-serif;font-size:15px;font-weight:700;cursor:pointer;}
        .modal-cancel:hover{border-color:#666;color:#fff;}
        .modal-confirm{flex:2;padding:12px;border-radius:12px;border:none;background:linear-gradient(135deg,#E8711A,#c9580f);color:#fff;font-family:'Heebo',sans-serif;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px #E8711A33;}
        .modal-confirm:hover{transform:scale(1.02);}

        /* History */
        .history-card{background:#1a1a1a;border:1.5px solid #2a2a2a;border-radius:14px;overflow:hidden;transition:border-color .2s;}
        .history-card-top{display:flex;align-items:flex-start;gap:10px;padding:14px;cursor:pointer;}
        .plan-badge{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:900;color:#fff;flex-shrink:0;}
        .history-info{flex:1;}
        .history-date{font-size:14px;font-weight:700;color:#ddd;}
        .history-meta{display:flex;gap:6px;font-size:12px;color:#777;margin-top:3px;flex-wrap:wrap;align-items:center;}
        .manual-tag{background:#9b59b622;color:#9b59b6;padding:1px 6px;border-radius:6px;font-size:11px;font-weight:700;}
        .history-note{font-size:12px;color:#888;margin-top:4px;font-style:italic;}
        .history-detail{padding:0 14px 14px;border-top:1px solid #252525;}
        .hist-exercise{margin-top:10px;}
        .hist-ex-name{font-size:13px;font-weight:700;color:#E8711A;margin-bottom:4px;}
        .hist-set-row{display:flex;gap:8px;font-size:12px;color:#888;padding:2px 0;}
        .hist-set-num{color:#666;}
        .hist-set-val{color:#bbb;font-weight:600;}

        /* Calendar */
        .cal-nav{display:flex;align-items:center;justify-content:space-between;padding:4px 4px 10px;}
        .cal-arrow{background:none;border:none;color:#E8711A;font-size:26px;cursor:pointer;padding:4px 10px;}
        .cal-month-label{font-size:17px;font-weight:800;}
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}
        .cal-day-header{text-align:center;font-size:11px;color:#555;font-weight:700;padding:4px 0;}
        .cal-day{min-height:46px;border-radius:10px;background:#1a1a1a;border:1.5px solid #252525;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;padding:4px 2px;}
        .cal-day:hover{border-color:#E8711A55;}
        .cal-day.today{border-color:#E8711A88;background:#E8711A11;}
        .cal-day.selected{border-color:#E8711A;background:#E8711A22;}
        .cal-day-num{font-size:13px;font-weight:700;color:#ccc;}
        .cal-day.today .cal-day-num{color:#E8711A;}
        .cal-day.selected .cal-day-num{color:#fff;}
        .cal-dots{display:flex;gap:3px;margin-top:3px;}
        .dot{width:5px;height:5px;border-radius:50%;}
        .dot-workout{background:#3498db;}
        .dot-weight{background:#2ecc71;}

        /* Day panel */
        .day-panel{background:#1a1a1a;border:1.5px solid #2a2a2a;border-radius:16px;padding:16px;direction:rtl;}
        .day-panel-title{font-size:14px;font-weight:700;color:#ddd;margin-bottom:12px;}
        .day-panel-row{display:flex;gap:10px;direction:rtl;}
        .saved-day-data{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;}
        .saved-tag{background:#252525;border:1px solid #333;border-radius:8px;padding:4px 10px;font-size:13px;color:#ccc;}
        .hist-workout-chip{display:flex;align-items:center;gap:8px;margin-top:10px;padding:8px 10px;background:#252525;border-radius:10px;}

        /* Weight chart */
        .weight-chart-wrap{background:#1a1a1a;border:1.5px solid #2a2a2a;border-radius:16px;padding:14px;direction:rtl;}
        .weight-chart-title{font-size:13px;font-weight:700;color:#aaa;margin-bottom:10px;}
        .weight-chart{overflow-x:auto;}
        .weight-chart svg{display:block;}
        .chart-range-label{display:flex;justify-content:space-between;font-size:11px;color:#555;margin-top:6px;}

        /* Weight log */
        .weight-log{background:#1a1a1a;border:1.5px solid #2a2a2a;border-radius:16px;padding:14px;direction:rtl;}
        .weight-log-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #222;flex-wrap:wrap;}
        .weight-log-row:last-child{border-bottom:none;}
        .wl-date{font-size:12px;color:#888;flex:2;}
        .wl-weight{font-size:14px;font-weight:700;color:#E8711A;flex-shrink:0;}
        .wl-note{font-size:11px;color:#666;flex:1;}

        /* Bottom nav */
        .bottom-nav{display:flex;background:#181818;border-top:1px solid #252525;position:sticky;bottom:0;z-index:50;}
        .nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 4px 12px;background:none;border:none;cursor:pointer;gap:3px;transition:all .15s;}
        .nav-icon{font-size:22px;}
        .nav-label{font-family:'Heebo',sans-serif;font-size:11px;font-weight:700;color:#555;transition:color .15s;}
        .nav-btn.active .nav-label{color:#E8711A;}
        .nav-btn.active .nav-icon{filter:drop-shadow(0 0 4px #E8711A88);}
      `}</style>

      <div className="app-shell">
        {page==="workout"&&<WorkoutScreen plans={plans} setPlans={setPlans} onFinishWorkout={finishWorkout}/>}
        {page==="history"&&<HistoryScreen history={history} plans={plans} onDelete={deleteHistory} onAdd={addHistory}/>}
        {page==="weight"&&<WeightScreen weights={weights} setWeights={setWeights} history={history}/>}

        <nav className="bottom-nav">
          {nav.map(n=>(
            <button key={n.id} className={`nav-btn ${page===n.id?"active":""}`} onClick={()=>setPage(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
