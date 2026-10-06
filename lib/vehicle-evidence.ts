import { z } from 'zod';

export const evidenceDomains = ['identity','quantity','dimensions','fitment','procedure'] as const;
const id = z.string().min(1);
const review = z.object({ domain:z.enum(evidenceDomains), status:z.enum(['unknown','documented','verified']), claimIds:z.array(id), reviewer:z.string().nullable(), reviewedRevision:z.string().nullable() });
const source = z.object({ id, title:id, url:z.string().url(), applicability:z.enum(['exact-target','adjacent-year','family','visual-reference','unresolved']), rights:id });
const claim = z.object({
  id, partId:id, domain:z.enum(evidenceDomains), subject:id, sourceIds:z.array(id).min(1), section:id,
  value:z.number().finite().nullable(), unit:z.string().nullable(), datum:z.string().nullable(), uncertainty:z.number().nonnegative().nullable(),
  method:z.enum(['source-reading','physical-measurement','physical-review']), referenceId:z.string().nullable(), notes:id,
});
const record = z.object({
  id, name:id, assemblyId:id, recordKind:z.enum(['modeled-group','gap-record']),
  geometry:z.enum(['present','absent','partial','unresolved']),
  gapKind:z.enum(['geometry','measurement','identity','fitment','reconciliation']).nullable(),
  relatedPartIds:z.array(id), reviews:z.array(review), claimIds:z.array(id), notes:id,
});

export const vehicleEvidenceSchema = z.object({
  schemaVersion:z.literal(1), vehicleId:id, configurationId:id, modelRevision:id,
  origin:z.object({ path:id, sha256:z.string().regex(/^[a-f0-9]{64}$/), baselineCommit:id }),
  configuration:z.object({ make:id, model:id, modelYear:z.number().int(), market:id, steering:id, engine:id, transmission:id, productionMonth:z.string().nullable(), referenceId:z.string().nullable(), identificationStatus:z.enum(['target-only','physically-identified']) }),
  assemblies:z.array(z.object({ id, name:id })), sources:z.array(source), claims:z.array(claim), records:z.array(record),
}).superRefine((data,ctx)=>{
  const fail=(message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,message});
  for(const [label,items] of [['records',data.records],['claims',data.claims],['sources',data.sources],['assemblies',data.assemblies]] as const){
    if(new Set(items.map(x=>x.id)).size!==items.length)fail(`Duplicate ${label} IDs`);
  }
  const records=new Map(data.records.map(x=>[x.id,x])), claims=new Map(data.claims.map(x=>[x.id,x])), sources=new Map(data.sources.map(x=>[x.id,x]));
  const assemblies=new Set(data.assemblies.map(x=>x.id));
  for(const c of data.claims){
    if(!records.has(c.partId))fail(`${c.id}: orphan part`);
    if(c.sourceIds.some(s=>!sources.has(s)))fail(`${c.id}: unknown source`);
    if(c.domain==='quantity'&&(!Number.isInteger(c.value)||(c.value??-1)<0||c.unit!=='count'))fail(`${c.id}: invalid quantity`);
    if(c.method==='physical-measurement'&&(c.value===null||!c.unit||!c.datum||c.uncertainty===null||!c.referenceId))fail(`${c.id}: incomplete measurement`);
  }
  if(data.configuration.identificationStatus==='physically-identified'&&!data.configuration.referenceId)fail('Physical identification requires a reference');
  for(const p of data.records){
    if(!assemblies.has(p.assemblyId))fail(`${p.id}: orphan assembly`);
    if(p.relatedPartIds.some(r=>!records.has(r)||r===p.id))fail(`${p.id}: invalid related part`);
    if(p.claimIds.some(c=>!claims.has(c)||claims.get(c)?.partId!==p.id))fail(`${p.id}: invalid claim ownership`);
    if(p.reviews.length!==evidenceDomains.length||new Set(p.reviews.map(r=>r.domain)).size!==evidenceDomains.length)fail(`${p.id}: missing or duplicate review domains`);
    for(const r of p.reviews){
      const evidence=r.claimIds.map(c=>claims.get(c));
      if(evidence.some(c=>!c||c.partId!==p.id||c.domain!==r.domain||!p.claimIds.includes(c.id)))fail(`${p.id}/${r.domain}: unrelated evidence`);
      if(r.status!=='unknown'&&!evidence.length)fail(`${p.id}/${r.domain}: evidence required`);
      if(r.status==='verified'){
        if(!r.reviewer||r.reviewedRevision!==data.modelRevision)fail(`${p.id}/${r.domain}: current revision review required`);
        if(data.configuration.identificationStatus!=='physically-identified')fail(`${p.id}/${r.domain}: exact reference required`);
        if(evidence.some(c=>!c||c.sourceIds.some(s=>sources.get(s)?.applicability!=='exact-target')))fail(`${p.id}/${r.domain}: exact-target evidence required`);
        if(r.domain==='dimensions'&&evidence.some(c=>c?.method!=='physical-measurement'))fail(`${p.id}: dimensions require measurements`);
        if(['fitment','procedure'].includes(r.domain)&&evidence.some(c=>c?.method!=='physical-review'||!c.referenceId))fail(`${p.id}: hands-on review required`);
        if(p.recordKind==='gap-record'||p.geometry!=='present')fail(`${p.id}: incomplete geometry cannot be verified`);
      }
    }
  }
});
export type VehicleEvidence = z.infer<typeof vehicleEvidenceSchema>;
export type PartEvidence = VehicleEvidence['records'][number];
export function evidenceCounts(data:VehicleEvidence){
  return {modeledGroups:data.records.filter(p=>p.recordKind==='modeled-group').length,
    absentGeometry:data.records.filter(p=>p.geometry==='absent').length,
    unresolvedRecords:data.records.filter(p=>['partial','unresolved'].includes(p.geometry)).length,
    verifiedParts:data.records.filter(p=>p.recordKind==='modeled-group'&&p.reviews.every(r=>r.status==='verified')).length,
    measuredParts:data.records.filter(p=>p.reviews.some(r=>r.domain==='dimensions'&&r.status==='verified')).length};
}
