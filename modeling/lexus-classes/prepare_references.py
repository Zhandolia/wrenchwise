"""Prepare licensed ES and Altezza-derived IS development geometry.
Blender -b --python prepare_references.py -- es|is source.glb output-dir
Source attribution, source identity and uncertainty are retained in exported metadata.
"""
import bpy,sys,json,hashlib,math,re
from pathlib import Path
from mathutils import Vector,Matrix
kind,src,out=sys.argv[sys.argv.index('--')+1:];src=Path(src);out=Path(out);out.mkdir(parents=True,exist_ok=True)
expected={'es':'b908984f9ae2c513bc88cff7b6265b490bffe43453cebb324cbb421ee3bf05c3','is':'dbde431554c4ef1f1236a894bb0dbb761501283c41cdeb448dd4a22f38e1368e'}
assert hashlib.sha256(src.read_bytes()).hexdigest()==expected[kind], 'Re-review changed source'
uid='ec3a23f5653d44a68b4b2d5d6c3a582b' if kind=='es' else '0396aafda6294dc4843250d979783656'
author='David_Holiday' if kind=='es' else 'BaizilikoVIIChai'
base='es-xv70-reference' if kind=='es' else 'is-xe10-development'
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(src))
obs=[o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.polygons)>0];pts=[o.matrix_world@v.co for o in obs for v in o.data.vertices];lo=Vector([min(v[i]for v in pts)for i in range(3)]);hi=Vector([max(v[i]for v in pts)for i in range(3)])
length=4.97586 if kind=='es' else 4.4;scale=length/(hi.y-lo.y);center=(hi+lo)/2
parts=[]
worlds={o.name:o.matrix_world.copy() for o in obs}
for i,o in enumerate(obs):
 o.data=o.data.copy();o.data.transform(worlds[o.name]);o.parent=None;o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_world=Matrix.Identity(4);o.delta_location=(0,0,0);o.delta_rotation_euler=(0,0,0);o.delta_scale=(1,1,1)
 for v in o.data.vertices:
  v.co=Vector(((v.co.x-center.x)*scale,(v.co.y-center.y)*scale,(v.co.z-lo.z)*scale))
  if kind=='is':v.co.x=-v.co.x;v.co.y=-v.co.y
 mat=o.data.materials[0].name.lower() if o.data.materials else ''
 if kind=='es':
  system='wheels' if any(t in mat for t in ['lowtire','lowrim','lowbrake'])else 'interior'if any(t in mat for t in ['lowleather','lowint','lowplastic_int'])else'body'
  label=mat.split('2019_low')[-1].replace('edge_color000255','paint surface')
 else:
  idx=int(o.name.split('_')[-1]);system='wheels'if 16<=idx<=66 else 'body'
  label={'material':'body panels','material_1':'panel borders','material_3':'dark trim','material_4':'glazing','material_11':'tire geometry','material_12':'brake finish','material_13':'wheel and mechanical surfaces'}.get(mat,'source surface')
 pid=base+'-mesh-'+str(i+1).zfill(3);o['partId']=pid;o['system']=system;o['label']=label.title()+' '+str(i+1);o['accuracy']='unverified';o['sourceUID']=uid
 parts.append({'id':pid,'name':o['label'],'system':system,'sourceMesh':o.name,'sourceMaterial':mat,'accuracy':'unverified','identification':'Material-group label; not an OEM part identity'})
for ob in obs:ob.data.update()
bpy.context.view_layer.update()
for o in list(bpy.context.scene.objects):
 if o not in obs:bpy.data.objects.remove(o,do_unlink=True)
