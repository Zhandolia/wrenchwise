/** @param {string} value */
const compact=value=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
/** @param {{name:string,author:string,make:string,family:string,bodyStyle:string,generation:string,sourceYear:number|null}} model @param {string} query */
export function matchesLibraryModel(model,query){
 const text=compact([model.name,model.author,model.make,model.family,model.bodyStyle,model.generation,model.sourceYear??''].join(' '));
 return query.trim().split(/\s+/).every(term=>text.includes(compact(term)));
}
