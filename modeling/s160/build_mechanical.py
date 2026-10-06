"""S160 GS300 mechanical reference study, v5. Original geometry, not factory CAD.
Blender -b --python build_mechanical.py -- V4_BLEND V4_MANIFEST OUT_DIR
Coordinates: metres, +X vehicle left, -Y front, +Z up.
Sources and uncertainty: research/s160-mechanical-sources.json.
"""
import bpy,sys,json,math,random
from pathlib import Path
from mathutils import Vector
from math import sin,cos,pi
base,index,out=map(Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(base));scene=bpy.context.scene
manifest=json.loads(index.read_text());old={p['id']:p for p in manifest['parts']};records={};new=[]
replace_ids={'airbox','airbox-ribs','air-intake-duct','maf','engine-harness','engine-cover','engine-cover-ribs','fuel-rail','intake-plenum','throttle','oil-cap','battery','battery-top','battery-terminal','battery-positive-cover','battery-hold-down','fuse-box','ecu-envelope','brake-booster','master-cylinder','brake-reservoir','abs-unit','radiator-support'}
replace_prefixes=('intake-runner-','exhaust-runner-','injector-','ignition-','spark-plug-')
removed=[]
for o in list(scene.objects):
 pid=o.get('partId','');sysid=o.get('system','')
 if o.type=='MESH' and (o.get('modelVersion')==5 or sysid in ['engine','transmission','cooling'] or pid in replace_ids or pid.startswith(replace_prefixes)):
  removed.append(pid);bpy.data.objects.remove(o,do_unlink=True)

def material(n,c,metal=0,rough=.5):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
cast=material('Cast aluminum / unpainted',(.34,.37,.39),.78,.48);machined=material('Machined aluminum',(.58,.61,.63),.86,.28);iron=material('Iron engine casting',(.065,.075,.08),.63,.59);steel=material('Zinc steel fasteners',(.37,.4,.42),.85,.29);black=material('Black molded polymer',(.014,.019,.023),.04,.42);rubber=material('Belt and hose rubber',(.01,.013,.016),0,.78);gasket=material('Composite gasket',(.17,.20,.19),.22,.78);brass=material('Brass fittings',(.42,.29,.10),.76,.37);red=material('Positive terminal red',(.32,.014,.012),.03,.46);white=material('Reservoir polymer',(.65,.66,.55),0,.53);orange=material('Dipstick yellow',(.92,.56,.04),.02,.39);friction=material('Friction lining',(.16,.09,.035),.05,.88);labelmat=material('Engine cover lettering',(.63,.66,.67),.45,.35);brown=material('Brown connector',(.23,.14,.085),0,.6)
DEFAULT='Part identity/layout referenced; surface dimensions, mating faces and installation clearances remain estimated.'
sourceid='rm718u-engine'

def tag(o,pid,name,system,mat=None,note=DEFAULT,evidence=None):
 o.name=pid;o['partId']=pid;o['system']=system;o['label']=name;o['accuracy']='unverified';o['sourceRef']=evidence or sourceid
 if mat:o.data.materials.append(mat)
 records.setdefault(pid,dict(id=pid,name=name,system=system,status='modeled',accuracy='unverified',oemPartNumber=None,quantityVerified=False,notes=note,source='Original Wrenchwise geometry; '+(evidence or sourceid),sourceRefs=[evidence or sourceid]))
 new.append(o);return o

def bevel(o,w=.002):
 if w:m=o.modifiers.new('Manufactured edge','BEVEL');m.width=w;m.segments=2
 return o

def box(pid,name,sys,p,size,mat,w=.003):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return bevel(tag(o,pid,name,sys,mat),w)

def cylinder(pid,name,sys,p,r,d,mat,axis='Z',r2=None,n=32):
 bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r,radius2=r if r2 is None else r2,depth=d,location=p);o=bpy.context.object
 if axis=='Y':o.rotation_euler.x=pi/2
 if axis=='X':o.rotation_euler.y=pi/2
 for f in o.data.polygons:f.use_smooth=True
 return bevel(tag(o,pid,name,sys,mat),.0006)

def mesh(pid,name,sys,vs,fs,mat,w=0):
 m=bpy.data.meshes.new(pid);m.from_pydata(vs,[],fs);m.update();o=bpy.data.objects.new(pid,m);scene.collection.objects.link(o);return bevel(tag(o,pid,name,sys,mat),w)

def tube(pid,name,sys,pts,r,mat):
 c=bpy.data.curves.new(pid,'CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_depth=r;c.bevel_resolution=2;s=c.splines.new('BEZIER');s.bezier_points.add(len(pts)-1)
 for bp,p in zip(s.bezier_points,pts):bp.co=p;bp.handle_left_type='AUTO';bp.handle_right_type='AUTO'
 o=bpy.data.objects.new(pid,c);scene.collection.objects.link(o);return tag(o,pid,name,sys,mat)

def rod(pid,name,sys,a,b,r,mat,n=20):
 a,b=Vector(a),Vector(b);o=cylinder(pid,name,sys,(a+b)/2,r,(b-a).length,mat,n=n);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o

def ring(pid,name,sys,p,ro,ri,d,mat,axis='Z',n=48):
 vs=[]
 for z,r in [(-d/2,ro),(d/2,ro),(-d/2,ri),(d/2,ri)]:
  for i in range(n):
   a=2*pi*i/n;v=Vector((r*cos(a),r*sin(a),z))
   if axis=='Y':v=Vector((v.x,v.z,v.y))
   if axis=='X':v=Vector((v.z,v.x,v.y))
   vs.append(tuple(Vector(p)+v))
 fs=[]
 for i in range(n):
  j=(i+1)%n
  fs.extend([(i,j,n+j,n+i),(2*n+j,2*n+i,3*n+i,3*n+j),(n+i,n+j,3*n+j,3*n+i),(j,i,2*n+i,2*n+j)])
 return mesh(pid,name,sys,vs,fs,mat,.0004)

def fastener(pid,name,sys,p,r=.006,axis='Z',length=.022):
 cylinder(pid,name,sys,p,r,r*.8,steel,axis,n=6)
 p2=Vector(p);p2[{'X':0,'Y':1,'Z':2}[axis]]+=length/2*(-1 if axis=='Z' and sys!='transmission' else 1)
 cylinder(pid,name,sys,p2,r*.55,length,steel,axis,n=12)
 ring(pid,name,sys,p,r*1.25,r*.5,.0015,steel,axis,n=20)

def polygon_shell(pid,name,sys,outline,y0,y1,mat):
 n=len(outline);vs=[(x,y,z) for y in [y0,y1] for x,z in outline];fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)];return mesh(pid,name,sys,vs,fs,mat,.005)

def annotate(pid,refs=None,count=None,section=None,notes=None):
 p=records[pid]
 if refs:p['sourceRefs']=refs
 if count is not None:p['quantityEvidence']={'count':count,'sourceId':(refs or p['sourceRefs'])[0],'section':section,'scope':'Documented quantity; 3D placement and fastener dimensions are estimates.'}
 if notes:p['notes']=notes

def text(pid,body,p,size,system='engine',rot=(0,0,0)):
 bpy.ops.object.text_add(location=p,rotation=rot);o=bpy.context.object;o.data.body=body;o.data.size=size;o.data.extrude=.00025;o.data.align_x='CENTER';tag(o,pid,body,system,labelmat);return o

def gear(pid,name,sys,p,r,ri,d,teeth,mat):
 ring(pid,name,sys,p,r*.92,ri,d,mat,'Y')
 for i in range(teeth):
  a=i*2*pi/teeth;o=box(pid,name,sys,(p[0]+r*.96*cos(a),p[1],p[2]+r*.96*sin(a)),(r*.16,d,r*pi/teeth*.8),mat,.0004);o.rotation_euler.y=-a

