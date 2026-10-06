'use client';
import {useState} from 'react';
import {Search,CarFront,ExternalLink} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {assetLabels,findCatalogRecords,vehicleCatalog} from '@/lib/vehicle-catalog';

export default function VehicleCatalogBrowser({onChoose,currentId}:{onChoose?:(id:string)=>void;currentId?:string}){
 const [query,setQuery]=useState(''),[make,setMake]=useState('all'),[coverage,setCoverage]=useState('all'),[page,setPage]=useState(0);
 const results=findCatalogRecords(query,make,coverage),size=24,pages=Math.max(1,Math.ceil(results.length/size)),safePage=Math.min(page,pages-1);
 const change=(fn:(s:string)=>void)=>(s:string)=>{fn(s);setPage(0)};
 return <section className="catalog-browser" aria-label="Toyota and Lexus vehicle catalog">
  <div className="catalog-summary"><strong>{vehicleCatalog.records.length} catalog records</strong><span>2 makes</span><span>4 provisional 3D entries</span><span>0 verified replicas</span></div>
  <p className="catalog-note">Historical vehicles and regional model ranges. Records can describe a generation, body variant or model family. Worldwide coverage is still being reconciled.</p>
  <div className="catalog-filters"><div className="library-search"><Search size={17}/><Input value={query} onChange={e=>change(setQuery)(e.target.value)} placeholder="Search model, year, region or body type" aria-label="Search Toyota and Lexus catalog"/></div>
   <Select value={make} onValueChange={change(setMake)}><SelectTrigger aria-label="Filter make"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All makes</SelectItem>{vehicleCatalog.makes.map(m=><SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}</SelectContent></Select>
   <Select value={coverage} onValueChange={change(setCoverage)}><SelectTrigger aria-label="Filter model availability"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All records</SelectItem><SelectItem value="assets">3D available</SelectItem><SelectItem value="needed">3D model needed</SelectItem></SelectContent></Select>
  </div>
  <p className="catalog-result-count" role="status">{results.length} matching records · Page {safePage+1} of {pages}</p>
  <div className="catalog-grid">{results.slice(safePage*size,(safePage+1)*size).map(r=><article className={'catalog-record '+(currentId===r.id?'current':'')} key={r.id}>
   <div className="catalog-record-heading"><span className="vehicle-series">{r.make}</span><CarFront size={20}/></div><h3>{r.name}</h3>
   <p>{r.generation||'Model family · generation needed'}{r.introductionMonth&&<> · {r.introductionMonth.slice(0,4)}-{r.introductionMonth.slice(4)}</>}</p><p>{r.region}</p>
   <span className="catalog-asset-status">{assetLabels[r.assetStatus]}</span>
   {onChoose?<button className="secondary-btn" onClick={()=>onChoose(r.id)}>{r.assetUrl?'Open 3D workshop':'Open model record'}</button>:<a className="secondary-btn" href={'/?vehicle='+encodeURIComponent(r.id)}>{r.assetUrl?'Open 3D workshop':'Open model record'}</a>}
   <a className="catalog-source" href={r.sourceUrl} target="_blank" rel="noreferrer">Reference source <ExternalLink size={13}/></a>
  </article>)}</div>
  {!results.length&&<p>No matching records. Try a model name without its trim or year.</p>}
  <div className="catalog-pagination"><button className="secondary-btn" disabled={safePage===0} onClick={()=>setPage(safePage-1)}>Previous</button><span>{safePage+1} / {pages}</span><button className="secondary-btn" disabled={safePage===pages-1} onClick={()=>setPage(safePage+1)}>Next</button></div>
 </section>
}
