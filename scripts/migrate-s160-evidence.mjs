import fs from 'node:fs';
import crypto from 'node:crypto';
import { evidenceDomains, vehicleEvidenceSchema, evidenceCounts } from '../lib/vehicle-evidence.ts';
const path='public/models/gs300-parts.json', raw=fs.readFileSync(path), old=JSON.parse(raw);
// Reconciliation preserves all legacy IDs. These links do not certify equivalence.
const reconcile={
 'pending-engine-19':{geometry:'unresolved',gapKind:'reconciliation',relatedPartIds:['crank-pulley-seal']},
 'pending-engine-32':{geometry:'partial',gapKind:'geometry',relatedPartIds:['vvti-filter-screen']},
 'pending-transmission-4':{geometry:'unresolved',gapKind:'measurement',relatedPartIds:['output-shaft-splines']},
 'pending-transmission-12':{geometry:'partial',gapKind:'geometry',relatedPartIds:['valve-body-separator']},
 'pending-suspension-18':{geometry:'unresolved',gapKind:'reconciliation',relatedPartIds:['ps-reservoir']},
 'pending-cooling-9':{geometry:'unresolved',gapKind:'fitment',relatedPartIds:[]},
};
const subjects={
 'timing-tensioner':'Hydraulic timing tensioner mounting bolts', 'timing-cover-upper':'No. 2 timing cover bolts',
 'timing-cover-lower':'No. 1 timing cover bolts','engine-cover':'Appearance cover nuts','timing-cover-top':'No. 3 timing cover bolts',
 'water-pump':'Water pump mounting bolts','water-pump-pulley':'Water pump pulley retaining nuts','transmission-pan':'Transmission oil pan bolts',
 'valve-body':'Valve body retaining bolts','trans-strainer':'Oil strainer retaining bolts',
};
const claims=old.parts.filter(p=>p.quantityEvidence).map(p=>({id:`${p.id}:quantity`,partId:p.id,domain:'quantity',subject:subjects[p.id],
 sourceIds:[p.quantityEvidence.sourceId],section:p.quantityEvidence.section,value:p.quantityEvidence.count,unit:'count',datum:null,uncertainty:null,
 method:'source-reading',referenceId:null,notes:p.quantityEvidence.scope}));
const result=vehicleEvidenceSchema.parse({
 schemaVersion:1,vehicleId:'gs300',configurationId:'lexus-gs-jzs160-us-2000-2jz-ge-auto',modelRevision:String(old.version),
 origin:{path,sha256:crypto.createHash('sha256').update(raw).digest('hex'),baselineCommit:'58a0019a3d4b8d5cc91d3b376abbf97913a85659'},
 configuration:{make:'Lexus',model:'GS 300',modelYear:2000,market:'US',steering:'LHD',engine:'2JZ-GE VVT-i',transmission:'Stock automatic; A650E reference, unit identification pending',productionMonth:null,referenceId:null,identificationStatus:'target-only'},
 assemblies:Object.entries(old.systems).map(([id,name])=>({id:`gs300:${id}`,name})),
 sources:old.sources.map(s=>({...s,applicability:s.id==='a650e-valve-overhaul'?'adjacent-year':s.id==='transtar-a650e'?'family':s.id==='tis'?'unresolved':s.id.startsWith('rm718u')||['lexus-brochure','lexus-specs'].includes(s.id)?'exact-target':'visual-reference',rights:s.id==='ccby-exterior'?'CC BY 4.0; see THIRD_PARTY_ASSETS.md':'Reference link only; no source media redistribution'})),
 claims,records:old.parts.map(p=>({id:p.id,name:p.name,assemblyId:`gs300:${p.system}`,recordKind:p.status==='modeled'?'modeled-group':'gap-record',
 geometry:p.status==='modeled'?'present':'absent',gapKind:p.status==='modeled'?null:'geometry',relatedPartIds:[],...reconcile[p.id],
 reviews:evidenceDomains.map(domain=>({domain,status:domain==='quantity'&&p.quantityEvidence?'documented':'unknown',claimIds:domain==='quantity'&&p.quantityEvidence?[`${p.id}:quantity`]:[],reviewer:null,reviewedRevision:null})),
 claimIds:p.quantityEvidence?[`${p.id}:quantity`]:[],notes:reconcile[p.id]?'Reconciliation candidate; legacy record retained. Related geometry does not establish complete coverage or fitment.':p.notes})),
});
const output='public/models/gs300-evidence.json', serialized=JSON.stringify(result,null,2)+'\n';
if(process.argv.includes('--check')){if(fs.readFileSync(output,'utf8')!==serialized)throw Error('Evidence migration is stale. Run node scripts/migrate-s160-evidence.mjs');}
else fs.writeFileSync(output,serialized);
console.log(JSON.stringify(evidenceCounts(result)));