EY=-1.21;F=-1.635;pitch=.105;cy=[EY+(i-2.5)*pitch for i in range(6)]
# Six open bore seats and original block casting. Only nominal bore is source-based.
block=box('engine-block','2JZ-GE cylinder block casting','engine',(0,EY,.575),(.30,.72,.31),iron,.009)
for y in cy:
 bpy.ops.mesh.primitive_cylinder_add(vertices=40,radius=.043,depth=.34,location=(0,y,.62));cut=bpy.context.object;mod=block.modifiers.new('Bore','BOOLEAN');mod.object=cut;mod.operation='DIFFERENCE';bpy.context.view_layer.objects.active=block;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
 ring('cylinder-liners','Six cylinder bore surfaces','engine',(0,y,.604),.044,.043,.25,machined)
 for s in [-1,1]:
  cylinder('block-core-plugs','Block core plugs','engine',(s*.152,y,.585),.019,.005,steel,'X')
  box('block-casting-ribs','Block cast webs','engine',(s*.151,y,.544),(.014,.013,.16),iron,.003)
for x in [-.095,.095]:box('block-deck','Block deck side rail','engine',(x,EY,.737),(.09,.72,.012),machined,.004)
for y in cy:ring('block-deck','Block deck bore seats','engine',(0,y,.737),.06,.043,.012,machined)
# Deck/gasket modeled with open rings and side rails, not a solid plate covering bores.
for y in cy:ring('head-gasket','Cylinder head gasket / bore fire rings','engine',(0,y,.746),.049,.043,.0018,gasket)
for x in [-.09,.09]:box('head-gasket','Cylinder head gasket / side rails','engine',(x,EY,.746),(.065,.705,.0018),gasket,.001)
box('cylinder-head','Cylinder head casting','engine',(0,EY,.81),(.355,.752,.12),cast,.012)
for s in [-1,1]:
 for y in cy:ring('head-port-faces','Cylinder head port flanges','engine',(s*.18,y,.81),.023,.015,.007,machined,'X',n=24)
 box('valve-cover-'+('intake' if s>0 else 'exhaust'),'Cylinder head cover '+('intake' if s>0 else 'exhaust'),'engine',(s*.105,EY,.899),(.145,.738,.059),cast,.020)
 tube('valve-cover-gaskets','Cylinder head cover gaskets','engine',[(s*.105-.065,EY-.35,.868),(s*.105+.065,EY-.35,.868),(s*.105+.065,EY+.35,.868),(s*.105-.065,EY+.35,.868),(s*.105-.065,EY-.35,.868)],.0027,rubber)
 for j,y in enumerate([EY-.31,EY-.18,EY-.06,EY+.07,EY+.2,EY+.31]):fastener(f'head-cover-bolt-{s}-{j}','Cylinder head cover bolt','engine',(s*.105,y,.933),.0045)
 cylinder('camshaft-'+str(s),'Intake camshaft' if s>0 else 'Exhaust camshaft','engine',(s*.102,EY,.844),.013,.704,steel,'Y')
 for j,y in enumerate(cy):
  for dy in [-.022,.022]:
   o=cylinder('cam-lobes-'+str(s),'Camshaft lobes','engine',(s*.106,y+dy,.85),.023,.012,steel,'Y');o.scale.z=.77
   rod('valve-stems','24 valve stems','engine',(s*.022,y+dy,.765),(s*.075,y+dy,.843),.0035,steel)
   cylinder('valve-heads','24 valve heads','engine',(s*.024,y+dy,.769),.0135,.004,steel)
   # Helical springs are separate from retainers and bucket followers.
   pts=[(s*.076+.009*cos(t*2*pi),y+dy+.009*sin(t*2*pi),.795+t*.006) for t in [k/12 for k in range(61)]]
   tube('valve-springs','24 valve springs','engine',pts,.0016,steel)
   cylinder('valve-retainers','Valve spring retainers','engine',(s*.076,y+dy,.826),.011,.003,steel)
   cylinder('valve-lifters','Valve lifter buckets','engine',(s*.082,y+dy,.84),.013,.012,machined)
 for j in range(4):
  y=EY-.32+j*.215;box('cam-bearing-caps','Camshaft bearing cap study','engine',(s*.102,y,.857),(.057,.023,.020),cast,.006)
  for x in [s*.102-.02,s*.102+.02]:fastener('cam-cap-fasteners','Cam cap fastener study','engine',(x,y,.873),.004)
 ring('camshaft-seals','Intake/exhaust camshaft seals','engine',(s*.102,F+.03,.845),.026,.014,.008,rubber,'Y')
for i,y in enumerate(cy):
 z=.681 if i in [0,5] else .625
 cylinder('piston-'+str(i+1),'Piston '+str(i+1),'engine',(0,y,z),.0425,.047,machined)
 for dz in [.015,.009]:ring('piston-rings-'+str(i+1),'Compression rings '+str(i+1),'engine',(0,y,z+dz),.0429,.039,.0014,steel)
 ring('oil-rings-'+str(i+1),'Oil control ring '+str(i+1),'engine',(0,y,z-.002),.0429,.038,.003,iron)
 cylinder('wrist-pins','Piston wrist pins','engine',(0,y,z-.005),.010,.066,steel,'X')
 rod('rod-'+str(i+1),'Connecting rod '+str(i+1),'engine',(0,y,z-.005),(.025,y,.465),.009,steel)
 ring('rod-bearing-'+str(i+1),'Rod big end '+str(i+1),'engine',(.025,y,.465),.021,.012,.020,steel,'Y')
 cylinder('crank-counterweights','Crankshaft counterweight study','engine',(.016,y,.449),.061,.018,iron,'Y')
 cylinder('spark-plug-'+str(i+1),'Spark plug '+str(i+1),'electrical',(0,y,.884),.007,.053,white)
 for n in range(4):ring('spark-plug-'+str(i+1),'Spark plug '+str(i+1),'electrical',(0,y,.89+n*.004),.008,.004,.002,white,n=16)
rod('crankshaft','Crankshaft main axis','engine',(0,EY-.37,.458),(0,EY+.37,.458),.024,steel)
for i in range(7):
 y=EY-.315+i*.105;ring('main-bearing-caps','Main bearing cap study','engine',(0,y,.458),.032,.025,.018,cast,'Y')
box('oil-pan-upper','Cast upper oil pan','engine',(0,EY,.37),(.34,.73,.11),cast,.018)
box('oil-pan-lower','Stamped lower sump','engine',(0,EY+.16,.281),(.30,.34,.085),iron,.022)
for x in [-.156,.156]:
 for j in range(7):fastener('sump-fasteners','Sump perimeter fasteners / placement estimated','engine',(x,EY-.30+j*.10,.312),.004)
tube('oil-pickup','Oil pickup tube','engine',[(0,EY-.28,.38),(.04,EY+.08,.34),(.04,EY+.21,.325)],.009,steel)
box('oil-strainer-engine','Engine oil pickup screen','engine',(.04,EY+.2,.318),(.095,.10,.02),steel,.015)
fastener('drain-plug','Engine oil drain plug','engine',(.152,EY+.17,.286),.008,'X')
# Timing: one idler with a hydraulic actuator, distinct from the accessory tensioner.
sourceid='rm718u-timing'
for pid,name,x,z,r in [('exhaust-cam-sprocket','Exhaust cam timing pulley',-.105,.843,.064),('vvti-gear','VVT-i intake timing pulley',.105,.843,.068),('crank-pulley','Crankshaft timing pulley',0,.458,.037)]:
 gear(pid,name,'engine',(x,F,z),r,.020,.027,40 if 'cam' in pid or pid=='vvti-gear' else 20,steel)
 if pid=='vvti-gear':
  cylinder(pid,name,'engine',(x,F-.024,z),.063,.024,cast,'Y')
  for j in range(5):
   a=j*2*pi/5;fastener('vvti-gear-locked-fasteners','VVT-i pulley factory-set bolts — do not loosen','engine',(x+.046*cos(a),F-.039,z+.046*sin(a)),.0037,'Y')
 else:
  for j in range(6):
   a=j*pi/3;rod(pid,name,'engine',(x+.020*cos(a),F-.002,z+.020*sin(a)),(x+r*.80*cos(a),F-.002,z+r*.80*sin(a)),.006,steel)
 fastener(pid+'-center',name+' center fastener','engine',(x,F-.042,z),.009,'Y')
 ring(pid+'-seal',name+' shaft seal','engine',(x,F+.025,z),.026 if r>.05 else .031,.015,.008,rubber,'Y')
