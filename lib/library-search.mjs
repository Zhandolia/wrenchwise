/** @param {string} value */
const compact=value=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
/** @param {{name:string,author:string,make:string,family:string,bodyStyle:string,generation:string,sourceYear:number|null,years?:string}} model @param {string} query */
export function matchesLibraryModel(model,query){
 const text=compact([model.name,model.author,model.make,model.family,model.bodyStyle,model.generation,model.sourceYear??''].join(' '));
 // Generation references advertise a range; downloadable assets only advertise their source year.
 const range=model.years?.match(/\b(\d{4})[–—-](\d{4})\b/);
 return query.trim().split(/\s+/).every(term=>{
  const normalized=compact(term);
  if(/^\d{4}$/.test(normalized)&&Number(normalized)>=1900&&Number(normalized)<=2100){
   const year=Number(normalized);
   return model.sourceYear===year||!!(range&&year>=Number(range[1])&&year<=Number(range[2]));
  }
  return text.includes(normalized);
 });
}

/** Resolve only known entries, so an invalid deep link never mixes one entry's title with another asset.
 * @template {{id:string,bodyGroup:string}} T
 * @param {T[]} entries @param {string} search
 */
export function readLibrarySelection(entries,search){
 const params=new URLSearchParams(search);
 const selected=entries.find(entry=>entry.id===(params.get('model')||params.get('generation')));
 return {id:(selected||entries[0]).id,group:selected?.bodyGroup||'All'};
}

/** Keep unrelated query parameters and anchors while switching between an asset and a pending generation.
 * @param {string} href @param {{id:string,assetUrl?:string}} entry
 */
export function librarySelectionUrl(href,entry){
 const url=new URL(href);
 url.searchParams.delete('model');url.searchParams.delete('generation');
 url.searchParams.set(entry.assetUrl?'model':'generation',entry.id);
 return url.pathname+url.search+url.hash;
}

/** @param {{make:string,family:string,generation:string,bodyGroup:string,name:string}} a @param {{make:string,family:string,generation:string,bodyGroup:string,name:string}} b */
export function compareLibraryEntries(a,b){
 const family=a.make.localeCompare(b.make)||a.family.localeCompare(b.family);
 if(family)return family;
 const order=['first','second','third','fourth','fifth','sixth'];
 const rank=(/** @type {string} */ text)=>{const i=order.findIndex(v=>text.toLowerCase().includes(v+' generation'));return i<0?99:i;};
 return rank(a.generation)-rank(b.generation)||a.bodyGroup.localeCompare(b.bodyGroup)||a.name.localeCompare(b.name);
}
