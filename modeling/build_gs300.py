"""Original provisional GS 300 assembly. Units: metres; all part geometry unverified.
Run: blender --background --factory-startup --python modeling/build_gs300.py -- OUTPUT_DIR
Global envelope targets are from the 2000 US Lexus brochure; these are not scan data.
"""
import bpy, math, json, os, sys
from mathutils import Vector
from math import sin, cos, pi, sqrt
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else '../outputs/gs300-assembly')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
records={};groups={};SOURCES=[{'id':'lexus-brochure','title':'Lexus 2000 US GS brochure (archived manufacturer publication)','url':'https://dgv4.xr793.org/wp-content/uploads/2018/11/2000-Lexus-GS.pdf'},{'id':'lexus-specs','title':'Lexus 2000 GS specification sheet (archived manufacturer publication)','url':'https://xr793.com/wp-content/uploads/2022/01/2000-Lexus-GS-Specs.pdf'},{'id':'tis','title':'Toyota / Lexus Technical Information System','url':'https://techinfo.toyota.com/'}]
SYSTEMS={'body':'Body & glazing','engine':'Engine & timing','transmission':'Automatic transmission','driveline':'Driveline','suspension':'Suspension & steering','brakes':'Brakes','wheels':'Wheels & tires','cooling':'Cooling','intake':'Intake & fuel','exhaust':'Exhaust','electrical':'Electrical','interior':'Interior','structure':'Structure & mounts'}
for key,label in SYSTEMS.items():
 o=bpy.data.objects.new(key,None);scene.collection.objects.link(o);o['system']=key;o['label']=label;groups[key]=o

def material(name,color,metal=0,rough=.45,coat=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Coat Weight'].default_value=coat
 return m
paint=material('Millennium silver inspired - visual approximation',(.24,.29,.32),.42,.31,.6)
chrome=material('Polished aluminum',(.7,.76,.8),.96,.2)
cast=material('Cast aluminum',(.42,.46,.49),.78,.43)
iron=material('Cast iron',(.11,.12,.13),.72,.54)
steel=material('Satin zinc steel',(.35,.39,.41),.84,.32)
black=material('Molded black polymer',(.021,.026,.031),.04,.49)
rubber=material('Rubber',(.012,.014,.017),0,.72)
glass=material('Blue green tinted glass',(.012,.021,.026),.08,.20,.4)
cloth=material('Charcoal fabric',(.075,.085,.095),0,.91)
wood=material('Walnut inspired trim',(.095,.04,.014),.12,.28,.5)
red=material('Red lens',(.28,.006,.009),.05,.25,.4)
amber=material('Amber lens',(.8,.24,.015),.1,.3,.3)
lens=material('Clear headlamp reflector',(.52,.56,.58),.18,.22,.4)
copper=material('Copper',(.37,.15,.055),.8,.38)
white=material('Reservoir polymer',(.66,.67,.58),0,.5)
beltmat=material('Timing belt rubber',(.018,.020,.022),0,.8)
# Portable PBR surface maps generated from an original deterministic pattern.
# These are material studies, not sampled factory textures.
for mat,scale,strength in [(cast,65,.16),(iron,45,.18),(rubber,130,.10),(cloth,180,.24),(black,95,.08)]:
 n=mat.node_tree.nodes;l=mat.node_tree.links;p=n.get('Principled BSDF');tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=scale;tex.inputs['Detail'].default_value=2
 bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=strength;bump.inputs['Distance'].default_value=.0005;l.new(tex.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],p.inputs['Normal'])

def record(pid,label,system,detail='Provisional original geometry; dimensions and fitment require measurement.',status='modeled'):
 if pid not in records:records[pid]={'id':pid,'name':label,'system':system,'status':status,'accuracy':'unverified','oemPartNumber':None,'quantityVerified':False,'notes':detail,'source':'Original Blender geometry' if status=='modeled' else 'Inventory candidate; verify against VIN-specific parts catalog'}

def tag(obj,pid,label,system,mat=None):
 obj.name=pid+'__'+label.replace(' ','_');obj.parent=groups[system];obj['partId']=pid;obj['label']=label;obj['system']=system;obj['accuracy']='unverified';record(pid,label,system)
 if mat:obj.data.materials.append(mat)
 return obj

def finish(o,bevel=0,smooth=False):
 if bevel:
  mod=o.modifiers.new('Manufactured edge fillet','BEVEL');mod.width=bevel;mod.segments=2
 if smooth and o.type=='MESH':
  for p in o.data.polygons:p.use_smooth=True
 return o

def box(pid,label,sys,loc,size,mat,bevel=.008,rot=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if rot:o.rotation_euler=rot
 return finish(tag(o,pid,label,sys,mat),bevel)

def cyl(pid,label,sys,loc,r,depth,mat,axis='Z',r2=None,verts=32):
 bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=r,radius2=r if r2 is None else r2,depth=depth,location=loc)
 o=bpy.context.object
 if axis=='Y':o.rotation_euler.x=pi/2
 if axis=='X':o.rotation_euler.y=pi/2
 return finish(tag(o,pid,label,sys,mat),.0015,True)

def ellipsoid(pid,label,sys,loc,scale,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=loc);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(tag(o,pid,label,sys,mat),0,True)

def mesh(pid,label,sys,vertices,faces,mat,solid=0):
 m=bpy.data.meshes.new(pid);m.from_pydata(vertices,[],faces);m.update();o=bpy.data.objects.new(pid,m);scene.collection.objects.link(o);tag(o,pid,label,sys,mat)
 if solid:mod=o.modifiers.new('Panel thickness','SOLIDIFY');mod.thickness=solid
 return finish(o,0,True)

def tube(pid,label,sys,points,r,mat):
 cu=bpy.data.curves.new(pid,'CURVE');cu.dimensions='3D';cu.resolution_u=10;cu.bevel_depth=r;cu.bevel_resolution=3;s=cu.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for bp,co in zip(s.bezier_points,points):bp.co=co;bp.handle_left_type='AUTO';bp.handle_right_type='AUTO'
 o=bpy.data.objects.new(pid,cu);scene.collection.objects.link(o);tag(o,pid,label,sys,mat);return o

