// Preserve the author's source geometry and texture; add attribution and viewer IDs only.
// node modeling/lexus-classes/prepare_es300_scan.mjs /path/to/original.glb
import fs from 'node:fs';
import crypto from 'node:crypto';
const source=fs.readFileSync(process.argv[2]);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourceSha256='8e4af2bef0657a53478ee3dcae2fdee6d67843e3889c5d503399167e2e725c0b';
if(sha(source)!==sourceSha256)throw Error('Changed source: inspect before publishing');
const size=source.readUInt32LE(12),gltf=JSON.parse(source.subarray(20,20+size));
const title='1997 Lexus ES 300 Photoscan',author='Giz',sourceUrl='https://sketchfab.com/3d-models/5eaed54fd300415a9ea88505a15cc750';
const limits=['1997 source scan, not the 2000 workshop target','One fused mesh; no individual service parts','Roof and windshield have severe scan defects','Closed hood; no usable engine-bay geometry','Ground slab and incomplete underside; no mechanical underbody','Source scale is unverified; no dimensions or surfaces certified'];
gltf.asset.copyright=`${title} by ${author} — CC BY 4.0. Viewer metadata added by Wrenchwise; geometry unchanged.`;
gltf.asset.extras={...gltf.asset.extras,title,author,sourceUrl,license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourceSha256,limitations:limits};
for(const n of gltf.nodes)if(n.mesh!==undefined)n.extras={...n.extras,partId:'es300-1997-source-scan',system:'body',accuracy:'unverified',label:'Fused source scan, not a service part'};
const json=Buffer.from(JSON.stringify(gltf)),padding=Buffer.alloc((4-json.length%4)%4,32),binary=source.subarray(20+size),header=Buffer.from(source.subarray(0,20));
header.writeUInt32LE(20+json.length+padding.length+binary.length,8);header.writeUInt32LE(json.length+padding.length,12);
const output=Buffer.concat([header,json,padding,binary]);
const dir='public/models/research';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(`${dir}/es300-1997-source-scan.glb`,output);
const report={title,author,authorUrl:'https://sketchfab.com/Gizmitt',sourceUrl,license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourceSha256,outputSha256:sha(output),binaryChunkSha256:sha(binary),sourceBytes:source.length,outputBytes:output.length,triangles:79896,meshCount:1,verifiedParts:0,assetUrl:'/models/research/es300-1997-source-scan.glb',status:'research-reference-only',changes:['Attribution and stable viewer metadata only; original binary geometry and texture retained'],limitations:limits};
fs.writeFileSync(`${dir}/es300-1997-source-scan.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
