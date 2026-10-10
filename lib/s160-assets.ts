import revision from '@/modeling/validation/s160-timing-2026-10-10.json';
// Keep the revised mesh and its inventory together across browser/CDN caches.
export function versionS160Asset(path:string){
 if(!/^\/models\/gs300-(assembly\.glb|parts\.json|evidence\.json)$/.test(path))return path;
 return path+'?v='+revision.sha256.slice(0,16);
}