cylinder('timing-idler','Timing-belt idler pulley','engine',(-.094,F,.627),.034,.035,machined,'Y')
ring('timing-idler-bearing','Idler bearing seal','engine',(-.094,F-.019,.627),.024,.010,.002,rubber,'Y')
fastener('timing-idler-bolt','Timing idler pivot bolt','engine',(-.094,F-.027,.627),.007,'Y')
rod('timing-idler-arm','Timing idler pivot arm','engine',(-.094,F+.021,.627),(-.157,F+.021,.568),.012,cast)
cylinder('timing-tensioner','Hydraulic timing-belt tensioner','engine',(-.152,F+.02,.512),.018,.077,cast)
cylinder('timing-tensioner-rod','Tensioner pushrod','engine',(-.152,F+.02,.56),.006,.027,steel)
cylinder('timing-tensioner-boot','Tensioner dust boot','engine',(-.152,F+.02,.55),.011,.012,rubber)
for i,x in enumerate([-.174,-.13]):fastener('timing-tensioner-bolt-'+str(i+1),'Timing tensioner mounting bolt '+str(i+1),'engine',(x,F-.001,.49),.005,'Y')
annotate('timing-tensioner',count=2,section='EM timing belt — tensioner mounting bolts',notes='Hydraulic actuator separated from the idler and accessory tensioner. Two mounting bolts are documented; bore, rod stroke and installation position remain estimated.')
# Flat belt ribbon with a visible tooth side, not a circular rubber hose.
path=[(-.169,.843),(-.165,.872),(-.145,.898),(-.105,.907),(.105,.911),(.145,.897),(.171,.866),(.173,.84),(.125,.69),(.071,.525),(.035,.447),(.021,.424),(-.02,.425),(-.038,.454),(-.060,.555),(-.066,.615),(-.079,.652),(-.13,.755)]
vs=[]
for i,(x,z) in enumerate(path):
 prev=Vector(path[i-1]);nxt=Vector(path[(i+1)%len(path)]);t=(nxt-prev).normalized();normal=Vector((-t.y,t.x))
 for dep,thick in [(-.014,-.002),(.014,-.002),(.014,.002),(-.014,.002)]:vs.append((x+normal.x*thick,F+dep,z+normal.y*thick))
fs=[]
for i in range(len(path)):
 for j in range(4):fs.append((i*4+j,i*4+(j+1)%4,((i+1)%len(path))*4+(j+1)%4,((i+1)%len(path))*4+j))
mesh('timing-belt','Timing belt — routing study','engine',vs,fs,rubber)
annotate('timing-belt',notes='Flat ribbon replaces the old tube. Pulley relationship is referenced; pitch, tooth count, wrap angles, tension and timing marks are not validated. Not an alignment tool.')
outline=[(-.19,.76),(-.19,.88),(-.145,.929),(.15,.929),(.196,.87),(.19,.755),(.115,.73),(-.12,.73)]
polygon_shell('timing-cover-upper','No.2 timing belt cover','engine',outline,F-.075,F-.044,black)
polygon_shell('timing-cover-lower','No.1 timing belt cover','engine',[(-.16,.735),(.15,.735),(.13,.48),(.08,.402),(-.074,.402),(-.13,.48)],F-.068,F-.040,black)
polygon_shell('timing-cover-rear','No.4 rear timing cover','engine',outline,F+.030,F+.035,black)
for pid,pts in [('timing-cover-upper',[(-.17,.85),(.17,.85),(0,.747)]),('timing-cover-lower',[(-.13,.69),(.13,.69),(-.10,.52),(.10,.52),(0,.415)])]:
 for i,(x,z) in enumerate(pts):fastener(pid+'-bolt-'+str(i+1),pid.replace('-',' ')+' bolt '+str(i+1),'engine',(x,F-.082,z),.004,'Y')
 annotate(pid,count=len(pts),section='EM timing belt — cover fasteners')
# Front upper black cover is compact, leaving the rear intake crossover exposed.
box('engine-cover','Engine appearance cover / forward head','engine',(0,EY-.20,.973),(.39,.29,.073),black,.026)
box('timing-cover-top','No.3 timing belt cover / plug valley','engine',(0,EY,.941),(.135,.69,.022),black,.009)
for i,(x,y) in enumerate([(-.12,EY-.28),(.12,EY-.28),(-.12,EY-.12),(.12,EY-.12)]):fastener('engine-cover-nut-'+str(i+1),'Engine cover retaining nut '+str(i+1),'engine',(x,y,1.012),.004)
annotate('engine-cover',count=4,section='EM cylinder head — appearance cover nuts')
for i,y in enumerate([EY-.28,EY-.09,EY+.09,EY+.28]):fastener('timing-cover-top-bolt-'+str(i+1),'No.3 timing cover bolt '+str(i+1),'engine',(.052,y,.959),.004)
annotate('timing-cover-top',count=4,section='EM timing belt — No.3 cover bolts')
text('engine-cover-lettering','VVT-i',(0,EY-.25,1.011),.043,rot=(0,0,0))
cylinder('oil-cap','Oil filler cap','engine',(.103,EY-.09,1.02),.026,.015,black)
box('oil-cap','Oil filler cap grip','engine',(.103,EY-.09,1.03),(.042,.014,.008),black,.003)
# Oil control valve, external supply pipe, screen and plug are discrete components.
cylinder('vvti-oil-control-valve','VVT-i camshaft timing oil control valve','engine',(.171,EY-.24,.91),.014,.089,steel,'Y')
box('vvti-ocv-connector','VVT-i oil-control-valve connector','electrical',(.171,EY-.188,.918),(.026,.028,.023),black,.004)
tube('vvti-oil-pipe','No.1 VVT-i oil supply pipe','engine',[(.188,EY-.30,.88),(.224,EY-.25,.895),(.219,EY-.07,.93),(.155,EY-.025,.944)],.004,steel)
cylinder('vvti-oil-filter','VVT-i oil control filter housing','engine',(.22,EY-.16,.893),.014,.026,cast,'X');ring('vvti-filter-screen','VVT-i filter screen study','engine',(.227,EY-.16,.893),.010,.008,.018,brass,'X')
# Intake rebuilt from the stock GS300 photo and EM cylinder-head component drawings.
sourceid='gs300-engine-photo'
for i,y in enumerate(cy):
 tube('intake-runner-'+str(i+1),'Lower intake runner '+str(i+1),'intake',[(.173,y,.808),(.28,y,.82),(.38,y,.89),(.385,y,.96)],.022,cast)
 ring('intake-gasket-'+str(i+1),'Intake runner seal '+str(i+1),'intake',(.18,y,.808),.026,.019,.002,gasket,'X')
 cylinder('injector-'+str(i+1),'Fuel injector '+str(i+1),'intake',(.224,y,.85),.009,.057,black)
 box('injector-connector-'+str(i+1),'Injector connector '+str(i+1),'electrical',(.235,y,.878),(.019,.027,.016),black if i%2==0 else brown,.003)
 ring('injector-seals','Injector O-rings','intake',(.224,y,.829),.010,.007,.002,rubber,n=20)
 tube('exhaust-runner-'+str(i+1),'Exhaust manifold runner '+str(i+1),'exhaust',[(-.18,y,.80),(-.265,y,.77),(-.28,y+.025,.69),(-.30,EY+(-.13 if i<3 else .2),.55)],.018,iron)
