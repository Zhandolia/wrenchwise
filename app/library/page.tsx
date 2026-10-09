'use client';
import {lazy,Suspense,useState} from 'react';
import {Wrench,Download,ExternalLink} from 'lucide-react';
import {appPath} from '@/lib/app-path';
import library from '@/research/model-library.json';
import '../assembly/assembly.css';
import './library.css';
const Viewer=lazy(()=>import('@/components/assembly-viewer'));
export default function LibraryPage(){
 const [query,setQuery]=useState(''),[make,setMake]=useState('All'),[kind,setKind]=useState('All');
 const [id,setId]=useState(()=>typeof window==='undefined'?library.models[0].id:new URLSearchParams(location.search).get('model')||library.models[0].id);
 const [reset,setReset]=useState(0),[selected,setSelected]=useState<string|null>(null);
 const model=library.models.find(m=>m.id===id)||library.models[0];
 const matches=library.models.filter(m=>(make==='All'||m.make===make)&&(kind==='All'||m.kind===kind)&&`${m.name} ${m.author}`.toLowerCase().includes(query.toLowerCase()));
 const choose=(next:string)=>{setId(next);setSelected(null);setReset(0);history.replaceState(null,'','?model='+encodeURIComponent(next))};
 const index=library.models.findIndex(m=>m.id===model.id);
 return <div className="assembly-app"><header className="assembly-header"><a className="brand" href={appPath('/')}><span className="brand-mark"><Wrench size={21}/></span>wrenchwise<span className="alpha">ALPHA</span></a><nav><a href={appPath('/catalog')}>Vehicle catalog</a><a href={appPath('/research')}>Research</a><a href={appPath('/assembly')}>GS assembly</a></nav></header>
 <main className="model-library"><div className="eyebrow orange">LEXUS + TOYOTA / COMMUNITY 3D REFERENCES</div><h1>More cars to explore.</h1><p className="library-intro">{library.models.length} downloadable models · rotate, zoom and inspect. These are community visual references. Model years and names follow their source listings; dimensions, installed parts and repair procedures are unverified.</p>
 <div className="library-layout"><aside className="library-sidebar"><label>Find a model<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name or creator"/></label><div className="library-filters"><label>Make<select value={make} onChange={e=>setMake(e.target.value)}>{['All','Lexus','Toyota'].map(v=><option key={v}>{v}</option>)}</select></label><label>Type<select value={kind} onChange={e=>setKind(e.target.value)}>{['All',...new Set(library.models.map(m=>m.kind))].map(v=><option key={v}>{v}</option>)}</select></label></div><p className="library-count">{matches.length} models found</p><div className="library-list">{matches.map(m=><button key={m.id} aria-pressed={m.id===model.id} onClick={()=>choose(m.id)}><span>{m.make} · {m.kind}</span><strong>{m.name}</strong><small>{(m.bytes/1e6).toFixed(1)} MB · {m.triangles.toLocaleString()} triangles</small></button>)}{!matches.length&&<p>No matching models. Try a different name or filter.</p>}</div></aside>
 <section className="library-detail"><div className="library-title"><div><span className="source-chip">{model.kind.toUpperCase()} · UNVERIFIED</span><h2>{model.name}</h2></div><a className="secondary-btn" href={appPath(model.assetUrl)} download><Download size={16}/>Download GLB · {(model.bytes/1e6).toFixed(1)} MB</a></div>
 <div className="library-controls"><button className="secondary-btn" onClick={()=>choose(library.models[(index-1+library.models.length)%library.models.length].id)}>Previous model</button><button className="secondary-btn" onClick={()=>setReset(r=>r+1)}>Reset view</button><button className="secondary-btn" onClick={()=>choose(library.models[(index+1)%library.models.length].id)}>Next model</button><span>Drag to orbit · scroll to zoom · arrow keys rotate</span></div>
 <div className="library-view"><Suspense fallback={<p role="status">Loading model viewer…</p>}><Viewer key={model.id} modelUrl={model.assetUrl} label={model.name+' community reference'} showGrid={false} visible={['body']} selected={selected} onSelect={setSelected} reset={reset} explode={0} cutaway={false} cameraView="all"/></Suspense></div>
 <p className="library-note">{model.notes}</p>{selected&&<p className="library-note">Selected source mesh: {selected}. Material groups are not OEM part identities.</p>}
 <div className="library-credit"><a href={model.sourceUrl} target="_blank" rel="noreferrer">Original model <ExternalLink size={13}/></a><span>by <a href={model.authorUrl} target="_blank" rel="noreferrer">{model.author}</a></span><a href={model.licenseUrl} target="_blank" rel="noreferrer">{model.license}</a></div><p className="library-note">Adapted for Wrenchwise: display normalization, material conversion where needed, source-mesh IDs and web compression. No endorsement implied. Display scale is not a physical measurement.</p>
 {model.id.includes('2jz')&&<p className="library-note">Includes an HKS filter credited by the engine creator to <a href="https://sketchfab.com/3d-models/2de170b9d33b46a99e3f0fa00fb94d71" target="_blank" rel="noreferrer">the original filter model</a> by <a href="https://sketchfab.com/reitaxac" target="_blank" rel="noreferrer">Reitax</a> (CC BY 4.0); this is a modified engine reference.</p>}
 </section></div><p><a className="evidence-link" href={appPath('/research/model-library.json')} download>Download the complete source and export manifest</a></p></main></div>;
}
