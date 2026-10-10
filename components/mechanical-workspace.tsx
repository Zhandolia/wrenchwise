'use client';
import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,RotateCcw,Wrench,ExternalLink,Search} from 'lucide-react';
import AssemblyViewer from './assembly-viewer';
import {appPath} from '@/lib/app-path';
import {versionS160Asset} from '@/lib/s160-assets';
import {serviceStudies} from '@/lib/s160-service';
import {timingLesson as lesson,timingSources,timingPartIds,timingSeparation,timingProgressKey} from '@/lib/timing-belt-lesson';
import {readWorkthroughProgress} from '@/lib/workthrough-progress.mjs';
import '@/app/mechanical.css';

type Part={id:string;name:string;system:string;status:string};
const storageKey=timingProgressKey;
const perspectives=[['timing','Front'],['engine-study','Three-quarter'],['mechanical-rear','Rear'],['mechanical-top','Top'],['mechanical-bottom','Underside']];
export default function MechanicalWorkspace(){
 const [progress,setProgress]=useState(()=>{try{return readWorkthroughProgress(localStorage.getItem(storageKey),lesson.steps)}catch{return readWorkthroughProgress(null,lesson.steps)}});
 const [mobilePane,setMobilePane]=useState('guide');
 const [notice,setNotice]=useState(''),[parts,setParts]=useState<Part[]>([]),[error,setError]=useState('');
 const [selected,setSelected]=useState<string|null>(null),[camera,setCamera]=useState('engine-study'),[reset,setReset]=useState(0),[isolated,setIsolated]=useState(false),[separated,setSeparated]=useState(false),[search,setSearch]=useState('');
 const index=lesson.steps.findIndex(s=>s.id===progress.step),step=lesson.steps[index],study=serviceStudies.find(s=>s.id===step.studyId)!;
 const timing=step.studyId==='timing-drive';
 const available=parts.filter(p=>p.status==='modeled'&&study.visible.includes(p.system)&&!study.hidden.includes(p.id)&&(!timing||timingPartIds.includes(p.id)||step.parts.some(s=>s.id===p.id)));
 const currentPart=parts.find(p=>p.id===selected),role=step.parts.find(p=>p.id===selected)?.role;
 const only=isolated&&selected?[selected]:timing?[...timingPartIds,...step.parts.map(p=>p.id)]:undefined;
 const focus=useMemo(()=>isolated&&selected?[selected]:timing?timingPartIds:study.focus,[isolated?selected:null,timing,study]);
 useEffect(()=>{const controller=new AbortController();fetch(appPath(versionS160Asset('/models/gs300-parts.json')),{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error('Component data could not load. Reload to retry; the written guide remains available.');const data=await r.json() as {parts:Part[]};setParts(data.parts)}).catch(e=>{if(e.name!=='AbortError')setError(e.message)});return()=>controller.abort()},[]);
 useEffect(()=>{setSelected(null);setIsolated(false);setSeparated(false);setCamera(timing?'timing':'engine-study');setSearch('');setReset(r=>r+1)},[step.id,timing]);
 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(progress))}catch{setNotice('This browser could not save your learning progress.')}},[progress]);
 const choose=(id:string)=>{setSelected(id);if(!timing&&timingPartIds.includes(id))setIsolated(true);if(isolated)setReset(r=>r+1)};
 const reviewed=progress.reviewed.includes(step.id);
 const move=(next:number)=>setProgress(p=>({...p,step:lesson.steps[next].id}));
 return <div className="mechanical-app">
  <header className="mechanical-header"><a className="mechanical-brand" href={appPath('/')}><Wrench size={22}/>Wrenchwise</a><nav aria-label="Workshop navigation"><a href={appPath('/')}>Guides & parts</a><a href={appPath('/assembly/?lesson=engine-bay-orientation')}>Engine layout</a><a href={appPath('/research/#s160-factory-references')}>References</a></nav></header>
  <main className="mechanical-main">
   <div className="mechanical-title"><div><h1>{lesson.title}</h1><p>{lesson.configuration}</p></div><span className="mechanical-tag">Procedure overview</span></div>
   <div className="mechanical-scope">Overview only. Use the factory manual for timing and torque specifications. <strong>3D geometry is approximate.</strong></div><div className="mechanical-mobile-nav"><label>Section<select aria-label="Jump to section" value={step.id} onChange={e=>{setProgress(p=>({...p,step:e.target.value}));setMobilePane('guide')}}>{lesson.steps.map((s,i)=><option key={s.id} value={s.id}>{i+1}. {s.title}</option>)}</select></label><div role="group" aria-label="Mobile workspace view"><button aria-pressed={mobilePane==='guide'} onClick={()=>setMobilePane('guide')}>Guide</button><button aria-pressed={mobilePane==='model'} onClick={()=>setMobilePane('model')}>3D</button></div></div>
   <div className="mechanical-layout" data-mobile-pane={mobilePane}>
    <aside className="mechanical-steps" aria-label="Walkthrough phases"><div className="mechanical-steps-heading"><span>Contents</span><small>{progress.reviewed.length} / {lesson.steps.length} reviewed</small></div>{lesson.steps.map((s,i)=><button key={s.id} aria-current={s.id===step.id?'step':undefined} onClick={()=>move(i)}><span>{progress.reviewed.includes(s.id)?<Check size={16}/>:String(i+1).padStart(2,'0')}</span><div>{s.title}</div></button>)}<button className="mechanical-restart" onClick={()=>setProgress(readWorkthroughProgress(null,lesson.steps))}>Reset progress</button></aside>
    <section className="mechanical-visual" aria-label="Mechanical inspection">
     <div className="mechanical-viewer-head"><span>{timing?'Timing drive':'Engine & accessories'}</span><small>Drag to rotate · Scroll to zoom</small></div>
     <div className="mechanical-stage" data-step={step.id} data-isolated={isolated} data-separated={separated} data-camera={camera}>
      {error?<p role="alert">{error}</p>:parts.length?<AssemblyViewer label="Interactive 2JZ-GE mechanical assembly" showGrid={false} neutralLighting visible={study.visible} hiddenParts={study.hidden.filter(id=>!step.parts.some(p=>p.id===id))} onlyParts={only} focusIds={focus} selected={selected} explode={0} cutaway={false} cameraView={camera} reset={reset} onSelect={choose} partOffsets={separated?timingSeparation:undefined}/>:<p role="status">Loading mechanical components…</p>}
      <button className="mechanical-reset" aria-label="Reset mechanical view" onClick={()=>{setCamera(timing?'timing':'engine-study');setReset(r=>r+1)}}><RotateCcw size={17}/></button>
      <span className="mechanical-axis">ENGINE FRONT = BELT END</span>
     </div>
     <div className="mechanical-camera" role="group" aria-label="Inspection angle">{perspectives.map(([id,label])=><button key={id} aria-pressed={camera===id} onClick={()=>{setCamera(id);setReset(r=>r+1)}}>{label}</button>)}</div>
     <div className="mechanical-display"><button disabled={!selected} aria-pressed={isolated} onClick={()=>{setIsolated(!isolated);setReset(r=>r+1)}}>{isolated?'Return to assembly':'Isolate selected part'}</button>{timing&&<button aria-pressed={separated} onClick={()=>{setSeparated(!separated);setReset(r=>r+1)}}>{separated?'Bring parts together':'Separate belt & tensioner'}</button>}</div>
     {separated&&<p className="mechanical-view-note">Parts are offset for inspection. This is not a removal path or operating position.</p>}
     <div className="mechanical-part"><div><span className="mechanical-kicker">{currentPart?'Selected part':'Parts'}</span><h2>{currentPart?.name||'Select a part'}</h2><p>{role||'Click the model or search below.'}</p></div></div>
     <details className="mechanical-components"><summary>Find a component in this view ({available.length})</summary><label><Search size={16}/><input aria-label="Search mechanical components" placeholder="Belt, pulley, tensioner…" value={search} onChange={e=>setSearch(e.target.value)}/></label><div>{available.filter(p=>(p.name+' '+p.id).toLowerCase().includes(search.toLowerCase())).map(p=><button key={p.id} aria-pressed={selected===p.id} onClick={()=>choose(p.id)}>{p.name}</button>)}</div></details>
    </section>
    <section className="mechanical-guide" aria-label="Current walkthrough phase"><p className="mechanical-kicker">Section {index+1} of {lesson.steps.length}</p><h2>{step.title}</h2><ol>{step.actions.map(text=><li key={text}>{text}</li>)}</ol><div className="mechanical-checkpoint"><strong>Important</strong><p>{step.checkpoint}</p></div><div className="mechanical-locate"><h3>Parts in this section</h3>{step.parts.map(p=><button key={p.id} aria-pressed={selected===p.id} onClick={()=>{choose(p.id);setMobilePane('model')}}><span>{parts.find(part=>part.id===p.id)?.name||p.id}</span><ArrowRight size={14}/></button>)}</div><div className="mechanical-source"><h3>Factory manual</h3><p>{step.reference}</p>{step.sourceIds.map(id=>{const s=timingSources.find(source=>source.id===id)!;return <a href={s.url} key={id} target="_blank" rel="noreferrer">{s.title.split(' · ').slice(0,2).join(' · ')}<ExternalLink size={13}/></a>})}<small>Manual mirror · Current information: <a href="https://techinfo.toyota.com/" target="_blank" rel="noreferrer">Toyota / Lexus TIS</a>.</small></div><label className="mechanical-review"><input type="checkbox" checked={reviewed} onChange={e=>setProgress(p=>({...p,reviewed:e.target.checked?[...p.reviewed,step.id]:p.reviewed.filter(id=>id!==step.id)}))}/>Section reviewed</label><div className="mechanical-next"><button disabled={index===0} onClick={()=>move(index-1)}><ArrowLeft size={16}/>Back</button><button disabled={index===lesson.steps.length-1} onClick={()=>move(index+1)}>Next section<ArrowRight size={16}/></button></div>{progress.reviewed.length===lesson.steps.length&&<p className="mechanical-complete" role="status">All sections reviewed. Learning progress only; no repair completion recorded.</p>}{notice&&<p role="status">{notice}</p>}</section>
   </div>
   <footer className="mechanical-footer"><span>Source review: October 2026</span><a href={appPath('/assembly/?study=timing-drive')}>Detailed component evidence</a><a href={appPath('/library/')}>Vehicle reference archive</a></footer>
  </main>
 </div>;
}
