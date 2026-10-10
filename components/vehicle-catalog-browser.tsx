'use client';
import {appPath} from '@/lib/app-path';
import {useState} from 'react';
import {Search,CarFront,ExternalLink} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {assetLabels,findCatalogFamilies,vehicleCatalog,CatalogFamily} from '@/lib/vehicle-catalog';
import ModelLibraryCards from '@/components/model-library-cards';
import library from '@/research/model-library.json';
import '@/app/workshop-learning.css';
const records=new Map(vehicleCatalog.records.map(r=>[r.id,r]));
const generationLabel=(label:string)=>label.replace(/Source lineage \d+/g,'historical source entry');
function FamilyCard({family,onChoose,currentId}:{family:CatalogFamily;onChoose?:(id:string)=>void;currentId?:string}){
 const preferred=currentId&&family.recordIds.includes(currentId)?currentId:family.recordIds.find(id=>records.get(id)?.assetUrl)||family.recordIds[0];
 const [chosen,setChosen]=useState(preferred);
 const id=family.recordIds.includes(chosen)?chosen:preferred,r=records.get(id)!;
 const generation=family.generations.find(g=>g.recordIds.includes(id))!;
 const engine=vehicleCatalog.engines.find(e=>e.id===r.engineId);
 const action=r.assetStatus==='provisional-assembly'?'Learn with the GS 300 workshop':r.assetUrl?'Explore vehicle reference':'View planned workshop';
 return <article className={'catalog-record '+(currentId===id?'current':'')}>
  <div className="catalog-record-heading"><span className="vehicle-series">{family.make}</span><CarFront size={20}/></div><h3>{family.name}</h3>
  {family.generations.length>1?<label className="family-field">Body generation / source group<select aria-label={family.make+' '+family.name+' generation'} value={generation.id} onChange={e=>{const g=family.generations.find(g=>g.id===e.target.value)!;setChosen(g.recordIds.find(id=>records.get(id)?.assetUrl)||g.recordIds[0])}}>{family.generations.map(g=><option key={g.id} value={g.id}>{generationLabel(g.label)}</option>)}</select></label>:<span className="catalog-single-value">{generationLabel(generation.label)}</span>}
  {generation.recordIds.length>1?<label className="family-field">Engine / regional configuration<select aria-label={family.make+' '+family.name+' configuration'} value={id} onChange={e=>setChosen(e.target.value)}>{generation.recordIds.map(id=>{const r=records.get(id)!;return <option key={id} value={id}>{r.name} · {generationLabel(r.generation||r.region)}{r.engineId?' · '+r.engineId.toUpperCase():''}</option>})}</select></label>:<span className="catalog-single-value">{r.name}{r.engineId?' · '+r.engineId.toUpperCase():''}</span>}
  {(generation.id.startsWith('source-')||generation.id==='unresolved')&&<p className="catalog-reference-note">Historical reference; exact chassis generation is not mapped yet.</p>}
  <p>{r.region}</p><span className="catalog-asset-status">{assetLabels[r.assetStatus]}</span>
  {engine&&<p className="family-engine">{engine.name} · {engine.architecture}<br/><a href={appPath('/components?engine='+engine.id)}>Explore engine systems & coverage</a></p>}
  {onChoose?<button className="secondary-btn" onClick={()=>onChoose(id)}>{action}</button>:<a className="secondary-btn" href={appPath('/workshop?vehicle='+encodeURIComponent(id))}>{action}</a>}
  <a className="catalog-source" href={appPath(r.sourceUrl)} target="_blank" rel="noreferrer">Reference source <ExternalLink size={13}/></a>
 </article>;
}
export default function VehicleCatalogBrowser({onChoose,currentId}:{onChoose?:(id:string)=>void;currentId?:string}){
 const [query,setQuery]=useState(''),[make,setMake]=useState('all'),[coverage,setCoverage]=useState('all'),[page,setPage]=useState(0);
 const results=findCatalogFamilies(query,make,coverage);
 const ready=results.filter(f=>f.recordIds.some(id=>records.get(id)?.assetUrl)).sort((a,b)=>Number(b.recordIds.includes('gs300'))-Number(a.recordIds.includes('gs300'))||a.name.localeCompare(b.name));
 const pending=results.filter(f=>!f.recordIds.some(id=>records.get(id)?.assetUrl));
 const size=24,pages=Math.max(1,Math.ceil(pending.length/size)),safePage=Math.min(page,pages-1);
 const change=(fn:(s:string)=>void)=>(s:string)=>{fn(s);setPage(0)};
 const card=(f:CatalogFamily)=><FamilyCard key={f.id+':'+query+':'+coverage} family={f} currentId={currentId} onChoose={onChoose}/>;
 return <section className="catalog-browser" aria-label="Toyota and Lexus vehicle catalog">
  <div className="catalog-summary"><span>{vehicleCatalog.records.filter(r=>r.assetStatus==='provisional-assembly'&&r.assetUrl).length} illustrative system workshop</span><span>{vehicleCatalog.records.filter(r=>r.assetStatus==='exterior-reference'&&r.assetUrl).length} exterior configurations</span><a href={appPath('/library/')}>{library.models.length} community references</a><span>0 verified repair guides</span></div>
  <p className="catalog-note">Start with an available workshop or inspect a vehicle’s exterior. Engine, region and chassis references stay separate when compatibility has not been established. <a href={appPath('/components')}>Explore engine systems →</a></p>
  <div className="catalog-filters"><div className="library-search"><Search size={17}/><Input value={query} onChange={e=>change(setQuery)(e.target.value)} placeholder="Find a vehicle, S160, engine or year" aria-label="Search Toyota and Lexus catalog"/></div>
   <Select value={make} onValueChange={change(setMake)}><SelectTrigger aria-label="Filter make"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All makes</SelectItem>{vehicleCatalog.makes.map(m=><SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}</SelectContent></Select>
   <Select value={coverage} onValueChange={change(setCoverage)}><SelectTrigger aria-label="Filter model availability"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All vehicles</SelectItem><SelectItem value="assets">Explore now</SelectItem><SelectItem value="needed">Workshops being planned</SelectItem></SelectContent></Select>
  </div>
  {!!ready.length&&<><h2 className="catalog-available-heading">Explore these workshops</h2><div className="catalog-grid">{ready.map(card)}</div></>}
  <ModelLibraryCards query={query} make={make} coverage={coverage}/>
  <p className="catalog-result-count" role="status">{ready.length} matching families with workshop geometry · {pending.length} additional catalog families</p>
  {!!pending.length&&<details className="catalog-pending-list" key={query+':'+make+':'+coverage} open={!!query||coverage==='needed'}><summary>Planned workshops & historical references ({pending.length} families)</summary><p className="catalog-reference-note">These records preserve manufacturer history. They do not indicate available geometry or verified repair procedures.</p><div className="catalog-grid">{pending.slice(safePage*size,(safePage+1)*size).map(card)}</div><div className="catalog-pagination"><button className="secondary-btn" disabled={safePage===0} onClick={()=>setPage(safePage-1)}>Previous</button><span>{safePage+1} / {pages}</span><button className="secondary-btn" disabled={safePage===pages-1} onClick={()=>setPage(safePage+1)}>Next</button></div></details>}
  {!results.length&&<p>No matching catalog families. Try the model name or a different year.</p>}
 </section>;
}
