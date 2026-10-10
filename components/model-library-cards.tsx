import library from '@/research/model-library.json';
import {appPath} from '@/lib/app-path';
import {matchesLibraryModel} from '@/lib/library-search.mjs';

export default function ModelLibraryCards({query='',make='all',coverage='all'}:{query?:string;make?:string;coverage?:string}){
 const matches=library.models.filter(m=>coverage!=='needed'&&(make==='all'||m.make===make)&&matchesLibraryModel(m,query));
 if(!matches.length)return null;
 return <section className="downloaded-models" aria-label="Explore community 3D references">
  <div className="downloaded-heading"><h2>{matches.length} community 3D references</h2><a href={appPath('/library/')}>Choose a vehicle →</a></div>
  <p>Explore body shapes and visible components. These references do not yet include guided mechanical studies; dimensions and repair fitment are unverified.</p>
  <div className="downloaded-grid">{matches.map(m=><a className="downloaded-card" key={m.id} href={appPath('/library/?model='+encodeURIComponent(m.id))}>
   <span>{m.bodyStyle} · {m.generation}</span><strong>{m.name}</strong><small>{m.bodyStyle==='Engine'?'Explore engine reference →':'Explore this vehicle →'}</small>
  </a>)}</div>
 </section>;
}
