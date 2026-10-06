import assetLicenses from '../research/asset-licenses.json';
import {vehicleCatalog} from './vehicle-catalog';
export {catalogVehicles as vehicles} from './vehicle-catalog';
export const chapters=[
 {title:'Explore the engine bay',short:'Engine anatomy',part:'Engine block',body:'Start with the layout. Rotate the model to see the cylinder head, intake runners, and the front of the engine. The stock intake crossover and VVT-i hardware now follow GS300 references; individual dimensions remain estimates.',tip:'Select a visible part to identify it.'},
 {title:'Identify the timing covers',short:'The protective layer',part:'Timing covers',body:'Timing covers shield the timing assembly. Use the cover control to reveal the belt and pulleys beneath. The three removable cover groups now include documented fastener quantities. Hole locations and removal paths still need validation.',tip:'Toggle covers to see what sits underneath.'},
 {title:'Trace the timing belt',short:'A synchronized system',part:'Timing belt',body:'The belt connects the crankshaft and camshaft sprockets. Follow the highlighted loop to understand that relationship. Its routing, timing marks, and tooth counts here are illustrative.',tip:'Timing alignment must come from the correct factory repair manual.'},
 {title:'Locate the water pump',short:'The cooling system',part:'Water pump',body:'Find the highlighted pump near the timing assembly. Its accessory pulley, four retaining nuts, six mounting bolts, gasket, O-ring and bypass pipes are separate groups. Casting and seal dimensions remain unverified.',tip:'Use the exact vehicle and engine variant when checking replacement parts.'},
 {title:'Inspect the tensioner',short:'Keeping the belt controlled',part:'Tensioner',body:'Locate the hydraulic actuator and the separate idler beside the belt. This chapter introduces their relationship. Compression method, installation, tension settings, and service limits require verified service documentation.',tip:'Use exploded view to separate overlapping components.'},
 {title:'Review the assembly',short:'Put the picture together',part:'Engine block',body:'Return to the assembled view and review how the parts relate. You have completed a layout exploration, not a repair qualification. A complete repair guide still needs validated geometry, fasteners, specifications, and expert review.',tip:'Contribute a model or leave a question to help develop this workshop.'}
];
export type ModelRecord={id:string;vehicle:string;name:string;fitment:string;source:string;license:string;size:number;created_at:number};
export type CommentRecord={id:string;chapter:number;author:string;body:string;created_at:number};

export const catalogExteriors:Record<string,string>=Object.fromEntries(vehicleCatalog.records.filter(r=>r.assetStatus==='exterior-reference'&&r.assetUrl).map(r=>[r.id,r.assetUrl!]));
export const exteriorCredits:Record<string,{author:string;source:string}>=Object.fromEntries(assetLicenses.map(a=>[a.vehicle,{author:a.author,source:a.sourceUrl}]));
