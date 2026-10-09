import {appPath,localWorkshop} from './app-path';
import {inspectGlb} from './glb';
import {vehicleCatalog} from './vehicle-catalog';
import type {ModelRecord,CommentRecord} from './workshop-data';
type StoredModel=ModelRecord & {file:Blob};
type StoredComment=CommentRecord & {vehicle:string};
let database:Promise<IDBDatabase>|undefined;
function openDatabase(){
 if(!database)database=new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open('wrenchwise-local-workshop',1);
  request.onupgradeneeded=()=>{
   request.result.createObjectStore('models',{keyPath:'id'});
   const notes=request.result.createObjectStore('comments',{keyPath:'id'});notes.createIndex('vehicle','vehicle');
  };
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=undefined};resolve(db)};
  request.onerror=()=>{database=undefined;reject(Error('Browser storage is unavailable. Allow site storage to save local models and notes.'))};
  request.onblocked=()=>reject(Error('Close other Wrenchwise tabs and try again.'));
 });
 return database;
}
async function stored<T>(store:string,mode:IDBTransactionMode,action:(s:IDBObjectStore)=>IDBRequest):Promise<T>{
 const db=await openDatabase();return new Promise((resolve,reject)=>{
  const tx=db.transaction(store,mode),request=action(tx.objectStore(store));
  tx.oncomplete=()=>resolve(request.result as T);
  tx.onerror=tx.onabort=()=>reject(Error('Could not save or read browser storage. Check available space and site storage permissions.'));
 });
}
async function server<T>(path:string,init?:RequestInit):Promise<T>{
 const r=await fetch(appPath(path),init);const data=await r.json();if(!r.ok)throw Error(data&&typeof data==='object'&&'error' in data?String(data.error):'Request failed.');return data as T;
}
export async function listModels():Promise<ModelRecord[]>{
 if(!localWorkshop)return server('/api/models');
 const models=await stored<StoredModel[]>('models','readonly',s=>s.getAll());
 return models.map(({file,...m})=>m).sort((a,b)=>b.created_at-a.created_at);
}
export async function modelUrl(id:string):Promise<string>{
 if(!localWorkshop)return appPath('/api/models/'+encodeURIComponent(id));
 const model=await stored<StoredModel|undefined>('models','readonly',s=>s.get(id));
 if(!model)throw Error('This local model is missing. Import its GLB again.');
 return URL.createObjectURL(model.file);
}
export async function listComments(vehicle:string,signal?:AbortSignal):Promise<CommentRecord[]>{
 if(!localWorkshop)return server('/api/comments?vehicle='+encodeURIComponent(vehicle),{signal});
 const notes=await stored<StoredComment[]>('comments','readonly',s=>s.index('vehicle').getAll(vehicle));
 return notes.sort((a,b)=>b.created_at-a.created_at);
}
export async function saveComment(input:{vehicle:string;chapter:number;author:string;body:string}):Promise<CommentRecord>{
 if(!localWorkshop)return server('/api/comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 const author=input.author.trim(),body=input.body.trim();
 if(!vehicleCatalog.records.some(v=>v.id===input.vehicle)||!Number.isInteger(input.chapter)||input.chapter<0||input.chapter>5||!author||author.length>60||!body||body.length>2000)throw Error('Add your name and a note of up to 2,000 characters.');
 const record={...input,author,body,id:crypto.randomUUID(),created_at:Date.now()};
 await stored('comments','readwrite',s=>s.add(record));return record;
}
export async function importModel(form:FormData):Promise<ModelRecord>{
 if(!localWorkshop)return server('/api/models',{method:'POST',body:form});
 const file=form.get('file');
 if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.glb')||file.size>20*1024*1024)throw Error('Choose a .glb file under 20 MB.');
 const field=(name:string)=>String(form.get(name)||'').trim();
 const vehicle=field('vehicle'),name=field('name'),fitment=field('fitment'),source=field('source'),license=field('license');
 if(!vehicleCatalog.records.some(v=>v.id===vehicle)||!name||name.length>100||!fitment||fitment.length>180||!source||source.length>500||!license||license.length>100||field('rights')!=='yes')throw Error('Complete the model information and confirm permission to use the asset.');
 inspectGlb(await file.arrayBuffer());
 const record={id:crypto.randomUUID(),vehicle,name,fitment,source,license,size:file.size,created_at:Date.now()};
 await stored('models','readwrite',s=>s.add({...record,file}));return record;
}
