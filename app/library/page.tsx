'use client';
import {lazy, Suspense, useEffect, useState} from 'react';
import {Wrench, ArrowRight, BookOpen, RotateCcw} from 'lucide-react';
import {appPath} from '@/lib/app-path';
import {matchesLibraryModel, compareLibraryEntries, readLibrarySelection, librarySelectionUrl} from '@/lib/library-search.mjs';
import {learningVehicles as entries, s160Vehicle} from '@/lib/learning-vehicles';
import library from '@/research/model-library.json';
import originals from '@/research/lexus-ls-originals.json';
import LSStudy from '@/components/ls-study';
import assetCredits from '@/research/asset-licenses.json';
const gsCredit = assetCredits.find(item => item.vehicle === 'gs300')!;
import generationReview from '@/research/lexus-ls-generation-review.json';
import LoadingBoundary from '@/components/loading-boundary';
import '../assembly/assembly.css';
import './library.css';
const Viewer = lazy(() => import('@/components/assembly-viewer'));
const assemblySystems = ['body','engine','intake','electrical','cooling','exhaust','transmission','suspension','brakes','driveline','wheels','structure','interior'];

export default function VehiclesPage() {
  const [query, setQuery] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('q') || '');
  const [make, setMake] = useState(() => {const value=typeof window==='undefined'?'':new URLSearchParams(window.location.search).get('make');return value==='Lexus'||value==='Toyota'?value:'All';});
  const [body, setBody] = useState('All');
  const [id, setId] = useState(() => typeof window !== 'undefined' && /(?:model|generation)=/.test(window.location.search) ? readLibrarySelection(entries, window.location.search).id : '');
  const [reset, setReset] = useState(0);
  const [view, setView] = useState('all');
  const entry = entries.find(item => item.id === id) || entries[0];
  const model = library.models.find(item => item.id === entry.id);
  const original = originals.models.find(item=>item.id===entry.id);
  const missing = generationReview.generations.find(item => item.id === entry.id);
  const isEngine = entry.bodyStyle === 'Engine';
  const isAssembly = entry.id === s160Vehicle.id;
  const available = entries.filter(item => make === 'All' || item.make === make);
  const matches = available.filter(item => (body === 'All' || item.bodyStyle === body) && matchesLibraryModel(item, query)).sort(compareLibraryEntries);
  const groups = [...new Set(matches.map(item => item.bodyGroup))];
  useEffect(() => {
    const restore = () => {setId(/(?:model|generation)=/.test(window.location.search) ? readLibrarySelection(entries, window.location.search).id : ''); setQuery(new URLSearchParams(window.location.search).get('q') || ''); const restoredMake=new URLSearchParams(window.location.search).get('make'); setMake(restoredMake==='Toyota'||restoredMake==='Lexus'?restoredMake:'All'); setBody('All'); setView('all'); setReset(0);};
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  const choose = (next: string) => {
    const target = entries.find(item => item.id === next);
    if (!target) return;
    setId(next); setView('all'); setReset(0);
    const url = librarySelectionUrl(window.location.href, target);
    if (url !== window.location.pathname + window.location.search + window.location.hash) window.history.pushState(null, '', url);
  };
  const clear = () => {setQuery(''); setMake('All'); setBody('All');};
  return <div className="assembly-app">
    <header className="assembly-header"><a className="brand" href={appPath('/')}><span className="brand-mark"><Wrench size={21}/></span>wrenchwise<span className="alpha">ALPHA</span></a><nav aria-label="Main navigation"><a href={appPath('/')}>Home</a><a aria-current="page" href={appPath('/library')}>Choose vehicle</a><a href={appPath('/components')}>Explore systems</a></nav></header>
    <main className="model-library">
      <div className="eyebrow orange">YOUR INTERACTIVE WORKSHOP</div>
      <h1>Choose a car. Understand how it works.</h1>
      <p className="library-intro">Find your vehicle, open the available 3D views, and see which systems and lessons you can explore. Coverage grows one car at a time.</p>
      <div className="library-layout">
        <aside className="library-sidebar" aria-label="Choose a vehicle">
          <label>Search vehicles<input value={query} onChange={event => setQuery(event.target.value)} placeholder="GS300, S160, LS400, 2000…"/></label>
          <div className="library-filters"><label>Make<select aria-label="Make" value={make} onChange={event => {setMake(event.target.value); setBody('All');}}>{['All','Lexus','Toyota'].map(value => <option key={value}>{value}</option>)}</select></label><label>Body style<select aria-label="Body style" value={body} onChange={event => setBody(event.target.value)}>{['All', ...new Set(available.map(item => item.bodyStyle))].map(value => <option key={value}>{value}</option>)}</select></label></div>
          <div className="library-filter-summary"><p className="library-count" role="status">{groups.length} vehicle & engine groups</p><button onClick={clear}>Clear filters</button></div>
          <div className="library-list" aria-label="Vehicle generations">{groups.map(group => {
            const variants = matches.filter(item => item.bodyGroup === group);
            const active = variants.find(item => item.id === id);
            const target = active || variants[0];
            const guided = variants.some(item => item.id === s160Vehicle.id);
            return <button key={group} aria-pressed={!!active} onClick={() => choose(target.id)}><strong>{group}</strong><span>{guided ? 'Guided mechanical studies' : originals.models.some(m=>m.id===target.id) ? 'Original body & engine study' : 'assetUrl' in target ? target.bodyStyle === 'Engine' ? 'Engine visual reference' : 'Exterior exploration' : 'Learning content in development'}</span></button>;
          })}{!matches.length && <div className="library-note"><p>No vehicles match those filters.</p><button className="secondary-btn" onClick={clear}>Show all vehicles</button></div>}</div>
          <a className="all-vehicles-link" href={appPath('/catalog')}>Browse all vehicle records →</a>
        </aside>
        <section className="library-detail" aria-label="Selected vehicle">
          {!id ? <div className="library-empty-prompt"><span className="source-chip">GARAGE / SELECT VEHICLE</span><span className="empty-cross" aria-hidden="true">[+]</span><h2>Your car. Your next discovery.</h2><p>Choose a body generation from the list to open its workspace. Available lessons and 3D coverage are labeled on each entry.</p></div> : <>
          <p className="library-selection-status" role="status">Selected: {entry.bodyGroup}</p>
          {!matches.some(item => item.id === entry.id) && <p className="library-note">Your current vehicle is outside these filters. Choose a result to switch.</p>}
          {original ? <LSStudy key={original.id} model={original}/> : <>
          <div className="library-title"><div><span className="source-chip">{isAssembly ? 'GUIDED MECHANICAL STUDIES' : missing ? 'IN DEVELOPMENT' : isEngine ? 'ENGINE VISUAL REFERENCE' : 'EXTERIOR EXPLORATION'}</span><h2>{entry.name}{isAssembly ? ' · S160' : ''}</h2><p className="library-generation">{entry.bodyGroup}{entry.sourceYear ? ' · ' + entry.sourceYear : ''}</p></div>{isAssembly && <a className="learn-primary" href={appPath('/assembly?lesson=engine-bay-orientation')}>Enter learning lab <ArrowRight size={16}/></a>}</div>
          {matches.filter(item => item.bodyGroup === entry.bodyGroup).length > 1 && <label className="variant-choice">Visual version<select aria-label="Visual version" value={entry.id} onChange={event => choose(event.target.value)}>{matches.filter(item => item.bodyGroup === entry.bodyGroup).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
          {missing ? <div className="library-pending"><h3>This generation’s learning workspace is in development.</h3><p>We don’t yet have an approved 3D model for {missing.name}. You can explore the GS 300’s mechanical studies while this vehicle is being prepared.</p><a className="learn-primary" href={appPath('/assembly?lesson=engine-bay-orientation')}>Try the GS 300 learning lab <ArrowRight size={16}/></a><details><summary>Vehicle reference and progress</summary><p>{missing.reason}</p><p>{missing.nextStep}</p><a href={missing.referenceUrl} target="_blank" rel="noreferrer">Lexus generation reference</a></details></div> : <>
            <div className="library-views" role="group" aria-label="Camera views">{[['all','Three-quarter'],['front','Front'],['side','Side'],['rear','Rear']].map(([value,label]) => <button key={value} aria-pressed={view === value} onClick={() => {setView(value); setReset(count => count + 1);}}>{label}</button>)}<button aria-label="Reset view" onClick={() => {setView('all'); setReset(count => count + 1);}}><RotateCcw size={14}/></button></div>
            <div className="library-view"><LoadingBoundary key={entry.id}><Suspense fallback={<p role="status">Opening your vehicle…</p>}><Viewer presentationYaw={model?.presentation.yawDegrees ?? 0} modelUrl={model?.assetUrl ?? s160Vehicle.assetUrl} label={entry.name + ' exploration'} showGrid={false} visible={isAssembly ? assemblySystems : ['body']} selected={null} onSelect={() => {}} reset={reset} explode={0} cutaway={false} cameraView={view}/></Suspense></LoadingBoundary></div>
            <p className="viewer-instruction">Drag to rotate · Scroll or pinch to zoom · Use the views above to compare sides</p>
            {isAssembly ? <div className="learning-next"><h3>What would you like to understand?</h3><div className="learning-actions"><a href={appPath('/assembly?lesson=engine-bay-orientation')}>Engine-bay orientation <span>Guided lesson + knowledge checks →</span></a><a href={appPath('/assembly?study=timing-drive')}>Timing system <span>Explore belt, idler and tensioner →</span></a><a href={appPath('/assembly?study=trans-case')}>Transmission <span>Explore the A650E anatomy →</span></a></div><p className="library-note">These are anatomy studies using provisional geometry. Repair procedures and measured component fitment are still being validated.</p></div> : <div className="learning-next"><h3>{isEngine ? "Explore the engine reference" : "Get familiar with the body"}</h3><p>{isEngine ? "Rotate this source model to inspect its visible shapes. This modified engine reference has no verified component identities or installation fitment." : "Compare the front, side and rear views. Identify the bonnet, cabin and luggage area, then rotate the car to understand their relationship."}</p><p className="library-note">{isEngine ? "This engine is a visual reference only." : "This vehicle currently has exterior exploration only."} Engine-bay anatomy and repair lessons are not available for it yet. Year and body labels do not establish parts compatibility.</p><a className="text-button" href={appPath('/assembly?lesson=engine-bay-orientation')}>Learn engine-bay anatomy with the GS 300 →</a></div>}
            {isAssembly && <details className="vehicle-sources"><summary>Sources & credits</summary><p>Original mechanical study by Wrenchwise (MIT). Adapted exterior: <a href={gsCredit.sourceUrl}>{gsCredit.title}</a> by <a href={gsCredit.authorUrl}>{gsCredit.author}</a> · <a href={gsCredit.licenseUrl}>{gsCredit.license}</a>. Scale targets, materials and trim adapted; exact surfaces remain unverified.</p><a href={appPath("/research")}>Full source audit</a></details>}
            {model && <details className="vehicle-sources"><summary>About this visual reference & credits</summary><p>{model.notes}</p><p>Source: <a href={model.sourceUrl} target="_blank" rel="noreferrer">{model.title}</a> by <a href={model.authorUrl} target="_blank" rel="noreferrer">{model.author}</a> · <a href={model.licenseUrl} target="_blank" rel="noreferrer">{model.license}</a></p><p>Adapted with display normalization, source-mesh IDs, material conversion where needed and web compression. No endorsement implied. Shared screen framing does not establish physical scale.</p>{model.additionalCredits.map(credit => <p key={credit.sourceUrl}>Includes <a href={credit.sourceUrl} target="_blank" rel="noreferrer">{credit.title}</a> by <a href={credit.authorUrl} target="_blank" rel="noreferrer">{credit.author}</a> · <a href={credit.licenseUrl} target="_blank" rel="noreferrer">{credit.license}</a>.</p>)}</details>}
          </>}
        </>}
        </>}
        </section>
      </div>
    </main>
  </div>;
}
