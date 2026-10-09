import library from '@/research/model-library.json';
import {appPath} from '@/lib/app-path';
import {matchesLibraryModel} from '@/lib/library-search.mjs';

export default function ModelLibraryCards({query='',make='all',coverage='all'}:{query?:string;make?:string;coverage?:string}){
 const matches=library.models.filter(m=>coverage!=='needed'&&(make==='all'||m.make===make)&&matchesLibraryModel(m,query));
 if(!matches.length)return null;
 return <section className="downloaded-models" aria-label="Available community 3D models">
  <div className="downloaded-heading"><h2>{matches.length} downloadable 3D models</h2><a href={appPath('/library/')}>Open full 3D library →</a></div>
  <p>Ready to rotate, zoom and download. Community references; exact dimensions, configurations and repair fitment are unverified.</p>
  <div className="downloaded-grid">{matches.map(m=><a className="downloaded-card" key={m.id} href={appPath('/library/?model='+encodeURIComponent(m.id))}>
   <span>{m.bodyStyle} · {m.generation}</span><strong>{m.name}</strong><small>Explore 3D · {(m.bytes/1e6).toFixed(1)} MB</small>
  </a>)}</div>
 </section>;
}