def rod(pid,label,sys,a,b,r,mat):
 v=Vector(b)-Vector(a);o=cyl(pid,label,sys,(Vector(a)+Vector(b))/2,r,v.length,mat);o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return o

def torus(pid,label,sys,loc,major,minor,mat,axis='Z'):
 bpy.ops.mesh.primitive_torus_add(major_segments=48,minor_segments=10,location=loc,major_radius=major,minor_radius=minor);o=bpy.context.object
 if axis=='Y':o.rotation_euler.x=pi/2
 if axis=='X':o.rotation_euler.y=pi/2
 return finish(tag(o,pid,label,sys,mat),0,True)

def bolts(pid,label,sys,points,r=.009,axis='Z'):
 for p in points:cyl(pid,label,sys,p,r,.012,steel,axis,verts=6)

# Structural geometry. A metre-based assembly, not factory CAD.
box('floor','Floor pan','structure',(0,.35,.28),(1.55,2.8,.055),iron,.025)
box('tunnel','Transmission tunnel','structure',(0,.08,.38),(.35,1.75,.2),iron,.08)
for side in [-1,1]:
 box('rail-'+str(side),'Longitudinal rail '+str(side),'structure',(side*.59,0,.34),(.11,4.0,.12),iron,.025)
 box('sill-'+str(side),'Rocker reinforcement '+str(side),'structure',(side*.77,.15,.30),(.12,2.7,.18),steel,.02)
for y,ax in [(-1.4,'front'),(1.4,'rear')]:
 box('subframe-'+ax,ax.title()+' subframe','structure',(0,y,.33),(1.20,.44,.10),iron,.03)
 for s in [-1,1]:cyl('subframe-mount-'+ax+str(s),'Subframe rubber mount','structure',(s*.48,y,.40),.06,.09,rubber)
box('firewall','Firewall','structure',(0,-.40,.64),(1.52,.055,.68),paint,.04)
box('radiator-support','Radiator support','structure',(0,-1.97,.58),(1.49,.055,.18),paint,.025)
box('rear-bulkhead','Rear bulkhead','structure',(0,1.35,.61),(1.48,.05,.62),paint,.025)

# Separate reference-based S160 exterior module.
exec(compile(open(os.path.join(os.path.dirname(__file__),'gs300_exterior.py')).read(),'gs300_exterior.py','exec'))

# Four wheels, brakes, and chassis links. Tire outer diameter is provisional: OEM sources conflict on 215/60 versus 225/60.
for y,ax in [(-WB/2,'front'),(WB/2,'rear')]:
 for s,side in [(-1,'left'),(1,'right')]:
  pos=(s*.769,y,.332);name=ax+'-'+side
  # Tire shoulder and sidewall sections; barrel remains open between the spokes.
  tv=[];tf=[];section=[(-.108,.206),(-.11,.268),(-.098,.311),(-.077,.330),(.077,.330),(.098,.311),(.11,.268),(.108,.206)]
  for i in range(97):
   a=i*2*pi/96
   for dx,r in section:tv.append((s*.769+dx,y+r*cos(a),.332+r*sin(a)))
  for i in range(96):
   for k in range(7):n=i*8+k;tf.append((n,n+8,n+9,n+1))
  mesh('tire-'+name,'Tire '+name,'wheels',tv,tf,rubber)
  for dx in [-.082,.082]:torus('wheel-'+name,'16 inch open wheel barrel '+name,'wheels',(s*.769+dx,y,.332),.195,.009,cast,'X')
  torus('rim-'+name,'Wheel rim lip '+name,'wheels',(s*.878,y,.332),.196,.009,chrome,'X')
  cyl('hub-cap-'+name,'Wheel center cap '+name,'wheels',(s*.877,y,.332),.052,.012,paint,'X')
  for i in range(5):
   a=i*2*pi/5+pi/2;verts=[]
   for dx in [s*.853,s*.88]:
    for r,da in [(.047,-.36),(.183,-.13),(.19,.13),(.047,.36)]:verts.append((dx,y+r*cos(a+da),.332+r*sin(a+da)))
   mesh('spokes-'+name,'Five-spoke wheel face study '+name,'wheels',verts,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],cast)
  for i in range(5):
   a=i*2*pi/5;cyl('lug-'+name,'Wheel lug nuts '+name,'wheels',(s*.892,y+cos(a)*.061,.332+sin(a)*.061),.010,.014,steel,'X',verts=6)
  # Raised fine tread blocks and sidewall channels.
  for i in range(54):
   a=i*2*pi/54
   for offset in [-.029,.029]:
    o=box('tread-'+name,'Tire tread '+name,'wheels',(s*.769+offset,y+cos(a)*.329,.332+sin(a)*.329),(.045,.010,.016),rubber,.001);o.rotation_euler.x=a
  radius=.14732 if ax=='front' else .1524
  cyl('rotor-'+name,'Brake rotor '+name,'brakes',(s*.715,y,.332),radius,.023,steel,'X')
  cyl('hub-'+name,'Wheel hub '+name,'brakes',(s*.694,y,.332),.052,.08,iron,'X')
  box('caliper-'+name,'Brake caliper '+name,'brakes',(s*.72,y-.105,.365),(.075,.083,.135),cast,.023)
  tube('brake-hose-'+name,'Flexible brake hose '+name,'brakes',[(s*.72,y-.12,.39),(s*.54,y-.12,.50),(s*.45,y-.05,.63)],.006,black)
  for h,wide in [(.40,.35),(.56,.20)]:
   rod('control-arm-'+str(h)+'-'+name,'Control arm '+name+' '+str(h),'suspension',(s*.65,y,.37 if h<.5 else .58),(s*.37,y-wide,h),.022,steel)
   rod('control-arm-'+str(h)+'-'+name,'Control arm '+name+' '+str(h),'suspension',(s*.65,y,.37 if h<.5 else .58),(s*.37,y+wide,h),.022,steel)
  cyl('damper-'+name,'Damper '+name,'suspension',(s*.53,y,.60),.033,.42,iron)
  points=[(s*.53+.062*cos(i*2*pi/16),y+.062*sin(i*2*pi/16),.43+i/112*.35) for i in range(113)]
  tube('spring-'+name,'Coil spring '+name,'suspension',points,.007,black)
  cyl('strut-top-'+name,'Upper suspension mount '+name,'suspension',(s*.53,y,.82),.091,.025,cast)
  if ax=='front':rod('tie-rod-'+side,'Steering tie rod '+side,'suspension',(s*.16,y+.1,.38),(s*.7,y+.1,.37),.012,steel)
