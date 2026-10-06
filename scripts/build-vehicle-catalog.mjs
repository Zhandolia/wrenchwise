import fs from 'node:fs';
const history=JSON.parse(fs.readFileSync('research/catalog/toyota-lineage-facts.json'));
const regional=JSON.parse(fs.readFileSync('research/catalog/regional-nameplates.json'));
const assets=JSON.parse(fs.readFileSync('research/catalog/asset-targets.json'));
const slug=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\+/g,' plus ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const sources=[...assets.sources,{id:'toyota-lineage',title:'Toyota 75-year vehicle lineage (2012 snapshot)',url:history.sourceUrl,scope:history.scope},
 ...regional.sources.map(s=>({id:s.id,title:`${s.make} · ${s.region}`,url:s.url,scope:regional.scope})),
 {id:'legacy-audit',title:'Existing vehicle source audits',url:'/research/vehicle-sources.json',scope:'Eleven initial Lexus targets; only GS300 is user-confirmed. See individual audits.'}];
const records=history.records.map(r=>({id:`lineage-${r.sourceId.toLowerCase()}`,make:r.name.startsWith('Lexus ')?'Lexus':'Toyota',
 name:r.name.replace(/^Lexus /,'').replace(/^Toyota (?!(Model|RK))/,''),kind:'historical-record',bodyType:r.bodyType,
 region:'Japan-oriented historical index',generation:`Source lineage ${r.generationLabel}`,introductionMonth:r.introductionMonth,endMonth:r.endMonth,
 configurationStatus:'unresolved',sourceIds:['toyota-lineage'],sourceRecordId:r.sourceId,
 sourceUrl:history.sourceUrl,assetStatus:'not-built',assetUrl:null,
 notes:'Source lineage ordinal is not a worldwide generation number. Dates describe this historical record; a blank end date does not imply current production. Exact market, chassis, engine and transmission require identification.'}));
for(const s of regional.sources)for(const name of s.names)records.push({id:`${s.id}-${slug(name)}`,make:s.make,name,kind:'nameplate-overview',bodyType:'Not classified',region:s.region,generation:null,introductionMonth:null,endMonth:null,
 configurationStatus:'unresolved',sourceIds:[s.id],sourceRecordId:null,sourceUrl:s.url,assetStatus:'not-built',assetUrl:null,
 notes:'Nameplate catalog entry. Generation, year, market configuration and powertrain must be selected before modeling. No geometry is attached.'});
const targets=[['gs300','GS 300','Sport sedan','2000 · JZS160 · 2JZ-GE VVT-i'],['gs400','GS 400','Sport sedan','2000 · S160 target'],['gs430','GS 430','Sport sedan','2001 · S160 target'],['ls400','LS 400','Flagship sedan','2000 target'],['ls430','LS 430','Flagship sedan','2001 target'],['es300','ES 300','Executive sedan','2000 target'],['es330','ES 330','Executive sedan','2004 target'],['rx300','RX 300','SUV','2000 target'],['rx330','RX 330','SUV','2004 target'],['gx470','GX 470','SUV','2003 target'],['lx470','LX 470','SUV','2000 target']];
for(const [id,name,bodyType,generation] of targets)records.unshift({id,make:'Lexus',name,kind:'workshop-target',bodyType,region:'US target',generation,introductionMonth:null,endMonth:null,
 configurationStatus:id==='gs300'?'target-confirmed':'unresolved',sourceIds:['legacy-audit'],sourceRecordId:null,sourceUrl:'/research',
 assetStatus:id==='gs300'?'provisional-assembly':['gs400','gs430','rx300'].includes(id)?'exterior-reference':'not-built',
 assetUrl:id==='gs300'?'/models/gs300-assembly.glb':['gs400','gs430','rx300'].includes(id)?`/models/catalog/${id}-reference.glb`:null,
 notes:id==='gs300'?'User-confirmed target. V5 assembly has no measured, verified parts. Physical reference and production month remain unidentified.':'Working target from initial catalog audit. Exact trim and installed components are unverified.'});
records.push(...assets.records);
records.sort((a,b)=>a.id==='gs300'?-1:b.id==='gs300'?1:a.kind==='workshop-target'&&b.kind!=='workshop-target'?-1:b.kind==='workshop-target'&&a.kind!=='workshop-target'?1:a.make.localeCompare(b.make)||a.name.localeCompare(b.name)||(a.introductionMonth||'').localeCompare(b.introductionMonth||''));
const data={schemaVersion:1,updatedAt:'2026-10-06',makes:[{id:'toyota',name:'Toyota'},{id:'lexus',name:'Lexus'}],
 coverage:{status:'incomplete',historicalRecords:history.records.length,scope:'Toyota and Lexus road-vehicle discovery: historical lineage plus selected regional manufacturer catalogs. Records include generations, body variants and regional nameplate overviews; they are not a count of unique models.',
 gaps:['Complete worldwide generation, facelift and powertrain mapping','Historical export-market aliases and discontinued regional models','China and other regional lineups beyond the cited sources','Exact production months, trims, emissions and driveline configurations','Measured/licensed geometry and physical validation for every vehicle'],excluded:['Concept-only vehicles','Competition-only vehicles','Marine products','Other makes until scope expands']},sources,records};
const out=JSON.stringify(data,null,2)+'\n',path='public/research/vehicle-catalog.json';
if(process.argv.includes('--check')){if(fs.readFileSync(path,'utf8')!==out)throw Error('Catalog is stale; run node scripts/build-vehicle-catalog.mjs');}else fs.writeFileSync(path,out);
console.log(JSON.stringify({records:records.length,toyota:records.filter(r=>r.make==='Toyota').length,lexus:records.filter(r=>r.make==='Lexus').length,assets:records.filter(r=>r.assetUrl).length,verified:0}));
