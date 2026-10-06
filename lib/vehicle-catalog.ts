import {matchesCatalogRecord} from '../scripts/catalog-families.mjs';
import raw from '../public/research/vehicle-catalog.json';
export type CatalogRecord={id:string;familyId:string;generationId:string;engineId:string|null;make:string;name:string;kind:string;bodyType:string;region:string;generation:string|null;introductionMonth:string|null;endMonth:string|null;configurationStatus:string;sourceIds:string[];sourceRecordId:string|null;sourceUrl:string;assetStatus:string;assetUrl:string|null;notes:string};
export const vehicleCatalog=raw as Omit<typeof raw,'records'> & {records:CatalogRecord[]};
export const assetLabels:Record<string,string>={'not-built':'3D model needed','provisional-assembly':'Provisional assembly','exterior-reference':'Exterior reference'};
export const catalogVehicles=vehicleCatalog.records.map(r=>({id:r.id,make:r.make,name:r.name,type:r.bodyType,detail:[r.generation,r.introductionMonth?`${r.introductionMonth.slice(0,4)}-${r.introductionMonth.slice(4)}`:null,r.region].filter(Boolean).join(' · '),available:!!r.assetUrl,assetStatus:r.assetStatus,sourceUrl:r.sourceUrl,notes:r.notes}));
export function findCatalogRecords(query:string,make='all',coverage='all'){
 return vehicleCatalog.records.filter(r=>(make==='all'||r.make===make)&&(coverage==='all'||(coverage==='assets'?!!r.assetUrl:!r.assetUrl))&&matchesCatalogRecord(r,query));
}

export type CatalogFamily=typeof raw.families[number];
export function findCatalogFamilies(query:string,make='all',coverage='all'){
 const matching=new Set(findCatalogRecords(query,make,coverage).map(r=>r.id));
 return vehicleCatalog.families.map(f=>({...f,recordIds:f.recordIds.filter(id=>matching.has(id)),generations:f.generations.map(g=>({...g,recordIds:g.recordIds.filter(id=>matching.has(id))})).filter(g=>g.recordIds.length)})).filter(f=>f.recordIds.length);
}