for y,ax in [(-1.4,'front'),(1.4,'rear')]:tube('antiroll-'+ax,ax.title()+' stabilizer bar','suspension',[(-.65,y,.38),(-.48,y-.25,.40),(.48,y-.25,.40),(.65,y,.38)],.015,steel)
cyl('steering-rack','Steering rack','suspension',(0,-1.25,.4),.035,.9,iron,'X')
rod('steering-shaft','Steering intermediate shaft','suspension',(-.34,-1.25,.42),(-.4,-.37,.76),.016,steel)

# Detailed provisional inline-six engine exterior and internal anatomy.
EY=-1.21
box('engine-block','Inline-six cylinder block','engine',(0,EY,.58),(.36,.75,.34),iron,.035)
box('cylinder-head','Cylinder head','engine',(0,EY,.80),(.42,.78,.12),cast,.025)
box('oil-pan-upper','Upper oil pan','engine',(0,EY,.365),(.40,.73,.105),cast,.020)
box('oil-pan-lower','Lower oil sump','engine',(0,EY+.15,.28),(.31,.34,.11),iron,.028)
cyl('drain-plug','Oil drain plug','engine',(.17,EY+.15,.28),.012,.02,steel,'X',verts=6)
for s,side in [(-1,'exhaust'),(1,'intake')]:
 box('valve-cover-'+side,'Valve cover '+side,'engine',(s*.112,EY,.889),(.166,.77,.064),cast,.02)
 for i in range(4):box('valve-rib-'+side,'Valve cover ribs '+side,'engine',(s*.112-.05+i*.033,EY,.925),(.006,.71,.007),steel,.002)
 cyl('camshaft-'+side,'Camshaft '+side,'engine',(s*.11,EY,.824),.016,.70,steel,'Y')
 for i in range(12):ellipsoid('cam-lobes-'+side,'Cam lobes '+side,'engine',(s*.11,EY-.30+i*.055,.825),(.026,.012,.023),steel)
 for y in [EY-.32,EY,EY+.32]:cyl('cover-bolts-'+side,'Valve cover fasteners '+side,'engine',(s*.17,y,.93),.010,.012,steel,verts=6)
 # Actual mount dimensions and brackets still need source measurements.
 box('engine-mount-'+side,'Engine mount '+side,'structure',(s*.31,EY+.1,.46),(.14,.12,.10),rubber,.025)
rod('crankshaft','Crankshaft main axis','engine',(0,EY-.37,.44),(0,EY+.37,.44),.029,steel)
for i in range(6):
 y=EY-.285+i*.114;pid='cylinder-'+str(i+1)
 cyl(pid,'Cylinder '+str(i+1)+' bore envelope','engine',(0,y,.655),.043,.22,steel)
 cyl('piston-'+str(i+1),'Piston '+str(i+1),'engine',(0,y,.70),.0425,.047,cast)
 for z in [.704,.715]:torus('piston-ring-'+str(i+1),'Piston ring study '+str(i+1),'engine',(0,y,z),.0425,.0012,steel)
 rod('rod-'+str(i+1),'Connecting rod '+str(i+1),'engine',(0,y,.685),(.022,y,.445),.012,steel)
 cyl('crank-web-'+str(i+1),'Crank counterweight '+str(i+1),'engine',(.018,y,.433),.064,.024,iron,'Y')
 cyl('spark-plug-'+str(i+1),'Spark plug '+str(i+1),'electrical',(0,y,.872),.008,.043,white)
 for s in [-1,1]:
  for dy in [-.022,.022]:
   rod('valves-'+str(i+1),'Valve pair study cylinder '+str(i+1),'engine',(s*.024,y+dy,.77),(s*.063,y+dy,.824),.004,steel)
   cyl('valves-'+str(i+1),'Valve pair study cylinder '+str(i+1),'engine',(s*.022,y+dy,.766),.013,.004,steel)
 # Six intake runners and exhaust manifold branches.
 tube('intake-runner-'+str(i+1),'Intake runner '+str(i+1),'intake',[(.17,y,.81),(.31,y,.84),(.41,y,.72),(.37,y,.63)],.026,cast)
 tube('exhaust-runner-'+str(i+1),'Exhaust runner '+str(i+1),'exhaust',[(-.17,y,.80),(-.30,y,.75),(-.35,y+.08,.62),(-.33,EY+.31,.43)],.022,steel)
box('intake-plenum','Intake plenum / ACIS envelope','intake',(.37,EY,.63),(.19,.72,.14),cast,.055)
cyl('throttle','Throttle body','intake',(.36,EY-.43,.66),.065,.13,cast,'Y')
box('fuel-rail','Fuel rail','intake',(.215,EY,.875),(.027,.71,.035),steel,.005)
for i in range(6):cyl('injector-'+str(i+1),'Fuel injector '+str(i+1),'intake',(.205,EY-.285+i*.114,.837),.01,.065,black)
# Timing components with differentiated VVT-i sprocket envelope. Routing remains schematic.
front=EY-.416
for x,r,label,pid in [(-.105,.062,'Exhaust cam sprocket','exhaust-cam-sprocket'),(.105,.076,'VVT-i intake gear envelope','vvti-gear'),(0,.065,'Crankshaft timing pulley','crank-pulley'),(-.12,.028,'Timing idler','timing-idler'),(.11,.032,'Timing tensioner roller','timing-tensioner')]:
 z=.827 if 'cam' in pid or pid=='vvti-gear' else .445 if pid=='crank-pulley' else .60
 cyl(pid,label,'engine',(x,front,z),r,.026,steel,'Y');cyl(pid,label,'engine',(x,front-.017,z),r*.55,.012,iron,'Y');cyl(pid,label,'engine',(x,front-.027,z),.011,.02,steel,'Y',verts=6)
 for i in range(32):
  a=i*2*pi/32;box(pid,label,'engine',(x+r*cos(a),front,z+r*sin(a)),(.006,.028,.006),steel,.001)