box('intake-plenum','ACIS intake air chamber','intake',(.37,EY+.015,.969),(.145,.62,.11),cast,.045)
# Two flattened air passages cross the engine at the rear, merging at the throttle.
for i,y in enumerate([EY+.08,EY+.235]):
 tube('intake-crossover','Intake air connector crossover','intake',[(.35,y,1.004),(.22,y,1.051),(.025,y,1.055),(-.17,EY+.12,1.027),(-.275,EY+.12,.99)],.045,cast)
box('intake-crossover','Intake connector casting bridge','intake',(.12,EY+.157,1.037),(.24,.20,.047),cast,.025)
for i in range(5):box('intake-casting-ribs','Intake connector cast ribs','intake',(-.05+i*.062,EY+.158,1.077),(.007,.165,.005),cast,.002)
cylinder('throttle','ETCS-i throttle body','intake',(-.292,EY+.12,.99),.052,.095,cast,'X')
ring('throttle-flange','Throttle body flange','intake',(-.255,EY+.12,.99),.066,.044,.009,machined,'X')
cylinder('throttle-plate','Throttle butterfly plate / illustrative opening','intake',(-.3,EY+.12,.99),.042,.002,brass,'X')
cylinder('throttle-motor','Throttle actuator motor','intake',(-.258,EY+.035,1.005),.029,.09,black,'X')
box('throttle-sensor','Throttle position sensor','electrical',(-.254,EY+.195,.989),(.039,.027,.044),black,.006)
box('fuel-rail','Fuel delivery rail','intake',(.228,EY,.89),(.025,.67,.027),steel,.005)
cylinder('fuel-pulsation-damper','Fuel pressure pulsation damper','intake',(.245,EY+.265,.912),.023,.026,steel)
cylinder('acis-actuator','ACIS vacuum actuator','intake',(.46,EY+.26,.94),.037,.036,black,'X')
rod('acis-link','ACIS actuator linkage','intake',(.465,EY+.25,.93),(.435,EY+.16,.92),.003,steel)
tube('pcv-hose','PCV hose','engine',[(.14,EY+.28,.928),(.18,EY+.35,.978),(.33,EY+.3,.99)],.007,rubber)
cylinder('pcv-valve','PCV valve','engine',(.14,EY+.28,.932),.009,.026,black)
# Actual airbox is on the vehicle's right (-X), battery behind it.
box('airbox','Air cleaner lower housing','intake',(-.60,-1.51,.699),(.27,.33,.17),black,.020)
box('airbox-lid','Air cleaner lid','intake',(-.60,-1.51,.796),(.285,.345,.05),black,.015)
box('air-filter','Air filter element','intake',(-.60,-1.51,.775),(.25,.30,.028),white,.004)
for i in range(25):box('air-filter-pleats','Air filter pleats','intake',(-.60,-1.65+i*.0116,.793),(.237,.002,.019),gasket,.0006)
for i in range(5):box('airbox-ribs','Airbox lid molded ribs','intake',(-.70+i*.048,-1.51,.825),(.006,.28,.006),black,.002)
tube('air-intake-duct','Air cleaner to throttle duct','intake',[(-.60,-1.335,.80),(-.56,-1.18,.857),(-.45,-1.06,.971),(-.345,EY+.12,.99)],.046,black)
for i in range(9):ring('intake-bellows','Air duct flexible bellows','intake',(-.55,-1.20+i*.008,.875+i*.006),.049,.042,.003,rubber,'Y',n=32)
for p in [(-.60,-1.327,.803),(-.351,EY+.12,.99)]:ring('intake-clamps','Air duct clamp bands','intake',p,.049,.047,.008,steel,'X' if p[0]>-.4 else 'Y',n=32)
box('maf','Mass air flow meter body','electrical',(-.635,-1.30,.855),(.045,.066,.024),black,.006)
box('maf-connector','MAF electrical connector','electrical',(-.67,-1.295,.86),(.024,.031,.018),black,.003)
box('intake-resonator','Intake resonator chamber','intake',(-.38,-1.34,.782),(.17,.20,.09),black,.036)
tube('intake-snorkel','Air cleaner inlet snorkel','intake',[(-.62,-1.64,.71),(-.62,-1.78,.67),(-.37,-1.86,.67)],.044,black)
# Ignition coils and three remote leads (not six invented distributor leads).
sourceid='rm718u-engine'
for n,i in enumerate([1,3,5]):
 y=cy[i];box('ignition-coil-'+str(n+1),'Ignition coil '+str(n+1),'electrical',(0,y,.932),(.056,.070,.025),black,.006)
 cylinder('ignition-boot-'+str(n+1),'Direct coil boot '+str(n+1),'electrical',(0,y,.908),.010,.033,rubber)
 # Remote lead endpoints intentionally remain identified as a routing study.
 target=cy[[4,2,0][n]]
 tube('ignition-lead-'+str(n+1),'High-tension lead '+str(n+1)+' / routing study','electrical',[(.022,y,.941),(.052,y,.96),(.051,target,.96),(0,target,.928)],.0045,rubber)
tube('engine-harness','Engine wiring loom','electrical',[(-.60,-.87,.88),(-.27,-.82,.97),(.20,-.88,.951),(.28,-1.30,.903),(.22,-1.53,.864)],.011,black)
for i,y in enumerate(cy):tube('injector-wiring','Injector harness branches','electrical',[(.26,y,.91),(.253,y,.891),(.235,y,.881)],.0035,black)
for x in [-.6,.6]:
 cylinder('strut-tower-cap-'+str(x),'Front strut tower upper plate','structure',(x,-1.3,.82),.096,.024,cast)
 for j in range(3):
  a=j*2*pi/3;fastener('strut-top-fasteners-'+str(x),'Strut upper fasteners / reference placement','structure',(x+.068*cos(a),-1.3+.068*sin(a),.84),.006)
# Small service items around the engine.
tube('oil-dipstick-tube','Engine oil level gauge tube','engine',[(.155,EY+.11,.43),(.27,EY+.1,.66),(.44,EY-.13,.90)],.005,steel)
ring('oil-dipstick-handle','Engine dipstick handle','engine',(.44,EY-.13,.93),.023,.015,.008,orange,'Y',n=28)
cylinder('starter','Starter motor','electrical',(.228,EY+.36,.52),.042,.155,cast,'Y')
cylinder('starter-solenoid','Starter magnetic switch','electrical',(.263,EY+.36,.569),.019,.09,black,'Y')
box('battery','Battery case','electrical',(-.60,-.90,.71),(.235,.29,.22),black,.01)
box('battery-top','Battery lid','electrical',(-.60,-.90,.827),(.244,.299,.021),black,.006)
box('battery-tray','Battery tray','electrical',(-.60,-.90,.591),(.26,.315,.016),black,.006)
for i,x in enumerate([-.68,-.52]):cylinder('battery-terminals','Battery terminal posts','electrical',(x,-.97,.85),.010,.02,steel)
box('battery-positive-cover','Positive terminal cover','electrical',(-.52,-.97,.856),(.035,.039,.024),red,.006)
box('battery-hold-down','Battery retaining bar','electrical',(-.60,-.90,.847),(.022,.318,.013),steel,.002)
tube('battery-ground','Battery ground cable','electrical',[(-.68,-.97,.86),(-.76,-.90,.80),(-.75,-.73,.67)],.006,black)
box('fuse-box','Engine compartment relay box','electrical',(.64,-.90,.76),(.19,.26,.13),black,.015)
cylinder('brake-booster','Brake booster, vehicle left','brakes',(.50,-.46,.77),.105,.08,iron,'Y')
cylinder('master-cylinder','Brake master cylinder','brakes',(.50,-.565,.77),.027,.16,cast,'Y')
box('brake-reservoir','Brake fluid reservoir','brakes',(.5,-.57,.84),(.10,.13,.085),white,.02)
cylinder('brake-reservoir-cap','Brake fluid reservoir cap','brakes',(.5,-.57,.89),.029,.01,black)
box('abs-unit','ABS hydraulic actuator envelope','brakes',(.65,-.65,.69),(.12,.14,.14),cast,.009)
# Water pump and accessory drive: pump is driven by the accessory belt.
sourceid='rm718u-pump'
px,pz=.065,.65
polygon_shell('water-pump','Water pump casting','cooling',[(-.10,.70),(-.07,.75),(.09,.75),(.17,.68),(.19,.56),(.12,.52),(-.015,.55),(-.08,.61)],F+.04,F+.108,cast)
# Raised volute and bearing neck replace the first flat casting silhouette.
cylinder('water-pump','Water pump casting','cooling',(px,F+.032,pz),.065,.059,cast,'Y',r2=.032,n=48)
for x,z in [(-.07,.70),(.04,.737),(.145,.69),(.158,.563),(.072,.543),(-.061,.609)]:
 cylinder('water-pump','Water pump mounting boss','cooling',(x,F+.04,z),.012,.030,cast,'Y',n=24)
 rod('water-pump','Water pump cast reinforcing web','cooling',(px+(x-px)*.38,F+.037,pz+(z-pz)*.38),(x,F+.047,z),.005,cast)
