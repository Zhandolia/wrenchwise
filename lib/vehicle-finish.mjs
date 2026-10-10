// Presentation-only paint treatment. Explicit per-asset material names prevent
// glass, lamps, tyres, interiors and mechanical parts from being painted silver.
// Shared texture atlases need authored paint masks; do not strip their textures.
export const silverPaintMaterials = {
 'lexus-ls-ucf10':['1990 dark jade pearl','1990 grey jade lower cladding'],
 'lexus-ls-ucf20':['1998 dark emerald pearl','1998 green lower cladding'],
 'lexus-ls-ucf30':['pearlescent body paint','lower body finish'],
 'lexus-ls-xf40':['pearlescent body paint','lower body finish'],
 'gs300-assembly':['Millennium silver inspired - visual approximation','Pearl silver paint'],
 'lexus-lc-500-3f6118':['body'],
 'lexus-gs-350-2011-a89d18':['Paint'],
 'lexus-ls-500-f-sport-bc240e':['Body'],
 'toyota-ae86-sprinter-trueno-zenki-a5737b':['Primary'],
 'toyota-supra-mk-iv-1994-eb9bb1':['TOYOTA_SUPRA_CAR_PAINT'],
 '1996-toyota-mr2-w20-f66020':['body_paint'],
 'toyota-camry-2020-236a5a':['Paint_Color'],
 'toyota-prius-2012-04eaf6':['Color.002'],
 'toyota-prius-2020-ad0d92':['Paint_Color'],
 'lexus-rx-350-rigged-rigged-driver-human-6b9a19':['Paint.002'],
};
export function applyVehicleFinish(material, assetUrl='') {
 const id=assetUrl.split('?')[0].split('/').at(-1)?.replace(/\.glb$/,'');
 if(!silverPaintMaterials[id]?.includes(material.name)||!material.color)return false;
 // Keep maps and alpha intact; this treatment is only approved for untextured paint.
 if(material.map||material.transparent||material.opacity<1)return false;
 material.color.set('#aeb4b8');
 material.metalness=.58;material.roughness=.34;
 if('clearcoat' in material){material.clearcoat=.45;material.clearcoatRoughness=.25;}
 material.needsUpdate=true;
 return true;
}