pts=[(-.172,front-.01,.827),(-.13,front-.01,.895),(.10,front-.01,.904),(.18,front-.01,.838),(.075,front-.01,.446),(0,front-.01,.381),(-.075,front-.01,.446),(-.172,front-.01,.827)]
tube('timing-belt','Timing belt routing study','engine',pts,.009,beltmat)
box('timing-cover-upper','Upper timing cover','engine',(0,front-.06,.82),(.39,.045,.24),black,.047)
box('timing-cover-lower','Lower timing cover','engine',(0,front-.06,.535),(.26,.045,.29),black,.036)
cyl('water-pump','Water pump envelope','cooling',(.09,front+.02,.659),.065,.09,cast,'Y')
cyl('thermostat','Thermostat housing','cooling',(.20,EY-.24,.51),.042,.09,cast,'X')
cyl('oil-filter','Oil filter','engine',(-.21,EY+.10,.52),.045,.095,black,'X')
box('engine-cover','2000 engine beauty cover study','engine',(0,EY+.02,.963),(.31,.62,.055),black,.025)
for i in range(7):box('engine-cover-ribs','Beauty cover raised ribs','engine',(-.108+i*.036,EY+.02,.993),(.012,.42,.007),black,.003)
cyl('oil-cap','Oil filler cap','engine',(-.12,EY+.17,.992),.027,.022,black)
for pid,label,x,z,r in [('alternator','Alternator',-.27,.55,.075),('ac-compressor','Air conditioning compressor',-.28,.38,.075),('ps-pump','Power steering pump',.25,.60,.053)]:
 cyl(pid,label,'engine',(x,EY-.30,z),r,.16,cast,'Y');cyl(pid+'-pulley',label+' pulley','engine',(x,front-.09,z),r*.76,.019,black,'Y')
 for i in range(7):cyl(pid+'-ribs',label+' casing ribs','engine',(x,EY-.37+i*.021,z),r+.003,.004,steel,'Y')
cyl('crank-damper','Crankshaft harmonic damper','engine',(0,front-.095,.445),.080,.035,iron,'Y')
tube('accessory-belt','Accessory drive belt routing study','engine',[(-.27,front-.1,.55),(-.29,front-.1,.38),(0,front-.1,.365),(.27,front-.1,.60),(-.27,front-.1,.55)],.008,beltmat)

# Transmission and driveline: external casing, service pan, converter and representative internals.
cyl('bellhousing','Automatic transmission bellhousing','transmission',(0,-.715,.49),.215,.25,cast,'Y',r2=.165)
cyl('torque-converter','Torque converter envelope','transmission',(0,-.76,.49),.185,.09,steel,'Y')
cyl('transmission-case','Automatic transmission main casing','transmission',(0,-.30,.425),.142,.64,cast,'Y',r2=.16)
cyl('tail-housing','Transmission extension housing','transmission',(0,.10,.415),.087,.27,cast,'Y',r2=.12)
box('transmission-pan','Transmission oil pan','transmission',(0,-.30,.279),(.30,.46,.066),iron,.02)
box('valve-body','Valve body envelope','transmission',(0,-.30,.317),(.25,.4,.033),cast,.01)
for i in range(9):box('case-ribs','Transmission casing ribs','transmission',(0,-.60+i*.066,.49),(.32,.012,.10),cast,.006)
for i in range(7):cyl('solenoids','Solenoid positions unverified','transmission',(-.1+i*.032,-.29,.325),.013,.045,black,'Y')
for y in [-.45,-.23,-.03]:
 cyl('gear-train','Planetary gear envelope - not tooth accurate','transmission',(0,y,.425),.105,.055,steel,'Y')
bolts('trans-pan-fasteners','Transmission pan fasteners','transmission',[(x,y,.24) for x in [-.13,.13] for y in [-.49,-.38,-.27,-.16,-.08]])
box('trans-mount','Transmission mount','structure',(0,.02,.27),(.20,.14,.05),rubber,.01)
rod('prop-shaft-front','Propeller shaft forward section','driveline',(0,.23,.385),(0,.77,.355),.038,steel)
rod('prop-shaft-rear','Propeller shaft rear section','driveline',(0,.80,.355),(0,1.31,.37),.04,steel)
cyl('center-bearing','Propeller shaft center support','driveline',(0,.785,.355),.072,.05,iron,'Y')
ellipsoid('differential-case','Rear differential housing','driveline',(0,1.4,.37),(.20,.22,.15),iron)
box('differential-cover','Differential rear cover','driveline',(0,1.60,.38),(.29,.035,.25),cast,.06)
for s,side in [(-1,'left'),(1,'right')]:
 rod('halfshaft-'+side,'Rear halfshaft '+side,'driveline',(s*.17,1.4,.37),(s*.70,1.4,.34),.022,steel)
 for x in [.20,.63]:
  for i in range(7):cyl('cv-boot-'+side,'CV joint boots '+side,'driveline',(s*(x+i*.009),1.4,.355),.041-i*.0018,.007,rubber,'X')
# Exhaust, fuel tank and underfloor pipes.
for s,side in [(-1,'left'),(1,'right')]:
 tube('exhaust-pipe-'+side,'Exhaust pipe '+side,'exhaust',[(-.33,-.87,.40),(s*.17,-.45,.24),(s*.20,.45,.23),(s*.33,1.12,.25),(s*.56,1.9,.26),(s*.57,2.35,.25)],.027,steel)
 cyl('catalyst-'+side,'Catalytic converter envelope '+side,'exhaust',(s*.18,-.13,.24),.07,.34,steel,'Y')
 box('muffler-'+side,'Rear muffler '+side,'exhaust',(s*.52,1.95,.28),(.26,.45,.13),steel,.06)
 tube('exhaust-hanger-'+side,'Exhaust hanger '+side,'exhaust',[(s*.52,1.89,.27),(s*.58,1.88,.39)],.009,black)
