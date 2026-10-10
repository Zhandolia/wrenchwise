/** 1990 UK UCF10 refinement from dated Lexus G227 XPK photographs and the
 * Anglia 1990 RHD engine-bay photograph. Metres; local shapes remain estimates.
 * Geometry is authored here, never traced textures or third-party meshes. */
import * as T from 'three';
const mix=T.MathUtils.lerp;
const clamp=T.MathUtils.clamp;
export function refineUcf10({root,c,parts,add,box,tube,cyl,ring,mat,surface,front,rear,fw,rw,rad,wr}){
 const remove=predicate=>{for(const o of [...root.children])if(predicate(o)){root.remove(o);const i=parts.findIndex(p=>p.id===o.name);if(i>=0)parts.splice(i,1);}};
 remove(o=>o.userData.system==='body'||o.name.startsWith('tailpipe')||/wheel-.*-(disc-face|vent-|dish|hub|lug-)/.test(o.name));
 const paint=mat('1990 dark jade pearl','#12372f',.52,.28,{clearcoat:1,clearcoatRoughness:.15});
 const lower=mat('1990 grey jade lower cladding','#455455',.48,.32,{clearcoat:.85});
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
 const stations=[[rear,.79,.95],[rear+.18,.866,.975],[rear+.60,.904,.979],[rw,.908,.967],[-.3,.91,.951],[.65,.91,.946],[fw,.9,.914],[front-.30,.859,.855],[front,.79,.843]];
 const sample=(z,col)=>{let i=1;while(i<stations.length-1&&z>stations[i][0])i++;const a=stations[i-1],b=stations[i],prev=stations[Math.max(0,i-2)],next=stations[Math.min(stations.length-1,i+1)],span=b[0]-a[0],t=clamp((z-a[0])/span,0,1),m0=(b[col]-prev[col])/(b[0]-prev[0]),m1=(next[col]-a[col])/(next[0]-a[0]);return (2*t**3-3*t*t+1)*a[col]+(t**3-2*t*t+t)*span*m0+(-2*t**3+3*t*t)*b[col]+(t**3-t*t)*span*m1;};
 const belt=z=>sample(z,2),width=z=>Math.min(.91,sample(z,1));
 const arch=z=>Math.max(.255,...[fw,rw].map(w=>Math.abs(z-w)<wr?rad+Math.sqrt(wr*wr-(z-w)**2):.255));
 const side=(z,y)=>width(z)-.028*Math.pow(clamp((y-.59)/.38,-1,1),4)-.020*Math.exp(-(((y-.28)/.075)**2));
 for(const s of [-1,1]){
  add('body-side-'+s,'Rounded wing and door skin','body',surface((u,v)=>{const z=mix(rear+.23,front-.27,u),y=mix(arch(z),belt(z),v);return[s*side(z,y),y,z];},320,32),paint);
  add('lower-cladding-'+s,'Two-tone lower door cladding','body',surface((u,v)=>{const z=mix(rear+.23,front-.27,u),lo=arch(z),hi=.592,y=lo>=hi?lo:mix(lo,hi,v);return[s*(side(z,y)+.003),y,z];},320,14),lower);
  for(const [i,wz] of [fw,rw].entries()){
   tube(`arch-lip-${s}-${i}`,'Soft rolled wheel arch','body',Array.from({length:72},(_,k)=>{const a=mix(-.10,Math.PI+.10,k/71),z=wz+wr*Math.cos(a),y=rad+wr*Math.sin(a);return[s*(side(z,y)+.003),y,z];}),.0055,paint);
  }
  const trimPoints=(y,z0,z1)=>Array.from({length:55},(_,i)=>{const z=mix(z0,z1,i/54);return[s*(side(z,y)+.006),y,z];});
  tube('side-moulding-'+s,'Slim lower-body chrome moulding','body',trimPoints(.594,rw+wr+.015,fw-wr-.01),.004,chrome);
  tube('front-side-moulding-'+s,'Front wing chrome moulding','body',trimPoints(.594,fw+wr+.015,front-.18),.004,chrome);
  tube('rear-side-moulding-'+s,'Rear quarter chrome moulding','body',trimPoints(.594,rear+.18,rw-wr-.015),.004,chrome);
 }
 const hoodZ0=1.015,hoodZ1=front-.105;
 const hoodW=z=>mix(.72,.69,(z-hoodZ0)/(hoodZ1-hoodZ0));
 const hoodY=(z,x)=>mix(.976,.862,(z-hoodZ0)/(hoodZ1-hoodZ0))+.022*(1-(x/.78)**2);
 add('hood','Crowned bonnet panel','body',surface((u,v)=>{const z=mix(hoodZ0,hoodZ1,u),x=(2*v-1)*hoodW(z);return[x,hoodY(z,x),z];},64,48),paint);
 for(const s of [-1,1]){
  add('fender-top-'+s,'Rounded front wing shoulder','body',surface((u,v)=>{const z=mix(hoodZ0,front-.105-.165*v,u),x=s*mix(hoodW(z)+.004,side(z,belt(z)),v),y=mix(hoodY(z,x)-.004,belt(z),v)+.012*Math.sin(v*Math.PI);return[x,y,z];},64,24),paint);
  tube('hood-gap-'+s,'Bonnet shut line','body',Array.from({length:40},(_,i)=>{const z=mix(hoodZ0,hoodZ1,i/39),x=s*(hoodW(z)+.002);return[x,hoodY(z,x)-.003,z];}),.0016,rubber);
 }
 add('nose-top','Bonnet nose curvature','body',surface((u,v)=>{const x=(2*v-1)*mix(.69,.79,u),z=mix(hoodZ1,front-.058,u)-.10*Math.pow(Math.abs(x)/.79,6)*u;return[x,.862+.017*(1-(x/.8)**2)-.02*u,z];},20,48),paint);
 const cabinFront=1.015,cabinRear=-1.55,roofFront=.30,roofRear=-.91;
 const roofWidth=z=>.70-.024*Math.pow((z+.305)/.605,2);
 const roofY=(z,x)=>c.height-.022*Math.pow((z+.305)/.605,2)-.048*Math.pow(Math.abs(x)/roofWidth(z),4);
 add('roof','Doubly curved roof','body',surface((u,v)=>{const z=mix(roofRear,roofFront,u),x=(2*v-1)*roofWidth(z);return[x,roofY(z,x),z];},64,56),paint);
 const cabinX=(z,y)=>mix(.833,.685,clamp((y-.955)/.435,0,1))+.006*Math.sin((z+1.55)/2.565*Math.PI);
 // Quadratic corners give the early LS its soft window outline and wide C-pillar.
 const roundedPath=(points,r=.12)=>{const shape=new T.Shape();for(let i=0;i<points.length;i++){const a=points[(i+points.length-1)%points.length],b=points[i],d=points[(i+1)%points.length];const p=[mix(b[0],a[0],r),mix(b[1],a[1],r)],q=[mix(b[0],d[0],r),mix(b[1],d[1],r)];if(!i)shape.moveTo(...p);else shape.lineTo(...p);shape.quadraticCurveTo(...b,...q);}shape.closePath();return shape;};
 const sidePanel=(id,name,s,points,material,offset=0,r=.13)=>{
  const shape=roundedPath(points,r),g=new T.ShapeGeometry(shape,24),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const z=p.getX(i),y=p.getY(i);p.setXYZ(i,s*(cabinX(z,y)+offset),y,z);}g.computeVertexNormals();add(id,name,'body',g,material);
  return shape.getPoints(14).map(p=>[s*(cabinX(p.x,p.y)+offset+.001),p.y,p.x]);
 };
 for(const s of [-1,1]){
  add('door-shoulder-'+s,'Upper door shoulder','body',surface((u,v)=>{const z=mix(-1.55,1.015,u),y=mix(belt(z),.959,v),x=s*mix(side(z,belt(z)),cabinX(z,.959),v);return[x,y,z];},64,12),paint);
  sidePanel('cabin-side-'+s,'Roof rail and C-pillar skin',s,[[1.05,.936],[.35,1.369],[-.94,1.369],[-1.60,.958]],paint,0,.18);
  const frontWindow=[[.915,.965],[.273,1.344],[-.315,1.367],[-.17,.965]];
  const rearWindow=[[-.235,.965],[-.38,1.364],[-.846,1.346],[-1.22,1.05],[-1.17,.977]];
  for(const [id,points] of [['front',frontWindow],['rear',rearWindow]]){
   const pts=sidePanel(id+'-door-glass-'+s,'Curved '+id+' side window',s,points,glass,.008,.19);
   tube(id+'-window-seal-'+s,'Window rubber channel','body',pts,.010,rubber,true);
   tube(id+'-window-chrome-'+s,'Fine window chrome surround','body',pts.map(([x,y,z])=>[x+s*.004,y,z]),.0035,chrome,true);
  }
  // Flush black B-pillar slopes rearward toward the roof.
  sidePanel('b-pillar-'+s,'Sloping B-pillar trim',s,[[-.173,.96],[-.316,1.376],[-.39,1.374],[-.244,.96]],black,.016,.025);
  tube('window-sill-'+s,'Window sill weatherstrip','body',Array.from({length:36},(_,i)=>{const z=mix(-1.30,.94,i/35);return[s*(cabinX(z,.954)+.005),.952,z];}),.005,chrome);
  const seamSets=[[[1.04,.945],[1.025,.72],[1.05,.47],[.99,.285]],[[-.2,.95],[-.21,.71],[-.22,.42],[-.29,.285]],[[-1.31,.957],[-1.39,.83],[-1.08,.58],[-.93,.29]]];
  seamSets.forEach((pts,i)=>tube(`door-seam-${s}-${i}`,'Door shut line','body',pts.map(([z,y])=>[s*(side(z,y)+.003),y,z]),.0016,rubber));
  for(const [i,z] of [.015,-1.05].entries()){
   box(`handle-recess-${s}-${i}`,'Flush door handle pocket','body',[s*(side(z,.851)+.004),.851,z],[.013,.052,.144],rubber,.016);
   box(`handle-${s}-${i}`,'Body-colour door handle','body',[s*(side(z,.859)+.012),.860,z],[.014,.032,.124],paint,.010);
   tube(`handle-edge-${s}-${i}`,'Door handle bright edge','body',[[s*(side(z,.85)+.02),.849,z-.05],[s*(side(z,.85)+.02),.849,z+.05]],.0023,chrome);
  }
  box('mirror-foot-'+s,'Triangular mirror sail','body',[s*.833,1.017,.843],[.045,.104,.14],black,.025,[0,0,s*.2]);
  box('mirror-'+s,'Rounded door mirror housing','body',[s*.941,1.025,.84],[.224,.114,.226],paint,.05);
  box('mirror-glass-'+s,'Mirror glass','body',[s*.951,1.027,.733],[.182,.078,.006],chrome,.027);
  box('wing-repeater-'+s,'UK amber wing repeater','body',[s*(side(1.08,.69)+.009),.69,1.08],[.011,.035,.060],amber,.006);
 }
 // Curved windscreens meet the crown smoothly instead of forming a flat trapezoid.
 for(const [id,baseZ,topZ,baseY] of [['windshield',cabinFront,roofFront,.963],['rear-glass',cabinRear,roofRear,.993]]){
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
  const sg=Math.sign(end),y0=name==='front'?.255:.38,y1=name==='front'?.643:.65;
  add(name+'-bumper','Wraparound '+name+' bumper','body',surface((u,v)=>{const y=mix(y0,y1,v),x=mix(-.89,.89,u)*(1-.022*Math.pow(2*v-1,4));return[x,y,wrap(x,end)-sg*(.022*Math.pow(2*v-1,6))];},96,28),lower);
  add(name+'-upper-fascia','Curved '+name+' fascia','body',surface((u,v)=>{const y=mix(y1,name==='front'?.654:.977,v),x=mix(-.875,.875,u);return[x,y,wrap(x,end)-sg*(name==='front'?.048:.052)];},80,24),paint);
  tube(name+'-bumper-bead','Bumper upper black bead','body',Array.from({length:96},(_,i)=>{const x=mix(-.895,.895,i/95);return[x,y1-.004,wrap(x,end)-sg*.002];}),.006,rubber);
  tube(name+'-bumper-chrome','Bumper chrome strip','body',Array.from({length:96},(_,i)=>{const x=mix(-.89,.89,i/95);return[x,y1-.015,wrap(x,end)+sg*.003];}),.0035,chrome);
 }
 // Real grille is an open dark aperture: no opaque chrome plate behind its bars.
 const grilleZ=front-.027,grilleY=.746,grilleW=.686,grilleH=.215;
 const grilleShape=roundedPath([[-grilleW/2,.11],[grilleW/2,.11],[grilleW*.46,-.102],[-grilleW*.46,-.102]],.10);
 add('front-grille','Recessed grille aperture','body',new T.ShapeGeometry(grilleShape,20),black,[0,grilleY,grilleZ]);
 const outline=grilleShape.getPoints(12).map(p=>[p.x,p.y+grilleY,grilleZ+.008]);tube('front-grille-frame','Thin chrome grille frame','body',outline,.0055,chrome,true);
 for(let i=0;i<8;i++){const y=grilleY-.088+i*.025;box('grille-slat-'+i,'Fine horizontal grille bar','body',[0,y,grilleZ+.009],[mix(.62,.67,i/7),.0035,.008],chrome,.0015);}
 for(let i=0;i<27;i++)box('grille-upright-'+i,'Grille vertical lattice','body',[-.308+i*.0237,grilleY,grilleZ+.003],[.002,.184,.007],chrome,.001);
 ring('grille-emblem-ring','Lexus oval emblem','body',[0,.75,grilleZ+.023],.027,.0035,chrome).scale.x=1.33;
 tube('grille-emblem','Lexus grille emblem stroke','body',[[.004,.772,grilleZ+.028],[-.012,.733,grilleZ+.028],[.021,.733,grilleZ+.028]],.003,chrome);
 const lampZ=x=>front-.048-.20*Math.pow(Math.abs(x)/.86,7);
 for(const s of [-1,1]){
  const lampPoint=(u,v,offset=0)=>{const x=s*mix(.362,.852,u),y=mix(.652,.850,v)+.013*u-.016*u*v;return[x,y,lampZ(x)+offset];};
  add('headlamp-housing-'+s,'Three-section headlamp reflector','body',surface((u,v)=>lampPoint(u,v),48,24),reflector);
  add('headlamp-'+s,'Wraparound ribbed headlamp glazing','body',surface((u,v)=>lampPoint(u,v,.014),48,24),lens);
  const perimeter=[];for(let i=0;i<=32;i++)perimeter.push(lampPoint(i/32,0,.016));for(let i=1;i<=16;i++)perimeter.push(lampPoint(1,i/16,.016));for(let i=1;i<=32;i++)perimeter.push(lampPoint(1-i/32,1,.016));for(let i=1;i<=16;i++)perimeter.push(lampPoint(0,1-i/16,.016));tube('headlamp-seal-'+s,'Headlamp perimeter seal','body',perimeter,.0045,rubber,true);
  for(const u of [.24,.77])tube('headlamp-divider-'+s+'-'+u,'Headlamp chamber divider','body',Array.from({length:12},(_,i)=>lampPoint(u,i/11,.015)),.0035,chrome);
  for(let i=0;i<41;i++)tube('lens-flute-'+s+'-'+i,'Fine optical lens rib','body',Array.from({length:5},(_,j)=>lampPoint(.015+i*.024,j/4,.019)),.0009,white);
  for(const [k,u] of [.12,.5,.88].entries())add('reflector-chamber-'+s+'-'+k,'Rectangular lamp optic','body',surface((a,b)=>lampPoint(u+(a-.5)*(k===1?.44:.19),.07+b*.86,.007),16,12),white);
  box('front-marker-'+s,'Amber bumper indicator','body',[s*.592,.525,wrap(s*.592,front)+.004],[.40,.056,.018],amber,.012,[0,s*.08,0]);
  box('fog-recess-'+s,'Lower bumper lamp recess','body',[s*.59,.374,wrap(s*.59,front)+.002],[.31,.095,.013],black,.014);
  box('fog-lamp-'+s,'Rectangular fog lamp','body',[s*.54,.374,wrap(s*.54,front)+.012],[.155,.073,.01],white,.008);
  for(let i=0;i<9;i++)box(`fog-rib-${s}-${i}`,'Fog lamp optical rib','body',[s*.54-.067+i*.016,.374,wrap(s*.54,front)+.019],[.0015,.068,.002],reflector,.0005);
  // Tail lamps turn around the rear corners. Outer signal band and inner reverse lens.
  const tailPoint=(u,v)=>{const x=s*mix(.255,.879,u),y=mix(.663,.906,v);return[x,y,wrap(x,rear)+.025];};
  add('tail-lamp-'+s,'Wraparound rear combination lamp','body',surface(tailPoint,48,24),red);
  add('tail-indicator-'+s,'Amber rear signal band','body',surface((u,v)=>{const p=tailPoint(.44+.56*u,.53+.19*v);p[2]-=.004;return p;},24,5),amber);
  add('tail-reverse-'+s,'Inner reverse lamp','body',surface((u,v)=>{const p=tailPoint(.035+.18*u,.32+.30*v);p[2]-=.005;return p;},12,6),white);
  for(let j=0;j<8;j++)tube('tail-rib-'+s+'-'+j,'Tail lens moulded rib','body',Array.from({length:30},(_,i)=>{const p=tailPoint(i/29,.04+j*.127);p[2]-=.007;return p;}),.0012,red);
  tube('tail-divider-'+s,'Tail lamp boot seam','body',Array.from({length:12},(_,i)=>{const p=tailPoint(.28,i/11);p[2]-=.007;return p;}),.003,rubber);
  tube('tailpipe-'+s,'Polished exhaust outlet','exhaust',[[s*.61,.244,rear+.28],[s*.61,.244,rear+.035]],.030,chrome);
 }
 box('front-plate-recess','Front plate mounting pad','body',[0,.501,front-.002],[.49,.129,.012],black,.009);
 box('front-plate','Neutral front registration plate','body',[0,.506,front+.005],[.452,.103,.007],white,.003);
 box('rear-plate-recess','Rear plate recess','body',[0,.768,rear+.026],[.486,.215,.015],black,.016);
 box('rear-plate','Neutral rear registration plate','body',[0,.77,rear+.014],[.425,.13,.006],mat('UK rear plate','#c7a635',.05,.5),.003);
 ring('boot-emblem','Boot Lexus emblem','body',[0,.938,rear+.025],.021,.003,chrome);
 box('front-lower-intake','Lower radiator grille opening','body',[0,.357,front+.004],[.83,.083,.013],black,.011);
 for(let i=0;i<2;i++)box('lower-intake-bar-'+i,'Lower bumper horizontal bar','body',[0,.340+i*.027,front+.014],[.82,.008,.01],lower,.003);
 tube('bumper-lower-lip','Front lower lip','body',Array.from({length:60},(_,i)=>{const x=mix(-.8,.8,i/59);return[x,.286,wrap(x,front)+.007];}),.009,lower);
 // A slim cowl, wipers and subtly inset sunroof replace the slab-like roof details.
 box('cowl','Windscreen scuttle panel','body',[0,.964,1.002],[1.55,.024,.10],black,.018);
 for(const s of [-1,1])tube('wiper-'+s,'Windscreen wiper','body',[[s*.24,.986,.976],[s*.45,1.007,.91],[s*.72,1.011,.895]],.004,black);
 const sunroof=roundedPath([[-.38,-.53],[.38,-.53],[.38,.08],[-.38,.08]],.16),sg=new T.ShapeGeometry(sunroof,24),sp=sg.attributes.position;
 for(let i=0;i<sp.count;i++){const x=sp.getX(i),z=sp.getY(i);sp.setXYZ(i,x,roofY(z,x)+.002,z);}sg.computeVertexNormals();add('sunroof','Flush sunroof glass','body',sg,glass);
 tube('sunroof-seal','Sunroof perimeter seal','body',sunroof.getPoints(20).map(p=>[p.x,roofY(p.y,p.x)+.002,p.y]),.002,rubber,true);
 // Factory 15-hole wheel faces with actual openings, recessed dishes and centre badges.
 for(const [axle,z] of [fw,rw].entries())for(const s of [-1,1]){
  const barrel=root.getObjectByName(`wheel-${axle}-${s}-barrel`);barrel.geometry=new T.CylinderGeometry(.1905,.1905,.16,64,1,true);
  root.getObjectByName(`wheel-${axle}-${s}-disc`).material=mat('brake rotor in wheel shadow','#343c38',.40,.68);
  const x=s*(c.track[axle]/2+c.tyre[0]/2-.008),rim=.1905,pre=`wheel-${axle}-${s}`,shape=new T.Shape();shape.absarc(0,0,rim-.015,0,Math.PI*2,false);
  for(let j=0;j<15;j++){const a=j*Math.PI*2/15,hole=new T.Path();hole.absellipse(Math.cos(a)*.148,Math.sin(a)*.148,.021,.012,0,Math.PI*2,true,a);shape.holes.push(hole);}
  const g=new T.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:3,curveSegments:12}),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getX(i),zz=p.getY(i),d=p.getZ(i),rr=Math.hypot(y,zz);p.setXYZ(i,s*(d+.014*(1-(rr/.185)**2)),y,zz);}g.computeVertexNormals();add(pre+'-disc-face','Fifteen-opening factory alloy wheel','wheels',g,silver,[x,rad,z]);
  cyl(pre+'-hub','Recessed alloy centre cap','wheels',[x+s*.020,rad,z],.083,.008,silver,'x',48);
  ring(pre+'-cap-edge','Wheel centre cap seam','wheels',[x+s*.025,rad,z],.081,.0013,rubber,'x');
  ring(pre+'-badge','Wheel centre emblem','wheels',[x+s*.026,rad,z],.022,.0019,chrome,'x');
 }
 // Early UK 1UZ details: side-entry throttle, long ribbed plenum, front oil cap,
 // positive-X washer filler, coolant reservoir behind battery and forward fuse box.
 remove(o=>/^(intake-plenum|plenum-rib-|throttle-body|intake-duct|intake-bellows-|oil-cap|washer-neck|washer-cap|coolant-reservoir|coolant-cap|fuse-box|radiator-air-guide)/.test(o.name));
 const alloy=mat('aged cast aluminium','#92968d',.6,.49),reservoir=mat('translucent cream reservoir','#b3b19a',0,.60);
 box('intake-plenum','Ribbed 1UZ intake plenum','intake',[0,.872,1.24],[.205,.096,.48],alloy,.028);
 for(let i=0;i<8;i++)box('plenum-rib-'+i,'Longitudinal intake casting rib','intake',[-.087+i*.025,.923,1.24],[.007,.008,.43],alloy,.002);
 box('plenum-badge-pad','Intake emblem pad','intake',[0,.929,1.35],[.16,.009,.115],alloy,.017);
 ring('plenum-emblem','Intake Lexus emblem','intake',[0,.936,1.35],.027,.0025,chrome,'y');
 box('throttle-body','Side-entry throttle body','intake',[-.18,.842,1.29],[.16,.125,.135],alloy,.018);
 tube('intake-duct','Side-entry curved intake duct','intake',[[-.25,.842,1.29],[-.37,.817,1.34],[-.40,.771,1.54],[-.52,.742,1.75]],.057,black);
 for(let i=0;i<9;i++){const p=[-.475-i*.006,.753-i*.0015,1.657+i*.014];const m=ring('intake-bellows-'+i,'Intake rubber bellows','intake',p,.060,.003,black);m.rotation.y=-.39;}
 box('air-flow-meter','Air flow meter housing','intake',[-.55,.73,1.83],[.15,.10,.13],alloy,.012,[0,-.2,0]);
 box('throttle-resonator','Intake resonator chamber','intake',[-.16,.877,1.065],[.33,.087,.13],black,.012);
 tube('idle-hose','Idle-air hose (route estimated)','intake',[[-.17,.84,1.35],[-.25,.80,1.48],[-.03,.81,1.49]],.014,black);
 cyl('oil-cap','Front oil filler cap','engine',[-.28,.825,1.52],.039,.026,black);
 box('coolant-reservoir','Coolant expansion tank','cooling',[.55,.675,1.49],[.19,.17,.24],reservoir,.033);
 box('coolant-lid','Coolant tank moulded upper shell','cooling',[.55,.766,1.49],[.198,.035,.244],black,.028);
 cyl('coolant-cap','Coolant filler cap','cooling',[.55,.800,1.44],.035,.02,black);
 box('fuse-box','Engine-bay fuse and relay box','electrical',[.57,.717,1.73],[.245,.135,.16],black,.028);
 tube('washer-neck','Washer filler beside the battery','electrical',[[.72,.44,2.01],[.72,.73,2.01]],.025,reservoir);
 cyl('washer-cap','Washer filler cap','electrical',[.72,.743,2.01],.035,.015,black);
 const guideShape=roundedPath([[-.7,1.92],[.32,1.92],[.38,2.15],[.67,2.18],[.67,2.225],[-.7,2.225]],.10),guideGeo=new T.ShapeGeometry(guideShape,20),guidePos=guideGeo.attributes.position;
 for(let i=0;i<guidePos.count;i++){const x=guidePos.getX(i),z=guidePos.getY(i);guidePos.setXYZ(i,x,.825+.018*Math.sin((z-1.92)/.305*Math.PI),z);}guideGeo.computeVertexNormals();add('radiator-air-guide','Moulded air guide with battery clearance','cooling',guideGeo,black);
 box('air-guide-centre','Radiator air guide raised centre','cooling',[-.10,.843,2.075],[.82,.018,.259],black,.025);
 for(let i=0;i<4;i++)cyl('air-guide-fastener-'+i,'Air guide retaining fastener','cooling',[-.62+i*.41,.839,2.18],.009,.003,black);
 for(const s of [-1,1]){
  const cover=root.getObjectByName('cam-cover-'+s);cover.material=alloy;
  const insert=root.getObjectByName('cam-cover-insert-'+s);insert.position.y=.815;insert.scale.x=1.35;
  for(const offset of [-.077,.077])box(`cam-casting-rib-${s}-${offset}`,'Cam-cover edge casting rib','engine',[s*.28+offset,.801,1.24],[.007,.008,.54],alloy,.002);
  remove(o=>o.name==='timing-bank-cover-'+s);
  box('timing-bank-cover-'+s,'Rounded upper timing-belt cover','engine',[s*.22,.653,1.598],[.25,.245,.088],black,.078);
 }
 for(let i=0;i<21;i++)box('cowl-vent-'+i,'Scuttle ventilation slot','body',[-.69+i*.066,.980,1.00],[.030,.003,.052],rubber,.005);
 // Additional visible harness branches follow only photographed regions.
 for(const s of [-1,1])tube('bay-harness-'+s,'Engine harness (route estimated)','electrical',[[s*.36,.81,1.03],[s*.40,.79,1.25],[s*.39,.75,1.54],[s*.54,.68,1.71]],.011,black);
 // Harmonise exposed structural paint with the body; preserve all existing part IDs.
 for(const o of root.children)if(o.isMesh&&o.userData.system==='structure'&&/fender|tower$|tower-[-1]|firewall|support|rail/.test(o.name))o.material=paint;
 root.userData.refinement='UCF10 reference pass 2: dated 1990 UK body and RHD bay photographs';
}
