/** @param {string} value */
const compact=value=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
/** @param {{name:string,author:string,make:string,family:string,bodyStyle:string,generation:string,sourceYear:number|null}} model @param {string} query */
export function matchesLibraryModel(model,query){
 const text=compact([model.name,model.author,model.make,model.family,model.bodyStyle,model.generation,model.sourceYear??''].join(' '));
 return query.trim().split(/\s+/).every(term=>text.includes(compact(term)));
}

/** @param {{make:string,family:string,generation:string,bodyGroup:string,name:string}} a @param {{make:string,family:string,generation:string,bodyGroup:string,name:string}} b */
export function compareLibraryEntries(a,b){
 const family=a.make.localeCompare(b.make)||a.family.localeCompare(b.family);
 if(family)return family;
 const order=['first','second','third','fourth','fifth','sixth'];
 const rank=(/** @type {string} */ text)=>{const i=order.findIndex(v=>text.toLowerCase().includes(v+' generation'));return i<0?99:i;};
 return rank(a.generation)-rank(b.generation)||a.bodyGroup.localeCompare(b.bodyGroup)||a.name.localeCompare(b.name);
}
