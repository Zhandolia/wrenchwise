'use client';
import {useState} from 'react';
import {Search,CarFront,ExternalLink} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {assetLabels,findCatalogFamilies,vehicleCatalog,CatalogFamily} from '@/lib/vehicle-catalog';
const records=new Map(vehicleCatalog.records.map(r=>[r.id,r]));
function FamilyCard({family,onChoose,currentId}:{family:CatalogFamily;onChoose?:(id:string)=>void;currentId?:string}){
 const preferred=currentId&&family.recordIds.includes(currentId)?currentId:family.recordIds.find(id=>records.get(id)?.assetUrl)||family.recordIds[0];
 const [chosen,setChosen]=useState(preferred);
 const id=family.recordIds.includes(chosen)?chosen:preferred,r=records.get(id)!;
 const generation=family.generations.find(g=>g.recordIds.includes(id))!;
 const engine=vehicleCatalog.engines.find(e=>e.id===r.engineId);
 return <article className={'catalog-record '+(currentId===id?'current':'')}>
  <div className="catalog-record-heading"><span className="vehicle-series">{family.make}</span><CarFront size={20}/></div><h3>{family.name}</h3>
  <label className="family-field">Generation / reference group<select aria-label={`${family.make} ${family.name} generation`} value={generation.id} onChange={e=>{const g=family.generations.find(g=>g.id===e.target.value)!;setChosen(g.recordIds.find(id=>records.get(id)?.assetUrl)||g.recordIds[0])}}>{family.generations.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
  <label className="family-field">Configuration / regional reference<select aria-label={`${family.make} ${family.name} configuration`} value={id} onChange={e=>setChosen(e.target.value)}>{generation.recordIds.map(id=>{const r=records.get(id)!;return <option key={id} value={id}>{r.name} · {r.generation||r.region}{r.engineId?` · ${r.engineId.toUpperCase()}`:''}</option>})}</select></label>
  <p>{r.region}</p><span className="catalog-asset-status">{assetLabels[r.assetStatus]}</span>
  {engine&&<p className="family-engine">{engine.name} · {engine.architecture}<br/><a href={`/components?engine=${engine.id}`}>Engine component & reuse status</a></p>}
  {onChoose?<button className="secondary-btn" onClick={()=>onChoose(id)}>{r.assetUrl?'Open 3D workshop':'Open model record'}</button>:<a className="secondary-btn" href={'/?vehicle='+encodeURIComponent(id)}>{r.assetUrl?'Open 3D workshop':'Open model record'}</a>}
  <a className="catalog-source" href={r.sourceUrl} target="_blank" rel="noreferrer">Reference source <ExternalLink size={13}/></a>
 </article>
}
export default function VehicleCatalogBrowser({onChoose,currentId}:{onChoose?:(id:string)=>void;currentId?:string}){
 const [query,setQuery]=useState(''),[make,setMake]=useState('all'),[coverage,setCoverage]=useState('all'),[page,setPage]=useState(0);
 const results=findCatalogFamilies(query,make,coverage),size=24,pages=Math.max(1,Math.ceil(results.length/size)),safePage=Math.min(page,pages-1);
 const change=(fn:(s:string)=>void)=>(s:string)=>{fn(s);setPage(0)};
 return <section className="catalog-browser" aria-label="Toyota and Lexus vehicle catalog">
  <div className="catalog-summary"><strong>{vehicleCatalog.families.length} vehicle families</strong><span>2 makes</span><span>{vehicleCatalog.records.filter(r=>r.assetUrl).length} provisional 3D configurations</span><span>0 verified replicas</span></div>
  <p className="catalog-note">Choose a family, then its generation and configuration. Engine badges and regional references are grouped together. {vehicleCatalog.records.length} source records retained; unresolved historical groups still need chassis identification. <a href="/components">Explore shared engine components →</a></p>
  <div className="catalog-filters"><div className="library-search"><Search size={17}/><Input value={query} onChange={e=>change(setQuery)(e.target.value)} placeholder="Search model, engine, year or region" aria-label="Search Toyota and Lexus catalog"/></div>
   <Select value={make} onValueChange={change(setMake)}><SelectTrigger aria-label="Filter make"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All makes</SelectItem>{vehicleCatalog.makes.map(m=><SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}</SelectContent></Select>
   <Select value={coverage} onValueChange={change(setCoverage)}><SelectTrigger aria-label="Filter model availability"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All configurations</SelectItem><SelectItem value="assets">3D available</SelectItem><SelectItem value="needed">3D model needed</SelectItem></SelectContent></Select>
  </div>
  <p className="catalog-result-count" role="status">{results.length} matching families · Page {safePage+1} of {pages}</p>
  <div className="catalog-grid">{results.slice(safePage*size,(safePage+1)*size).map(f=><FamilyCard key={f.id+':'+query+':'+coverage} family={f} currentId={currentId} onChoose={onChoose}/>)}</div>
  {!results.length&&<p>No matching families. Try a model name without its trim or year.</p>}
  <div className="catalog-pagination"><button className="secondary-btn" disabled={safePage===0} onClick={()=>setPage(safePage-1)}>Previous</button><span>{safePage+1} / {pages}</span><button className="secondary-btn" disabled={safePage===pages-1} onClick={()=>setPage(safePage+1)}>Next</button></div>
 </section>
}
