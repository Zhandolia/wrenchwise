import raw from '../public/research/vehicle-catalog.json';
export type CatalogRecord={id:string;make:string;name:string;kind:string;bodyType:string;region:string;generation:string|null;introductionMonth:string|null;endMonth:string|null;configurationStatus:string;sourceIds:string[];sourceRecordId:string|null;sourceUrl:string;assetStatus:string;assetUrl:string|null;notes:string};
export const vehicleCatalog=raw as Omit<typeof raw,'records'> & {records:CatalogRecord[]};
export const assetLabels:Record<string,string>={'not-built':'3D model needed','provisional-assembly':'Provisional assembly','exterior-reference':'Exterior reference'};
export const catalogVehicles=vehicleCatalog.records.map(r=>({id:r.id,make:r.make,name:r.name,type:r.bodyType,detail:[r.generation,r.introductionMonth?`${r.introductionMonth.slice(0,4)}-${r.introductionMonth.slice(4)}`:null,r.region].filter(Boolean).join(' · '),available:!!r.assetUrl,assetStatus:r.assetStatus,sourceUrl:r.sourceUrl,notes:r.notes}));
export function findCatalogRecords(query:string,make='all',coverage='all'){
 const tokens=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 return vehicleCatalog.records.filter(r=>(make==='all'||r.make===make)&&(coverage==='all'||(coverage==='assets'?!!r.assetUrl:!r.assetUrl))&&tokens.every(t=>`${r.make} ${r.name} ${r.generation??''} ${r.introductionMonth??''} ${r.region} ${r.bodyType} ${r.id}`.toLowerCase().includes(t)));
}
