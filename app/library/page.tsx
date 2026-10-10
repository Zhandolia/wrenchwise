'use client';
import {lazy,Suspense,useState} from 'react';
import {Wrench,Download,ExternalLink} from 'lucide-react';
import {appPath} from '@/lib/app-path';
import {matchesLibraryModel,compareLibraryEntries} from '@/lib/library-search.mjs';
import library from '@/research/model-library.json';
import generationReview from '@/research/lexus-ls-generation-review.json';
import '../assembly/assembly.css';
import './library.css';
const entries=[...library.models,...generationReview.generations];
const Viewer=lazy(()=>import('@/components/assembly-viewer'));
export default function LibraryPage(){
 const [query,setQuery]=useState(''),[make,setMake]=useState('All'),[body,setBody]=useState('All');
 const [group,setGroup]=useState(()=>{const id=typeof window==='undefined'?null:new URLSearchParams(location.search).get('model')||new URLSearchParams(location.search).get('generation');return entries.find(m=>m.id===id)?.bodyGroup||'All'});
 const [id,setId]=useState(()=>typeof window==='undefined'?library.models[0].id:new URLSearchParams(location.search).get('model')||new URLSearchParams(location.search).get('generation')||library.models[0].id);
 const [reset,setReset]=useState(0),[selected,setSelected]=useState<string|null>(null),[view,setView]=useState('all');
 const entry=entries.find(m=>m.id===id)||entries[0];
 const missing=generationReview.generations.find(m=>m.id===entry.id);
 const model=library.models.find(m=>m.id===id)||library.models[0];
 const available=entries.filter(m=>make==='All'||m.make===make);
 const groups=[...new Set(available.filter(m=>body==='All'||m.bodyStyle===body).sort(compareLibraryEntries).map(m=>m.bodyGroup))];
 const matches=available.filter(m=>(body==='All'||m.bodyStyle===body)&&(group==='All'||m.bodyGroup===group)&&matchesLibraryModel(m,query)).sort(compareLibraryEntries);
 const grouped=[...new Set(matches.map(m=>m.bodyGroup))];
 const choose=(next:string)=>{setId(next);setSelected(null);setReset(0);setView('all');history.replaceState(null,'','?'+(generationReview.generations.some(g=>g.id===next)?'generation':'model')+'='+encodeURIComponent(next))};
 const chooseGroup=(next:string)=>{setGroup(next);setQuery('');if(next!=='All'){const first=entries.find(m=>m.bodyGroup===next);if(first)choose(entry.bodyGroup===next?entry.id:first.id)}};
 const index=matches.findIndex(m=>m.id===entry.id);
 const adjacent=(delta:number)=>{if(matches.length)choose(matches[index<0?0:(index+delta+matches.length)%matches.length].id)};
 const clear=()=>{setQuery('');setMake('All');setBody('All');setGroup('All')};
 return <div className="assembly-app">
  <header className="assembly-header"><a className="brand" href={appPath('/')}><span className="brand-mark"><Wrench size={21}/></span>wrenchwise<span className="alpha">ALPHA</span></a><nav><a href={appPath('/catalog')}>Vehicle catalog</a><a href={appPath('/research')}>Research</a><a href={appPath('/assembly')}>GS assembly</a></nav></header>
  <main className="model-library"><div className="eyebrow orange">LEXUS + TOYOTA / 3D LIBRARY</div><h1>Find your body generation.</h1><p className="library-intro">Choose a generation to open it directly. {library.models.length} community models are available; the four earlier Lexus LS generations have reference entries while their 3D models are being sourced. Facelifts and custom versions stay together. Exact dimensions and repair fitment remain unverified.</p>
   <div className="library-layout">
    <aside className="library-sidebar">
     <label>Find a model<input value={query} onChange={e=>{setQuery(e.target.value);setGroup('All')}} placeholder="SC300, AE86, sedan, 2012…"/></label>
     <div className="library-filters">
      <label>Make<select aria-label="Make" value={make} onChange={e=>{setMake(e.target.value);setBody('All');setGroup('All')}}>{['All','Lexus','Toyota'].map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Body style<select aria-label="Body style" value={body} onChange={e=>{setBody(e.target.value);setGroup('All')}}>{['All',...new Set(available.map(m=>m.bodyStyle))].map(v=><option key={v}>{v}</option>)}</select></label>
     </div>
     <label>Body generation<select aria-label="Body generation" value={group} onChange={e=>chooseGroup(e.target.value)}><option>All</option>{groups.map(v=><option key={v} value={v}>{v}{generationReview.generations.some(g=>g.bodyGroup===v)?' · 3D pending':''}</option>)}</select></label>
     <div className="library-filter-summary"><p className="library-count" role="status">{matches.filter(m=>'assetUrl' in m).length} models · {grouped.length} generations</p><button onClick={clear}>Clear filters</button></div>
     {group==='All'?<div className="library-list" aria-label="Body generations">{grouped.map(g=>{const variants=matches.filter(m=>m.bodyGroup===g);return <button key={g} aria-pressed={g===entry.bodyGroup} onClick={()=>{setGroup(g);setQuery('');choose(variants.some(m=>m.id===entry.id)?entry.id:variants[0].id)}}><strong>{g}</strong><span>{variants[0].bodyStyle} · {!('assetUrl' in variants[0])?'3D model pending':variants.length===1?'Open 3D model':variants.length+' versions available'}</span></button>})}{!matches.length&&<p>No matching models. Try another body or clear the filters.</p>}</div>:matches.length>1?<div className="library-list" aria-label="Available versions"><p className="library-note">This body has {matches.length} versions. A model is already open; switch versions below.</p>{matches.map(m=><button key={m.id} aria-pressed={m.id===entry.id} onClick={()=>choose(m.id)}><strong>{m.name}</strong><small>{m.kind}{m.sourceYear?' · '+m.sourceYear:''}</small></button>)}</div>:<p className="library-note" role="status">{missing?'Generation selected. 3D model pending.':matches.length?'Generation selected. Your 3D model is open.':'No matching models. Clear the filters to browse again.'}</p>}
    </aside>
    <section className="library-detail">{missing?<>
     <div className="library-title"><div><span className="source-chip">SEDAN · 3D MODEL PENDING</span><h2>{missing.name}</h2><p className="library-generation">{missing.bodyGroup} · {missing.years}</p></div></div>
     <div className="library-pending"><h3>This generation is on the list. Its 3D model is not available yet.</h3><p>{missing.reason}</p><p>{missing.nextStep}</p><a className="secondary-btn" href={missing.referenceUrl} target="_blank" rel="noreferrer">View Lexus generation reference <ExternalLink size={16}/></a></div>
     <p className="library-note">Pre-facelift and facelift versions belong to this body generation. A future model will identify the specific version it depicts.</p>
     <p className="library-note"><a href={appPath('/research/lexus-ls-generation-review.json')}>View source review and acquisition status</a></p>
     <button className="secondary-btn" onClick={()=>{setGroup('All');setQuery('')}}>Browse other generations</button>
    </>:<>
     <div className="library-title"><div><span className="source-chip">{model.bodyStyle.toUpperCase()} · {model.kind.toUpperCase()}</span><h2>{model.name}</h2><p className="library-generation">{entry.bodyGroup}{model.sourceYear?' · Source year '+model.sourceYear:''}</p></div><a className="secondary-btn" href={appPath(model.assetUrl)} download><Download size={16}/>Download GLB · {(model.bytes/1e6).toFixed(1)} MB</a></div>
     {index<0&&<p className="library-note">This model is outside the current filters. Select a result to switch models.</p>}
     <div className="library-controls"><button className="secondary-btn" disabled={matches.length<2} onClick={()=>adjacent(-1)}>Previous model</button><button className="secondary-btn" onClick={()=>{setView('all');setReset(r=>r+1)}}>Reset view</button><button className="secondary-btn" disabled={matches.length<2} onClick={()=>adjacent(1)}>Next model</button></div>
     <div className="library-views" role="group" aria-label="Camera views">{[['all','Three-quarter'],['front','Front'],['side','Side'],['rear','Rear']].map(([v,label])=><button key={v} aria-pressed={view===v} onClick={()=>{setView(v);setReset(r=>r+1)}}>{label}</button>)}<span>Drag to orbit · scroll to zoom</span></div>
     <div className="library-view"><Suspense fallback={<p role="status">Loading model viewer…</p>}><Viewer key={entry.id} presentationYaw={model.presentation.yawDegrees} modelUrl={model.assetUrl} label={model.name+' community reference'} showGrid={false} visible={['body']} selected={selected} onSelect={setSelected} reset={reset} explode={0} cutaway={false} cameraView={view}/></Suspense></div>
     <p className="library-note">{model.notes}</p>{selected&&<p className="library-note">Selected source mesh: {selected}. Material groups are not OEM part identities.</p>}
     <div className="library-credit"><a href={model.sourceUrl} target="_blank" rel="noreferrer">Original model <ExternalLink size={13}/></a><span>by <a href={model.authorUrl} target="_blank" rel="noreferrer">{model.author}</a></span><a href={model.licenseUrl} target="_blank" rel="noreferrer">{model.license}</a></div>
     <p className="library-note">Body groups are browsing aids inferred from the source and appearance. Years identify the source model, not every year it fits. <a href={model.bodyReferenceUrl} target="_blank" rel="noreferrer">Body reference</a>. Models share a viewing angle and screen framing, not physical scale.</p>
     <p className="library-note">Adapted for Wrenchwise: display normalization, material conversion where needed, source-mesh IDs and web compression. No endorsement implied.</p>
     {model.additionalCredits.map(c=><p className="library-note" key={c.sourceUrl}>Includes <a href={c.sourceUrl} target="_blank" rel="noreferrer">{c.title}</a> by <a href={c.authorUrl} target="_blank" rel="noreferrer">{c.author}</a> · <a href={c.licenseUrl} target="_blank" rel="noreferrer">{c.license}</a>.</p>)}
    </>}</section>
   </div><p><a className="evidence-link" href={appPath('/research/model-library.json')} download>Download the complete source and export manifest</a></p>
  </main>
 </div>;
}
