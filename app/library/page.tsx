'use client';
import {lazy,Suspense,useState} from 'react';
import {Wrench,Download,ExternalLink} from 'lucide-react';
import {appPath} from '@/lib/app-path';
import {matchesLibraryModel} from '@/lib/library-search.mjs';
import library from '@/research/model-library.json';
import '../assembly/assembly.css';
import './library.css';
const Viewer=lazy(()=>import('@/components/assembly-viewer'));
export default function LibraryPage(){
 const [query,setQuery]=useState(''),[make,setMake]=useState('All'),[body,setBody]=useState('All'),[group,setGroup]=useState('All');
 const [id,setId]=useState(()=>typeof window==='undefined'?library.models[0].id:new URLSearchParams(location.search).get('model')||library.models[0].id);
 const [reset,setReset]=useState(0),[selected,setSelected]=useState<string|null>(null),[view,setView]=useState('all');
 const model=library.models.find(m=>m.id===id)||library.models[0];
 const available=library.models.filter(m=>make==='All'||m.make===make);
 const groups=[...new Set(available.filter(m=>body==='All'||m.bodyStyle===body).map(m=>m.bodyGroup))].sort();
 const matches=available.filter(m=>(body==='All'||m.bodyStyle===body)&&(group==='All'||m.bodyGroup===group)&&matchesLibraryModel(m,query)).sort((a,b)=>a.bodyGroup.localeCompare(b.bodyGroup)||a.name.localeCompare(b.name));
 const grouped=[...new Set(matches.map(m=>m.bodyGroup))].sort();
 const choose=(next:string)=>{setId(next);setSelected(null);setReset(0);setView('all');history.replaceState(null,'','?model='+encodeURIComponent(next))};
 const index=matches.findIndex(m=>m.id===model.id);
 const adjacent=(delta:number)=>{if(matches.length)choose(matches[index<0?0:(index+delta+matches.length)%matches.length].id)};
 const clear=()=>{setQuery('');setMake('All');setBody('All');setGroup('All')};
 return <div className="assembly-app">
  <header className="assembly-header"><a className="brand" href={appPath('/')}><span className="brand-mark"><Wrench size={21}/></span>wrenchwise<span className="alpha">ALPHA</span></a><nav><a href={appPath('/catalog')}>Vehicle catalog</a><a href={appPath('/research')}>Research</a><a href={appPath('/assembly')}>GS assembly</a></nav></header>
  <main className="model-library"><div className="eyebrow orange">LEXUS + TOYOTA / 3D LIBRARY</div><h1>Find your body generation.</h1><p className="library-intro">Browse {library.models.length} community models by body style and generation. Facelifts and custom versions stay together. Exact dimensions and repair fitment remain unverified.</p>
   <div className="library-layout">
    <aside className="library-sidebar">
     <label>Find a model<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="SC300, AE86, sedan, 2012…"/></label>
     <div className="library-filters">
      <label>Make<select aria-label="Make" value={make} onChange={e=>{setMake(e.target.value);setBody('All');setGroup('All')}}>{['All','Lexus','Toyota'].map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Body style<select aria-label="Body style" value={body} onChange={e=>{setBody(e.target.value);setGroup('All')}}>{['All',...new Set(available.map(m=>m.bodyStyle))].map(v=><option key={v}>{v}</option>)}</select></label>
     </div>
     <label>Body generation<select aria-label="Body generation" value={group} onChange={e=>setGroup(e.target.value)}><option>All</option>{groups.map(v=><option key={v}>{v}</option>)}</select></label>
     <div className="library-filter-summary"><p className="library-count" role="status">{matches.length} {matches.length===1?'model':'models'} · {grouped.length} body {grouped.length===1?'group':'groups'}</p><button onClick={clear}>Clear filters</button></div>
     <div className="library-list">{grouped.map(g=><section className="library-body-group" key={g}><h3>{g}</h3>{matches.filter(m=>m.bodyGroup===g).map(m=><button key={m.id} aria-pressed={m.id===model.id} onClick={()=>choose(m.id)}><span>{m.bodyStyle} · {m.kind}</span><strong>{m.name}</strong><small>{m.sourceYear?'Source year '+m.sourceYear+' · ':''}{(m.bytes/1e6).toFixed(1)} MB</small></button>)}</section>)}{!matches.length&&<p>No matching models. Try another body or clear the filters.</p>}</div>
    </aside>
    <section className="library-detail">
     <div className="library-title"><div><span className="source-chip">{model.bodyStyle.toUpperCase()} · {model.kind.toUpperCase()}</span><h2>{model.name}</h2><p className="library-generation">{model.bodyGroup}{model.sourceYear?' · Source year '+model.sourceYear:''}</p></div><a className="secondary-btn" href={appPath(model.assetUrl)} download><Download size={16}/>Download GLB · {(model.bytes/1e6).toFixed(1)} MB</a></div>
     {index<0&&<p className="library-note">This model is outside the current filters. Select a result to switch models.</p>}
     <div className="library-controls"><button className="secondary-btn" disabled={!matches.length} onClick={()=>adjacent(-1)}>Previous model</button><button className="secondary-btn" onClick={()=>{setView('all');setReset(r=>r+1)}}>Reset view</button><button className="secondary-btn" disabled={!matches.length} onClick={()=>adjacent(1)}>Next model</button></div>
     <div className="library-views" role="group" aria-label="Camera views">{[['all','Three-quarter'],['front','Front'],['side','Side'],['rear','Rear']].map(([v,label])=><button key={v} aria-pressed={view===v} onClick={()=>{setView(v);setReset(r=>r+1)}}>{label}</button>)}<span>Drag to orbit · scroll to zoom</span></div>
     <div className="library-view"><Suspense fallback={<p role="status">Loading model viewer…</p>}><Viewer key={model.id} presentationYaw={model.presentation.yawDegrees} modelUrl={model.assetUrl} label={model.name+' community reference'} showGrid={false} visible={['body']} selected={selected} onSelect={setSelected} reset={reset} explode={0} cutaway={false} cameraView={view}/></Suspense></div>
     <p className="library-note">{model.notes}</p>{selected&&<p className="library-note">Selected source mesh: {selected}. Material groups are not OEM part identities.</p>}
     <div className="library-credit"><a href={model.sourceUrl} target="_blank" rel="noreferrer">Original model <ExternalLink size={13}/></a><span>by <a href={model.authorUrl} target="_blank" rel="noreferrer">{model.author}</a></span><a href={model.licenseUrl} target="_blank" rel="noreferrer">{model.license}</a></div>
     <p className="library-note">Body groups are browsing aids inferred from the source and appearance. Years identify the source model, not every year it fits. <a href={model.bodyReferenceUrl} target="_blank" rel="noreferrer">Body reference</a>. Models share a viewing angle and screen framing, not physical scale.</p>
     <p className="library-note">Adapted for Wrenchwise: display normalization, material conversion where needed, source-mesh IDs and web compression. No endorsement implied.</p>
     {model.additionalCredits.map(c=><p className="library-note" key={c.sourceUrl}>Includes <a href={c.sourceUrl} target="_blank" rel="noreferrer">{c.title}</a> by <a href={c.authorUrl} target="_blank" rel="noreferrer">{c.author}</a> · <a href={c.licenseUrl} target="_blank" rel="noreferrer">{c.license}</a>.</p>)}
    </section>
   </div><p><a className="evidence-link" href={appPath('/research/model-library.json')} download>Download the complete source and export manifest</a></p>
  </main>
 </div>;
}
