"""Original photo-informed exterior studies, NOT measured replicas.
Each family has its own silhouette and lamp construction. Dimension envelopes alone
are insufficient for repair validation. Missing mechanical parts are not invented.
Blender 4.5: blender -b --python build_reference_studies.py -- OUTPUT_DIR [vehicle]
"""
import bpy,sys,json,math
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];out=Path(args[0]);out.mkdir(parents=True,exist_ok=True)
repo=Path(__file__).resolve().parents[2]
ledger={r['vehicle']:r for r in json.loads((repo/'research/vehicle-sources.json').read_text())['vehicles']}
# y fractions from nose to tail, height fractions from ground. Hand-estimated from OEM
# photographs; their perspective is not treated as a calibrated blueprint.
PROFILES={
'ls400':dict(belt=.64,hood=.61,tail=.66,cabin=[(.28,.65),(.39,.92),(.46,1),(.66,.99),(.78,.79),(.82,.68)],suv=False,grille=.38,lamps='rectangle',wheel=.338,rim=.2032,spokes=5,twoTone=True),
'ls430':dict(belt=.65,hood=.62,tail=.67,cabin=[(.25,.66),(.37,.94),(.43,1),(.65,.995),(.78,.79),(.82,.69)],suv=False,grille=.42,lamps='rounded',wheel=.338,rim=.2032,spokes=6,twoTone=False),
'es300':dict(belt=.65,hood=.61,tail=.71,cabin=[(.27,.66),(.40,.95),(.47,1),(.65,.97),(.79,.77),(.82,.71)],suv=False,grille=.33,lamps='es300',wheel=.33,rim=.2032,spokes=5,twoTone=True),
'es330':dict(belt=.64,hood=.60,tail=.71,cabin=[(.25,.64),(.40,.95),(.48,1),(.64,.97),(.80,.77),(.84,.71)],suv=False,grille=.34,lamps='swept',wheel=.332,rim=.2032,spokes=7,twoTone=False),
'rx330':dict(belt=.60,hood=.57,tail=.60,cabin=[(.23,.60),(.39,.94),(.49,1),(.69,.99),(.85,.87),(.97,.61)],suv=True,grille=.37,lamps='swept',wheel=.355,rim=.2159,spokes=5,twoTone=False),
'gx470':dict(belt=.58,hood=.57,tail=.61,cabin=[(.22,.60),(.34,.94),(.41,.985),(.79,.985),(.92,.94),(.965,.62)],suv=True,grille=.40,lamps='gx',wheel=.388,rim=.2159,spokes=5,twoTone=True),
'lx470':dict(belt=.59,hood=.60,tail=.61,cabin=[(.24,.64),(.35,.97),(.43,1),(.83,1),(.94,.94),(.97,.64)],suv=True,grille=.38,lamps='quad',wheel=.396,rim=.2032,spokes=5,twoTone=True)}

def material(name,c,metal=0,rough=.4):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if name=='Paint':p.inputs['Coat Weight'].default_value=.65;p.inputs['Coat Roughness'].default_value=.18
 return m

def mesh(name,verts,faces,mat,system='body'):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);me.materials.append(mat)
 for p in me.polygons:p.use_smooth=True
 o['partId']=name;o['label']=name.replace('-',' ').title();o['system']=system;o['validation']='unverified photo-informed surface study';return o

def tube(name,pts,r,mat,cyclic=False):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=10;sp=cu.splines.new('POLY');sp.points.add(len(pts)-1)
 for v,p in zip(sp.points,pts):v.co=(*p,1)
 sp.use_cyclic_u=cyclic;cu.bevel_depth=r;cu.bevel_resolution=2;o=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(o);o.data.materials.append(mat);o['partId']=name;o['system']='body';return o