box('fuel-tank','Fuel tank envelope','intake',(0,1.00,.39),(1.0,.58,.20),black,.05)
cyl('fuel-pump-module','Fuel pump module envelope','intake',(0,1.05,.507),.09,.015,white)
for s in [-1,1]:box('tank-strap-'+str(s),'Fuel tank strap','intake',(s*.30,1.0,.279),(.05,.57,.015),steel,.008)
tube('fuel-line','Fuel supply line routing study','intake',[(0,1.04,.52),(-.53,.75,.34),(-.53,-.2,.34),(.22,-.62,.70),(.215,EY,.89)],.005,steel)
tube('filler-neck','Fuel filler neck routing study','intake',[(-.86,1.66,.8),(-.76,1.60,.55),(-.46,1.18,.43)],.028,steel)
# Cooling, air conditioning and intake.
box('radiator','Radiator core','cooling',(0,-1.965,.60),(1.0,.055,.43),iron,.009)
for i in range(45):box('radiator-fins','Radiator fins','cooling',(-.47+i*.0214,-2.001,.60),(.006,.007,.40),cast,.001)
for s,side in [(-1,'left'),(1,'right')]:box('radiator-tank-'+side,'Radiator end tank '+side,'cooling',(s*.53,-1.965,.60),(.055,.082,.46),black,.015)
box('condenser','A/C condenser','cooling',(0,-2.048,.60),(.99,.025,.41),steel,.005)
cyl('radiator-cap','Radiator cap','cooling',(.36,-1.965,.84),.024,.019,chrome)
box('fan-shroud','Radiator fan shroud','cooling',(0,-1.90,.57),(.94,.07,.39),black,.06)
for s,side in [(-1,'left'),(1,'right')]:
 cyl('fan-hub-'+side,'Cooling fan hub '+side,'cooling',(s*.25,-1.855,.58),.035,.05,black,'Y')
 for i in range(7):
  a=2*pi*i/7;o=box('fan-blades-'+side,'Cooling fan blades '+side,'cooling',(s*.25+.088*cos(a),-1.855,.58+.088*sin(a)),(.13,.016,.039),black,.012);o.rotation_euler.y=-a
box('coolant-reservoir','Coolant expansion reservoir','cooling',(.64,-1.75,.62),(.16,.20,.23),white,.03)
cyl('reservoir-cap','Coolant reservoir cap','cooling',(.64,-1.75,.748),.027,.017,black)
tube('upper-radiator-hose','Upper radiator hose','cooling',[(.43,-1.93,.79),(.47,-1.71,.79),(.13,front,.80)],.024,rubber)
tube('lower-radiator-hose','Lower radiator hose','cooling',[(-.45,-1.95,.42),(-.41,-1.75,.37),(.19,EY-.24,.51)],.023,rubber)
tube('heater-hoses','Heater hose routing study','cooling',[(.2,-.8,.68),(.27,-.52,.71),(.18,-.42,.68)],.014,rubber)
box('airbox','Air filter housing','intake',(.57,-1.45,.74),(.29,.32,.22),black,.025)
for i in range(8):box('airbox-ribs','Airbox molded ribs','intake',(.57,-1.57+i*.035,.855),(.25,.009,.008),black,.003)
tube('air-intake-duct','Air intake duct','intake',[(.54,-1.42,.84),(.42,-1.53,.84),(.36,-1.63,.70)],.050,rubber)
box('maf','Airflow meter envelope','electrical',(.49,-1.47,.863),(.055,.075,.042),black,.007)
box('washer-reservoir','Washer reservoir','electrical',(-.68,-1.79,.56),(.18,.23,.27),white,.045)
cyl('washer-cap','Washer reservoir cap','electrical',(-.68,-1.79,.71),.029,.015,material('Washer cap blue',(.06,.18,.42),0,.4))
# Battery, fuse box, main harness, ignition and control modules.
box('battery','12V battery','electrical',(-.60,-1.34,.68),(.22,.27,.20),black,.012)
box('battery-top','Battery top cover','electrical',(-.60,-1.34,.786),(.23,.28,.016),black,.007)
for x in [-.67,-.53]:cyl('battery-terminal','Battery terminals','electrical',(x,-1.39,.803),.012,.022,steel)
box('battery-positive-cover','Positive terminal cover','electrical',(-.53,-1.39,.814),(.039,.037,.03),red,.006)
box('battery-hold-down','Battery hold-down','electrical',(-.60,-1.34,.81),(.024,.30,.018),steel,.005)
box('fuse-box','Engine bay fuse box','electrical',(-.61,-.93,.74),(.18,.27,.13),black,.014)
box('ecu-envelope','Engine control unit envelope','electrical',(.48,-.34,.69),(.17,.07,.13),cast,.015)
for i in range(3):box('ignition-coil-'+str(i+1),'Ignition coil pack '+str(i+1),'electrical',(0,EY-.23+i*.23,.924),(.056,.074,.033),black,.006)
tube('engine-harness','Engine wiring loom routing study','electrical',[(-.60,-1.39,.81),(-.45,-1.03,.84),(0,-.80,.97),(.1,-.60,.90),(.5,-.38,.77)],.013,black)
for i in range(6):tube('ignition-lead-'+str(i+1),'Ignition lead study '+str(i+1),'electrical',[(0,EY-.285+i*.114,.918),(-.12,EY-.285+i*.114,.95),(-.20,EY+.16,.84)],.005,black)
for s,side in [(-1,'left'),(1,'right')]:tube('chassis-brake-line-'+side,'Rigid brake line routing study '+side,'brakes',[(s*.45,-.42,.7),(s*.55,-.6,.35),(s*.55,1.40,.35)],.003,steel)
cyl('brake-booster','Brake booster envelope','brakes',(-.5,-.43,.76),.105,.082,iron,'Y')
cyl('master-cylinder','Master brake cylinder','brakes',(-.5,-.54,.76),.028,.15,cast,'Y')
box('brake-reservoir','Brake fluid reservoir','brakes',(-.5,-.54,.82),(.075,.11,.055),white,.015)
box('abs-unit','ABS actuator envelope','brakes',(-.64,-.72,.68),(.12,.14,.13),cast,.013)
# Cabin. Standard cloth trim; navigation, moonroof and luxury package are deliberately not assumed.
box('dashboard','Dashboard shell','interior',(0,-.19,.93),(1.44,.34,.25),black,.09)
box('console','Center console','interior',(0,.36,.57),(.30,.88,.32),black,.045)
box('console-trim','Center console trim','interior',(0,.22,.74),(.26,.37,.012),wood,.02)
box('shifter-gate','Automatic selector gate','interior',(0,.12,.756),(.10,.18,.011),black,.012)
rod('shifter-stalk','Selector lever','interior',(0,.12,.766),(0,.14,.86),.011,steel)
ellipsoid('shift-knob','Automatic shift knob','interior',(0,.14,.867),(.027,.034,.043),black)
box('radio','Audio head unit envelope','interior',(0,-.017,.92),(.19,.018,.12),iron,.008)
box('climate-panel','Climate control panel envelope','interior',(0,-.007,.83),(.19,.025,.055),black,.01)
for x in [-.12,.12]:cyl('audio-knobs','Audio control knobs','interior',(x,.005,.92),.016,.012,black,'Y')
for x in [-.56,-.16,.16,.56]:box('dash-vent-'+str(x),'Dashboard air vent','interior',(x,-.004,1.025),(.14,.022,.066),iron,.013)
box('instrument-binnacle','Instrument binnacle','interior',(-.42,-.055,1.04),(.37,.19,.14),black,.045)
for x,r in [(-.535,.044),(-.43,.059),(-.31,.045)]:
 cyl('gauges','Instrument gauge faces','interior',(x,.025,1.053),r,.008,black,'Y')
 torus('gauge-rings','Gauge bezel rings','interior',(x,.032,1.053),r,.002,chrome,'Y')
 rod('gauge-needles','Gauge needles','interior',(x,.04,1.053),(x+.015,.04,1.053+r*.7),.0015,red)
