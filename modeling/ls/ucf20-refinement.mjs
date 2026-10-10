/** 1998 UK UCF20 facelift refinement from Lexus LEX 401 exterior photographs
 * and the Car & Classic 1998 RHD VVT-i engine-bay photograph. Metres; local shapes remain estimates.
 * Geometry is authored here, never traced textures or third-party meshes. */
import * as T from 'three';
const mix=T.MathUtils.lerp;
const clamp=T.MathUtils.clamp;
export function refineUcf20({root,c,parts,add,box,tube,cyl,ring,mat,surface,front,rear,fw,rw,rad,wr}){
 const remove=predicate=>{for(const o of [...root.children])if(predicate(o)){root.remove(o);const i=parts.findIndex(p=>p.id===o.name);if(i>=0)parts.splice(i,1);}};
 remove(o=>o.userData.system==='body'||o.name.startsWith('tailpipe')||/wheel-.*-(disc-face|vent-|dish|hub|lug-)/.test(o.name));
 const paint=mat('1998 dark emerald pearl','#10322b',.52,.28,{clearcoat:1,clearcoatRoughness:.15});
 const lower=mat('1998 green lower cladding','#263f37',.48,.32,{clearcoat:.85});
 const chrome=mat('polished window and grille trim','#c2c9c5',.95,.20);
 const rubber=mat('seals and shut lines','#101615',0,.86);
 const black=mat('satin black mouldings','#1b2220',.05,.62);
 const glass=mat('subtly green tinted glazing','#10201d',0,.34,{clearcoat:.16,clearcoatRoughness:.3,envMapIntensity:.18,specularIntensity:.35});
 const silver=mat('factory satin alloy wheel','#b3b9b1',.72,.30);
 const reflector=mat('headlamp reflector','#b7c0b9',.26,.28);
 const lens=mat('ribbed headlamp glazing','#d8e1d9',.04,.19,{transparent:true,opacity:.25,depthWrite:false,clearcoat:1});
 const red=mat('ruby red tail lamp','#8c0911',.08,.23,{clearcoat:1});
 const amber=mat('amber signal lens','#d46b08',.10,.25,{clearcoat:1});
 const white=mat('white reverse lens','#cbd6ca',.12,.26);
 // Continuous C1 longitudinal contours avoid ripples from independently eased stations.
 const stations=[[rear,.79,.964],[rear+.20,.875,.99],[rear+.60,.908,.99],[rw,.915,.980],[-.3,.915,.963],[.65,.915,.955],[fw,.907,.927],[front-.30,.875,.902],[front,.80,.889]];
 const sample=(z,col)=>{let i=1;while(i<stations.length-1&&z>stations[i][0])i++;const a=stations[i-1],b=stations[i],prev=stations[Math.max(0,i-2)],next=stations[Math.min(stations.length-1,i+1)],span=b[0]-a[0],t=clamp((z-a[0])/span,0,1),m0=(b[col]-prev[col])/(b[0]-prev[0]),m1=(next[col]-a[col])/(next[0]-a[0]);return (2*t**3-3*t*t+1)*a[col]+(t**3-2*t*t+t)*span*m0+(-2*t**3+3*t*t)*b[col]+(t**3-t*t)*span*m1;};
 const belt=z=>sample(z,2),width=z=>Math.min(.915,sample(z,1));
 const arch=z=>Math.max(.255,...[fw,rw].map(w=>Math.abs(z-w)<wr?rad+Math.sqrt(wr*wr-(z-w)**2):.255));
 const side=(z,y)=>width(z)-.028*Math.pow(clamp((y-.59)/.38,-1,1),4)-.020*Math.exp(-(((y-.28)/.075)**2));
 for(const s of [-1,1]){
  add('body-side-'+s,'Rounded wing and door skin','body',surface((u,v)=>{const z=mix(rear+.23,front-.27,u),y=mix(arch(z),belt(z),v);return[s*side(z,y),y,z];},320,32),paint);
  add('lower-cladding-'+s,'Two-tone lower door cladding','body',surface((u,v)=>{const z=mix(rear+.23,front-.27,u),lo=arch(z),hi=.625,y=lo>=hi?lo:mix(lo,hi,v);return[s*(side(z,y)+.003),y,z];},320,14),lower);
  for(const [i,wz] of [fw,rw].entries()){
   tube(`arch-lip-${s}-${i}`,'Soft rolled wheel arch','body',Array.from({length:72},(_,k)=>{const a=mix(-.10,Math.PI+.10,k/71),z=wz+wr*Math.cos(a),y=rad+wr*Math.sin(a);return[s*(side(z,y)+.003),y,z];}),.0055,paint);
  }
  const trimPoints=(y,z0,z1)=>Array.from({length:55},(_,i)=>{const z=mix(z0,z1,i/54);return[s*(side(z,y)+.006),y,z];});
  tube('side-moulding-'+s,'Slim lower-body chrome moulding','body',trimPoints(.627,rw+wr+.015,fw-wr-.01),.004,chrome);
  tube('front-side-moulding-'+s,'Front wing chrome moulding','body',trimPoints(.627,fw+wr+.015,front-.18),.004,chrome);
  tube('rear-side-moulding-'+s,'Rear quarter chrome moulding','body',trimPoints(.627,rear+.18,rw-wr-.015),.004,chrome);
 }
 const hoodZ0=1.06,hoodZ1=front-.105;
 const hoodW=z=>mix(.735,.70,(z-hoodZ0)/(hoodZ1-hoodZ0));
 const hoodY=(z,x)=>mix(.985,.906,(z-hoodZ0)/(hoodZ1-hoodZ0))+.022*(1-(x/.78)**2);
 add('hood','Crowned bonnet panel','body',surface((u,v)=>{const z=mix(hoodZ0,hoodZ1,u),x=(2*v-1)*hoodW(z);return[x,hoodY(z,x),z];},64,48),paint);
 for(const s of [-1,1]){
  add('fender-top-'+s,'Rounded front wing shoulder','body',surface((u,v)=>{const z=mix(hoodZ0,front-.105-.165*v,u),x=s*mix(hoodW(z)+.004,side(z,belt(z)),v),y=mix(hoodY(z,x)-.004,belt(z),v)+.012*Math.sin(v*Math.PI);return[x,y,z];},64,24),paint);
  tube('hood-gap-'+s,'Bonnet shut line','body',Array.from({length:40},(_,i)=>{const z=mix(hoodZ0,hoodZ1,i/39),x=s*(hoodW(z)+.002);return[x,hoodY(z,x)-.003,z];}),.0016,rubber);
 }
 add('nose-top','Bonnet nose curvature','body',surface((u,v)=>{const x=(2*v-1)*mix(.69,.79,u),z=mix(hoodZ1,front-.058,u)-.10*Math.pow(Math.abs(x)/.79,6)*u;return[x,.906+.017*(1-(x/.8)**2)-.02*u,z];},20,48),paint);
 const cabinFront=1.06,cabinRear=-1.58,roofFront=.39,roofRear=-.92;
 const roofWidth=z=>.70-.024*Math.pow((z+.265)/.655,2);
 const roofY=(z,x)=>c.height-.022*Math.pow((z+.265)/.655,2)-.048*Math.pow(Math.abs(x)/roofWidth(z),4);
 add('roof','Doubly curved roof','body',surface((u,v)=>{const z=mix(roofRear,roofFront,u),x=(2*v-1)*roofWidth(z);return[x,roofY(z,x),z];},64,56),paint);
 const cabinX=(z,y)=>mix(.833,.685,clamp((y-.955)/.435,0,1))+.006*Math.sin((z+1.55)/2.565*Math.PI);
 // Quadratic corners give the facelift LS its rounded window outline and broad C-pillar.
 const roundedPath=(points,r=.12)=>{const shape=new T.Shape();for(let i=0;i<points.length;i++){const a=points[(i+points.length-1)%points.length],b=points[i],d=points[(i+1)%points.length];const p=[mix(b[0],a[0],r),mix(b[1],a[1],r)],q=[mix(b[0],d[0],r),mix(b[1],d[1],r)];if(!i)shape.moveTo(...p);else shape.lineTo(...p);shape.quadraticCurveTo(...b,...q);}shape.closePath();return shape;};
 const sidePanel=(id,name,s,points,material,offset=0,r=.13)=>{
  const shape=roundedPath(points,r),g=new T.ShapeGeometry(shape,24),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const z=p.getX(i),y=p.getY(i);p.setXYZ(i,s*(cabinX(z,y)+offset),y,z);}g.computeVertexNormals();add(id,name,'body',g,material);
  return shape.getPoints(14).map(p=>[s*(cabinX(p.x,p.y)+offset+.001),p.y,p.x]);
 };
 for(const s of [-1,1]){
  add('door-shoulder-'+s,'Upper door shoulder','body',surface((u,v)=>{const z=mix(-1.58,1.06,u),y=mix(belt(z),.959,v),x=s*mix(side(z,belt(z)),cabinX(z,.959),v);return[x,y,z];},64,12),paint);
  sidePanel('cabin-side-'+s,'Roof rail and C-pillar skin',s,[[1.09,.953],[.435,1.380],[-.95,1.380],[-1.64,.969]],paint,0,.18);
  const frontWindow=[[.963,.976],[.360,1.356],[-.295,1.376],[-.15,.976]];
  const rearWindow=[[-.218,.976],[-.36,1.376],[-.863,1.357],[-1.29,1.05],[-1.22,.987]];
  for(const [id,points] of [['front',frontWindow],['rear',rearWindow]]){
   const pts=sidePanel(id+'-door-glass-'+s,'Curved '+id+' side window',s,points,glass,.008,.19);
   tube(id+'-window-seal-'+s,'Window rubber channel','body',pts,.010,rubber,true);
   tube(id+'-window-chrome-'+s,'Fine window chrome surround','body',pts.map(([x,y,z])=>[x+s*.004,y,z]),.0035,chrome,true);
  }
  // Flush black B-pillar slopes rearward toward the roof.
  sidePanel('b-pillar-'+s,'Sloping B-pillar trim',s,[[-.151,.97],[-.296,1.386],[-.373,1.384],[-.23,.97]],black,.016,.025);
  tube('window-sill-'+s,'Window sill weatherstrip','body',Array.from({length:36},(_,i)=>{const z=mix(-1.30,.94,i/35);return[s*(cabinX(z,.954)+.005),.952,z];}),.005,chrome);
  const seamSets=[[[1.04,.945],[1.025,.72],[1.05,.47],[.99,.285]],[[-.2,.95],[-.21,.71],[-.22,.42],[-.29,.285]],[[-1.31,.957],[-1.39,.83],[-1.08,.58],[-.93,.29]]];
  seamSets.forEach((pts,i)=>tube(`door-seam-${s}-${i}`,'Door shut line','body',pts.map(([z,y])=>[s*(side(z,y)+.003),y,z]),.0016,rubber));
  for(const [i,z] of [.015,-1.05].entries()){
   box(`handle-recess-${s}-${i}`,'Flush door handle pocket','body',[s*(side(z,.851)+.004),.851,z],[.013,.052,.144],rubber,.016);
   box(`handle-${s}-${i}`,'Body-colour door handle','body',[s*(side(z,.859)+.012),.860,z],[.014,.032,.124],paint,.010);
   tube(`handle-edge-${s}-${i}`,'Door handle bright edge','body',[[s*(side(z,.85)+.02),.849,z-.05],[s*(side(z,.85)+.02),.849,z+.05]],.0023,chrome);
  }
  box('mirror-foot-'+s,'Triangular mirror sail','body',[s*.833,1.017,.843],[.045,.104,.14],black,.025,[0,0,s*.2]);
  box('mirror-'+s,'Facelift rounded door mirror housing','body',[s*.947,1.04,.88],[.232,.118,.242],paint,.05);
  box('mirror-glass-'+s,'Mirror glass','body',[s*.957,1.043,.764],[.182,.078,.006],chrome,.027);
  box('wing-repeater-'+s,'UK amber wing repeater','body',[s*(side(1.08,.69)+.009),.69,1.08],[.011,.035,.060],amber,.006);
 }
 // Curved windscreens meet the crown smoothly instead of forming a flat trapezoid.
 for(const [id,baseZ,topZ,baseY] of [['windshield',cabinFront,roofFront,.977],['rear-glass',cabinRear,roofRear,.993]]){
  const point=(u,v)=>{const x=(v*2-1)*mix(.813,roofWidth(topZ)-.015,u),z=mix(baseZ,topZ,u)+(id==='windshield'?1:-1)*.028*Math.sin(u*Math.PI)*(1-(2*v-1)**2),y=mix(baseY,roofY(topZ,x)-.006,u)+.021*Math.sin(u*Math.PI)*(1-(2*v-1)**2);return[x,y,z];};
  add(id,id==='windshield'?'Curved windscreen':'Curved rear screen','body',surface(point,48,48),glass);
  for(const s of [0,1]){const pts=Array.from({length:40},(_,i)=>point(i/39,s));tube(id+'-pillar-'+s,id==='windshield'?'Rounded A-pillar':'Rounded C-pillar edge','body',pts,.022,paint);tube(id+'-seal-'+s,'Screen edge seal','body',pts.map(([x,y,z])=>[x*(1-.008),y+.002,z]),.004,rubber);}
  for(const u of [0,1])tube(id+'-horizontal-seal-'+u,'Screen upper / lower seal','body',Array.from({length:40},(_,i)=>point(u,i/39)),.005,rubber);
  if(id==='rear-glass')for(let j=0;j<12;j++)tube('demister-'+j,'Rear screen demister line','body',Array.from({length:24},(_,i)=>{const p=point(.11+j*.065,.07+.86*i/23);p[1]+=.0025;return p;}),.00065,mat('demister conductor','#655b43',.05,.8));
 }
 add('trunk','Rounded boot deck','body',surface((u,v)=>{const z=mix(rear+.07,cabinRear,u),x=(v*2-1)*(side(z,belt(z))-.005);return[x,belt(z)+.013+.024*(1-(v*2-1)**2),z];},44,48),paint);
 for(const s of [-1,1])tube('trunk-gap-'+s,'Boot lid side shut line','body',Array.from({length:30},(_,i)=>{const z=mix(rear+.08,cabinRear+.015,i/29),x=s*.66;return[x,belt(z)+.02,z];}),.0017,rubber);
 // Rounded wraparound bumper geometry follows the body instead of a flat rectangular wall.
 const wrap=(x,end,inset=0)=>end-inset-Math.sign(end)*.67*(1-Math.pow(Math.max(0,1-Math.pow(Math.abs(x)/.912,4)),1/4));
 for(const [name,end] of [['front',front],['rear',rear]]){
  const sg=Math.sign(end),y0=name==='front'?.255:.275,y1=name==='front'?.660:.66;
  add(name+'-bumper','Wraparound '+name+' bumper','body',surface((u,v)=>{const y=mix(y0,y1,v),x=mix(-.89,.89,u)*(1-.022*Math.pow(2*v-1,4));return[x,y,wrap(x,end)-sg*(.022*Math.pow(2*v-1,6))];},96,28),lower);
  add(name+'-upper-fascia','Curved '+name+' fascia','body',surface((u,v)=>{const y=mix(y1,name==='front'?.672:.989,v),x=mix(-.875,.875,u);return[x,y,wrap(x,end)-sg*(name==='front'?.048:.052)];},80,24),paint);
  tube(name+'-bumper-bead','Bumper upper black bead','body',Array.from({length:96},(_,i)=>{const x=mix(-.895,.895,i/95);return[x,y1-.004,wrap(x,end)-sg*.002];}),.006,rubber);
  tube(name+'-bumper-chrome','Bumper chrome strip','body',Array.from({length:96},(_,i)=>{const x=mix(-.89,.89,i/95);return[x,y1-.015,wrap(x,end)+sg*.003];}),.0035,chrome);
 }
 // Real grille is an open dark aperture: no opaque chrome plate behind its bars.
 const grilleZ=front-.027,grilleY=.787,grilleW=.760,grilleH=.244;
 const grilleShape=roundedPath([[-grilleW/2,.122],[grilleW/2,.122],[grilleW*.425,-.122],[-grilleW*.425,-.122]],.10);
 add('front-grille','Recessed grille aperture','body',new T.ShapeGeometry(grilleShape,20),black,[0,grilleY,grilleZ]);
 const outline=grilleShape.getPoints(12).map(p=>[p.x,p.y+grilleY,grilleZ+.008]);tube('front-grille-frame','Thin chrome grille frame','body',outline,.0055,chrome,true);
 for(let i=0;i<8;i++){const y=grilleY-.105+i*.030;box('grille-slat-'+i,'Fine horizontal grille bar','body',[0,y,grilleZ+.009],[mix(.635,.742,i/7),.0045,.010],black,.0015);}
 ring('grille-emblem-ring','Lexus oval emblem','body',[0,.787,grilleZ+.023],.027,.0035,chrome).scale.x=1.33;
 tube('grille-emblem','Lexus grille emblem stroke','body',[[.004,.810,grilleZ+.028],[-.012,.770,grilleZ+.028],[.021,.770,grilleZ+.028]],.003,chrome);
 const lampZ=x=>front-.048-.20*Math.pow(Math.abs(x)/.86,7);
 for(const s of [-1,1]){
  // Facelift one-piece lamp: rounded inner edge, clear dual reflectors and outer amber chamber.
  const lampShape=roundedPath([[.403,.678],[.846,.683],[.867,.868],[.805,.906],[.473,.903],[.418,.856]],.18);
  const lampGeometry=offset=>{const g=new T.ShapeGeometry(lampShape,20),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=s*p.getX(i);p.setXYZ(i,x,p.getY(i),lampZ(x)+offset);}g.computeVertexNormals();return g;};
  add('headlamp-housing-'+s,'Facelift headlamp reflector housing','body',lampGeometry(0),reflector);
  add('headlamp-'+s,'Facelift clear headlamp glazing','body',lampGeometry(.018),lens);
  tube('headlamp-seal-'+s,'Headlamp perimeter seal','body',lampShape.getPoints(16).map(p=>[s*p.x,p.y,lampZ(p.x)+.020]),.004,rubber,true);
  for(const [i,x] of [.513,.672].entries()){
   const radius=i===0?.064:.074;
   add('reflector-chamber-'+s+'-'+i,'Faceted headlamp reflector','body',surface((u,v)=>{const a=u*Math.PI*2,r=radius*v,xx=s*(x+Math.cos(a)*r);return[xx,.782+Math.sin(a)*r,lampZ(xx)+.009-.024*(1-v*v)];},32,10),white);
   cyl('headlamp-bulb-'+s+'-'+i,'Headlamp bulb shield','body',[s*x,.782,lampZ(x)+.012],.014,.017,chrome,'z',16);
  }
  add('front-marker-'+s,'Integrated amber corner indicator','body',surface((u,v)=>{const x=s*mix(.803,.852,u);return[x,mix(.714,.871,v),lampZ(x)+.017];},12,12),amber);
  for(let i=0;i<9;i++)tube('lens-flute-'+s+'-'+i,'Outer indicator lens flute','body',[[s*(.807+i*.005),.724,lampZ(.807+i*.005)+.021],[s*(.807+i*.005),.864,lampZ(.807+i*.005)+.021]],.0008,amber);
  box('headlamp-washer-'+s,'Headlamp washer nozzle','body',[s*.64,.646,wrap(s*.64,front)+.003],[.033,.022,.023],black,.008);
  box('fog-recess-'+s,'Lower bumper lamp recess','body',[s*.63,.382,wrap(s*.63,front)+.002],[.31,.105,.013],black,.014);
  box('fog-lamp-'+s,'Rectangular fog lamp','body',[s*.61,.382,wrap(s*.61,front)+.012],[.23,.081,.01],white,.008);
  for(let i=0;i<9;i++)box(`fog-rib-${s}-${i}`,'Fog lamp optical rib','body',[s*.61-.097+i*.024,.382,wrap(s*.61,front)+.019],[.0015,.068,.002],reflector,.0005);
  // Tail lamps turn around the rear corners. Outer signal band and inner reverse lens.
  // Stock walkaround shows the outer lamp tapering down into the rear wing.
  const tailPoint=(u,v)=>{const x=s*mix(.282,.882,u),y=mix(.674,.876-.064*u**5,v);return[x,y,wrap(x,rear)+.025];};
  add('tail-lamp-'+s,'Wraparound rear combination lamp','body',surface(tailPoint,48,24),red);
  add('tail-indicator-'+s,'Amber rear signal band','body',surface((u,v)=>{const p=tailPoint(.46+.54*u,.48+.22*v);p[2]-=.004;return p;},24,5),amber);
  add('tail-reverse-'+s,'Inner reverse lamp','body',surface((u,v)=>{const p=tailPoint(.035+.18*u,.32+.30*v);p[2]-=.005;return p;},12,6),white);
  for(let j=0;j<8;j++)tube('tail-rib-'+s+'-'+j,'Tail lens moulded rib','body',Array.from({length:30},(_,i)=>{const p=tailPoint(i/29,.04+j*.127);p[2]-=.007;return p;}),.0012,red);
  tube('tail-divider-'+s,'Tail lamp boot seam','body',Array.from({length:12},(_,i)=>{const p=tailPoint(.28,i/11);p[2]-=.007;return p;}),.003,rubber);
  tube('tailpipe-'+s,'Tucked exhaust outlet','exhaust',[[s*.61,.30,rear+.40],[s*.61,.29,rear+.19]],.026,black);
 }
 box('front-plate-recess','Front plate mounting pad','body',[0,.529,front-.002],[.49,.129,.012],black,.009);
 // Fuel flap belongs to vehicle-left. Its outline is photo-derived, not measured.
 const fuelFlap=roundedPath([[-1.69,.779],[-1.87,.779],[-1.87,.906],[-1.69,.906]],.24);
 tube('fuel-flap-gap','Fuel filler flap perimeter','body',fuelFlap.getPoints(12).map(p=>[side(p.x,p.y)+.004,p.y,p.x]),.0015,rubber,true);
 box('front-plate','Neutral front registration plate','body',[0,.534,front+.005],[.452,.103,.007],white,.003);
 box('rear-plate-recess','Rear plate recess','body',[0,.768,rear+.026],[.486,.215,.015],black,.016);
 box('rear-plate','Neutral rear registration plate','body',[0,.77,rear+.014],[.425,.13,.006],mat('UK rear plate','#c7a635',.05,.5),.003);
 ring('boot-emblem','Boot Lexus emblem','body',[0,.956,rear+.025],.021,.003,chrome);
 box('front-lower-intake','Lower radiator grille opening','body',[0,.357,front+.004],[.83,.083,.013],black,.011);
 for(let i=0;i<2;i++)box('lower-intake-bar-'+i,'Lower bumper horizontal bar','body',[0,.340+i*.027,front+.014],[.82,.008,.01],lower,.003);
 tube('bumper-lower-lip','Front lower lip','body',Array.from({length:60},(_,i)=>{const x=mix(-.8,.8,i/59);return[x,.286,wrap(x,front)+.007];}),.009,lower);
 // A slim cowl, wipers and subtly inset sunroof replace the slab-like roof details.
 box('cowl','Windscreen scuttle panel','body',[0,.977,1.049],[1.55,.024,.10],black,.018);
 for(const s of [-1,1])tube('wiper-'+s,'Windscreen wiper','body',[[s*.24,.998,1.026],[s*.45,1.019,.96],[s*.72,1.023,.945]],.004,black);
 const sunroof=roundedPath([[-.38,-.53],[.38,-.53],[.38,.08],[-.38,.08]],.16),sg=new T.ShapeGeometry(sunroof,24),sp=sg.attributes.position;
 for(let i=0;i<sp.count;i++){const x=sp.getX(i),z=sp.getY(i);sp.setXYZ(i,x,roofY(z,x)+.002,z);}sg.computeVertexNormals();add('sunroof','Flush sunroof glass','body',sg,glass);
 tube('sunroof-seal','Sunroof perimeter seal','body',sunroof.getPoints(20).map(p=>[p.x,roofY(p.y,p.x)+.002,p.y]),.002,rubber,true);
 // Factory seven-opening 16-inch wheel faces with actual openings, recessed dishes and centre badges.
 for(const [axle,z] of [fw,rw].entries())for(const s of [-1,1]){
  const barrel=root.getObjectByName(`wheel-${axle}-${s}-barrel`);barrel.geometry=new T.CylinderGeometry(.2032,.2032,.16,64,1,true);
  root.getObjectByName(`wheel-${axle}-${s}-disc`).material=mat('brake rotor in wheel shadow','#343c38',.40,.68);
  const x=s*(c.track[axle]/2+c.tyre[0]/2-.008),rim=.2032,pre=`wheel-${axle}-${s}`,shape=new T.Shape();shape.absarc(0,0,rim-.015,0,Math.PI*2,false);
  for(let j=0;j<7;j++){const a=j*Math.PI*2/7,hole=new T.Path();hole.absellipse(Math.cos(a)*.150,Math.sin(a)*.150,.026,.027,0,Math.PI*2,true,a);shape.holes.push(hole);}
  const g=new T.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:3,curveSegments:12}),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getX(i),zz=p.getY(i),d=p.getZ(i),rr=Math.hypot(y,zz);p.setXYZ(i,s*(d+.014*(1-(rr/.198)**2)),y,zz);}g.computeVertexNormals();add(pre+'-disc-face','Seven-opening 16-inch factory alloy wheel','wheels',g,silver,[x,rad,z]);
  cyl(pre+'-hub','Recessed alloy centre cap','wheels',[x+s*.020,rad,z],.064,.008,silver,'x',48);
  ring(pre+'-cap-edge','Wheel centre cap seam','wheels',[x+s*.025,rad,z],.062,.0013,rubber,'x');
  for(let j=0;j<5;j++){const a=j*Math.PI*2/5;cyl(pre+'-lug-'+j,'Recessed wheel fastener','wheels',[x+s*.022,rad+Math.cos(a)*.051,z+Math.sin(a)*.051],.009,.010,chrome,'x',6);}
  ring(pre+'-badge','Wheel centre emblem','wheels',[x+s*.026,rad,z],.022,.0019,chrome,'x');
 }
 // 1998 RHD VVT-i bay: the reference shows the coolant tank on vehicle-right,
 // fuse box behind the vehicle-left battery, and a full-width moulded air guide.
 // Hidden engine hardware is an illustrative study, not measured service geometry.
 remove(o=>/^(engine-cover|intake-plenum|plenum-rib-|throttle-body|intake-duct|intake-bellows-|air-cleaner|oil-cap|washer-neck|washer-cap|coolant-reservoir|coolant-cap|fuse-box|upper-hose)/.test(o.name));
 const alloy=mat('VVT-i cast aluminium','#9ba099',.56,.49),reservoir=mat('coolant reservoir polymer','#999982',0,.64);
 box('intake-plenum','VVT-i intake manifold','intake',[0,.844,1.25],[.255,.118,.52],alloy,.029);
 for(let i=0;i<7;i++)box('plenum-rib-'+i,'Cast transverse intake rib','intake',[0,.907,1.035+i*.065],[.228,.011,.030],alloy,.006);
 box('throttle-body','Front-entry VVT-i throttle body','intake',[0,.807,1.60],[.16,.139,.16],alloy,.019);
 tube('intake-duct','Curved front intake duct','intake',[[0,.806,1.71],[-.11,.81,1.81],[-.29,.79,1.82],[-.45,.747,1.93]],.063,black);
 for(let i=0;i<10;i++)ring('intake-bellows-'+i,'Intake flexible bellows','intake',[-.28-i*.014,.79-i*.003,1.824+i*.008],.064,.003,black,'x');
 box('air-cleaner','Air-cleaner lower housing','intake',[-.50,.636,2.01],[.40,.23,.31],black,.045);
 box('air-cleaner-lid','Air-cleaner upper shell','intake',[-.50,.756,2.01],[.416,.045,.326],black,.04);
 box('air-flow-meter','Air flow meter housing','intake',[-.455,.742,1.91],[.12,.12,.13],black,.018);
 for(const s of [-1,1])box('air-cleaner-clip-'+s,'Air-cleaner retaining clip','intake',[-.50+s*.205,.725,2.01],[.013,.051,.026],alloy,.003);
 // Perforated decorative cover: the central aperture reveals the actual ribbed plenum.
 const coverShape=roundedPath([[-.32,.94],[.31,.94],[.40,1.65],[.31,1.76],[-.35,1.76],[-.395,1.60]],.14);
 const opening=new T.Path();opening.moveTo(-.105,1.04);opening.lineTo(-.105,1.40);opening.lineTo(.105,1.40);opening.lineTo(.105,1.04);opening.closePath();coverShape.holes.push(opening);
 const coverY=(x,z)=>.925-.067*(Math.abs(x)/.4)**2-.032*((z-1.22)/.55)**2;
 const coverGeo=new T.ShapeGeometry(coverShape,24),cp=coverGeo.attributes.position;
 for(let i=0;i<cp.count;i++){const x=cp.getX(i),z=cp.getY(i);cp.setXYZ(i,x,coverY(x,z),z);}coverGeo.computeVertexNormals();
 add('engine-cover','Removable VVT-i engine cover','engine',coverGeo,black);
 for(const s of [-1,1])tube('engine-cover-edge-'+s,'Engine cover moulded crease','engine',Array.from({length:24},(_,i)=>{const z=mix(1.00,1.70,i/23),x=s*.125;return[x,coverY(x,z)+.002,z];}),.004,black);
 ring('engine-cover-emblem','Engine cover Lexus oval','engine',[0,coverY(0,1.57)+.004,1.57],.034,.0028,chrome,'y').scale.x=1.4;
 tube('engine-cover-letter','Engine cover emblem stroke','engine',[[.005,.918,1.539],[-.017,.918,1.59],[.025,.918,1.59]],.0025,chrome);
 for(const [i,[x,z]] of [[-.27,1.12],[.27,1.12],[-.28,1.47],[.29,1.47]].entries()){
  cyl('engine-cover-mount-'+i,'Engine cover mounting recess','engine',[x,coverY(x,z)+.001,z],.014,.003,rubber,'y',20);
 }
 // Coolant tank and power-steering reservoir are separate from the air-cleaner.
 box('coolant-reservoir','Vehicle-right coolant expansion tank','cooling',[-.60,.686,1.66],[.245,.16,.28],reservoir,.035);
 box('coolant-lid','Coolant tank dark upper shell','cooling',[-.60,.775,1.66],[.255,.035,.289],black,.031);
 cyl('coolant-cap','Coolant filler cap','cooling',[-.55,.808,1.63],.033,.027,black);
 tube('coolant-return-hose','Coolant return hose (route estimated)','cooling',[[-.66,.786,1.72],[-.67,.75,1.85],[-.41,.746,1.94]],.009,rubber);
 cyl('power-steering-reservoir','Power-steering fluid reservoir','engine',[-.375,.746,1.62],.046,.115,alloy);
 cyl('power-steering-cap','Power-steering reservoir cap','engine',[-.375,.811,1.62],.047,.02,black);
 box('fuse-box','Fuse and relay box behind battery','electrical',[.57,.728,1.57],[.30,.18,.30],black,.034);
 box('fuse-box-lid','Fuse and relay box lid','electrical',[.57,.826,1.57],[.312,.025,.315],black,.022);
 box('fuse-box-label','Fuse-box diagram label','electrical',[.515,.841,1.58],[.084,.002,.123],white,.003);
 cyl('oil-cap','VVT-i oil filler cap','engine',[.315,.823,1.15],.035,.024,black);
 tube('washer-neck','Washer filler beside battery','electrical',[[.746,.46,2.04],[.746,.755,2.04]],.024,reservoir);
 cyl('washer-cap','Washer filler cap','electrical',[.746,.766,2.04],.033,.016,black);
 tube('upper-hose','Upper radiator hose (route estimated)','cooling',[[.27,.775,2.07],[.24,.743,1.94],[.16,.690,1.75]],.022,rubber);
 // The broad inlet shroud has a scalloped rear edge leaving the battery exposed.
 const guideShape=roundedPath([[-.73,1.87],[.27,1.87],[.39,2.04],[.72,2.08],[.75,2.27],[-.73,2.27]],.16),guideGeo=new T.ShapeGeometry(guideShape,20),gp=guideGeo.attributes.position;
 for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getY(i);gp.setXYZ(i,x,.815+.040*Math.sin((z-1.87)/.4*Math.PI)-.045*(Math.abs(x)/.75)**4,z);}guideGeo.computeVertexNormals();
 add('bay-front-shroud','Removable radiator inlet shroud','structure',guideGeo,black);
 box('air-guide-latch-recess','Bonnet latch opening','structure',[0,.819,2.25],[.27,.012,.065],rubber,.02);
 for(let i=0;i<6;i++)cyl('air-guide-fastener-'+i,'Upper support fastener','structure',[-.67+i*.267,.794,2.29],.01,.004,black);
 for(const s of [-1,1]){
  const cover=root.getObjectByName('cam-cover-'+s);cover.material=alloy;
  // Stamped inner-wing shoulder follows the suspension tower instead of a bare box.
  add('inner-wing-shoulder-'+s,'Stamped inner wing shoulder','structure',surface((u,v)=>{const z=mix(1.07,2.13,u),x=s*mix(.54,.76,v),tower=Math.exp(-(((z-fw)/.20)**2));return[x,.725+.065*Math.sin(v*Math.PI)+.052*tower,z];},44,18),paint);
  for(let j=0;j<4;j++)tube('coil-harness-'+s+'-'+j,'Ignition coil harness (route estimated)','electrical',[[s*.29,.82,1.00+j*.155],[s*.365,.807,1.015+j*.155],[s*.38,.80,1.12+j*.155]],.006,black);
  tube('bay-harness-'+s,'Engine harness (route estimated)','electrical',[[s*.39,.80,1.0],[s*.42,.77,1.30],[s*.45,.70,1.54]],.012,black);
  box('timing-vvti-bulge-'+s,'VVT-i timing cover upper housing','engine',[s*.235,.757,1.591],[.24,.10,.095],black,.038);
  tube('hood-strut-'+s,'Bonnet gas strut (closed position study)','body',[[s*.735,.795,1.08],[s*.733,.85,1.65]],.008,alloy);
 }
 for(let i=0;i<21;i++)box('cowl-vent-'+i,'Scuttle ventilation slot','body',[-.69+i*.066,.993,1.048],[.030,.003,.052],rubber,.005);
 for(const o of root.children)if(o.isMesh&&o.userData.system==='structure'&&/fender|tower$|tower-[-1]|firewall|support|rail/.test(o.name))o.material=paint;
 root.userData.refinement='UCF20 reference pass 2: 1998 UK facelift exterior and RHD VVT-i bay photographs';
}