ring('water-pump-gasket','Water pump gasket','cooling',(px,F+.11,pz),.080,.058,.002,gasket,'Y')
cylinder('water-pump-hub','Water pump shaft and hub','cooling',(px,F-.023,pz),.024,.135,machined,'Y')
cylinder('water-pump-pulley','Water pump accessory pulley','cooling',(px,F-.099,pz),.068,.024,black,'Y')
ring('pump-pulley-lip','Water pump pulley rim','cooling',(px,F-.111,pz),.069,.063,.004,steel,'Y')
for i in range(4):
 a=pi/4+i*pi/2;fastener('water-pump-pulley-nut-'+str(i+1),'Water pump pulley nut '+str(i+1),'cooling',(px+.025*cos(a),F-.12,pz+.025*sin(a)),.0045,'Y')
for i,(x,z) in enumerate([(-.07,.70),(.04,.737),(.145,.69),(.158,.563),(.072,.543),(-.061,.609)]):fastener('water-pump-bolt-'+str(i+1),'Water pump mounting bolt '+str(i+1),'cooling',(x,F+.027,z),.005,'Y')
annotate('water-pump',count=6,section='CO-6/CO-8 — water pump mounting bolts',notes='Six block mounting bolts documented. Pump casting, passages, gasket outline and bolt positions are reconstructed estimates.')
annotate('water-pump-pulley',count=4,section='CO-5 — pulley retaining nuts')
cylinder('pump-impeller','Water pump impeller study','cooling',(px,F+.108,pz),.049,.005,cast,'Y')
for i in range(8):
 a=i*2*pi/8;pts=[(px+.016*cos(a),F+.12,pz+.016*sin(a)),(px+.035*cos(a+.3),F+.126,pz+.035*sin(a+.3)),(px+.048*cos(a+.45),F+.12,pz+.048*sin(a+.45))];tube('pump-impeller','Water pump impeller study','cooling',pts,.003,cast)
ring('pump-block-oring','Water pump block O-ring','cooling',(.122,F+.111,.567),.022,.019,.003,rubber,'Y')
tube('water-pump-drain','Water pump drain hose','cooling',[(.10,F+.05,.563),(.095,F+.05,.52),(.07,F+.08,.49)],.0035,rubber)
tube('water-bypass-outlet','Water bypass outlet','cooling',[(.035,F+.10,.758),(.055,F+.17,.805),(.18,F+.17,.811)],.016,cast)
tube('water-bypass-pipe-1','No.1 water bypass pipe','cooling',[(.18,F+.17,.811),(.25,F+.22,.787),(.27,EY+.27,.70)],.014,steel)
tube('water-bypass-pipe-2','No.2 water bypass pipe','cooling',[(.175,F+.09,.58),(.23,F+.22,.59),(.235,EY+.33,.61)],.014,steel)
cylinder('thermostat','Thermostat element','cooling',(.191,F+.09,.57),.026,.013,brass,'X')
ring('thermostat-seal','Thermostat rubber seal','cooling',(.197,F+.09,.57),.030,.025,.004,rubber,'X')
tube('water-inlet','Water inlet housing','cooling',[(.196,F+.09,.57),(.255,F+.05,.56),(.28,F-.015,.55)],.028,cast)
for x in [.18,.224]:fastener('water-inlet-fasteners','Water inlet retaining nuts','cooling',(x,F+.055,.59),.005,'Y')
# Accessory housings, ribs, front pulleys and dedicated tensioner.
for pid,x,z,r in [('alternator',.27,.49,.069),('ac-compressor',-.27,.405,.065),('ps-pump',-.255,.696,.046)]:
 cylinder(pid,pid.replace('-',' ').title(),'engine',(x,F+.10,z),r,.145,cast,'Y')
 for j in range(7):ring(pid+'-ribs','Accessory casing ribs','engine',(x,F+.039+j*.018,z),r+.001,r-.007,.005,cast,'Y',n=28)
 cylinder(pid+'-pulley','Accessory pulley','engine',(x,F-.103,z),r*.81,.025,black,'Y')
 for j in range(4):ring(pid+'-pulley','Accessory pulley grooves','engine',(x,F-.112+j*.006,z),r*.82,r*.77,.002,steel,'Y',n=28)
cylinder('ps-reservoir','Power steering reservoir','engine',(-.255,F+.14,.783),.043,.106,black)
cylinder('ps-reservoir-cap','Power steering reservoir cap','engine',(-.255,F+.14,.84),.046,.012,black)
cylinder('crank-damper','Crankshaft harmonic damper','engine',(0,F-.105,.458),.080,.039,iron,'Y')
for j in range(5):ring('crank-damper','Crank damper belt grooves','engine',(0,F-.12+j*.007,.458),.08,.076,.002,steel,'Y')
fastener('crank-damper-bolt','Crankshaft pulley retaining bolt','engine',(0,F-.139,.458),.014,'Y')
cylinder('accessory-tensioner','Accessory drive belt tensioner','engine',(-.11,F+.012,.734),.040,.044,cast,'Y')
rod('accessory-tensioner-arm','Accessory tensioner arm','engine',(-.11,F+.005,.734),(-.14,F-.055,.665),.012,cast)
cylinder('accessory-tensioner-pulley','Accessory tensioner pulley','engine',(-.14,F-.103,.665),.035,.025,black,'Y')
# Accessory route remains an explicit study, does not masquerade as a validated belt path.
tube('accessory-belt','Accessory belt / route awaiting validation','engine',[(-.29,F-.103,.696),(-.24,F-.103,.734),(-.11,F-.103,.775),(.105,F-.103,.705),(.276,F-.103,.543),(.313,F-.103,.484),(.05,F-.103,.386),(-.255,F-.103,.35),(-.307,F-.103,.398),(-.29,F-.103,.696)],.0035,rubber)
# Radiator restored ahead of the engine; dual motor-driven fans and open shroud.
sourceid='rm718u-cooling'
RY=-1.97
box('radiator','Radiator core','cooling',(0,RY,.57),(.94,.045,.37),iron,.003)
for j in range(46):box('radiator-fins','Radiator fins','cooling',(-.451+j*.020,RY-.026,.57),(.003,.006,.35),cast,.0004)
for x in [-.486,.486]:box('radiator-tanks','Radiator side tanks','cooling',(x,RY,.57),(.046,.067,.40),black,.008)
for z in [.37,.77]:box('fan-shroud','Fan shroud crossmember','cooling',(0,RY+.063,z),(.94,.029,.023),black,.004)
for s in [-1,1]:
 x=s*.23;ring('fan-shroud','Dual electric fan shroud','cooling',(x,RY+.063,.57),.188,.170,.031,black,'Y')
 cylinder('fan-motor-'+str(s),'Electric radiator fan motor','cooling',(x,RY+.11,.57),.032,.047,black,'Y')
 for j in range(7):
  a=j*2*pi/7;vs=[(x+.045*cos(a),RY+.075,.57+.045*sin(a)),(x+.163*cos(a+.28),RY+.073,.57+.163*sin(a+.28)),(x+.169*cos(a+.55),RY+.093,.57+.169*sin(a+.55)),(x+.050*cos(a+.8),RY+.086,.57+.050*sin(a+.8))];mesh('fan-blades-'+str(s),'Cooling fan blades','cooling',vs,[(0,1,2,3)],black)
 tube('fan-wiring','Cooling fan wiring','electrical',[(x,RY+.14,.57),(x+.1,RY+.11,.73),(s*.46,RY+.08,.75)],.004,black)