rod('steering-column','Steering column','interior',(-.42,-.10,.90),(-.42,.21,.97),.031,iron)
torus('steering-wheel','Steering wheel rim','interior',(-.42,.25,1.04),.17,.016,black,'Y')
ellipsoid('steering-airbag','Driver airbag cover','interior',(-.42,.25,1.04),(.078,.036,.056),black)
for a in [pi/6,5*pi/6,3*pi/2]:rod('steering-spokes','Steering wheel spokes','interior',(-.42,.25,1.04),(-.42+cos(a)*.153,.25,1.04+sin(a)*.153),.015,black)
for s,side in [(-1,'driver'),(1,'passenger')]:
 x=s*.43
 for y,which in [(.37,'front'),(.80,'rear')]:
  box('seat-base-'+which+'-'+side,which.title()+' seat cushion '+side,'interior',(x,y,.57),(.48,.51,.15),cloth,.065)
  box('seat-back-'+which+'-'+side,which.title()+' seat back '+side,'interior',(x,y+.22,.86 if which=='front' else .80),(.48,.13,.55 if which=='front' else .45),cloth,.066,rot=(.13,0,0))
  box('headrest-'+which+'-'+side,which.title()+' head restraint '+side,'interior',(x,y+.25,1.18 if which=='front' else 1.08),(.24,.12,.16),cloth,.047)
  for dx in [-.06,.06]:rod('headrest-post-'+which+'-'+side,'Headrest posts','interior',(x+dx,y+.23,1.08 if which=='front' else .98),(x+dx,y+.23,1.15 if which=='front' else 1.05),.007,steel)
  if which=='front':
   for dx in [-.16,.16]:box('seat-rail-'+side,'Seat rails '+side,'interior',(x+dx,y,.405),(.025,.48,.05),iron,.006)
 box('door-card-'+side,'Door trim '+side,'interior',(s*.795,.22,.71),(.08,1.85,.37),black,.05)
 box('door-wood-'+side,'Door trim insert '+side,'interior',(s*.75,.18,.803),(.018,.58,.065),wood,.02)
 box('door-switch-'+side,'Window switch panel '+side,'interior',(s*.70,.07,.75),(.095,.18,.032),black,.013)
 rod('belt-webbing-'+side,'Front seat belt webbing '+side,'interior',(s*.74,.55,1.21),(s*.37,.50,.63),.016,black)
box('rear-seat-center','Rear seat center cushion','interior',(0,.80,.575),(.35,.49,.13),cloth,.05)
box('rear-back-center','Rear center backrest','interior',(0,1.02,.80),(.35,.12,.45),cloth,.05)
box('parcel-shelf','Rear parcel shelf','interior',(0,1.40,.84),(1.39,.26,.055),cloth,.03)
box('headliner','Headliner','interior',(0,.4,1.35),(1.22,.79,.027),cloth,.025)
box('rearview-mirror','Interior mirror','interior',(0,-.19,1.24),(.23,.046,.068),black,.02)
for s in [-1,1]:box('sun-visor-'+str(s),'Sun visor','interior',(s*.34,-.09,1.31),(.36,.14,.018),cloth,.018)
for x,z,label in [(-.49,.35,'Brake pedal'),(-.36,.32,'Accelerator pedal')]:box(label.lower().replace(' ','-'),label,'interior',(x,-.30,z),(.055,.035,.085),rubber,.009)
box('carpet','Cabin carpet','interior',(0,.40,.33),(1.40,1.9,.027),cloth,.025)

# Provisional packaging correction, pending measured mounting coordinates.
for o in list(scene.objects):
 pid=o.get('partId','');system=o.get('system','')
 if system=='engine' or pid.startswith(('spark-plug','ignition-','intake-runner','exhaust-runner','injector','engine-mount')) or pid in {'intake-plenum','throttle','fuel-rail','water-pump','thermostat','engine-harness'}:o.location.z-=.08
 if system=='transmission':o.location.z-=.06

