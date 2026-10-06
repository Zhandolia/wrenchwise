"""Prepare CC BY assets. Blender 4.5; no repair-accuracy claim.
Run: blender -b --python prepare_downloaded.py -- INPUT_DIR OUTPUT_DIR
Original creators and immutable download hashes: research/asset-licenses.json.
"""
import bpy, sys, json, math, hashlib
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];src=Path(args[0]);out=Path(args[1]);out.mkdir(parents=True,exist_ok=True)
UIDS={'gs300':'0bc00c7cd32c4d6da2098fbc2ab1eff0','rx300':'6f2f754c78794734b794237913ba97cc','gs400':'0bc00c7cd32c4d6da2098fbc2ab1eff0','gs430':'0bc00c7cd32c4d6da2098fbc2ab1eff0'}
def mat(name,color,metal=0,rough=.35,alpha=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,alpha);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Alpha'].default_value=alpha
 if alpha<1:m.surface_render_method='DITHERED'
 if 'paint' in name:p.inputs['Coat Weight'].default_value=.7;p.inputs['Coat Roughness'].default_value=.18
 return m

def build(vehicle,uid):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(src/(uid+'.glb')))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];gs=vehicle.startswith('gs')
 mats={
 'paint':mat('Pearl silver paint',(.40,.43,.47),.68,.26),
 'chrome':mat('Polished aluminum and chrome',(.64,.67,.70),.95,.20),
 'alloy':mat('Satin alloy wheels',(.48,.5,.52),.8,.32),
 'rubber':mat('Tire rubber',(.012,.014,.016),0,.82),
 'trim':mat('Black trim and gaskets',(.009,.013,.016),.05,.48),
 'cladding':mat('Warm gray cladding',(.16,.16,.145),.38,.32),
 'leather':mat('Ivory leather',(.38,.32,.23),0,.78),
 'interior':mat('Interior charcoal',(.025,.026,.028),0,.78),
 'glass':mat('Green tinted automotive glass',(.075,.14,.15),.2,.12,.46),
 'lens':mat('Clear lamp lens',(.68,.78,.84),.22,.12,.22),
 'red':mat('Red tail lens',(.48,.012,.015),.2,.18,.85),
 'amber':mat('Amber signal lens',(.95,.28,.02),.12,.22),
 'reflector':mat('Lamp reflector',(.7,.73,.76),.92,.14),
 'plate':mat('Plate',(.7,.7,.67),0,.45)}
 length=4.80568 if gs else 4.57454;fac=length/(16.1472378 if gs else 14.9335642);zmin=-2.9704661 if gs else -2.9704971;yc=.0503254 if gs else -.0091838
 # Preserve original shape through uniform scaling. Catalog measurements are comparison targets,
 # not a justification for stretching every axis until a bounding box passes.
 items=[];removed=[];body_faces=0
 for ob in meshes:
  name=ob.name;idx=int(name.split('_')[1]);mesh=ob.data;mesh.transform(ob.matrix_world)
  par=list(range(len(mesh.vertices)))
  def find(i):
   while par[i]!=i:par[i]=par[par[i]];i=par[i]
   return i
  for e in mesh.edges:a,b=map(find,e.vertices);par[a]=b
  groups={}
  for v in mesh.vertices:groups.setdefault(find(v.index),[]).append(v.index)
  pgroup={}
  for f in mesh.polygons:pgroup.setdefault(find(f.vertices[0]),[]).append(f)
  colors=mesh.color_attributes.active_color
  for root,vi in groups.items():
   fs=pgroup.get(root,[])
   if not fs:continue
   co=[mesh.vertices[i].co.copy() for i in vi];lo=Vector([min(v[i] for v in co) for i in range(3)]);hi=Vector([max(v[i] for v in co) for i in range(3)]);c=(lo+hi)/2
   # Remove optional spoiler and supports, preserving the deck lid beneath.
   spoiler=gs and ((idx==3 and root in [67,13490,7691]) or (idx==9 and root in [135,154]) or (idx in [10,11] and lo.y>7.7 and lo.z>.78))
   if spoiler:removed.append((name,root,'optional spoiler'));continue
   if gs and vehicle!='gs300' and idx==2 and lo.y>7.49 and lo.z>.18 and hi.z<.28 and lo.x>1.5:
    removed.append((name,root,'GS300 badge replaced for exterior variant'));continue
   if gs:default={2:'chrome',3:'paint',4:'alloy',5:'leather',6:'interior',7:'reflector',8:'rubber',9:'trim',10:'reflector',11:'chrome'}.get(idx,'trim')
   else:default={2:'trim',3:'paint',4:'interior',5:'interior',6:'alloy',7:'leather',8:'trim',9:'chrome',10:'cladding',11:'leather',12:'rubber',13:'chrome',14:'red'}.get(idx,'trim')
   iswheel=(idx in ([4,8] if gs else [6,12]))
   system='wheels' if iswheel else 'interior' if idx in ([5,6] if gs else [4,5,7,11]) else 'body'
   label=default
   if gs and idx==3 and root==10966:label='hood'
   # Keep geometry's original diffuse colors as a material classification guide.
   vm={v:i for i,v in enumerate(vi)};verts=[(v.x*fac,(v.y-yc)*fac,(v.z-zmin)*fac) for v in co];faces=[[vm[v] for v in f.vertices] for f in fs]
   me=bpy.data.meshes.new(f'{vehicle}-{name}-{root}');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(me.name,me);bpy.context.collection.objects.link(o)
   for m in mats.values():me.materials.append(m)
   mkeys=list(mats)
   for f,nf in zip(fs,me.polygons):
    key=default
    if idx==(11 if gs else 13) and colors:
     r,g,b,_=colors.data[f.loop_start].color
     if r>g*1.8 and r>b*1.8:key='red' if r>g*3 else 'amber'
     elif g>r*1.08 and b>r*1.05:key='glass'
     elif r>.6:key='lens' if abs(c.x)>1 and (c.y<-5 or c.y>6) else 'chrome'
     elif r<.07:key='trim'
     else:key='interior' if abs(c.y)<3 and c.z<.3 else 'chrome'
    if gs and vehicle!='gs430' and idx==2 and lo.y<-7.29 and hi.y<-7.29 and hi.z<-.45 and lo.x>-1.11 and hi.x<1.11 and len(vi)<40:key='trim'
    if not gs and idx==4 and colors:
     r,g,b,_=colors.data[f.loop_start].color
     if r>g*1.5:key='amber'
    if not gs and idx==13 and lo.y>6 and hi.z<.7 and abs(c.x)>1.3:key='red'
    if not gs and idx==4 and c.y<-5 and key=='interior':key='reflector'
    if vehicle=='gs430' and key=='amber' and c.y>6:key='lens'
    nf.material_index=mkeys.index(key);nf.use_smooth=not (idx==7 and gs)
   # Distinct stable mesh IDs survive GLB export; OEM part numbers remain unknown.
   part=f'{vehicle}-{name.lower()}-{root}'
   o['partId']=part;o['system']=system;o['label']=label;o['sourceUID']=uid;o['validation']='unverified reference geometry'
   items.append(dict(id=part,label=label,system=system,sourceObject=name,sourceComponent=root,faces=len(fs)))
  bpy.data.objects.remove(ob,do_unlink=True)
 # Remove source empties so coordinates are meters directly, without inherited conversion scale.
 for ob in list(bpy.context.scene.objects):
  if ob.type=='EMPTY':bpy.data.objects.remove(ob,do_unlink=True)
 if gs and vehicle!='gs300':
  bpy.ops.object.text_add(location=(.55,2.285,.955),rotation=(math.pi/2,0,math.pi));badge=bpy.context.object;badge.name=vehicle+'-badge';badge.data.body=vehicle.upper().replace('GS','GS ');badge.data.size=.020;badge.data.extrude=.0006;badge.data.materials.append(mats['chrome']);badge['partId']=badge.name;badge['system']='body';badge['label']='badge';bpy.ops.object.convert(target='MESH')
 # Batch disconnected decorative fragments by selectable assembly, reducing hundreds of draw calls.
 batches={}
 for ob in [o for o in bpy.context.scene.objects if o.type=='MESH']:
  pts=[v.co for v in ob.data.vertices];center=sum(pts,Vector())/len(pts);sys=ob['system']
  if sys=='wheels':key=f"{vehicle}-{'left' if center.x>0 else 'right'}-{'front' if center.y<0 else 'rear'}-wheel"
  elif ob['label']=='hood':key='hood' if gs else vehicle+'-hood'
  elif sys=='interior':key=vehicle+'-cabin-interior'
  else:key=vehicle+'-'+ob['label']
  batches.setdefault(key,[]).append(ob)
 items=[]
 for key,obs in batches.items():
  bpy.ops.object.select_all(action='DESELECT')
  for ob in obs:ob.select_set(True)
  bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();ob=bpy.context.object;ob.name=key;ob['partId']=key
  # Drop unused material slots, otherwise every object retains all imported slots.
  bpy.ops.object.material_slot_remove_unused()
  items.append(dict(id=key,label=key.replace('-',' ').title(),system=ob['system'],faces=len(ob.data.polygons)))
 bpy.context.scene.unit_settings.system='METRIC' 
 bpy.ops.wm.save_as_mainfile(filepath=str(out/(vehicle+'-reference.blend')))
 bpy.ops.export_scene.gltf(filepath=str(out/(vehicle+'-reference.glb')),export_format='GLB',export_copyright='Source: David_Holiday / CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ ; adapted by Wrenchwise. https://sketchfab.com/3d-models/'+uid,export_extras=True,export_cameras=False,export_lights=False)
 pts=[v.co for ob in bpy.context.scene.objects if ob.type=='MESH' for v in ob.data.vertices];bounds=[max(v[i] for v in pts)-min(v[i] for v in pts) for i in range(3)]
 report=dict(vehicle=vehicle,sourceUID=uid,units='m',uniformScale=fac,boundsXYZ=bounds,parts=items,removed=removed,notValidated=['exact market/trim','wheel/tire option','top geometry','underbody','engine','transmission','fasteners','repair procedures'])
 (out/(vehicle+'-reference.json')).write_text(json.dumps(report,indent=2))
 # Review renders: canonical six views and perspective. A render is not an OEM reference.
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
 scene.world=bpy.data.worlds.new('Review world');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.20,.24,1)
 center=Vector((0,0,bounds[2]/2))
 for pos,power,size in [((3,-4,6),1600,5),((-4,-2,3),1100,4),((1,4,5),1700,4)]:
  bpy.ops.object.light_add(type='AREA',location=pos);a=bpy.context.object;a.data.energy=power;a.data.shape='DISK';a.data.size=size;a.rotation_euler=(center-a.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=length*1.24
 scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
 for name,d in [('perspective',(1,-1,.6)),('front',(0,-1,0)),('rear',(0,1,0)),('left',(1,0,0)),('right',(-1,0,0)),('top',(0,0,1)),('underbody',(0,0,-1))]:
  cam.data.ortho_scale=length*(1.75 if name in ['top','underbody'] else 1.24)
  cam.location=center+Vector(d)*10;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/(vehicle+'-'+name+'.png'));bpy.ops.render.render(write_still=True)
 print('PREPARED',vehicle,len(items),bounds,'removed',removed,flush=True)
for v,uid in UIDS.items():
 if len(args)<3 or v==args[2]:build(v,uid)