box('condenser','Air conditioning condenser','cooling',(0,RY-.077,.57),(.93,.020,.35),steel,.004)
cylinder('receiver-drier','A/C receiver-drier envelope','cooling',(.47,RY-.10,.54),.02,.28,cast)
box('radiator-support','Upper radiator support','structure',(0,RY,.79),(1.35,.073,.055),black,.009)
cylinder('radiator-cap','Radiator filler cap','cooling',(.33,RY,.795),.025,.016,steel)
for x in [-.39,.39]:box('radiator-cushions','Radiator mount cushions','cooling',(x,RY,.362),(.045,.065,.025),rubber,.006)
cylinder('radiator-drain','Radiator drain cock','cooling',(-.48,RY+.04,.385),.008,.025,white,'Y')
tube('upper-radiator-hose','Upper radiator hose','cooling',[(.33,RY+.03,.743),(.38,-1.83,.765),(.25,F+.17,.80),(.13,F+.17,.805)],.022,rubber)
tube('lower-radiator-hose','Lower radiator hose','cooling',[(-.46,RY+.035,.415),(-.32,-1.81,.37),(.19,F-.07,.49),(.28,F-.015,.55)],.021,rubber)
for i,p in enumerate([(.33,RY+.04,.74),(.13,F+.17,.805),(-.45,RY+.05,.415),(.277,F-.02,.55)]):ring('coolant-hose-clamp-'+str(i),'Coolant hose clamp','cooling',p,.024,.022,.008,steel,'Y',n=28)
box('coolant-reservoir','Coolant reservoir','cooling',(.62,-1.73,.60),(.14,.18,.20),white,.022)
cylinder('reservoir-cap','Coolant reservoir cap','cooling',(.62,-1.73,.71),.026,.011,black)
tube('coolant-overflow','Coolant overflow hose','cooling',[(.33,RY,.79),(.47,-1.91,.77),(.62,-1.73,.705)],.004,rubber)
tube('heater-supply','Heater supply hose','cooling',[(.23,EY+.33,.67),(.27,-.65,.7),(.16,-.43,.69)],.012,rubber)
tube('heater-return','Heater return hose','cooling',[(.16,EY+.34,.65),(.17,-.65,.67),(.12,-.43,.68)],.012,rubber)
# A650E outer castings and a separate service stack, based on the parts-maker exploded plate.
sourceid='transtar-a650e'
TZ=.45
# Loft a faceted cast case: wide front bell, narrowing main body and tail.
def loft(pid,name,sections,mat):
 vs=[];fs=[];N=29 if pid=='transmission-case' else 48
 for y,rx,rz,zc in sections:
  if pid=='transmission-case':
   profile=[(rx*cos(j*pi/24),zc+rz*sin(j*pi/24)) for j in range(25)]+[(-.173,zc-.03),(-.173,.335),(.173,.335),(.173,zc-.03)]
   vs.extend((x,y,z) for x,z in profile)
  else:
   for j in range(N):
    a=j*2*pi/N;vs.append((rx*cos(a),y,zc+rz*sin(a)))
 for i in range(len(sections)-1):
  for j in range(N):fs.append((i*N+j,i*N+(j+1)%N,(i+1)*N+(j+1)%N,(i+1)*N+j))
 o=mesh(pid,name,'transmission',vs,fs,mat)
 for face in o.data.polygons:face.use_smooth=True
 # True wall thickness, leaving ends open for separated views.
 mod=o.modifiers.new('Casting wall estimate','SOLIDIFY');mod.thickness=.007;return o
loft('bellhousing','A650E converter housing',[(-.82,.205,.203,.47),(-.79,.204,.200,.47),(-.70,.19,.18,.47),(-.60,.155,.15,.45)],cast)
ring('bellhousing-flange','Converter housing flange','transmission',(0,-.821,.47),.214,.193,.012,cast,'Y')
for j in range(10):
 a=(j+.35)*2*pi/10;fastener('bellhousing-fasteners','Bellhousing fasteners / positions estimated','transmission',(.202*cos(a),-.829,.47+.202*sin(a)),.007,'Y')
loft('transmission-case','A650E main case casting',[(-.61,.153,.147,.45),(-.53,.15,.139,.45),(-.33,.14,.126,.45),(-.06,.122,.113,.45),(.01,.103,.095,.45)],cast)
for y in [-.58,-.48,-.37,-.25,-.13,-.02]:
 ring('case-ribs','A650E transverse cast ribs','transmission',(0,y,.45),.144 if y<-.2 else .125,.134 if y<-.2 else .115,.008,cast,'Y')
for a in [0,pi/4,pi/2,3*pi/4,pi]:
 tube('case-longitudinal-ribs','A650E longitudinal ribs','transmission',[(.155*cos(a),-.60,.45+.147*sin(a)),(.144*cos(a),-.36,.45+.135*sin(a)),(.122*cos(a),-.055,.45+.115*sin(a))],.007,cast)
loft('tail-housing','A650E extension housing',[(.0,.101,.093,.45),(.09,.089,.082,.45),(.22,.057,.055,.45),(.26,.048,.047,.45)],cast)
for j in range(6):
 a=j*2*pi/6;rod('tail-ribs','Extension casting ribs','transmission',(.10*cos(a),.025,.45+.09*sin(a)),(.05*cos(a),.24,.45+.048*sin(a)),.005,cast)
ring('output-seal','Extension output seal','transmission',(0,.261,.45),.046,.028,.009,rubber,'Y')
cylinder('trans-output-shaft','Transmission output shaft','transmission',(0,.21,.45),.027,.20,steel,'Y')
for j in range(16):
 a=j*2*pi/16;rod('output-shaft-splines','Output splines / count illustrative','transmission',(.027*cos(a),.265,.45+.027*sin(a)),(.027*cos(a),.30,.45+.027*sin(a)),.0014,steel,n=8)
cylinder('torque-converter','Torque converter outer shell','transmission',(0,-.742,.47),.181,.096,steel,'Y')
ring('converter-weld','Converter circumferential weld','transmission',(0,-.747,.47),.183,.177,.006,iron,'Y')
cylinder('trans-input-shaft','Transmission input shaft','transmission',(0,-.64,.45),.016,.22,steel,'Y')
ring('front-pump','Transmission front oil pump assembly','transmission',(0,-.589,.45),.136,.024,.035,cast,'Y')
ring('front-pump-seal','Front pump seal','transmission',(0,-.61,.45),.036,.022,.008,rubber,'Y')
# Internals are exploded-diagram informed, with tooth counts and clutch stack dimensions unverified.
for k,(pid,y,r) in enumerate([('od-direct-clutch',-.535,.108),('direct-clutch',-.425,.106),('forward-clutch',-.315,.105),('second-brake',-.205,.104),('low-reverse-clutch',-.075,.091)]):
 ring(pid+'-drum',pid.replace('-',' ').title()+' drum','transmission',(0,y,.45),r,r-.011,.065,cast,'Y')
 for j in range(5):
  ring(pid+'-frictions',pid.replace('-',' ').title()+' friction study','transmission',(0,y-.024+j*.010,.45),r-.013,.064,.003,friction,'Y')
  ring(pid+'-steels',pid.replace('-',' ').title()+' steel plate study','transmission',(0,y-.020+j*.010,.45),r-.011,.060,.002,steel,'Y')