# Service inventory backlog. Generic subassemblies to reconcile against the exact car, not an OEM bill of materials.
BACKLOG={
'body':['Hood hinges left/right','Hood latch and cable','Hood gas supports','Hood insulation','Front door hinge assemblies','Rear door hinge assemblies','Door check straps','Door latch actuators','Door wiring boots','Window regulators','Window motors','Outer belt moldings','Inner weatherstrips','Door aperture seals','Trunk hinges','Trunk weatherstrip','Trunk latch actuator','Trunk trim panels','Front bumper reinforcement','Rear bumper reinforcement','Bumper energy absorbers','Front inner fender liners','Rear wheelhouse liners','Under-engine splash panels','Cowl grille','Cowl drain channels','Windshield adhesive bead','Rear glass adhesive bead','Washer nozzles','Washer hoses','Wiper motor and linkage','Grille emblem and mounts','Body badges','Front parking lamp sockets','Tail lamp sockets','Center high-mounted stop lamp','Trunk license plate lamps','License plate fasteners','Body panel shims','Seam sealer paths','Corrosion protection layers'],
'engine':['Head gasket','Head bolts with exact pattern','Main bearing caps','Main bearings and clearances','Connecting rod bearings','Thrust washers','Piston wrist pins and retainers','Oil control rings','Cylinder honing texture','Valve guides','Valve seats','Valve stem seals','Valve springs','Spring seats and retainers','Valve keepers','Cam bearing caps','Cam seals','Rear main seal','Front crankshaft seal','Oil pump rotor and housing','Oil pickup and strainer','Oil pressure relief valve','Oil passages','Crankcase ventilation baffles','PCV valve and hose','Oil level dipstick and tube','Timing tensioner hydraulic actuator','Exact belt tooth geometry','Factory timing marks','Timing cover gaskets','VVT-i oil control valve','VVT-i filter and oil passage','Knock sensors','Crankshaft position sensor','Camshaft position sensor','Coolant temperature sensor','Oil pressure switch','Engine lifting brackets','Engine identification markings','Exact engine mount brackets','Starter motor','Starter pinion and ring gear','Flexplate and fasteners','Accessory tensioner','Accessory idler','Spark plug tube seals'],
 'transmission':['A650E case casting measured surfaces','Front pump assembly','Input shaft splines','Output shaft splines','Planetary gear sets with exact tooth counts','Clutch drums','Clutch friction discs','Clutch separator plates','Brake bands or brake packs by exact variant','One-way clutches','Valve-body hydraulic channels','Check balls and separator plate','Filter and pickup','Shift solenoid variants','Solenoid wire harness','Transmission speed sensors','Selector shaft and range switch','Shift cable and bracket','ATF cooler lines','ATF dipstick and tube','Vent tube','Front pump seal','Output seal','Case gaskets','Transmission pan gasket','Drain and fill plugs','Exact bellhousing fastener locations'],
 'driveline':['Propeller shaft universal joints','Propeller shaft flange fasteners','Balance weights','Slip joint splines','Center bearing rubber carrier','Differential ring gear','Differential pinion gear','Pinion bearings and preload shims','Differential side gears','Differential carrier bearings','Differential oil seals','Differential breather','Differential drain and fill plugs','CV joint inner races','CV joint cages and balls','CV boot clamps','Halfshaft retaining clips'],
 'suspension':['Front upper ball joints','Front lower ball joints','Rear knuckle castings','Front steering knuckles','Control-arm bushings','Caster and camber adjustment hardware','Rear toe-control arms','Rear toe adjustment cams','Spring isolators','Damper bump stops','Dust boots','Stabilizer end links','Stabilizer chassis bushings','Steering rack bellows','Rack pinion and hydraulic piston','Power steering high-pressure hose','Power steering return hose','Power steering reservoir','Power steering cooler loop','Steering universal joints'],
 'brakes':['Brake pads by axle','Pad shims and retaining clips','Caliper pistons','Caliper dust seals','Caliper slide pins','Bleed screws','Rotor vent vane geometry','Backing plates','Wheel bearings','Wheel speed sensors','ABS tone rings','Parking brake shoes','Parking brake expander','Parking brake cables','Parking brake pedal mechanism','Brake booster vacuum line','Master cylinder reservoir seals','Rigid line clips and unions','ABS hydraulic port assignments'],
 'wheels':['Confirm OE tire size from door placard','Measured OE wheel spoke profile','Tire sidewall markings','Tire tread pattern by actual fitted tire','Valve stems','Wheel balancing weights','Full-size spare wheel','Spare-wheel retainer','Jack and handle','Lug wrench'],
 'cooling':['Water pump impeller','Water pump seal','Water pump backing plate','Water pump gasket','Thermostat element and seal','Exact coolant passages','Radiator drain cock','Radiator mounting cushions','Cooling fan drive arrangement verification','A/C compressor internal mechanism','A/C refrigerant hoses','A/C receiver drier','Expansion valve','Evaporator core','Heater core','HVAC blower and housing','Blend doors and actuators','Cabin air ducts','Cabin air filter fitment verification'],
 'intake':['Air filter element','Intake snorkel','Throttle plate and motor','Throttle position sensor','ACIS control valve','ACIS vacuum actuator','Intake plenum gaskets','Intake runner gaskets','Injector seals','Fuel pressure regulation by variant','Fuel filter fitment','Fuel pump strainer','Fuel level sender','EVAP charcoal canister','EVAP purge valve','EVAP vent plumbing','Tank vent and rollover valves','Fuel cap and tether'],
 'exhaust':['Exhaust manifold heat shields','Manifold gaskets','Manifold studs and nuts','Oxygen sensors by emissions variant','Catalyst substrate','Front pipe flange gaskets','Exhaust flange fasteners','Exhaust heat shields','Exhaust underbody isolators','Muffler internal baffles'],
 'electrical':['Battery tray','Battery negative ground straps','Main fusible links','Fuse and relay positions','Starter wiring','Alternator windings and rectifier','Connector housings with pin counts','Harness branches and exact routing','Harness clips and tape wraps','ECU connectors','Body control module','Airbag control module','ABS controller','Diagnostic connector','Instrument cluster circuit board','Immobilizer antenna','Ignition switch assembly','Door lock motors','Horn pair','Exterior lighting harness','Trunk wiring harness','Antenna and amplifier'],
 'interior':['Seat frame mechanisms','Seat motors and switches','Seat occupancy sensor','Seat belt retractors','Seat belt pretensioners','Belt buckles','Driver airbag module','Passenger airbag module','Front side airbag modules','Clock spring','Steering wheel switches by trim','Turn signal stalk','Wiper stalk','Column tilt/telescope mechanisms','Glove box','Glove box hinges and damper','Glove box lamp','Armrest hinges','Cup holders','Ashtray and power socket','Audio speakers and wiring','Floor mats and retainers','Interior carpet insulation','A/B/C pillar trim','Dome light','Door courtesy lamps','Rear seat latches','Child seat anchor hardware'],
 'structure':['Factory datum holes','Weld flanges','Spot weld locations','Front crash rails internal reinforcements','Rear crash rail reinforcements','Suspension hardpoint coordinates','Chassis seam details','Underbody cavity plugs','Grommets','Earth studs','Fasteners with thread/pitch/length/grade','Hose clamps with size and position','Cable clips with type and location','All additional VIN-specific catalog subassemblies']}
