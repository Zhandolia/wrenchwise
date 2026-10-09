import {z} from 'zod';
const id=z.string().min(1);
export const capturePlanSchema=z.object({
 schemaVersion:z.literal(1),configurationId:id,referenceId:id.nullable(),coordinateConvention:id,
 datums:z.array(z.object({id,description:id})),
 captures:z.array(z.object({id,partIds:z.array(id).min(1),view:id,status:z.enum(['pending','captured']),sourceId:id.nullable()})),
 measurements:z.array(z.object({id,partId:id,feature:id,datumId:id,unit:z.enum(['mm','m','degrees']),status:z.enum(['pending','measured']),value:z.number().finite().nullable(),uncertainty:z.number().finite().nonnegative().nullable(),method:id.nullable(),sourceId:id.nullable(),measuredBy:id.nullable()})),
 limitations:z.array(id),
}).superRefine((p,ctx)=>{
 const fail=(message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,message});
 for(const rows of [p.datums,p.captures,p.measurements])if(new Set(rows.map(r=>r.id)).size!==rows.length)fail('Duplicate capture-plan IDs');
 for(const c of p.captures){
  if(c.status==='captured'&&(!p.referenceId||!c.sourceId))fail(`${c.id}: reference and source required`);
  if(c.status==='pending'&&c.sourceId!==null)fail(`${c.id}: pending capture must not claim a source`);
 }
 for(const m of p.measurements){
  if(!p.datums.some(d=>d.id===m.datumId))fail(`${m.id}: unknown datum`);
  const fields=[m.value,m.uncertainty,m.method,m.sourceId,m.measuredBy];
  if(m.status==='measured'&&(!p.referenceId||fields.some(v=>v===null)))fail(`${m.id}: incomplete measured record`);
  if(m.status==='pending'&&fields.some(v=>v!==null))fail(`${m.id}: pending measurement must remain empty`);
 }
});
export function validateCaptureLinks(plan:z.infer<typeof capturePlanSchema>,configuration:{configurationId:string;configuration:{referenceId:string|null;identificationStatus:string}},partIds:Set<string>,sourceIds:Set<string>){
 if(plan.configurationId!==configuration.configurationId||plan.referenceId!==configuration.configuration.referenceId)throw Error('Capture configuration/reference mismatch');
 if(plan.referenceId&&configuration.configuration.identificationStatus!=='physically-identified')throw Error('Capture requires physical identification');
 for(const c of plan.captures){for(const p of c.partIds)if(!partIds.has(p))throw Error(`Unknown capture part: ${p}`);if(c.sourceId&&!sourceIds.has(c.sourceId))throw Error(`Unknown capture source: ${c.sourceId}`);}
 for(const m of plan.measurements){if(!partIds.has(m.partId))throw Error(`Unknown measurement part: ${m.partId}`);if(m.sourceId&&!sourceIds.has(m.sourceId))throw Error(`Unknown measurement source: ${m.sourceId}`);}
}
