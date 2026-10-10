'use client';
import {lazy,Suspense,useEffect,useState} from 'react';
import {ArrowRight,Search,Wrench} from 'lucide-react';
import {appPath} from '@/lib/app-path';
import {timingLesson,timingProgressKey} from '@/lib/timing-belt-lesson';
import {readWorkthroughProgress} from '@/lib/workthrough-progress.mjs';
import './reference-home.css';
const Workshop=lazy(()=>import('./workshop/page'));
const entries=[
 {title:'Timing-belt replacement',system:'Engine',type:'Procedure overview',detail:'8 sections · Factory manual links',url:'/assembly/?lesson=timing-belt',keywords:'timing belt cambelt tensioner idler camshaft crankshaft'},
 {title:'Engine-bay layout',system:'Engine',type:'Guided lesson',detail:'Intake, air cleaner and pump drive',url:'/assembly/?lesson=engine-bay-orientation',keywords:'orientation under hood beginner'},
 {title:'Water pump & seals',system:'Cooling',type:'3D reference',detail:'Pump, gasket, thermostat and bypass pipes',url:'/assembly/?study=pump-seals',keywords:'coolant water cooling seal thermostat gasket'},
 {title:'Timing-drive components',system:'Engine',type:'3D reference',detail:'Belt, pulleys, idler and tensioner',url:'/assembly/?study=timing-drive',keywords:'camshaft crankshaft timing belt tensioner'},
 {title:'Air intake & MAF',system:'Engine',type:'3D reference',detail:'Duct, bellows, clamps and sensor',url:'/assembly/?study=air-intake',keywords:'air intake maf sensor electrical'},
 {title:'Engine cover & PCV',system:'Engine',type:'3D reference',detail:'Head covers and crankcase ventilation',url:'/assembly/?study=cover-pcv',keywords:'pcv valve cover ventilation'},
];
export default function Home(){
 const [legacy]=useState(()=>typeof window!=='undefined'&&/(?:vehicle|asset)=/.test(window.location.search));
 const [query,setQuery]=useState(''),[system,setSystem]=useState('All systems'),[resume,setResume]=useState('');
 useEffect(()=>{try{const p=readWorkthroughProgress(localStorage.getItem(timingProgressKey),timingLesson.steps);if(p.step!==timingLesson.steps[0].id||p.reviewed.length)setResume(timingLesson.steps.find(s=>s.id===p.step)?.title||'');}catch{}},[]);
 const results=entries.filter(e=>(system==='All systems'||e.system===system)&&query.trim().toLowerCase().split(/\s+/).every(term=>(e.title+' '+e.detail+' '+e.keywords+' 2000 Lexus GS300 GS 300 2JZ-GE VVT-i').toLowerCase().includes(term)));
 if(legacy)return <Suspense fallback={<main>Opening workshop…</main>}><Workshop/></Suspense>;
 return <div className="reference-home"><header className="reference-header"><a className="reference-brand" href={appPath('/')}><Wrench size={22}/>Wrenchwise</a><nav aria-label="Main navigation"><a href={appPath('/')} aria-current="page">Guides & parts</a><a href={appPath('/research/#s160-factory-references')}>References</a></nav></header>
 <main className="reference-main"><h1>Guides & parts</h1><div className="reference-vehicle"><span>Available engine</span><strong>2JZ-GE VVT-i</strong><span>2000 Lexus GS300 · US · LHD</span><a href={appPath('/library/')}>Other vehicle references <ArrowRight size={14}/></a></div>
 <div className="reference-search"><label><Search size={19}/><input aria-label="Search guides and parts" placeholder="Search a job or part…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')} aria-label="Clear search">Clear</button>}</label><select aria-label="Filter guides by system" value={system} onChange={e=>setSystem(e.target.value)}><option>All systems</option><option>Engine</option><option>Cooling</option></select></div>
 {resume&&<a className="reference-resume" href={appPath('/assembly/?lesson=timing-belt')}><span>Continue timing-belt overview <small>{resume}</small></span><ArrowRight size={17}/></a>}
 <div className="reference-list-heading"><span role="status">{results.length} {results.length===1?'result':'results'}</span><span>Current coverage</span></div><div className="reference-list">{results.map(e=><a className="reference-row" href={appPath(e.url)} key={e.title}><div><h2>{e.title}</h2><p>{e.detail}</p></div><span className="reference-type">{e.type}</span><ArrowRight size={17}/></a>)}{!results.length&&<div className="reference-empty"><h2>No matching guides</h2><p>Only the engine and topics listed here are available.</p><button onClick={()=>{setQuery('');setSystem('All systems')}}>Show all guides</button></div>}</div>
 <p className="reference-note">3D shapes are approximate. Procedure overviews accompany the factory manual; use its specifications for actual repairs.</p>
 </main><footer className="reference-footer"><a href={appPath('/research')}>Sources & accuracy</a><a href={appPath('/library')}>Vehicle reference archive</a><span>Independent project · Not affiliated with Toyota or Lexus</span></footer></div>;
}