for system,names in BACKLOG.items():
 for i,label in enumerate(names):record('pending-'+system+'-'+str(i+1),label,system,'Not modeled. Need exact fitment, source, dimensions, quantity and placement.', 'missing')

# Convert curves, apply fillets, and merge decoration that shares a serviceable part ID.
for o in list(scene.objects):
 if o.type not in {'MESH','CURVE'}:continue
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 if o.type=='CURVE':bpy.ops.object.convert(target='MESH');o=bpy.context.object
 for modifier in list(o.modifiers):
  try:bpy.ops.object.modifier_apply(modifier=modifier.name)
  except:pass
byid={}
for o in list(scene.objects):
 if o.type=='MESH':byid.setdefault(o.get('partId'),[]).append(o)
for pid,objects in byid.items():
 if len(objects)<2:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()

# Exportable original normal maps. Keep texture data embedded and modest for browsers.
import numpy as np
N=256;u,v=np.meshgrid(np.arange(N)/N,np.arange(N)/N)
for mi,mat in enumerate([cast,iron,rubber,cloth,black]):
 if mat==cloth:h=.5+ .1*np.sin(u*2*pi*64)*np.sin(v*2*pi*64)
 else:h=sum(np.sin(2*pi*(u*(11+k*13)+v*(7+k*17))+k*1.234)/(k+1) for k in range(6))*.04
 dx=(np.roll(h,-1,1)-np.roll(h,1,1))*.75;dy=(np.roll(h,-1,0)-np.roll(h,1,0))*.75
 a=np.zeros((N,N,4),dtype=np.float32);a[:,:,0]=.5-dx;a[:,:,1]=.5-dy;a[:,:,2]=1;a[:,:,3]=1
 im=bpy.data.images.new(mat.name+' micro-normal',width=N,height=N);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(a.ravel());im.pack()
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=nodes.get('Principled BSDF')
 for link in list(p.inputs['Normal'].links):links.remove(link)
 tex=nodes.new('ShaderNodeTexImage');tex.image=im;normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.45;links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],p.inputs['Normal'])

# Export assembly metadata.
meshes=[o for o in scene.objects if o.type=='MESH'];triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
for o in meshes:
 rec=records[o['partId']];rec['meshName']=o.name;rec['dimensionsMetres']=[round(float(x),5) for x in o.dimensions]
manifest={'title':'2000 Lexus GS 300 US automatic — provisional assembly','version':3,'units':'metres','coordinateSystem':'Blender X lateral, Y rearward, Z up; GLB uses Y up','accuracy':'Provisional original geometry, not a 1:1 verified replica','validation':{'geometryVerified':False,'fitmentVerified':False,'fastenerLocationsVerified':False,'repairGuideReady':False},'dimensionTargets':{'lengthMetres':L,'bodyWidthMetres':W,'heightMetres':H,'wheelbaseMetres':WB,'basis':'Converted from rounded dimensions in Lexus US 2000 brochure. Overall width excludes mirrors. Target scale is not dimensional validation.'},'openIssues':['Exterior rebuilt from pre-facelift reference photographs; dimensional surface validation is still pending.','Wheel face is a five-spoke photographic study; exact US OE wheel casting remains unverified.','The specification sheet lists 55.9 inches height but its diagram shows 56.7; brochure 55.9 used provisionally.','OEM archived pages disagree on 215/60R16 versus 225/60R16 tires. Wheel/tire details need placard confirmation.','No factory CAD or measurements of mechanical parts supplied.','Generic transmission internals only; gear/valve-body engineering not represented.','No claimed exhaustive OEM parts count; reconcile all inventory against VIN-specific catalog.'],'systems':SYSTEMS,'sources':SOURCES+[{'id':'lexus-exterior','title':'Lexus pre-facelift exterior photographic references (UK; trim differences require US verification)','url':'https://media.lexus.co.uk/images/gs-300-1998-2000-exterior/'},{'id':'lexus-us-gallery','title':'Lexus USA 1998–2000 GS 300 reference album','url':'https://pressroom.lexus.com/album/1998-2000-lexus-gs-300-second-2nd-generation/'}],'meshCount':len(meshes),'triangleCount':triangles,'parts':list(records.values())}
with open(os.path.join(OUT,'gs300-parts.json'),'w') as f:json.dump(manifest,f,indent=2)
# Scene and GLB share the same named geometry; cameras/lights excluded from model export.
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'gs300-assembly.glb'),export_format='GLB',use_selection=True,export_extras=True,export_materials='EXPORT',export_yup=True)
# Studio lighting saved in the native Blender project.
world=scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.05,.07,.10,1);world.node_tree.nodes['Background'].inputs[1].default_value=.35
for name,loc,power,size in [('Key',(-3,-4,6),1300,5),('Fill',(4,-2,3),750,4),('Rim',(1,4,5),1400,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.65))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(5.8,-8.5,3.0));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,.70))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=6.45;scene.camera=camera
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.011));floor=bpy.context.object;floor.name='Studio floor';floor.data.materials.append(material('Studio graphite',(.035,.046,.06),.15,.45))
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'gs300-assembly.blend'))
scene.render.filepath=os.path.join(OUT,'gs300-assembly.png');bpy.ops.render.render(write_still=True)
# Orthographic validation renders expose silhouette errors without perspective.
for name,loc in [('front',(0,-9,.80)),('side',(9,0,.80)),('rear',(0,9,.80))]:
 camera.location=loc;camera.rotation_euler=(Vector((0,0,.80))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=5.5 if name=='side' else 2.7;scene.render.resolution_x=1200;scene.render.resolution_y=700;scene.render.filepath=os.path.join(OUT,'gs300-'+name+'.png');bpy.ops.render.render(write_still=True)
print('ASSEMBLY_RESULT',json.dumps({'meshes':len(meshes),'triangles':triangles,'parts':len(records),'modeled':sum(r['status']=='modeled' for r in records.values()),'output':OUT}))
