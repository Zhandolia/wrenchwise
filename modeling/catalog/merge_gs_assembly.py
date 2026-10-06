"""Combine corrected CC BY S160 exterior with the existing provisional mechanical study.
Blender --python merge_gs_assembly.py -- PREPARED_DIR V3_BASE_GLB OUT_DIR
Keep the original v3 gs300-parts.json next to the v3 base GLB. Do not use a
previously merged v4 file as the base: its cooling assembly is already moved.
The result remains unverified, and keeps both original and CC BY license provenance.
"""
import bpy,sys,json,math
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];prepared,base,out=map(Path,args);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(base))
for ob in list(bpy.context.scene.objects):
 if ob.type=='MESH' and ob.get('system') in ['body','interior','wheels']:bpy.data.objects.remove(ob,do_unlink=True)
# The old cooling envelope stood above the new hood. Reposition only the radiator
# pack/support for the visual study, leaving engine-mounted pump geometry untouched.
for ob in list(bpy.context.scene.objects):
 pid=ob.get('partId','')
 if pid in ['radiator','radiator-fins','radiator-tank-left','radiator-tank-right','radiator-cap','radiator-support','condenser','fan-shroud','fan-hub-left','fan-hub-right','fan-blades-left','fan-blades-right']:
  transform=ob.matrix_world.copy();transform.translation+=Vector((0,.30,-.27));ob.matrix_world=transform
 if pid in ['pillar-b-left','pillar-b-right']:bpy.data.objects.remove(ob,do_unlink=True)
with bpy.data.libraries.load(str(prepared/'gs300-reference.blend'),link=False) as (a,b):b.objects=a.objects
new=[]
for ob in b.objects:
 if ob and ob.type=='MESH':bpy.context.collection.objects.link(ob);new.append(ob)
# Align midpoint of the two reference wheel centers with the existing axle midpoint.
wheelcenters=[]
for ob in new:
 if ob.get('system')=='wheels':
  vs=[ob.matrix_world@Vector(v) for v in ob.bound_box];wheelcenters.append((min(v.y for v in vs)+max(v.y for v in vs))/2)
shift=-sum(wheelcenters)/len(wheelcenters)
for ob in new:ob.location.y+=shift
bpy.ops.wm.save_as_mainfile(filepath=str(out/'gs300-assembly.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'gs300-assembly.glb'),export_format='GLB',export_copyright='Exterior: David_Holiday / CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ https://sketchfab.com/3d-models/0bc00c7cd32c4d6da2098fbc2ab1eff0 ; mechanical study: Wrenchwise / MIT. Adapted by Wrenchwise.',export_extras=True,export_cameras=False,export_lights=False)
manifest=json.loads((base.parent/'gs300-parts.json').read_text());manifest['parts']=[p for p in manifest['parts'] if not((p['system'] in ['body','interior','wheels'] or p['id'] in ['pillar-b-left','pillar-b-right']) and p['status']=='modeled')]
for ob in new:
 manifest['parts'].append(dict(id=ob['partId'],name=ob['partId'].replace('-',' ').title(),system=ob['system'],status='modeled',accuracy='unverified',oemPartNumber=None,quantityVerified=False,notes='CC BY exterior/interior reference group. Contains multiple decorative surfaces; not an OEM service-part boundary.',source='David_Holiday / CC BY 4.0; Wrenchwise material and trim adaptations',meshName=ob.name,dimensionsMetres=list(ob.dimensions)))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];manifest['version']=4;manifest['meshCount']=len(meshes);manifest['triangleCount']=sum(sum(len(f.vertices)-2 for f in o.data.polygons) for o in meshes);manifest['accuracy']='CC BY exterior reference combined with original provisional mechanical geometry. Not a verified 1:1 replica.'
manifest['openIssues']=['Exterior source is an S160 reference mesh, not factory CAD. US year/trim and body surfaces remain unverified.','Spoiler removed and grille finish corrected. Wheel casting, side markers and lamp internals require additional reference work.','Uniform length scaling gives approximately 1452 mm overall height against the 1419.9 mm brochure target; this discrepancy remains unresolved.','Exterior axle midpoint aligned to the schematic chassis; suspension hardpoints and mechanical clearances are not validated.','Engine, transmission and other mechanical geometry remain the previous provisional study.','No factory top or underbody photographs found in the audited OEM photo set.','No exhaustive OEM parts count, part-number mapping, fastener validation, or verified repair procedure.']
manifest['sources'].append(dict(id='ccby-exterior',title='David_Holiday GS300 reference mesh — CC BY 4.0',url='https://sketchfab.com/3d-models/0bc00c7cd32c4d6da2098fbc2ab1eff0'))
manifest['exteriorAlignmentOffsetMetres']=shift
(out/'gs300-parts.json').write_text(json.dumps(manifest,indent=2)+'\n')
(out/'parts-inventory.txt').write_text('GS 300 assembly v4 — unverified component groups, not an OEM bill of materials.\nExterior CC BY 4.0; original mechanics MIT.\n\n'+'\n'.join(f"{p['status']:8} | {p['system']:14} | {p['id']} | {p['name']}" for p in manifest['parts'])+'\n')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True;scene.world=bpy.data.worlds.new('Review');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.20,.24,1);center=Vector((0,.12,.72))
for pos,power in [((3,-4,6),1700),((-4,-2,3),1000),((1,4,5),1600)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=5;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(6,-8,5));cam=bpy.context.object;scene.camera=cam;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=6.2;scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
for name,hood in [('complete',True),('hood-removed',False)]:
 for o in new:
  if o.get('partId')=='hood':o.hide_render=not hood
 scene.render.filepath=str(out/('gs300-'+name+'.png'));bpy.ops.render.render(write_still=True)
print('MERGED',manifest['meshCount'],manifest['triangleCount'],'offset',shift,flush=True)
