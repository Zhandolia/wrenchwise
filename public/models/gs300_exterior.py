"""S160 pre-facelift surface study from Lexus 1998–2000 photographic references.
All coordinates are estimates, not scans. Shared namespace supplied by build_gs300.py.
"""
L=4.80568;W=1.80086;H=1.41986;WB=2.79908

def interp(t,knots):
 for i in range(len(knots)-1):
  a,va=knots[i];b,vb=knots[i+1]
  if t<=b:
   q=max(0,min(1,(t-a)/(b-a)));q=q*q*(3-2*q);return va+(vb-va)*q
 return knots[-1][1]

def strip(pid,label,fn,nu=64,nv=16,mat=paint,solid=0,sys='body'):
 vs=[fn(i/nu,j/nv) for i in range(nu+1) for j in range(nv+1)]
 fs=[(i*(nv+1)+j,(i+1)*(nv+1)+j,(i+1)*(nv+1)+j+1,i*(nv+1)+j+1) for i in range(nu) for j in range(nv)]
 return mesh(pid,label,sys,vs,fs,mat,solid)

def line(pid,label,points,r,mat=black,sys='body',closed=False):
 # POLY prevents automatic Bezier handles overshooting at glass corners.
 cu=bpy.data.curves.new(pid,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=3
 sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
 for p,co in zip(sp.points,points):p.co=(*co,1)
 sp.use_cyclic_u=closed;o=bpy.data.objects.new(pid,cu);scene.collection.objects.link(o);return tag(o,pid,label,sys,mat)

def belt_height(y):return interp(y,[(-2.34,.71),(-1.96,.89),(-1.55,.935),(-.72,.94),(.5,.948),(1.6,.97),(2.25,.91)])
def half_width(y):return interp(y,[(-2.34,.72),(-1.94,.862),(-1.42,.90),(-.55,.898),(.6,.90),(1.4,.899),(2.05,.862),(2.35,.78)])
def sidepoint(side,y,t):
 bottom=.215
 for wy in [-WB/2,WB/2]:
  dy=abs(y-wy)
  if dy<.37:bottom=max(bottom,.337+sqrt(.37**2-dy**2))
 z=bottom+(belt_height(y)-bottom)*t
 x=half_width(y)-.045*(1-t)-.04*t**5+.011*sin(pi*t)
 return (side*x,y,z)
for side,st in [(-1,'left'),(1,'right')]:
 for ya,yb,pid in [(-2.20,-.73,'front-fender'),(-.724,.40,'front-door'),(.407,1.32,'rear-door'),(1.327,2.31,'rear-quarter')]:
  strip(pid+'-'+st,pid.replace('-',' ').title()+' '+st,lambda u,v:sidepoint(side,ya+(yb-ya)*u,v),80,24)
  if 'door' in pid:
   hy=yb-.16
   box('handle-recess-'+pid+'-'+st,'Door handle recess '+st,'body',(side*.894,hy,.89),(.012,.16,.05),black,.02)
   box('handle-'+pid+'-'+st,'Body-color door handle '+st,'body',(side*.906,hy,.895),(.022,.137,.027),paint,.013)
 for wy,ax in [(-WB/2,'front'),(WB/2,'rear')]:
  pts=[(side*(half_width(wy+.37*cos(a))-.003),wy+.37*cos(a),.337+.37*sin(a)) for a in [pi*i/64 for i in range(65)]]
  line('arch-'+ax+'-'+st,'Wheel arch rolled lip '+ax+' '+st,pts,.006,paint)
 # Narrow waist molding follows the reference crease below the handles.
 ys=[-.99+2.05*i/80 for i in range(81)]
 line('belt-trim-'+st,'Body side protective molding '+st,[(side*(half_width(y)+.003),y,.505) for y in ys],.011,paint)
 line('belt-trim-chrome-'+st,'Molding bright edge '+st,[(side*(half_width(y)+.004),y,.522) for y in ys],.0035,chrome)
 strip('rocker-'+st,'Rocker outer skin '+st,lambda u,v:(side*(.851+.01*sin(pi*v)),-.995+2.04*u,.21+.13*v),60,8)

# Hood, rear deck and shoulder surfaces share their boundaries with the side skins.
def nose_top(x):return .885+.034*(abs(x)/.861)**2
def hood(u,v):
 a=2*u-1;x=a*.792;z0=nose_top(x);y0=-2.365+.22*(abs(x)/.90)**3+.46*(z0-.66)
 y=y0+(-.731-y0)*v;z=z0*(1-v)+(.932+.035*(1-a*a))*v+.012*sin(pi*v)
 return (x,y,z)
strip('hood','S160 contoured hood',hood,64,60)
for side,st in [(-1,'left'),(1,'right')]:
 strip('fender-crown-'+st,'Front fender crown '+st,lambda u,v:(side*(.792+(half_width(-2.08+1.349*u)-.04-.792)*v),-2.08+1.349*u,(.914+.018*u)+(belt_height(-2.08+1.349*u)-(.914+.018*u))*v),60,16)
 strip('quarter-shoulder-'+st,'Rear quarter shoulder '+st,lambda u,v:(side*(.77+(half_width(1.53+.76*u)-.04-.77)*v),1.53+.76*u,.965-.038*u+.014*(1-v*v)),48,12)
# Rear deck is a gently crowned surface, not a box.
strip('trunk-lid','Trunk lid',lambda u,v:((2*u-1)*(.766-.043*v),1.55+0.74*v,.965-.038*v+.016*(1-(2*u-1)**2)),64,36)
# Cabin envelope: smooth roof crown, raked glass, bounded window outlines.
def roof_z(y):return 1.41986-.17*((y-.36)/1.0)**2
def roof_w(y):return interp(y,[(-.16,.657),(.20,.687),(.65,.684),(1.02,.649)])
def roofpoint(u,v):
 y=-.16+1.18*v;a=2*u-1;return(a*roof_w(y),y,roof_z(y)-.035*a*a)
strip('roof','Continuous crowned roof panel',roofpoint,48,64)
def wind(u,v):
 a=2*u-1;return(a*(.791-.134*v),-.718+.556*v-.035*(1-a*a)*sin(pi*v),.94+(roof_z(-.16)-.94)*v-.035*a*a*v+.01*(1-a*a)*sin(pi*v))
strip('windshield','Curved windshield',wind,48,32,glass,0)
def rearwind(u,v):
 a=2*u-1;return(a*(.649+.116*v),1.026+.52*v+.018*(1-a*a)*sin(pi*v),roof_z(1.02)-(roof_z(1.02)-.97)*v-.035*a*a*(1-v))
strip('rear-glass','Curved rear glass',rearwind,48,32,glass,0)
# Side windows follow a continuous roof/sill relationship without spline overshoot.
def glass_top(y):
 if y<-.16:return .95+(roof_z(-.16)-.035-.95)*((y+.69)/.53)
 if y<=.87:return roof_z(y)-.043
 return (roof_z(.87)-.043)-.36*((y-.87)/.48)**1.5
def glass_side(side,y,z):return(side*(.817-.15*max(0,min(1,(z-.949)/.43))),y,z)
for side,st in [(-1,'left'),(1,'right')]:
 for ya,yb,name in [(-.671,.405,'front'),(.448,1.052,'rear'),(1.075,1.329,'quarter')]:
  def win(u,v):
   y=ya+(yb-ya)*u;z=.953+(glass_top(y)-.953)*v;return glass_side(side,y,z)
  strip('glass-'+name+'-'+st,name.title()+' side glass '+st,win,40,16,glass,0)
  border=[win(i/40,0) for i in range(41)]+[win(1,i/16) for i in range(1,17)]+[win(1-i/40,1) for i in range(1,41)]+[win(0,1-i/16) for i in range(1,17)]
  line('window-seal-'+name+'-'+st,'Window weatherstrip '+name+' '+st,border,.006,black,closed=True)
 # Broad sheet-metal C pillar, and body-colored A pillar.
 def cp(u,v):
  y=.88+.67*u
  inner_y=.88+.46*u;inner_z=glass_top(inner_y)
  outer_y=1.02+.53*u;outer_z=roof_z(1.02)-(roof_z(1.02)-.97)*u-.035*(1-u)
  return (side*((.668+.15*u)+.025*v),inner_y+(outer_y-inner_y)*v,inner_z+(outer_z-inner_z)*v)
 strip('pillar-c-'+st,'C pillar sheet metal '+st,cp,48,12)
 a=[wind(0 if side<0 else 1,i/40) for i in range(41)]
 line('pillar-a-'+st,'A pillar '+st,a,.013,paint)
 rail=[(side*(roof_w(y)+.003),y,roof_z(y)-.035) for y in [-.16+1.18*i/64 for i in range(65)]]
 line('roof-rail-'+st,'Roof side rail '+st,rail,.007,paint)
 b=[glass_side(side,.426,.954+(glass_top(.426)-.954)*i/24) for i in range(25)]
 line('pillar-b-'+st,'Black B pillar '+st,b,.016,black,sys='structure')
 sill=[(side*.819,y,.953) for y in [-.67+2.0*i/64 for i in range(65)]]
 line('window-sill-'+st,'Window lower bright trim '+st,sill,.003,chrome)
 # Slightly flattened mirror shells, with stalk attached to the sail panel.
 box('mirror-'+st,'Door mirror housing '+st,'body',(side*.947,-.574,1.018),(.197,.21,.115),paint,.048)
 ellipsoid('mirror-glass-'+st,'Door mirror glass '+st,'body',(side*.947,-.477,1.02),(.085,.003,.045),chrome)
 rod('mirror-arm-'+st,'Door mirror support '+st,'body',(side*.79,-.59,1.035),(side*.91,-.58,1.04),.021,black)
 line('wiper-'+st,'Windshield wiper '+st,[(side*.06,-.697,.96),(side*.30,-.694,.964),(side*.56,-.685,.964)],.006,black)
box('fuel-door','Fuel filler door','body',(-.893,1.61,.908),(.01,.178,.16),paint,.025)

# Rounded wraparound fascias. Front/back surfaces avoid rectangular bumper blocks.
def fascia(front,u,v):
 x=(2*u-1)*(.842+.051*sin(pi*v));z=(.25+.40*v) if front else (.25+.36*v)
 y=(-2.397+.22*(abs(x)/.886)**4) if front else (2.397-.23*(abs(x)/.886)**4)
 y+= (.028*(2*v-1)**2) if front else (-.025*(2*v-1)**2)
 return (x,y,z)
for front,name in [(True,'front'),(False,'rear')]:
 strip(name+'-bumper',name.title()+' wraparound bumper cover',lambda u,v:fascia(front,u,v),96,24)
 line(name+'-bumper-molding',name.title()+' bumper molding',[fascia(front,i/100,.78) for i in range(101)],.012,paint)
 # Top shoulder closes the fascia to the body.
 strip(name+'-bumper-top',name.title()+' fascia shoulder',lambda u,v:(fascia(front,u,1)[0],fascia(front,u,1)[1]+(.10*v if front else -.08*v),fascia(front,u,1)[2]+.018*sin(pi*v)),96,8)
# Between the four lamps: a wider trapezoidal grille, inclined with the nose.
def front_y(x,z,offset=0):return -2.365+.22*(abs(x)/.90)**3+.46*(z-.66)+offset
strip('nose-panel','Front nose and lamp surround',lambda u,v:((2*u-1)*.861,front_y((2*u-1)*.861,.63+(nose_top((2*u-1)*.861)-.63)*v),.63+(nose_top((2*u-1)*.861)-.63)*v),96,20)
# Lamp boundary coordinates are independently authored from photographs, not ellipsoid blobs.
def lens_patch(pid,label,points,mat,side=1,depth=-.028):
 cx=sum(x for x,z in points)/len(points);cz=sum(z for x,z in points)/len(points)
 vs=[];fs=[];n=len(points);rings=12
 for k in range(rings+1):
  r=k/rings
  for x,z in points:
   xx=cx+(x-cx)*r;zz=cz+(z-cz)*r
   vs.append((side*xx,front_y(xx,zz,depth),zz))
 for k in range(rings):
  for j in range(n):fs.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
 mesh(pid,label,'body',vs,fs,mat,0)
 return vs[-n:]
# Rounded asymmetric ovals, outer lamps taller and swept up/outward.
for side,st in [(-1,'left'),(1,'right')]:
 for name,base in [('outer',[(.555,.684),(.571,.795),(.635,.885),(.74,.924),(.816,.893),(.826,.817),(.787,.707),(.69,.678)]),('inner',[(.355,.676),(.373,.752),(.426,.813),(.489,.802),(.513,.739),(.494,.682),(.425,.667)])]:
  coords=[]
  for i in range(len(base)):
   p0=Vector(base[(i-1)%len(base)]);p1=Vector(base[i]);p2=Vector(base[(i+1)%len(base)]);p3=Vector(base[(i+2)%len(base)])
   for k in range(8):
    t=k/8;pt=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t);coords.append(tuple(pt))
  ps=lens_patch('lamp-housing-'+name+'-'+st,'Contoured headlamp lens '+name+' '+st,coords,lens,side,-.030)
  line('lamp-seal-'+name+'-'+st,'Headlamp seal '+name+' '+st,ps,.004,black,closed=True)
  cx=.695 if name=='outer' else .433;cz=.782 if name=='outer' else .743
  r=.057 if name=='outer' else .038
  circle=[(cx+r*cos(i*2*pi/48),cz+r*sin(i*2*pi/48)) for i in range(48)]
  lens_patch('reflector-'+name+'-'+st,'Headlamp reflector '+name+' '+st,circle,chrome,side,-.034)
  # Molded optical ribs lie on the same curved lens surface.
  for j in range(-3,4):
   dx=j*r/4;dz=sqrt(max(0,r*r-dx*dx))*.9
   line('lamp-optics-'+name+'-'+st,'Headlamp optical ribs '+name+' '+st,[(side*(cx+dx),front_y(cx+dx,cz+zz,-.036),cz+zz) for zz in [-dz+2*dz*k/16 for k in range(17)]],.001,lens)
  if name=='outer':
   coords=[(.752,.701),(.785,.713),(.793,.750),(.763,.748)]
   lens_patch('marker-'+st,'Amber side section '+st,coords,amber,side,-.038)
 if side==-1:
  grille=[(-.34,.831),(.34,.831),(.296,.653),(-.296,.653)]
  lens_patch('grille-back','Pre-facelift trapezoid grille backing',grille,black,1,-.052)
  for i in range(25):
   x=-.30+i*.025;z0=.668;z1=.817
   if abs(x)>.29:z0+=.06
   line('grille-bars','Vertical grille bars',[(x,front_y(x,z0,-.063),z0),(x,front_y(x,z1,-.063),z1)],.0014,black)
  # Grille perimeter uses small-radius fillets, not a huge chrome rectangle.
  line('grille-surround','Grille chrome perimeter',[(x,front_y(x,z,-.065),z) for x,z in grille],.006,chrome,closed=True)
 # Only create central pieces once.
 if side==-1:
  oval=[(.043*cos(a),front_y(0,.741,-.069),.741+.029*sin(a)) for a in [i*2*pi/64 for i in range(64)]]
  line('grille-emblem','Lexus oval grille emblem',oval,.003,chrome,closed=True)
  line('grille-emblem','Lexus oval grille emblem',[(.012,-2.40,.765),(-.015,-2.40,.723),(.026,-2.40,.723)],.003,chrome)
 # Fog lamps and three narrow lower intake bars.
 box('fog-recess-'+st,'Fog lamp recess '+st,'body',(side*.685,-2.316,.365),(.20,.016,.13),black,.035)
 box('fog-lamp-'+st,'Rectangular fog lamp '+st,'body',(side*.685,-2.327,.365),(.164,.015,.087),lens,.023)
