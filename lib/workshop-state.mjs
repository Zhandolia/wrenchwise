/** Preserve the active vehicle and optional personal asset in refresh/share links. */
export function workshopSelectionUrl(currentUrl,vehicle,assetId='demo'){
 const url=new URL(currentUrl);url.searchParams.set('vehicle',vehicle);
 if(assetId==='demo')url.searchParams.delete('asset');else url.searchParams.set('asset',assetId);
 return url;
}
/** Assets can only restore into the vehicle to which they were imported. */
export function resolveSavedAsset(models,vehicle,assetId){
 return assetId==='demo'?undefined:models.find(m=>m.id===assetId&&m.vehicle===vehicle);
}
/** A new identity on each scope change also rejects an A -> B -> A stale response. */
export function createScopeGuard(){
 let current={key:''};
 return {enter(key){if(current.key!==key)current={key};return current;},isCurrent(token){return token===current;}};
}
/** -1 is a vehicle note; legacy chapter numbers only apply to the GS300 study. */
export function noteContextLabel(note,vehicle){
 return vehicle==='gs300'&&note.chapter>=0?'GS 300 exploration · Chapter '+(note.chapter+1):'Vehicle note';
}
export function isValidNoteChapter(chapter){return Number.isInteger(chapter)&&chapter>=-1&&chapter<=5;}