for k,y in enumerate([-.47,-.25,-.04]):
 gear('planetary-sun-'+str(k),'Planetary sun gear study','transmission',(0,y,.45),.032,.014,.023,18,steel)
 for j in range(3):
  a=j*2*pi/3;gear('planetary-planets-'+str(k),'Planetary pinion study','transmission',(.058*cos(a),y,.45+.058*sin(a)),.025,.008,.023,14,steel)
 ring('planetary-ring-'+str(k),'Planetary annulus study','transmission',(0,y,.45),.096,.084,.03,steel,'Y')
# Hollow stamped pan; flange/seal distinct. Factory specifies FIPG, not a loose service gasket.
sourceid='rm718u-at-service'
box('trans-pan-flange','Transmission pan mounting flange','transmission',(0,-.285,.273),(.345,.545,.012),cast,.014)
pan=box('transmission-pan','A650E stamped oil pan','transmission',(0,-.285,.248),(.34,.53,.05),iron,.017)
# Open the top of pan using a subtraction, exposing three magnets in service views.
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,-.285,.28));c=bpy.context.object;c.dimensions=(.322,.512,.102);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);m=pan.modifiers.new('Pan cavity','BOOLEAN');m.object=c;m.operation='DIFFERENCE';bpy.context.view_layer.objects.active=pan;bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(c,do_unlink=True)
# Thin rectangular FIPG bead, no invented pre-cut OEM gasket.
tube('trans-pan-sealant','Oil pan FIPG sealing bead','transmission',[(-.159,-.535,.274),(.159,-.535,.274),(.159,-.035,.274),(-.159,-.035,.274),(-.159,-.535,.274)],.0015,gasket)
pts=[(-.159,-.50+i*.075,.268) for i in range(7)]+[(.159,-.50+i*.075,.268) for i in range(7)]+[(-.09,-.54,.268),(0,-.54,.268),(.09,-.54,.268),(-.074,-.03,.268),(.074,-.03,.268)]
for i,p in enumerate(pts):fastener('trans-pan-bolt-'+str(i+1),'A650E pan bolt '+str(i+1),'transmission',p,.0045)
annotate('transmission-pan',count=19,section='AT-5/AT-7 — pan bolts',notes='19 bolts and three pan magnets documented. Pan outline, bolt spacing, FIPG bead path and casting clearances remain estimated.')
for i,(x,y) in enumerate([(-.08,-.43),(.07,-.34),(-.045,-.14)]):box('trans-pan-magnet-'+str(i+1),'Pan magnet '+str(i+1),'transmission',(x,y,.232),(.025,.039,.006),iron,.004)
fastener('trans-drain-plug','ATF drain plug','transmission',(.085,-.43,.218),.008)
ring('trans-drain-washer','ATF drain plug sealing washer','transmission',(.085,-.43,.224),.010,.005,.0015,steel)
# Three valve-body cast sections and thin separator plates, channels explicitly schematic.
for pid,p,size in [('valve-body',(0,-.285,.355),(.265,.43,.026)),('valve-body-lower-1',(-.019,-.31,.331),(.232,.365,.016)),('valve-body-lower-2',(.068,-.24,.318),(.116,.20,.011))]:
 box(pid,pid.replace('-',' ').title(),'transmission',p,size,cast,.007)
for y in [-.43,-.38,-.33,-.28,-.23,-.18]:
 for x in [-.09,-.03,.03,.09]:box('valve-body-channel-study','Valve body surface ribs — not hydraulic routing','transmission',(x,y,.372),(.008,.041,.009),cast,.002)
box('valve-body-separator','Valve body separator plate study','transmission',(0,-.285,.341),(.262,.425,.0015),steel,.003)
for i in range(21):
 col=i%3;row=i//3;fastener('valve-body-bolt-'+str(i+1),'Valve body retaining bolt '+str(i+1),'transmission',(-.102+col*.094,-.46+row*.056,.319),.0035)
annotate('valve-body',refs=['rm718u-at-valve'],count=21,section='AT-8 — valve body removal')
# Seven distinct solenoid identities; no pinout, valve calibration or port-placement claim.
for i,name in enumerate(['S1','S2','S3','S4','SLN','SLU','SLT']):
 x=-.118 if i<4 else .118;y=-.45+(i if i<4 else i-4)*.083;pid='solenoid-'+name.lower()
 cylinder(pid,'A650E solenoid '+name,'transmission',(x,y,.351),.013,.059,steel,'X')
 cylinder(pid,'A650E solenoid '+name,'transmission',(x+(-.027 if i<4 else .027),y,.351),.014,.025,black,'X')
 box(pid+'-connector','Solenoid '+name+' connector','transmission',(x,y,.321),(.023,.019,.02),black,.003)
 annotate(pid,refs=['a650e-valve-overhaul'],notes='A650E family solenoid identity from the 1999 overhaul reference; 2000 on-vehicle source confirms seven connectors. Position, electrical pinout and hydraulic calibration are unverified.')
box('trans-strainer','A650E ATF strainer','transmission',(-.019,-.28,.297),(.213,.34,.02),steel,.018)
for i,(x,y) in enumerate([(-.094,-.418),(.061,-.417),(-.095,-.133),(.072,-.139)]):fastener('trans-strainer-bolt-'+str(i+1),'Oil strainer bolt '+str(i+1),'transmission',(x,y,.281),.004)
for i,(x,y) in enumerate([(-.052,-.35),(.041,-.29),(-.025,-.18)]):ring('trans-strainer-seal-'+str(i+1),'Oil strainer seal '+str(i+1),'transmission',(x,y,.31),.013,.009,.004,rubber,n=24)
annotate('trans-strainer',count=4,section='AT-5/AT-7 — strainer bolts',notes='Four strainer bolts and three seals documented. Pickup opening and sealing face positions are estimated.')
for side in [-1,1]:
 tube('trans-solenoid-harness','Solenoid wiring harness','transmission',[(side*.11,-.49,.318),(side*.095,-.33,.309),(side*.105,-.16,.317),(.12,-.08,.35)],.0035,black)
cylinder('trans-temperature-sensor','ATF temperature sensor','transmission',(.101,-.20,.323),.007,.028,black,'Y')
cylinder('trans-case-connector','Transmission case electrical connector','transmission',(.142,-.09,.406),.019,.022,black,'X')
box('range-switch','Park/neutral position switch','transmission',(-.15,-.35,.414),(.026,.10,.06),black,.017)
rod('selector-lever','Transmission selector lever','transmission',(-.175,-.35,.414),(-.18,-.27,.365),.006,steel)
for i,y in enumerate([-.50,-.10]):cylinder('trans-speed-sensor-'+str(i+1),'Transmission speed sensor '+str(i+1),'transmission',(.10,y,.561),.012,.031,black)
tube('atf-dipstick-tube','ATF dipstick tube','transmission',[(.14,-.50,.405),(.22,-.64,.51),(.34,-.72,.78),(.39,-.71,.89)],.006,steel)
ring('atf-dipstick-handle','ATF dipstick handle','transmission',(.39,-.71,.919),.019,.012,.007,orange,'Y',n=24)
for i,z in enumerate([.395,.43]):tube('atf-cooler-line-'+str(i+1),'ATF cooler pipe '+str(i+1),'transmission',[(.147,-.47,z),(.26,-.61,z-.04),(.34,-1.10,.34+i*.036),(.41,-1.75,.37+i*.05),(.46,RY,.44+i*.11)],.004,steel)
tube('trans-breather','Transmission breather hose','transmission',[(.05,-.5,.60),(.07,-.62,.64),(.12,-.71,.69)],.0045,rubber)
# Consolidate by semantic part ID. Modifier application precedes merge; metadata stays on each group.
bpy.ops.object.select_all(action='DESELECT')
for o in list(new):
 if o.name not in bpy.data.objects:continue
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 if o.type in ['CURVE','FONT']:bpy.ops.object.convert(target='MESH')
 elif o.type=='MESH':
  for m in list(o.modifiers):
   try:bpy.ops.object.modifier_apply(modifier=m.name)
   except RuntimeError:pass
 o.select_set(False)
