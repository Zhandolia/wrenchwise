"""Prepare the audited CC BY GR Supra visual reference. No mechanical accuracy claim.
Blender 4.5: --python prepare_supra.py -- source.glb output-directory
"""
import bpy,sys,json,hashlib,re,math
from pathlib import Path
from mathutils import Vector,Matrix
args=sys.argv[sys.argv.index('--')+1:];source=Path(args[0]);out=Path(args[1]);out.mkdir(parents=True,exist_ok=True)
assert hashlib.sha256(source.read_bytes()).hexdigest()=='66d783670fd31ff8ac98d650327a503637ec2e6ee58bc7ec81203eade5e7e6ac','Review changed source first'
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(source))
obs=[o for o in bpy.context.scene.objects if o.type=='MESH']
pts=[o.matrix_world@Vector(v) for o in obs for v in o.bound_box]
lo=Vector([min(v[i] for v in pts) for i in range(3)]);hi=Vector([max(v[i] for v in pts) for i in range(3)])
# Scale from rounded US brochure length, preserving source proportions. This is not metrology.
scale=4.3815/(hi.y-lo.y);center=(lo+hi)/2
parts=[]
for index,o in enumerate(obs):
 o.data.transform(o.matrix_world);o.parent=None;o.matrix_world=Matrix.Identity(4)
 for v in o.data.vertices:v.co=Vector(((v.co.x-center.x)*scale,(v.co.y-center.y)*scale,(v.co.z-lo.z)*scale))
 name=o.name
 system='wheels' if name.startswith(('TYRE','Rim','Disk','Hub')) else 'interior' if any(k in name.lower() for k in ['interior','int_','seat','belt','stitch','console','monitor','speed','pedal','torpeda','helm','ponteiro']) else 'body'
 part_id='supra-'+re.sub('[^a-z0-9]+','-',name.lower()).strip('-')
 o['partId']=part_id;o['system']=system;o['label']=name.replace('_',' ');o['accuracy']='unverified';o['sourceUID']='86f609515557438e93bd3c6145ef99ca'
 parts.append({'id':part_id,'name':o['label'],'system':system,'accuracy':'unverified','sourceMesh':name})
for o in list(bpy.context.scene.objects):
 if o.type=='EMPTY':bpy.data.objects.remove(o,do_unlink=True)
for m in bpy.data.materials:
 if not m.use_nodes:continue
 p=m.node_tree.nodes.get('Principled BSDF')
 if not p:continue
 n=m.name.lower()
 if n=='car_paint':
  p.inputs['Base Color'].default_value=(.26,.008,.004,1);p.inputs['Metallic'].default_value=.55;p.inputs['Roughness'].default_value=.32;p.inputs['Coat Weight'].default_value=.5
 elif n in ['ext_headlight','glass_light','bulbmat','ext_headlight_crhome']:
  p.inputs['Base Color'].default_value=(.32,.4,.46,1);p.inputs['Metallic'].default_value=.75;p.inputs['Roughness'].default_value=.18
 elif 'glass' in n:
  p.inputs['Base Color'].default_value=(.07,.12,.14,.28);p.inputs['Alpha'].default_value=.28;p.inputs['Roughness'].default_value=.13;p.inputs['Metallic'].default_value=.12;m.surface_render_method='DITHERED'
 elif 'tyre' in n or 'ruber' in n:
  p.inputs['Base Color'].default_value=(.009,.01,.012,1);p.inputs['Metallic'].default_value=0;p.inputs['Roughness'].default_value=.85
 elif 'chrome' in n or 'crhome' in n or n in ['disk','escape']:
  p.inputs['Metallic'].default_value=.9;p.inputs['Roughness'].default_value=.25
 elif 'leather' in n or 'fabric' in n:
  p.inputs['Base Color'].default_value=(.025,.02,.022,1) if 'red' not in n else (.10,.004,.009,1);p.inputs['Metallic'].default_value=0;p.inputs['Roughness'].default_value=.75
 elif any(k in n for k in ['plastic','black','piano','underbody','gril','grid','floor','teto','carbon','screen','dashboard']):
  p.inputs['Base Color'].default_value=(.009,.012,.016,1);p.inputs['Roughness'].default_value=.5;p.inputs['Metallic'].default_value=.05
 elif 'tail' in n or 'breaking_light' in n:
  p.inputs['Base Color'].default_value=(.45,.003,.009,1);p.inputs['Roughness'].default_value=.2
bpy.ops.wm.save_as_mainfile(filepath=str(out/'gr-supra-reference.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'gr-supra-reference.glb'),export_format='GLB',export_extras=True,export_copyright='Toyota GR Supra by 3dmodels.cars — CC BY 4.0. Adapted by Wrenchwise; unverified visual reference.')
pts=[o.matrix_world@Vector(v) for o in obs for v in o.bound_box];low=Vector([min(v[i] for v in pts) for i in range(3)]);high=Vector([max(v[i] for v in pts) for i in range(3)]);center=(low+high)/2;span=max(high-low)
(out/'gr-supra-parts.json').write_text(json.dumps({'title':'Toyota GR Supra visual reference','sourceUrl':'https://sketchfab.com/3d-models/86f609515557438e93bd3c6145ef99ca','license':'CC BY 4.0','author':'3dmodels.cars','boundsMetres':list(high-low),'parts':parts,'limits':['Exact year, market, powertrain and trim unverified','Engine and transmission service geometry absent','Dimensions are uniformly normalized visual geometry, not measured','PBR material adjustments; source has no bitmap textures']},indent=2))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.15,.18,.22,1)
for loc,power in [((3,-4,6),1600),((-4,-2,3),1000),((1,4,5),1700)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(loc));o=bpy.context.object;o.data.energy=power;o.data.size=5;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=span*1.25;cam.data.clip_start=.01
scene.render.resolution_x=1100;scene.render.resolution_y=750;scene.render.resolution_percentage=100
for name,d in [('front',(1,-1,.65)),('rear',(-1,1,.6)),('left',(1,0,.1)),('right',(-1,0,.1)),('top',(0,0,1)),('underbody',(0,0,-1))]:
 cam.data.ortho_scale=span*(1.75 if name in ['top','underbody'] else 1.25)
 cam.location=center+Vector(d).normalized()*span*2;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
