const supportedRequiredExtensions=new Set(['KHR_materials_unlit','KHR_mesh_quantization','EXT_meshopt_compression']);
const maxDecodedBufferBytes=256*1024*1024;

export function inspectGlb(bytes:ArrayBuffer){
 if(bytes.byteLength<20)throw new Error('This is not a complete GLB file.');
 const view=new DataView(bytes);
 if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.byteLength)throw new Error('Choose a valid binary glTF 2.0 (.glb) file.');
 const length=view.getUint32(12,true);
 if(view.getUint32(16,true)!==0x4e4f534a||length>bytes.byteLength-20)throw new Error('The GLB manifest is invalid.');
 const json=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,length)));
 if(json.asset?.version!=='2.0')throw new Error('Only glTF 2.0 is supported.');
 if(!json.meshes?.length)throw new Error('The model needs at least one mesh.');
 if([...(json.buffers||[]),...(json.images||[])].some((x:any)=>x.uri))throw new Error('Use a self-contained GLB with embedded geometry and textures.');
 if(json.extensionsRequired?.some((s:string)=>!supportedRequiredExtensions.has(s)))throw new Error('This model requires an unsupported extension. Use an uncompressed or Meshopt-compressed GLB.');

 // File size alone cannot bound the decoder's allocations. Check both declared
 // buffers and actual Meshopt output sizes before the browser loads the model.
 let declaredBytes=0,decodedBytes=0;
 for(const buffer of json.buffers||[]){
  if(!Number.isSafeInteger(buffer.byteLength)||buffer.byteLength<0||buffer.byteLength>maxDecodedBufferBytes-declaredBytes)throw new Error('Optimize this model to at most 256 MB of decoded buffers.');
  declaredBytes+=buffer.byteLength;
 }
 for(const bufferView of json.bufferViews||[]){
  const meshopt=bufferView.extensions?.EXT_meshopt_compression;
  if(!meshopt)continue;
  const outputBytes=meshopt.count*meshopt.byteStride;
  if(!Number.isSafeInteger(meshopt.count)||meshopt.count<=0||!Number.isSafeInteger(meshopt.byteStride)||meshopt.byteStride<=0||meshopt.byteStride>256||!Number.isSafeInteger(outputBytes)||outputBytes>maxDecodedBufferBytes-decodedBytes)throw new Error('Optimize this model to at most 256 MB of decoded buffers.');
  if(outputBytes!==bufferView.byteLength)throw new Error('The compressed buffer size does not match its declared output.');
  decodedBytes+=outputBytes;
 }
 if((json.nodes?.length||0)>1500)throw new Error('This model has too many nodes. Keep it below 1,500 nodes.');
 let vertices=0;
 for(const mesh of json.meshes)for(const primitive of mesh.primitives||[]){vertices+=json.accessors?.[primitive.attributes?.POSITION]?.count||0;}
 if(vertices>1000000)throw new Error('Optimize this model to fewer than one million vertices.');
 return json;
}
