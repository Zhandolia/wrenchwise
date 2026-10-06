import bpy,sys,json,math,os
from pathlib import Path
from mathutils import Vector
base,out=map(Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(exist_ok=True,parents=True)
bpy.ops.wm.open_mainfile(filepath=str(base));scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
world=bpy.data.worlds.new('Studio review');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.15,.18,.23,1);scene.world=world
scene.render.image_settings.file_format='PNG'
meshes=[o for o in scene.objects if o.type=='MESH'];original={o.name:o.location.copy() for o in meshes}
for p,power in [((3,-4,6),1800),((-4,-2,3),1400),((2,4,5),1800)]:
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=4;o.rotation_euler=(Vector((0,-1,.6))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam;scene.render.resolution_x=1440;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
cover=['engine-cover','engine-cover-lettering','engine-cover-nut-','timing-cover-top','timing-cover-upper','timing-cover-lower','accessory-belt','water-pump-pulley','pump-pulley-lip','water-pump-pulley-nut-','crank-damper','accessory-tensioner']
views=[
 ('engine-layout',['engine','intake','cooling','electrical','exhaust'],(0,-1.26,.71),(1,-1,.82),2.6,[],{}),
 ('engine-front',['engine','cooling','intake','electrical'],(0,-1.50,.74),(.15,-1,.25),1.7,['radiator','fan-','condenser','receiver-drier','intake-snorkel'],{}),
 ('timing-detail',['engine'],(0,-1.65,.70),(0,-1,.12),.95,cover,{}),
 ('pump-detail',['cooling'],(.08,-1.6,.65),(.6,-1,.5),.95,['radiator','fan-','condenser','receiver-drier','upper-radiator','lower-radiator','coolant-','reservoir-','heater-','water-pump-pulley','pump-pulley','water-pump-pulley-nut'],{'water-pump':(0,-.14,0),'water-pump-hub':(0,-.14,0),'pump-impeller':(0,-.14,0),'water-pump-gasket':(0,-.075,0),'thermostat':(.10,0,0),'thermostat-seal':(.15,0,0),'water-inlet':(.22,0,0)}),
 ('transmission-case',['transmission'],(0,-.27,.43),(1,-1,.7),1.65,[],{}),
 ('transmission-pan',['transmission'],(0,-.30,.36),(1,-1,-1),1.55,[],{'transmission-pan':(0,0,-.20),'trans-pan-magnet':(0,0,-.20),'trans-pan-bolt':(0,0,-.20),'trans-pan-sealant':(0,0,-.20),'trans-drain':(0,0,-.20)}),
 ('transmission-valves',['transmission'],(0,-.28,.35),(.6,-.7,-1),.85,['transmission-pan','trans-pan-','trans-drain','trans-strainer'],{}),
 ('full-vehicle',None,(0,0,.74),(1,-1,.58),6.3,[],{}),
 ('engine-bay',None,(0,-1.1,.76),(.7,-1,1.2),3.0,['hood'],{})]
for name,systems,center,direction,scale,hidden,offset in views:
 if os.environ.get('REVIEW_VIEWS') and name not in os.environ['REVIEW_VIEWS'].split(','):continue
 if name=='engine-layout':hidden=hidden+['fuel-','tank-strap','filler-neck','exhaust-pipe','exhaust-tip','catalyst','muffler','exhaust-hanger']
 for ob in meshes:
  pid=ob.get('partId','');ob.location=original[ob.name];ob.hide_render=(systems is not None and ob.get('system') not in systems) or any(pid.startswith(s) for s in hidden)
  for prefix,delta in sorted(offset.items(),key=lambda item:len(item[0]),reverse=True):
   if pid.startswith(prefix):
    ob.location+=Vector(delta);break
 center=Vector(center)
 if name not in ['full-vehicle','engine-bay']:center.z-=.09
 cam.location=center+Vector(direction)*8;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
print('REVIEW COMPLETE',flush=True)
