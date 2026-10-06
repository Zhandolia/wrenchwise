/** Browsing taxonomy only. Original source/vehicle IDs remain the storage keys. */
export const slug=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function buildFamilies(records,rules){
 const families=new Map();
 for(const r of records){
  let name=r.name;
  if(r.make==='Lexus')name=r.name.match(/^(CT|ES|GS|GX|HS|IS|LBX|LC|LFA|LM|LS|LX|NX|RC|RX|RZ|SC|TX|TZ|UX)(?=\s|$)/)?.[1]||name;
  for(const [canonical,aliases]of Object.entries(rules.aliases[r.make]||{}))if(aliases.includes(r.name)||canonical.toLowerCase()===r.name.toLowerCase())name=canonical;
  const id=`${slug(r.make)}-${slug(name)}`;
  if(!families.has(id))families.set(id,{id,make:r.make,name,recordIds:[],generations:[]});
  const family=families.get(id),target=rules.targets[r.id];
  // A source's lineage ordinal is not a global chassis generation. Keep it unresolved.
  const generationId=target?.generationId||(r.kind==='nameplate-overview'?'unresolved':r.kind==='historical-record'?`source-${r.id}`:`target-${r.id}`);
  const label=target?.generationLabel||(r.kind==='nameplate-overview'?'Generation not selected':r.kind==='historical-record'?`${r.name} · ${r.generation} · ${r.introductionMonth?.slice(0,4)||'date unknown'}`:r.generation||'Generation unresolved');
  let generation=family.generations.find(g=>g.id===generationId);
  if(!generation){generation={id:generationId,label,recordIds:[]};family.generations.push(generation);}
  generation.recordIds.push(r.id);family.recordIds.push(r.id);
  r.familyId=id;r.generationId=generationId;r.engineId=target?.engineId||null;
 }
 return [...families.values()].sort((a,b)=>a.make.localeCompare(b.make)||a.name.localeCompare(b.name));
}
export function matchesCatalogRecord(r,query){
 const tokens=query.trim().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
 const words=`${r.make} ${r.name} ${r.generation??''} ${r.introductionMonth??''} ${r.region} ${r.bodyType} ${r.engineId??''}`.toLowerCase().split(/[^a-z0-9]+/);
 const compactName=r.name.toLowerCase().replace(/[^a-z0-9]/g,'');
 return tokens.every(t=>words.some(w=>w.startsWith(t))||compactName.startsWith(t));
}