box('lower-grille','Lower intake recess','body',(0,-2.384,.357),(1.09,.018,.139),black,.021)
for z in [.309,.35,.393]:line('lower-grille-bars','Lower intake horizontal bars',[(-.55,-2.40,z),(0,-2.414,z),(.55,-2.40,z)],.004,paint)
box('plate-front','Front plate mount','body',(0,-2.425,.515),(.31,.019,.155),black,.009)
# Rear panel and pre-facelift multi-section lamps.
strip('rear-panel','Rear panel',lambda u,v:((2*u-1)*.805,2.313-.11*(abs(2*u-1)**4),.60+.325*v),80,24)
box('rear-plate-recess','Rear plate recess','body',(0,2.324,.744),(.35,.02,.175),black,.026)
for side,st in [(-1,'left'),(1,'right')]:
 for layer,(pid,mat,zc,rz) in enumerate([('tail-lamp',red,.794,.108),('tail-signal',amber,.815,.019),('tail-reverse',lens,.782,.010)]):
  pts=[]
  for i in range(64):
   a=2*pi*i/64;dx=.132*math.copysign(abs(cos(a))**.7,cos(a));dz=rz*math.copysign(abs(sin(a))**.7,sin(a))
   pts.append((side*(.65+dx),2.327+layer*.002-.11*(abs(.65+dx)/.805)**4,zc+dz))
  vs=[(side*.65,2.327+layer*.002-.11*(.65/.805)**4,zc)]+pts
  mesh(pid+'-'+st,pid.replace('-',' ').title()+' '+st,'body',vs,[(0,i+1,(i+1)%64+1) for i in range(64)],mat,0)
 ellipsoid('inner-tail-'+st,'Trunk-mounted inner tail lamp '+st,'body',(side*.383,2.323,.78),(.064,.002,.062),red)
 cyl('exhaust-tip-'+st,'Exhaust outlet '+st,'exhaust',(side*.61,2.32,.225),.035,.13,chrome,'Y')
 cyl('exhaust-tip-dark-'+st,'Exhaust outlet interior '+st,'exhaust',(side*.61,2.39,.225),.029,.004,black,'Y')
# Closed edge strips at windscreen/roof prevent disconnected rail artifacts.
for fn,pid in [(wind,'windshield'),(rearwind,'rear-glass')]:
 for v in [0,1]:line(pid+'-edge',pid+' edge trim',[fn(i/64,v) for i in range(65)],.004,black)
