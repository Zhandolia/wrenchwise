"""Export a reusable provisional 2JZ study from the reviewed S160 v5 source.
Blender -b --python modeling/components/extract_2jz.py -- source.blend output-dir
Preserves part IDs and metric scale. No geometry or fitment is newly verified.
"""
import bpy,sys,json,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
source=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
assert hashlib.sha256(source.read_bytes()).hexdigest()=='d3ef33072ae0383a5d0b5b13ec3956e921620cdfd27676f6215c8806973728d8','Re-review changed S160 source'
bpy.ops.wm.open_mainfile(filepath=str(source))
ledger=json.loads(Path('public/models/gs300-parts.json').read_text());byid={p['id']:p for p in ledger['parts']}
def keep(o):
 id=o.get('partId','');system=o.get('system','')
 return o.type=='MESH' and (system=='engine' or id.startswith(('intake-runner-','intake-gasket-','injector-','throttle','acis-','water-pump','water-bypass','thermostat','water-inlet','exhaust-runner-')) or id in ['fuel-rail','fuel-pulsation-damper','intake-plenum','intake-crossover','intake-casting-ribs','pump-pulley-lip','pump-impeller','pump-block-oring'])
obs=[o for o in bpy.context.scene.objects if keep(o)];assert len(obs)>150
# Bake parent transforms before discarding the vehicle scene. Origin is a visual
# bounding datum, NOT a measured engine mounting datum.
for o in obs:
 world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
for o in list(bpy.context.scene.objects):
 if o not in obs:bpy.data.objects.remove(o,do_unlink=True)
pts=[o.matrix_world@Vector(v) for o in obs for v in o.bound_box];lo=Vector([min(v[i] for v in pts)for i in range(3)]);hi=Vector([max(v[i] for v in pts)for i in range(3)]);offset=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
parts=[]
for o in obs:
 o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4)
 for v in o.data.vertices:v.co-=offset
 id=o['partId'];p=byid[id]
 layer='installation' if p['system']!='engine' or id.startswith(('alternator','ac-compressor','ps-','accessory-','engine-cover','valve-rib','oil-pan','dipstick','pcv-','engine-mount')) else 'core'
 o['componentId']='2jz-ge-vvti';o['componentLayer']=layer;o['accuracy']='unverified'
 parts.append({'id':id,'name':p['name'],'system':p['system'],'layer':layer,'accuracy':'unverified','evidenceUrl':'/models/gs300-evidence.json','sourceRefs':p.get('sourceRefs',[])})
manifest={'componentId':'2jz-ge-vvti','revision':1,'sourceRevision':'S160 v5','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'units':'metres','origin':'Visual bounding box base center; not a measured mount datum','boundsMetres':list(hi-lo),'approvedVehicleIds':[],'studyVehicleIds':['gs300'],'verifiedParts':0,'parts':sorted(parts,key=lambda p:p['id']),'limitations':['Extracted and modularized existing study; no new dimensional evidence','Timing geometry, clearances, interfaces and hardware locations unverified','Installation layer belongs to the GS300 study only','Core layer is a modeling separation, not proof of interchangeable parts','Full gap/evidence ledger remains linked to the S160 source']}
(out/'2jz-ge-vvti-parts.json').write_text(json.dumps(manifest,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'2jz-ge-vvti.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'2jz-ge-vvti.glb'),export_format='GLB',export_extras=True,export_copyright='Wrenchwise original provisional mechanical geometry. MIT. No verified fitment.')
# Six visual inspection views with the complete component framed.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12
scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.17,.22,1)
center=(hi+lo)/2-offset;span=max(hi-lo)
for loc,power in [((3,-4,6),1000),((-4,-2,3),900),((1,4,5),1300)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(loc));o=bpy.context.object;o.data.energy=power;o.data.size=4;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=span*1.4
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
for name,d in [('front',(0,-1,0)),('rear',(0,1,0)),('left',(1,0,0)),('right',(-1,0,0)),('top',(0,0,1)),('bottom',(0,0,-1))]:
 cam.location=center+Vector(d)*span*3;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
print(json.dumps({'parts':len(parts),'bounds':list(hi-lo)}))