by={}
for o in scene.objects:
 if o.type=='MESH' and o.get('partId') in records:by.setdefault(o['partId'],[]).append(o)
for pid,obs in by.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in obs:o.select_set(True)
 bpy.context.view_layer.objects.active=obs[0]
 if len(obs)>1:bpy.ops.object.join()
 o=bpy.context.object;o.name=pid;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o['partId']=pid;o['label']=records[pid]['name'];o['system']=records[pid]['system'];o['sourceRef']=','.join(records[pid]['sourceRefs'])
 o['accuracy']='unverified';o['modelVersion']=5
 # Correct packaging found in closed-hood and underside reviews. Translations
 # are fit estimates, not measured factory installation coordinates.
 if pid in ['intake-crossover','intake-casting-ribs']:
  for v in o.data.vertices:
   world=o.matrix_world@v.co;world.z=1.01+(world.z-1.01)*.65-.012;v.co=o.matrix_world.inverted()@world
 if pid=='intake-plenum':o.location.z-=.015
 if o.get('system')=='transmission':
  if pid.startswith(('valve-body','solenoid-','trans-strainer','trans-solenoid-harness','trans-temperature-sensor')):o.location.z-=.04
  o.location.z-=.08
 else:o.location.z-=.09
 records[pid]['meshName']=pid;records[pid]['dimensionsMetres']=list(o.dimensions)
# Open the service face; remove the earlier circular case/valve-body overlap.
for pid in ['transmission-case','case-ribs']:
 o=bpy.data.objects.get(pid)
 bpy.ops.mesh.primitive_cube_add(size=1,location=(0,-.28,-.241));cut=bpy.context.object;cut.dimensions=(1,1.4,1);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 bpy.context.view_layer.objects.active=o;m=o.modifiers.new('Open valve body service face','BOOLEAN');m.object=cut;m.operation='DIFFERENCE';bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(cut,do_unlink=True)
# Cut a real opening in the mounting flange (the prior full plate occluded the strainer).
o=bpy.data.objects.get('trans-pan-flange');bpy.ops.mesh.primitive_cube_add(size=1,location=(0,-.285,.193));cut=bpy.context.object;cut.dimensions=(.306,.500,.12);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);bpy.context.view_layer.objects.active=o;m=o.modifiers.new('Open service flange','BOOLEAN');m.object=cut;m.operation='DIFFERENCE';bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(cut,do_unlink=True)
# Join the side walls to the same semantic case group.
for pos,size in [((-.159,-.285,.225),(.018,.53,.064)),((.159,-.285,.225),(.018,.53,.064)),((0,-.544,.225),(.31,.018,.064)),((0,-.026,.225),(.31,.018,.064))]:
 wall=box('transmission-case','A650E main case casting','transmission',pos,size,cast,.005)
 bpy.context.view_layer.objects.active=wall
 for mod in list(wall.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
 bpy.ops.object.select_all(action='DESELECT');wall.select_set(True);case=bpy.data.objects.get('transmission-case');case.select_set(True);bpy.context.view_layer.objects.active=case;bpy.ops.object.join()
for pid in records:
 ob=bpy.data.objects.get(pid)
 if ob:records[pid]['dimensionsMetres']=list(ob.dimensions)
# Replace satisfied inventory placeholders without silently deleting unresolved exact-geometry requirements.
fulfilled={'pending-engine-1','pending-engine-3','pending-engine-7','pending-engine-8','pending-engine-13','pending-engine-14','pending-engine-16','pending-engine-17','pending-engine-21','pending-engine-25','pending-engine-26','pending-engine-27','pending-engine-31','pending-engine-41','pending-engine-44','pending-transmission-2','pending-transmission-6','pending-transmission-7','pending-transmission-8','pending-transmission-13','pending-transmission-14','pending-transmission-15','pending-transmission-16','pending-transmission-17','pending-transmission-19','pending-transmission-20','pending-transmission-21','pending-transmission-22','pending-transmission-23','pending-transmission-26','pending-cooling-1','pending-cooling-4','pending-cooling-5','pending-cooling-7','pending-cooling-8','pending-cooling-12','pending-intake-1','pending-intake-2','pending-intake-3','pending-intake-4','pending-intake-6','pending-intake-8','pending-intake-9','pending-electrical-1','pending-electrical-2'}
manifest['parts']=[p for p in manifest['parts'] if p['id'] not in set(removed)|fulfilled and p['id'] not in records]+list(records.values())
for p in manifest['parts']:
 if p['id']=='pending-transmission-25':p['name']='Pan FIPG bead path and sealing-face validation';p['notes']='Factory on-vehicle source specifies FIPG. A pre-cut OEM service gasket is not assumed.'
manifest['version']=5;manifest['accuracy']='Reference-informed mechanical study. No complete part is dimensionally verified.'
manifest['mechanicalRevision']={'addedOrRebuiltGroups':len(records),'retiredPlaceholderIds':sorted(fulfilled),'referenceDate':'2026-10-06','basis':'RM718U component identities and service fastener counts, stock GS300 engine-bay photograph, Transtar A650E family exploded parts plate. Geometry remains original and estimated.'}
manifest['openIssues']=['No component is validated against a scan or measurement drawing. The assembly is not a 1:1 service model.','Timing belt tooth counts, wrap angles, timing marks and accessory belt route are unverified; do not use the model for engine timing.','Transmission internals are family-level studies. Clutch quantities, clearances, hydraulic passages and gear tooth counts are not validated.','Documented bolt quantities do not validate modeled hole positions, thread sizes, lengths or torque application.','Exterior height discrepancy, US trim details and suspension hardpoints remain unresolved.','Service exploration stages omit workshop preparation, complete removal/reassembly steps and final checks. They are anatomy studies, not repair instructions.']
refs=json.loads((Path(__file__).resolve().parents[2]/'research/s160-mechanical-sources.json').read_text());manifest['sources']=[s for s in manifest['sources'] if s['id'] not in {x['id'] for x in refs['sources']}]+refs['sources']
meshes=[o for o in scene.objects if o.type=='MESH'];manifest['meshCount']=len(meshes);manifest['triangleCount']=sum(sum(len(f.vertices)-2 for f in o.data.polygons) for o in meshes)
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
bpy.ops.object.select_all(action='DESELECT');bpy.ops.wm.save_as_mainfile(filepath=str(out/'gs300-assembly.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'gs300-assembly.glb'),export_format='GLB',export_copyright='Exterior: David_Holiday CC BY 4.0 https://sketchfab.com/3d-models/0bc00c7cd32c4d6da2098fbc2ab1eff0 ; mechanical geometry: Wrenchwise MIT. Reference-informed, not factory CAD.',export_extras=True,export_cameras=False,export_lights=False)
(out/'gs300-parts.json').write_text(json.dumps(manifest,indent=2)+'\n')
(out/'parts-inventory.txt').write_text('GS300 v5 — reference-informed groups, not a verified OEM bill of materials.\n\n'+'\n'.join(f"{p['status']:8} | {p['system']:14} | {p['id']} | {p['name']}" for p in manifest['parts'])+'\n')
print('MECHANICAL_V5',len(records),len(meshes),manifest['triangleCount'],flush=True)