def box(name,pos,size,mat,bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:mod=o.modifiers.new('Edge radius','BEVEL');mod.width=bevel;mod.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 o['partId']=name;o['system']='body';return o

def uv(name,pos,size,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=pos);o=bpy.context.object;o.name=name;o.scale=size;o.data.materials.append(mat)
 for f in o.data.polygons:f.use_smooth=True
 o['partId']=name;o['system']='body';return o

def interp(points,t):
 if t<=points[0][0]:return points[0][1]
 if t>=points[-1][0]:return points[-1][1]
 for i in range(len(points)-1):
  a,b=points[i:i+2]
  if a[0]<=t<=b[0]:
   u=(t-a[0])/(b[0]-a[0]);prev=points[max(0,i-1)];nxt=points[min(len(points)-1,i+2)]
   ma=(b[1]-prev[1])/(b[0]-prev[0]);mb=(nxt[1]-a[1])/(nxt[0]-a[0]);dy=b[0]-a[0]
   return (2*u**3-3*u*u+1)*a[1]+(u**3-2*u*u+u)*dy*ma+(-2*u**3+3*u*u)*b[1]+(u**3-u*u)*dy*mb

def build(car):
 cfg=PROFILES[car];ref=ledger[car];bpy.ops.wm.read_factory_settings(use_empty=True)
 dims=ref['dimensions'];L=dims['lengthIn']*.0254;W=dims['bodyWidthIn']*.0254;H=dims['heightIn']*.0254;WB=dims['wheelbaseIn']*.0254
 if car=='gx470':H-=.041 # published 74.6 in includes rack, built separately below
 mats={k:material(k,*args) for k,args in {'Paint':((.30,.34,.39),.65,.28),'Chrome':((.58,.62,.67),.94,.2),'Alloy':((.46,.48,.5),.8,.33),'Rubber':((.012,.015,.018),0,.85),'Trim':((.01,.017,.02),.05,.52),'Glass':((.025,.06,.075),.35,.16),'Cladding':((.16,.17,.17),.3,.34),'Lens':((.5,.6,.69),.58,.18),'Red':((.4,.009,.014),.25,.23),'Amber':((.92,.23,.012),.15,.2)}.items()}
 paint=mats['Paint'];trim=mats['Trim'];chrome=mats['Chrome'];glass=mats['Glass'];wheelz=cfg['wheel'];frontAxle=-WB/2-.075;rearAxle=WB/2-.075;arch=wheelz+.045;belt=H*cfg['belt'];bottom=.30 if cfg['suv'] else .20
 def Y(t):return L*(t-.5)
 def width(t):return W/2*interp([(0,.78),(.025,.91),(.09,.99),(.23,1),(.52,.997),(.76,1),(.91,.98),(1,.83)],t)
 def deck(t):return H*interp([(0,cfg['hood']-.05),(.07,cfg['hood']),(.25,cfg['belt']),(.64,cfg['belt']),(.83,cfg['tail']),(1,cfg['tail']-.06)],t)
 def top(t):
  if t<cfg['cabin'][0][0] or t>cfg['cabin'][-1][0]:return deck(t)
  return max(deck(t),H*interp(cfg['cabin'],t))
 def sideX(t,z):
  shoulder=deck(t)-.035;w=width(t)
  if z<=shoulder:return w*(.91+.09*min(1,max(0,(z-bottom)/(shoulder-bottom))))
  high=top(t);f=min(1,max(0,(z-shoulder)/max(.01,high-shoulder)));return w*(1-.25*f*min(1,max(0,(high-deck(t))/.15)))
 # Lower body, with actual open wheel arches; not a box hidden behind wheel discs.
 for sign,label in [(1,'left'),(-1,'right')]:
  verts=[];faces=[];steps=180;rows=9
  for i in range(steps+1):
   t=i/steps;y=Y(t);lower=bottom
   for axle in [frontAxle,rearAxle]:
    d=abs(y-axle)
    if d<arch:lower=max(lower,wheelz+math.sqrt(arch*arch-d*d))
   upper=deck(t)
   for j in range(rows+1):
    z=lower+(upper-lower)*j/rows;x=sideX(t,z);verts.append((sign*x,y,z))
  for i in range(steps):
   for j in range(rows):a=i*(rows+1)+j;face=(a,a+1,a+rows+2,a+rows+1);faces.append(face if sign<0 else face[::-1])
  mesh(label+'-fenders-and-side-panels',verts,faces,paint)
  # Wheel arch lips track the opening and accent the SUV fender flare.
  for which,axle in [('front',frontAxle),('rear',rearAxle)]:
   pts=[]
   for i in range(65):
    a=math.pi*i/64;y=axle+arch*math.cos(a);z=wheelz+arch*math.sin(a);t=y/L+.5;pts.append((sign*(sideX(t,z)+.007),y,z))
   tube(label+'-'+which+'-arch-lip',pts,.008 if not cfg['suv'] else .014,paint)
  # Door shut-lines and outer handles placed from the model-family cabin proportions.
  a=cfg['cabin'][0][0]+.025;b=.54;c=.78 if not cfg['suv'] else .74
  for n,t in [('front',a),('pillar',b),('rear',c)]:
   z0=bottom+.05;z1=deck(t)-.018;tube(label+'-'+n+'-door-shut',[(sign*(sideX(t,z0)+.002),Y(t),z0),(sign*(sideX(t,z1)+.003),Y(t),z1)],.003,trim)
  for n,t in [('front',b-.04),('rear',c-.04)]:
   z=deck(t)-.065;x=sign*(sideX(t,z)+.009);uv(label+'-'+n+'-handle-recess',(x,Y(t),z),(.015,.094,.029),trim);uv(label+'-'+n+'-handle',(x+sign*.012,Y(t),z+.004),(.019,.066,.014),paint)
  z=bottom+.17;tube(label+'-side-molding',[(sign*(sideX(t,z)+.012),Y(t),z) for t in [.29,.4,.55,.7,.77]],.012,mats['Cladding'] if cfg['twoTone'] else chrome)
  if cfg['suv']:box(label+'-running-board',(sign*(W/2+.018),.06,.32),(.16,WB-.3,.06),trim,.018)
  # Mirrors have distinct housings, stalks, and dark rear glass.
  t=cfg['cabin'][0][0]+.025;z=belt+.08;x=sign*(W/2+.035)
  tube(label+'-mirror-stalk',[(sign*(W/2-.03),Y(t),z),(x,Y(t)-.01,z+.025)],.024,trim)
  uv(label+'-mirror-housing',(x+sign*.055,Y(t)-.035,z+.055),(.13,.09,.07),paint);uv(label+'-mirror-glass',(x+sign*.055,Y(t)+.044,z+.055),(.11,.012,.055),glass)
 # Hood, roof and deck form a continuous smoothly sampled upper skin.
 verts=[];faces=[];steps=180;across=40
 for i in range(steps+1):
  t=i/steps;high=top(t);d=deck(t);cab=high>d+.02;w=sideX(t,high)
  for j in range(across+1):
   u=2*j/across-1;z=high+.025*(1-u*u);verts.append((u*w,Y(t),z))
 for i in range(steps):
  for j in range(across):a=i*(across+1)+j;faces.append((a,a+1,a+across+2,a+across+1))
 mesh('hood-roof-and-deck-surface',verts,faces,paint)
 # Cabin sides fill roof-to-belt gaps; window patches sit on the same analytic surface.
 ca=cfg['cabin'][0][0];cb=cfg['cabin'][-1][0]
 for sign,label in [(1,'left'),(-1,'right')]:
  verts=[];faces=[]
  for i in range(101):
   t=ca+(cb-ca)*i/100;low=deck(t)-.015;high=top(t)-.025
   for j in range(11):z=low+(high-low)*j/10;verts.append((sign*sideX(t,z),Y(t),z))
  for i in range(100):
   for j in range(10):a=i*11+j;f=(a,a+1,a+12,a+11);faces.append(f if sign>0 else f[::-1])
  mesh(label+'-pillars',verts,faces,paint)
  spans=[(ca+.032,.535),(.555,.755)] if not cfg['suv'] else [(ca+.04,.53),(.55,.73),(.75,cb-.018)]
  for n,(start,end) in enumerate(spans):
   if n==1 and not cfg['suv']:end=cb-.048
   verts=[];faces=[];outline=[]
   for i in range(41):
    t=start+(end-start)*i/40;low=deck(t)+.026;high=top(t)-.065
    high=max(low+.002,high)
    for j in range(6):z=low+(high-low)*j/5;verts.append((sign*(sideX(t,z)+.005),Y(t),z))
   for i in range(40):
    for j in range(5):a=i*6+j;f=(a,a+1,a+7,a+6);faces.append(f if sign>0 else f[::-1])
   mesh(label+'-window-'+str(n+1),verts,faces,glass)
   outline=[verts[i*6] for i in range(41)]+[verts[i*6+5] for i in range(40,-1,-1)];tube(label+'-window-seal-'+str(n+1),outline,.007,trim,True)
   if not cfg['suv']:tube(label+'-window-chrome-'+str(n+1),outline,.003,chrome,True)
 # Windshields are ruled curved patches following the roof slope.
 for name,a,b in [('windshield',ca+.014,cfg['cabin'][1][0]+.002),('rear-glass',cfg['cabin'][-3][0]+.02,cb-.018)]:
  verts=[];faces=[]
  for i in range(31):
   t=a+(b-a)*i/30;w=width(t)*(.73 if i>8 and name=='windshield' else .77)
   for j in range(31):u=j/15-1;verts.append((u*w,Y(t),top(t)-.034*u*u+.008))
  for i in range(30):
   for j in range(30):k=i*31+j;faces.append((k,k+1,k+32,k+31))
  mesh(name,verts,faces,glass)
  outline=verts[:31]+[verts[i*31+30] for i in range(1,31)]+list(reversed(verts[-31:-1]))+[verts[i*31] for i in range(29,0,-1)];tube(name+'-seal',outline,.006,trim,True)
 for sign in [-1,1]:
  t=ca+.019;z=top(t)+.02;tube(('left' if sign>0 else 'right')+'-wiper',[(sign*.15,Y(t),z),(sign*.61,Y(t+.025),top(t+.025)+.025)],.007,trim)
 # Front/rear bumper surfaces; lateral rounding is part of the body envelope.
 for rear in [False,True]:
  t=1 if rear else 0;y=Y(t);sign=1 if rear else -1;high=deck(t);verts=[];faces=[]
  for i in range(61):
   u=i/30-1;x=u*width(t);yy=y
   for j in range(15):z=bottom+(high-bottom)*j/14;verts.append((x,yy,z))
  for i in range(60):
   for j in range(14):k=i*15+j;faces.append((k,k+1,k+16,k+15))
  mesh(('rear' if rear else 'front')+'-bumper',verts,faces,mats['Cladding'] if cfg['twoTone'] else paint)
 # Grille with horizontal slats on these model families.
 gy=Y(0)-.007;gz=deck(0)-.115;gw=W*cfg['grille'];gh=.22 if cfg['suv'] else .18
 box('radiator-grille-recess',(0,gy,gz),(gw,.022,gh),trim,.022)
 for j in range(5 if cfg['suv'] else 4):
  z=gz-gh*.38+j*gh*.76/(4 if cfg['suv'] else 3);tube('grille-slat-'+str(j),[(-gw*.47,gy-.021,z),(0,gy-.04,z),(gw*.47,gy-.021,z)],.006,chrome)
 pts=[(gw/2*math.cos(i*math.tau/80),gy-.021,gz+gh/2*math.sin(i*math.tau/80)) for i in range(80)];tube('grille-perimeter',pts,.006,chrome,True)
 uv('grille-badge',(0,gy-.045,gz),(.041,.008,.027),chrome)
 box('front-lower-air-intake',(0,Y(0)-.006,bottom+.11),(W*.6,.025,.10),trim,.028)
 for side in [-1,1]:
  label='left' if side>0 else 'right';x=side*W*.335;z=gz+.022;style=cfg['lamps'];w=W*.23;h=.17 if not cfg['suv'] else .21
  if style=='quad':
   for n,(xx,rr) in enumerate([(side*W*.28,.107),(side*W*.40,.118)]):uv(label+'-headlamp-'+str(n),(xx,gy+.055,z), (rr,.055,rr*.85),mats['Lens'])
  else:
   points=[(-w*.5,-h*.43),(-w*.5,h*.38),(w*.36,h*.60),(w*.5,h*.22),(w*.5,-h*.35),(w*.12,-h*.5)]
   if style in ['swept','gx']:points=[(-w*.5,-h*.44),(-w*.47,h*.05),(w*.46,h*(1.25 if style=='swept' else .75)),(w*.5,-h*.35)]
   if style=='es300':points=[(-w*.5,-h*.35),(-w*.4,h*.15),(w*.48,h*.6),(w*.5,-h*.36)]
   verts=[(x+side*dx,gy-.025,z+dz) for dx,dz in points];mesh(label+'-headlamp-lens',verts,[tuple(range(len(verts)))],mats['Lens']);tube(label+'-headlamp-seal',verts,.006,trim,True)
   for n,dx in enumerate([-.065,.075]):uv(label+'-headlamp-reflector-'+str(n),(x+side*dx,gy-.035,z),(.054,.009,.055),chrome)
  uv(label+'-front-signal',(side*W*.43,gy+.14,z-.02),(.028,.022,.059),mats['Amber'])
  uv(label+'-fog-lamp',(side*W*.32,gy+.035,bottom+.115),(.075,.025,.04),mats['Lens'])
  # Taillamp outer cluster, distinct sedan versus vertical SUV layout.
  yy=Y(1)+.014;zz=H*(.59 if cfg['suv'] else cfg['tail']-.07)
  if cfg['suv']:size=(.13,.05,.25 if car=='gx470' else .20);xx=side*W*.40
  else:size=(.21,.048,.085);xx=side*W*.34
  uv(label+'-tail-lamp',(xx,yy-.04,zz),size,mats['Red']);uv(label+'-reverse-lens',(xx,yy+.008,zz+.015),(size[0]*.88,.008,.018),mats['Lens'])
  if not cfg['suv']:tube(label+'-exhaust-tip',[(side*.55,Y(.94),.22),(side*.55,Y(1)+.025,.22)],.025,chrome)
 box('rear-license-recess',(0,Y(1)+.016,H*(.50 if cfg['suv'] else .52)),(.35,.02,.16),trim,.015)
 # Wheels use real circular openings, radial sidewalls and a separately editable face.
 for sign,label in [(1,'left'),(-1,'right')]:
  for which,axle in [('front',frontAxle),('rear',rearAxle)]:
   x=sign*(W/2-.085);r=cfg['wheel'];rim=cfg['rim'];verts=[];faces=[];profile=[(-.11,r*.82),(-.11,r*.94),(-.085,r),(.085,r),(.11,r*.94),(.11,r*.82)]
   for i in range(96):
    a=math.tau*i/96
    for off,rr in profile:verts.append((x+off,axle+rr*math.sin(a),wheelz+rr*math.cos(a)))
   for i in range(96):
    for j in range(len(profile)-1):k=i*len(profile)+j;n=((i+1)%96)*len(profile)+j;faces.append((k,k+1,n+1,n))
   mesh(label+'-'+which+'-tire',verts,faces,mats['Rubber'],'wheels')
   for off in [-.105,.105]:
    tube(label+'-'+which+'-rim-lip-'+str(off),[(x+off,axle+rim*math.sin(i*math.tau/64),wheelz+rim*math.cos(i*math.tau/64)) for i in range(64)],.012,mats['Alloy'],True)
   frontx=x+sign*.11
   for i in range(cfg['spokes']):
    a=math.tau*i/cfg['spokes'];pts=[]
    for rr,da in [(rim*.19,-.40),(rim*.96,-.12),(rim*.96,.12),(rim*.19,.40)]:pts.append((frontx,axle+rr*math.sin(a+da),wheelz+rr*math.cos(a+da)))
    mesh(label+'-'+which+'-spoke-'+str(i),pts,[(0,1,2,3)],mats['Alloy'],'wheels')
   uv(label+'-'+which+'-hub',(frontx,axle,wheelz),(.016,.048,.048),mats['Alloy'])
   for i in range(5):a=i*math.tau/5;uv(label+'-'+which+'-lug-'+str(i),(frontx+sign*.007,axle+.034*math.sin(a),wheelz+.034*math.cos(a)),(.008,.007,.007),chrome)
 if cfg['suv']:
  for sign,label in [(1,'left'),(-1,'right')]:
   pts=[(sign*W*.31,Y(t),top(t)+.034) for t in [.40,.48,.60,.72,.83]];tube(label+'-roof-rail',pts,.015,trim)
  for t in [.48,.76]:tube('roof-crossbar-'+str(t),[(-W*.31,Y(t),top(t)+.042),(0,Y(t),top(t)+.055),(W*.31,Y(t),top(t)+.042)],.012,trim)
 # Paint no imaginary powertrain beneath the empty shell.
 bpy.context.scene.unit_settings.system='METRIC';bpy.ops.wm.save_as_mainfile(filepath=str(out/(car+'-study.blend')))
 bpy.ops.export_scene.gltf(filepath=str(out/(car+'-study.glb')),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
 report={'vehicle':car,'stage':'original exterior surface study','repairGrade':False,'referenceAlbum':ref['albumUrl'],'dimensionsAre':'published envelope targets, not validation','unmodeled':['engine','transmission','underbody','suspension','interior','fasteners'],'unverified':['surface dimensions','lamp construction','wheel design and option','panel seams','US trim']}
 (out/(car+'-study.json')).write_text(json.dumps(report,indent=2))
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.25,.3,1);target=Vector((0,0,H/2))
 for pos,power in [((3,-4,6),1700),((-4,-2,3),1000),((1,4,5),1600)]:
  bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=5;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=L*1.25;scene.render.resolution_x=1000;scene.render.resolution_y=700;scene.render.resolution_percentage=100
 for name,d in [('perspective',(1,-1,.5)),('rear',(1,1,.4)),('left',(1,0,0))]:
  cam.location=target+Vector(d)*10;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/(car+'-'+name+'.png'));bpy.ops.render.render(write_still=True)
 print('STUDY',car,flush=True)
for car in ([args[1]] if len(args)>1 else PROFILES):build(car)
