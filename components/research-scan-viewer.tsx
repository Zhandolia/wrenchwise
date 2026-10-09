'use client';
import {lazy,Suspense,useState} from 'react';
import {appPath} from '@/lib/app-path';
const AssemblyViewer=lazy(()=>import('./assembly-viewer'));
export default function ResearchScanViewer(){
 const [loaded,setLoaded]=useState(false),[reset,setReset]=useState(0),[view,setView]=useState('all');
 return <section id="es300-source-scan" className="research-scan">
  <div className="eyebrow orange">DOWNLOADED SOURCE / RESEARCH ONLY</div>
  <h2>Inspect the 1997 ES 300 scan</h2>
  <p>This earlier-year scan by Giz is a modeling reference, not the 2000 ES 300 workshop model. It has a damaged roof and windshield, a ground slab, and no usable engine bay. Its single fused surface cannot support part-by-part repairs. Scale remains unverified.</p>
  <div className="research-scan-controls">{!loaded?<button className="secondary-btn" onClick={()=>setLoaded(true)}>Load 3D reference · 4.6 MB</button>:<><button className="secondary-btn" onClick={()=>{setView('all');setReset(r=>r+1)}}>Reset view</button><button className="secondary-btn" onClick={()=>{setView('underbody');setReset(r=>r+1)}}>Inspect underside</button></>}<a className="evidence-link" href={appPath('/models/research/es300-1997-source-scan.glb')} download>Download reference GLB</a></div>
  {loaded&&<div className="research-scan-canvas"><Suspense fallback={<p role="status">Loading reference viewer…</p>}><AssemblyViewer showGrid={false} modelUrl="/models/research/es300-1997-source-scan.glb" label="1997 ES300 incomplete source scan, unverified scale" visible={['body']} selected={null} onSelect={()=>{}} explode={0} cutaway={false} cameraView={view} reset={reset}/></Suspense></div>}
  <p>Drag to orbit and scroll to zoom. Keyboard: arrow keys rotate; + and − zoom.</p>
  <p><a href="https://sketchfab.com/3d-models/5eaed54fd300415a9ea88505a15cc750" target="_blank" rel="noreferrer">1997 Lexus ES 300 Photoscan</a> by <a href="https://sketchfab.com/Gizmitt" target="_blank" rel="noreferrer">Giz</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Wrenchwise added viewer metadata; source geometry and texture are unchanged. No endorsement implied.</p>
 </section>;
}