for m in bpy.data.materials:
 if not m.use_nodes:continue
 p=m.node_tree.nodes.get('Principled BSDF')
 if not p:continue
 n=m.name.lower();p.inputs['Base Color'].default_value=m.diffuse_color
 if kind=='es':
  if 'carpaint'in n or 'edge_color' in n:
   p.inputs['Base Color'].default_value=(.008,.065,.29,1);p.inputs['Metallic'].default_value=.45;p.inputs['Roughness'].default_value=.36;p.inputs['Coat Weight'].default_value=.3
  elif 'tire'in n:p.inputs['Base Color'].default_value=(.008,.01,.012,1);p.inputs['Roughness'].default_value=.83;p.inputs['Metallic'].default_value=0
  elif 'chrome'in n or 'rim'in n or 'metal'in n:p.inputs['Metallic'].default_value=.85;p.inputs['Roughness'].default_value=.23
  elif 'leather'in n or 'plastic'in n or 'int1'in n:p.inputs['Roughness'].default_value=.65;p.inputs['Metallic'].default_value=.02
  if 'glass_clear'in n:p.inputs['Base Color'].default_value=(.08,.13,.15,.34);p.inputs['Alpha'].default_value=.34;p.inputs['Roughness'].default_value=.13;m.surface_render_method='DITHERED'
 else:
  if n in ['material','material_1']:
   p.inputs['Base Color'].default_value=(.24,.27,.3,1);p.inputs['Metallic'].default_value=.65;p.inputs['Roughness'].default_value=.3;p.inputs['Coat Weight'].default_value=.7
  elif n=='material_11':p.inputs['Base Color'].default_value=(.01,.012,.014,1);p.inputs['Metallic'].default_value=0;p.inputs['Roughness'].default_value=.85
  elif n in ['material_13','material_14']:p.inputs['Base Color'].default_value=(.32,.35,.38,1);p.inputs['Metallic'].default_value=.8;p.inputs['Roughness'].default_value=.27
  elif n in ['material_4','.001_0']:p.inputs['Base Color'].default_value=(.02,.045,.058,1);p.inputs['Metallic'].default_value=.25;p.inputs['Roughness'].default_value=.14
  else:p.inputs['Roughness'].default_value=.55
# Recalculate paint shading after coordinate baking; keep panel topology intact.
if kind=='es':
 for o in obs:
  if 'paint' in o.get('label','').lower():
   o.data.normals_split_custom_set([(0,0,0)]*len(o.data.loops))
   for p in o.data.polygons:p.use_smooth=True
# Preserve source topology; no fictitious engine, transmission or service hardware.
limits=['No verified engine/transmission or repair anatomy','Uniform length normalization is not dimensional validation','Mesh groups are not OEM part identities','PBR materials adapted; source has no bitmap texture maps','Market, trim, wheel option and production month unverified']
if kind=='is':limits+=['Source is Toyota Altezza, not a validated Lexus IS configuration','Modified wheels, bumper/trim, blank lamp surfaces and missing cabin detail require reconstruction','This development study must not be labeled a stock Lexus replica']
bpy.context.view_layer.update()
pts=[o.matrix_world@v.co for o in obs for v in o.data.vertices];low=Vector([min(v[i]for v in pts)for i in range(3)]);high=Vector([max(v[i]for v in pts)for i in range(3)])
manifest={'id':base,'sourceTitle':'2021 Lexus ES350 F Sport'if kind=='es'else'Draft request: Toyota Altezza 2001','sourceUID':uid,'sourceUrl':'https://sketchfab.com/3d-models/'+uid,'author':author,'license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'boundsMetres':list(high-low),'parts':parts,'verifiedParts':0,'limits':limits}
assert abs((high-low).y-length)<0.002, 'Length normalization failed'
assert abs(low.z)<0.002, 'Ground alignment failed'
(out/(base+'-parts.json')).write_text(json.dumps(manifest,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(out/(base+'.blend')))
bpy.ops.export_scene.gltf(filepath=str(out/(base+'.glb')),export_format='GLB',export_extras=True,export_copyright=manifest['sourceTitle']+' by '+author+' — CC BY 4.0. Adapted by Wrenchwise; unverified geometry.')
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=24;s.world=bpy.data.worlds.new('World');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.17,.21,1)
c=(high+low)/2;span=max(high-low)
for d,power in [((3,-4,6),1800),((-4,-2,3),1100),((1,4,5),1900)]:
 bpy.ops.object.light_add(type='AREA',location=c+Vector(d));o=bpy.context.object;o.data.energy=power;o.data.size=5;o.rotation_euler=(c-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';s.render.resolution_x=1000;s.render.resolution_y=800;s.render.resolution_percentage=100
for name,d in [('front',(1,-1,.55)),('rear',(-1,1,.5)),('left',(1,0,.03)),('right',(-1,0,.03)),('top',(0,0,1)),('underbody',(0,0,-1))]:
 cam.data.ortho_scale=span*(1.55 if name in ['top','underbody']else 1.23);cam.location=c+Vector(d).normalized()*span*2;cam.rotation_euler=(c-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
print(json.dumps({'vehicle':kind,'groups':len(parts),'bounds':list(high-low)}))
