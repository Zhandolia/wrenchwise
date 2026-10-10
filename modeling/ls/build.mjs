/** Original LS surface/anatomy studies. No downloaded vehicle mesh or photo texture is used.
 * Rebuild: node modeling/ls/build.mjs [generation-id]
 * Coordinates: metres, +Y up, +Z forward, +X vehicle left. See config.mjs for evidence.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {configurations,sources} from './config.mjs';
import {refineUcf10} from './ucf10-refinement.mjs';
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}};
const lerp=T.MathUtils.lerp, vec=a=>new T.Vector3(...a);
const out='public/models/ls';fs.mkdirSync(out,{recursive:true});
function surface(fn,nu=32,nv=16){
 const p=[],uv=[],idx=[];
 for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){p.push(...fn(i/nu,j/nv));uv.push(i/nu,j/nv);}
 for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=i*(nv+1)+j,b=a+nv+1;idx.push(a,b,a+1,b,b+1,a+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function interpolate(stations,z,col){for(let i=1;i<stations.length;i++)if(z<=stations[i][0]){const a=stations[i-1],b=stations[i];let t=(z-a[0])/(b[0]-a[0]);t=Math.max(0,Math.min(1,t));t=t*t*(3-2*t);return lerp(a[col],b[col],t);}return stations.at(-1)[col];}
export function buildCar(c){
 const root=new T.Group();root.name=c.id;root.userData={originalAuthor:'Wrenchwise',license:'MIT',accuracy:'provisional',coordinateSystem:'metres, Y up, Z forward, X vehicle left',engine:c.engine};
 const parts=[];let tri=0;
 const mat=(name,color,metalness=0,roughness=.5,extra={})=>{const m=new T.MeshPhysicalMaterial({color,metalness,roughness,side:T.DoubleSide,...extra});m.name=name;return m;};
 const paint=mat('pearlescent body paint',c.paint,.25,.37,{clearcoat:1,clearcoatRoughness:.16});
 const lower=mat('lower body finish',c.cladding,.30,.38,{clearcoat:.7});
 const chrome=mat('satin polished metal','#c5cdd0',.92,.21),dark=mat('rubber and seals','#111819',.05,.83);
 const glass=mat('smoked reflective glazing','#0b1b20',0,.30,{clearcoat:.65,clearcoatRoughness:.16,envMapIntensity:.35});
 const black=mat('moulded engine plastics','#262c2b',.08,.65),alloy=mat('cast aluminium','#a5ada9',.7,.48);
 const lampGlass=mat('clear lamp glazing','#cbdde0',0,.13,{transparent:true,opacity:.25,depthWrite:false,clearcoat:1});
 const bright=mat('lamp lens','#dce5d8',.25,.19,{clearcoat:1}),red=mat('red tail lens','#8f1317',.16,.25,{clearcoat:1});
 const amber=mat('amber marker lens','#c56a16',.15,.29),steel=mat('steel','#616d70',.78,.4),ivory=mat('reservoir plastic','#c7c7ac',0,.61);
 const rubber=mat('tyre rubber','#17191b',.03,.91),rubberRib=mat('tread ribs','#26292b',.05,.87),boltmat=mat('plated fasteners','#9facae',.8,.3);
 const add=(id,name,system,g,m,position=[0,0,0],rotation=[0,0,0])=>{const mesh=new T.Mesh(g,m);mesh.name=id;mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.userData={partId:id,system,accuracy:'estimated',displayName:name};root.add(mesh);parts.push({id,name,system,accuracy:'estimated'});tri+=(g.index?g.index.count:g.attributes.position.count)/3;return mesh;};
 const box=(id,name,system,p,size,m,r=.012,rotation=[0,0,0])=>add(id,name,system,new RoundedBoxGeometry(...size,3,Math.min(r,...size.map(x=>x/3))),m,p,rotation);
 const tube=(id,name,system,pts,r,m,closed=false)=>{let curve;if(closed){curve=new T.CurvePath();for(let i=0;i<pts.length;i++)curve.add(new T.LineCurve3(vec(pts[i]),vec(pts[(i+1)%pts.length])));}else curve=new T.CatmullRomCurve3(pts.map(vec),false,'centripetal');return add(id,name,system,new T.TubeGeometry(curve,c.gen===1?Math.min(144,Math.max(16,pts.length*4)):Math.max(16,pts.length*8),r,8,closed),m);};
 const cyl=(id,name,system,p,r,h,m,axis='y',segments=32)=>add(id,name,system,new T.CylinderGeometry(r,r,h,segments),m,p,axis==='x'?[0,0,Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:[0,0,0]);
 const ring=(id,name,system,p,r,t,m,axis='z')=>add(id,name,system,new T.TorusGeometry(r,t,8,64),m,p,axis==='x'?[0,Math.PI/2,0]:axis==='y'?[Math.PI/2,0,0]:[0,0,0]);
 const bolts=(prefix,system,pts)=>pts.forEach((p,i)=>cyl(prefix+'-'+i,'Fastener (illustrative)',system,p,.007,.006,boltmat,'y',6));
 const front=c.length/2,rear=-front,fw=front-c.frontOverhang,rw=fw-c.wheelbase;
 const rad=c.tyre[0]*c.tyre[1]+c.tyre[2]*.0254/2,wr=rad+.035;
 const stations=[[rear,.82,c.deck-.09],[rear+.14,.87,c.deck-.025],[rear+.55,c.width/2,c.deck],[rw,.905,c.belt],[0,c.width/2,c.belt],[fw,c.width/2,c.belt-.035],[front-.30,.86,c.hoodFront+.025],[front,.83,c.hoodFront-.035]];
 const width=z=>interpolate(stations,z,1),belt=z=>interpolate(stations,z,2);
 const arch=z=>Math.max(.23,...[fw,rw].map(w=>Math.abs(z-w)<wr?rad+Math.sqrt(wr*wr-(z-w)**2):.23));
 const sideX=(z,y)=>width(z)-.053*Math.pow((y-belt(z))/.75,2)+.031*Math.sin(Math.max(0,Math.min(1,(y-.23)/(belt(z)-.23)))*Math.PI)+.016*Math.exp(-Math.pow((y-(belt(z)-.13))/.05,2));
 // Side shells are open at the wheel arches and across the engine bay.
 for(const s of [-1,1]){
  add('body-side-'+s,'Sculpted side shell','body',surface((u,v)=>{const z=lerp(rear+.03,front-.03,u),y=lerp(arch(z),belt(z),v);return [s*sideX(z,y),y,z];},256,20),paint);
  add('lower-cladding-'+s,'Lower door and sill cladding','body',surface((u,v)=>{const z=lerp(rear+.04,front-.04,u),lo=arch(z),hi=.52;if(lo>hi)return [s*(sideX(z,lo)+.002),lo,z];const y=lerp(lo,hi,v);return [s*(sideX(z,y)+.006),y,z];},256,8),lower);
  for(const [wi,z] of [fw,rw].entries()){
   const pts=Array.from({length:45},(_,i)=>{const a=lerp(-.16,Math.PI+.16,i/44),zz=z+wr*Math.cos(a),y=rad+wr*Math.sin(a);return [s*(sideX(zz,y)+.006),y,zz];});
   tube(`arch-lip-${s}-${wi}`,'Rolled wheel-arch lip','body',pts,.009,paint);
   add(`wheel-liner-${s}-${wi}`,'Wheel-house liner','structure',surface((u,v)=>{const a=lerp(0,Math.PI,u);return [s*lerp(.61,.88,v),rad+Math.sin(a)*(wr-.006),z+Math.cos(a)*(wr-.006)];},48,6),black);
  }
  tube('belt-trim-'+s,'Beltline chrome trim','body',Array.from({length:40},(_,i)=>{const z=lerp(rear+.2,front-.27,i/39);return [s*(width(z)+.004),belt(z)-.045,z];}),.006,chrome);
  tube('side-moulding-'+s,'Side protective moulding','body',Array.from({length:40},(_,i)=>{const z=lerp(rw+wr+.035,fw-wr-.02,i/39);return [s*(sideX(z,.535)+.01),.535,z];}),.011,c.gen<3?chrome:paint);
 }
 // Hood and deck are separate curved sheets; the hood can be hidden for anatomy.
 const hoodZ0=c.windshieldBase+.035,hoodZ1=front-.13;
 const hoodW=z=>lerp(.755,.69,(z-hoodZ0)/(hoodZ1-hoodZ0));
 const hoodY=(z,x)=>lerp(c.belt+.04,c.hoodFront+.025,(z-hoodZ0)/(hoodZ1-hoodZ0))+(c.gen>=3?.045:.027)*(1-(x/.78)**2);
 add('hood','Bonnet / hood panel','body',surface((u,v)=>{const z=lerp(hoodZ0,hoodZ1,u),x=(v*2-1)*hoodW(z);return [x,hoodY(z,x),z];},48,32),paint);
 for(const s of [-1,1]){
  add('fender-top-'+s,'Front wing shoulder','body',surface((u,v)=>{const z=lerp(hoodZ0,front-.12,u),x=s*lerp(hoodW(z)+.006,width(z),v);return [x,lerp(hoodY(z,x)-.002,belt(z),v),z];},48,12),paint);
  tube('hood-gap-'+s,'Bonnet perimeter gap','body',Array.from({length:22},(_,i)=>{const z=lerp(hoodZ0,hoodZ1,i/21),x=s*(hoodW(z)+.002);return [x,hoodY(z,x)-.003,z];}),.0025,dark);
 }
 add('trunk','Boot lid / rear deck','body',surface((u,v)=>{const z=lerp(rear+.07,c.rearGlassBase,u),x=(v*2-1)*(width(z)-.012);return [x,belt(z)+.008+.02*(1-(v*2-1)**2),z];},36,24),paint);
 box('floor','Passenger compartment floor','structure',[0,.26,-.45],[1.55,.09,2.65],black);
 // Curved roof, front and rear glazing; side windows follow the tapered cabin.
 const rwid=.70,roofH=c.height;
 const roofY=(z,x)=>roofH-.024*(x/rwid)**2-.018*Math.pow((z-(c.roofFront+c.roofRear)/2)/.7,2);
 add('roof','Crowned roof panel','body',surface((u,v)=>{const z=lerp(c.roofRear,c.roofFront,u),x=(v*2-1)*rwid;return [x,roofY(z,x),z];},36,32),paint);
 const glazing=(id,name,baseZ,topZ)=>{
  const low=belt(baseZ)+.025;
  add(id,name,'body',surface((u,v)=>{const z=lerp(baseZ,topZ,u),x=(v*2-1)*lerp(.815,.696,u);return [x,lerp(low,roofY(topZ,x)-.012,u)+.017*Math.sin(u*Math.PI)*(1-(v*2-1)**2),z];},32,32),glass);
  for(const s of [-1,1])tube(id+'-pillar-'+s,id==='windshield'?'A-pillar':'Rear roof pillar','body',Array.from({length:18},(_,i)=>{const t=i/17,z=lerp(baseZ,topZ,t),x=s*lerp(.836,.717,t);return [x,lerp(low-.018,roofY(topZ,x),t),z];}),id==='windshield'?.018:.023,paint);
  for(const t of [0,1])tube(id+'-seal-'+t,'Window surround','body',Array.from({length:18},(_,i)=>{const x=lerp(-1,1,i/17)*lerp(.82,.702,t),z=lerp(baseZ,topZ,t);return [x,lerp(low,roofY(topZ,x)-.008,t),z];}),.005,dark);
 };
 glazing('windshield','Windscreen',c.windshieldBase,c.roofFront);glazing('rear-glass','Rear window',c.rearGlassBase,c.roofRear);
 const sideWindow=(id,points,s)=>{const shape=new T.Shape(points.map(([z,y])=>new T.Vector2(z,y)));const g=new T.ShapeGeometry(shape,16);const pos=g.attributes.position;for(let i=0;i<pos.count;i++){const z=pos.getX(i),y=pos.getY(i),x=s*lerp(.847,.716,Math.max(0,Math.min(1,(y-c.belt)/(roofH-c.belt))));pos.setXYZ(i,x,y,z);}g.computeVertexNormals();add(id,'Side glazing','body',g,glass);const pts=points.map(([z,y])=>[s*lerp(.850,.719,(y-c.belt)/(roofH-c.belt)),y,z]);tube(id+'-surround','Chrome window surround','body',pts,.009,chrome,true);};
 for(const s of [-1,1]){
  const bz=-.35;
  const outline=[[c.windshieldBase+.04,c.belt-.006],[c.roofFront+.03,roofH-.014],[c.roofRear-.035,roofH-.019],[c.rearGlassBase-.13,c.belt-.006]];
  const cabinShape=new T.Shape(outline.map(([z,y])=>new T.Vector2(z,y))),cabinGeo=new T.ShapeGeometry(cabinShape);
  const cabinPos=cabinGeo.attributes.position;for(let i=0;i<cabinPos.count;i++){const z=cabinPos.getX(i),y=cabinPos.getY(i);cabinPos.setXYZ(i,s*lerp(.840,.710,(y-c.belt)/(roofH-c.belt)),y,z);}cabinGeo.computeVertexNormals();add('cabin-side-'+s,'Roof and door window frame','body',cabinGeo,paint);
  tube('roof-drip-'+s,'Roof edge weatherstrip','body',[[s*.714,roofH-.019,c.roofRear],[s*.714,roofH-.006,(c.roofFront+c.roofRear)/2],[s*.714,roofH-.019,c.roofFront]],.005,dark);
  sideWindow('front-door-glass-'+s,[[c.windshieldBase-.06,c.belt+.034],[c.roofFront-.03,roofH-.04],[bz+.028,roofH-.04],[bz+.028,c.belt+.034]],s);
  sideWindow('rear-door-glass-'+s,[[bz-.028,c.belt+.034],[bz-.028,roofH-.04],[c.roofRear+.11,roofH-.052],[c.rearGlassBase+.20,c.belt+.05]],s);
  tube('b-pillar-'+s,'B-pillar trim','body',[[s*.833,c.belt+.02,bz],[s*.706,roofH-.028,bz]],.032,dark);
  for(const [i,z] of [c.windshieldBase-.045,bz,c.rearGlassBase+.02].entries()){
   const zlo=i===2?rw+.39:z;
   tube(`door-seam-${s}-${i}`,'Door panel gap','body',[[s*sideX(z,c.belt),c.belt-.035,z],[s*(sideX(z,.72)+.003),.72,z],[s*(sideX(zlo,.30)+.003),.30,zlo]],.0025,dark);
  }
  for(const [i,z] of [.0,-1.05].entries()){
   box(`handle-recess-${s}-${i}`,'Door handle recess','body',[s*(sideX(z,c.belt-.10)+.008),c.belt-.10,z],[.018,.045,.16],dark,.009);
   box(`handle-${s}-${i}`,'Door pull','body',[s*(sideX(z,c.belt-.09)+.020),c.belt-.09,z],[.023,.022,.132],c.gen<3?chrome:paint,.009);
  }
  box('mirror-foot-'+s,'Mirror base','body',[s*.85,c.belt+.10,.83],[.06,.10,.16],dark,.015);
  box('mirror-'+s,'Door mirror housing','body',[s*.966,c.belt+.14,.79],[.22,.10,.23],paint,.046);
  box('mirror-glass-'+s,'Door mirror glass','body',[s*.970,c.belt+.144,.680],[.176,.072,.008],chrome,.02);
 }
 // Small roof details; no cabin completeness claim.
 box('sunroof-seal','Sunroof perimeter','body',[0,c.height-.017,-.18],[.76,.005,.64],dark,.045);
 box('sunroof','Sunroof glass','body',[0,c.height-.013,-.18],[.734,.004,.614],glass,.04);
 for(const s of [-1,1])tube('wiper-'+s,'Windscreen wiper','body',[[s*.26,c.belt+.04,c.windshieldBase+.008],[s*.43,c.belt+.071,c.windshieldBase-.04],[s*.71,c.belt+.075,c.windshieldBase-.07]],.007,dark);
 // Front and rear fascia wrap into the wings, with independent lights and grille slats.
 for(const [end,z] of [['front',front],['rear',rear]]){
  const sign=end==='front'?1:-1;
  add(end+'-bumper',end+' bumper skin','body',surface((u,v)=>{const x=lerp(-.87,.87,u),y=lerp(.25,end==='front'?c.hoodFront-.19:c.deck-.12,v),zz=z-sign*(.15*Math.pow(Math.abs(x)/.87,6)+.035*Math.pow(v-.5,2));return [x,y,zz];},48,16),lower);
  add(end+'-upper-fascia',end+' upper body fascia','body',surface((u,v)=>{const x=lerp(-.83,.83,u),zz=z-sign*(.065*Math.pow(Math.abs(x)/.83,4)+.11),y=lerp(end==='front'?c.hoodFront-.21:c.deck-.24,end==='front'?c.hoodFront+.018:c.deck+.007,v);return [x,y,zz];},40,12),paint);
  box(end+'-impact-strip','Bumper protective strip','body',[0,.49,z-sign*.008],[1.63,.055,.027],c.gen<3?lower:paint,.02);
  box(end+'-plate-recess','Registration plate recess','body',[0,end==='front'?.42:.66,z-sign*.007],[.52,.135,.019],dark,.012);
  box(end+'-plate','Neutral registration plate','body',[0,end==='front'?.42:.66,z-sign*.018],[.45,.092,.008],c.gen<4&&end==='rear'?amber:bright,.003);
 }
 box('front-grille-frame','Grille surround','body',[0,c.hoodFront-.06,front-.045],[c.grilleWidth+.035,c.grilleHeight+.025,.035],chrome,.028);
 box('front-grille','Grille recess','body',[0,c.hoodFront-.06,front-.042],[c.grilleWidth,c.grilleHeight,.025],dark,.02);
 if(c.gen>=2){for(const id of ['front-grille-frame','front-grille']){const m=root.getObjectByName(id);const pos=m.geometry.attributes.position;for(let i=0;i<pos.count;i++){const y=pos.getY(i);pos.setX(i,pos.getX(i)*lerp(.77,1,Math.max(0,Math.min(1,(y+c.grilleHeight/2)/c.grilleHeight))));}m.geometry.computeVertexNormals();}}
 const rows=c.gen===4?5:8;
 for(let i=0;i<rows;i++)box('grille-slat-'+i,'Horizontal grille slat','body',[0,c.hoodFront-.06-c.grilleHeight/2+.018+i*(c.grilleHeight-.036)/(rows-1),front-.024],[(c.grilleWidth-.035)*(c.gen>=2?lerp(.77,1,i/(rows-1)):1),.007,.014],chrome,.003);
 ring('grille-emblem-ring','Oval grille emblem surround','body',[0,c.hoodFront-.047,front-.015],.032,.004,chrome).scale.x=1.35;
 tube('grille-emblem','Stylized L emblem','body',[[.006,c.hoodFront-.028,front-.010],[-.013,c.hoodFront-.060,front+.03],[.018,c.hoodFront-.060,front+.03]],.0035,chrome);
 for(const s of [-1,1]){
  const h=c.lampHeight,cx=s*(c.grilleWidth/2+.235),cz=front-.04;
  // Lamp shape varies by generation, from rectangular early lamps to swept LS460 units.
  const pts=c.gen===4?[[.0,-h*.52],[.36,-h*.18],[.43,h*.69],[.075,h*.40]]:c.gen===3?[[0,-h*.48],[.36,-h*.40],[.35,h*.58],[.23,h*.69],[.07,h*.30]]:[[0,-h*.46],[.37,-h*.43],[.40,h*.46],[.015,h*.5]];
  const lampShape=new T.Shape();for(let i=0;i<pts.length;i++){const prev=pts[(i+pts.length-1)%pts.length],cur=pts[i],next=pts[(i+1)%pts.length],a=[lerp(cur[0],prev[0],.12),lerp(cur[1],prev[1],.12)],b=[lerp(cur[0],next[0],.12),lerp(cur[1],next[1],.12)];if(i===0)lampShape.moveTo(s*a[0],a[1]);else lampShape.lineTo(s*a[0],a[1]);lampShape.quadraticCurveTo(s*cur[0],cur[1],s*b[0],b[1]);}lampShape.closePath();
  const lens=new T.ExtrudeGeometry(lampShape,{depth:.02,bevelEnabled:true,bevelSize:.010,bevelThickness:.009,bevelSegments:3,steps:1});
  const start=s*(c.grilleWidth/2+.026);
  add('headlamp-housing-'+s,'Headlamp reflector housing','body',lens.clone(),c.gen===1?chrome:dark,[start,c.hoodFront-.07,cz-.018],[0,s*.12,0]);
  add('headlamp-'+s,'Headlamp glazing','body',lens,lampGlass,[start,c.hoodFront-.07,cz+.015],[0,s*.12,0]);
  for(let i=0;i<2;i++){
   if(c.gen>1){cyl(`projector-${s}-${i}`,'Headlamp optic','body',[start+s*(.10+i*.15),c.hoodFront-.063,cz+.034],i===0?.055:.046,.009,chrome,'z');ring(`optic-${s}-${i}`,'Optic lens rim','body',[start+s*(.10+i*.15),c.hoodFront-.063,cz+.041],i===0?.047:.037,.004,steel);}
   else for(let j=0;j<11;j++)box(`lens-flute-${s}-${i}-${j}`,'Headlamp lens fluting','body',[start+s*(.027+i*.18+j*.014),c.hoodFront-.07,cz+.034],[.0015,.135,.002],chrome,.0005);
  }
  if(c.gen===1)box('front-marker-'+s,'Front marker lens','body',[s*.61,.535,front-.020],[.34,.047,.025],c.gen<3?amber:bright,.007);
  box('fog-recess-'+s,'Fog lamp recess','body',[s*.57,.335,front-.012],[.29,.082,.025],dark,.013);
  box('fog-lamp-'+s,'Fog lamp lens','body',[s*.60,.338,front+.006],[.19,.057,.012],bright,.012);
  box('tail-lamp-'+s,'Rear combination lamp','body',[s*.58,c.deck-.13,rear+.040],[c.gen===4?.49:.47,c.gen===1?.185:.215,.056],red,.035);
  box('tail-reverse-'+s,'Rear reverse lens','body',[s*.52,c.deck-.151,rear+.009],[.20,.045,.009],bright,.006);
  for(let i=0;i<6;i++)box(`tail-rib-${s}-${i}`,'Tail lamp lens rib','body',[s*.58,c.deck-.21+i*.027,rear+.008],[.415,.002,.003],red,.001);
  tube('tailpipe-'+s,'Exhaust outlet','exhaust',[[s*.62,.25,rear+.35],[s*.62,.25,rear-.012]],.032,steel);
 }
 box('front-lower-intake','Lower bumper intake','body',[0,.317,front+.002],[c.gen>=3?1.02:.68,.075,.025],dark,.015);
 add('nose-top','Bonnet leading edge and nose panel','body',surface((u,v)=>{const z=lerp(front-.13,front-.025,u),x=(v*2-1)*lerp(.69,.79,u);return [x,lerp(c.hoodFront+.026,c.hoodFront+.005,u)+.01*(1-(v*2-1)**2),z];},8,32),paint);
 // Detailed wheels with round tyre shoulders, tread, brake rotor and generation-specific spokes.
 for(const [axle,z] of [fw,rw].entries())for(const s of [-1,1]){
  const x=s*c.track[axle]/2,w=c.tyre[0],rimR=c.tyre[2]*.0254/2,pre=`wheel-${axle}-${s}`;
  const profile=[[-w/2,rimR],[-w/2-.004,rad-.045],[-w/2+.025,rad-.009],[-w/2+.048,rad],[w/2-.048,rad],[w/2-.025,rad-.009],[w/2+.004,rad-.045],[w/2,rimR]].map(([a,b])=>new T.Vector2(b,a));
  add(pre+'-tyre','Tyre','wheels',new T.LatheGeometry(profile,80),rubber,[x,rad,z],[0,0,Math.PI/2]);
  for(const dx of [-w*.26,0,w*.26])ring(pre+'-groove-'+dx,'Circumferential tyre tread','wheels',[x+dx,rad,z],rad-.0005,.0028,dark,'x');
  for(let k=0;k<56;k++){const a=k*Math.PI/28;const m=box(pre+'-tread-'+k,'Tyre shoulder tread','wheels',[x,rad+Math.sin(a)*(rad-.003),z+Math.cos(a)*(rad-.003)],[w*.82,.006,.016],rubberRib,.001);m.rotation.x=-a;}
  const face=x+s*(w/2-.011);
  cyl(pre+'-barrel','Wheel barrel','wheels',[x,rad,z],rimR,.16,chrome,'x',64);
  cyl(pre+'-dish','Inset wheel face','wheels',[face-s*.008,rad,z],rimR-.013,.009,steel,'x',64);
  ring(pre+'-lip','Machined rim lip','wheels',[face+s*.003,rad,z],rimR-.004,.009,chrome,'x');
  cyl(pre+'-disc','Brake disc','brakes',[face-s*.045,rad,z],rimR*.79,.018,steel,'x',64);
  box(pre+'-caliper','Brake caliper (approximate)','brakes',[face-s*.035,rad+.06,z+rimR*.60],[.075,.12,.08],alloy,.017);
  cyl(pre+'-hub','Wheel centre cap','wheels',[face+s*.003,rad,z],rimR*.34,.023,chrome,'x',48);
  if(c.gen<=3){cyl(pre+'-disc-face','Alloy wheel dish','wheels',[face+s*.004,rad,z],rimR*(c.gen===1?.81:.90),.012,chrome,'x',64);for(let k=0;k<(c.gen===1?15:7);k++){const a=k*Math.PI*2/(c.gen===1?15:7);const vent=box(pre+'-vent-'+k,'Wheel-face ventilation pocket','wheels',[face+s*.012,rad+Math.sin(a)*rimR*.77,z+Math.cos(a)*rimR*.77],[.005,c.gen===1?.022:.038,c.gen===1?.044:.073],dark,.012);vent.rotation.x=-a;}}
  for(let k=0;k<(c.gen<=3?0:c.wheelSpokes);k++){
   const a=k*Math.PI*2/c.wheelSpokes,rr=rimR*.66;
   const m=box(pre+'-spoke-'+k,'Alloy wheel spoke','wheels',[face,rad+Math.sin(a)*rr,z+Math.cos(a)*rr],[.031,c.gen===1?.044:.034,rimR*.65],chrome,.011);m.rotation.x=-a;
  }
  for(let k=0;k<5;k++){const a=k*Math.PI*2/5;cyl(pre+'-lug-'+k,'Wheel fastener','wheels',[face+s*.023,rad+Math.sin(a)*.051,z+Math.cos(a)*.051],.009,.014,boltmat,'x',6);}
 }
 // Engine bay: original illustrative packaging. No service-fitment claims.
 const ez=1.24,ey=.60;
 box('firewall','Engine-bay rear bulkhead','structure',[0,.65,.92],[1.55,.55,.045],paint,.025);
 box('radiator-support','Upper radiator support','structure',[0,.73,2.16],[1.48,.065,.075],paint,.012);
 for(const s of [-1,1]){
  box('inner-fender-'+s,'Inner wing','structure',[s*.70,.60,1.58],[.10,.40,1.0],paint,.045);
  cyl('tower-'+s,'Suspension tower (approximate)','structure',[s*.66,.68,fw],.16,.21,paint);
  cyl('tower-mount-'+s,'Suspension top mount','structure',[s*.66,.795,fw],.078,.018,dark);
  bolts('tower-bolt-'+s,'structure',[0,1,2].map(k=>[s*.66+Math.cos(k*Math.PI*2/3)*.10,.804,fw+Math.sin(k*Math.PI*2/3)*.10]));
  tube('chassis-rail-'+s,'Engine-bay side rail','structure',[[s*.56,.31,.86],[s*.56,.30,1.6],[s*.58,.35,2.18]],.055,paint);
 }
 box('engine-block','V8 crankcase','engine',[0,.49,ez],[.44,.31,.57],alloy,.045);
 box('oil-pan','Engine oil sump','engine',[0,.29,ez],[.37,.13,.43],alloy,.025);
 for(const s of [-1,1]){
  box('cylinder-bank-'+s,'V8 cylinder bank','engine',[s*.19,.63,ez],[.23,.26,.62],alloy,.025,[0,0,-s*Math.PI/4]);
  box('cam-cover-'+s,'Cam / valve cover','engine',[s*.28,.745,ez],[.19,.10,.65],c.gen===1?alloy:black,.028,[0,0,-s*.20]);
  box('cam-cover-insert-'+s,'Cam cover centre strip','engine',[s*.28,.798,ez],[.078,.01,.50],black,.009);
  for(let j=0;j<4;j++){
   const z=ez-.24+j*.155;
   box(`ignition-${s}-${j}`,c.gen===1?'Spark plug lead boot':'Ignition coil (approximate)','electrical',[s*.29,.814,z],[.045,.045,.056],black,.01);
   if(c.gen===1)tube(`lead-${s}-${j}`,'Ignition lead (route estimated)','electrical',[[s*.29,.84,z],[s*.34,.85,z+.04],[s*.37,.80,ez+.35]],.006,dark);
   tube(`intake-runner-${s}-${j}`,'Intake runner (shape estimated)','intake',[[s*.08,.79,z],[s*.17,.85,z],[s*.22,.73,z]],.031,alloy);
   tube(`exhaust-runner-${s}-${j}`,'Exhaust runner (route estimated)','exhaust',[[s*.31,.59,z],[s*.42,.49,z],[s*.38,.38,ez-.32]],.024,steel);
  }
  bolts('cover-fastener-'+s,'engine',[-.23,0,.23].flatMap(d=>[[s*.20,.795,ez+d],[s*.36,.774,ez+d]]));
  box('timing-bank-cover-'+s,c.gen===4?'Timing-chain housing study':'Timing-belt cover','engine',[s*.22,.66,ez+.355],[.24,.28,.075],c.gen===4?alloy:black,.04);
 }
 box('intake-plenum','Intake manifold / plenum','intake',[0,.84,ez],[.25,.105,.47],alloy,.025);
 for(let i=0;i<7;i++)box('plenum-rib-'+i,'Cast intake rib','intake',[0,.898,ez-.20+i*.061],[.23,.005,.009],alloy,.002);
 box('throttle-body','Throttle body study','intake',[0,.79,ez+.38],[.14,.14,.13],alloy,.018);
 tube('intake-duct','Air intake duct (route estimated)','intake',[[0,.79,ez+.46],[0,.75,1.90],[-.32,.73,1.96],[-.56,.72,1.83]],.058,dark);
 for(let i=0;i<8;i++)ring('intake-bellows-'+i,'Intake duct bellows','intake',[0,.765,1.76+i*.015],.060,.0035,black);
 box('air-cleaner','Air-cleaner housing','intake',[-.56,.64,1.98],[.30,.22,.30],black,.025);
 box('air-cleaner-lid','Air-cleaner lid','intake',[-.56,.758,1.98],[.318,.04,.316],black,.02);
 for(let i=0;i<7;i++)box('air-cleaner-rib-'+i,'Air-cleaner reinforcing rib','intake',[-.56,.783,1.865+i*.034],[.26,.008,.009],black,.003);
 for(const s of [-1,1])box('air-cleaner-clip-'+s,'Air-cleaner retaining clip (illustrative)','intake',[-.56+s*.16,.736,1.99],[.015,.05,.032],steel,.003);
 box('battery','12-volt battery','electrical',[.55,.63,1.93],[.265,.23,.175],dark,.012);
 box('battery-lid','Battery top cover','electrical',[.55,.754,1.93],[.274,.022,.184],black,.008);
 for(const s of [-1,1]){cyl('battery-terminal-'+s,'Battery terminal','electrical',[.55+s*.085,.779,1.93],.012,.025,boltmat);tube('battery-cable-'+s,'Battery cable (route estimated)','electrical',[[.55+s*.085,.795,1.93],[.55+s*.09,.77,1.78],[.68,.63,1.70]],.008,s===1?red:dark);}
 box('battery-retainer','Battery hold-down (illustrative)','electrical',[.55,.777,1.93],[.03,.012,.196],steel,.003);
 box('fuse-box','Engine-bay fuse box','electrical',[.59,.71,1.14],[.18,.12,.26],black,.014);
 const brakeSide=c.market.includes('RHD')?-1:1;
 cyl('brake-booster','Brake booster study','brakes',[brakeSide*.51,.65,.98],.12,.075,dark,'z');
 box('brake-reservoir','Brake fluid reservoir (location estimated)','brakes',[brakeSide*.52,.78,1.03],[.12,.07,.095],ivory,.02);
 cyl('brake-reservoir-cap','Brake fluid cap','brakes',[brakeSide*.52,.823,1.03],.035,.02,dark);
 box('coolant-reservoir','Coolant expansion tank (location estimated)','cooling',[.53,.62,1.58],[.14,.16,.17],ivory,.025);
 cyl('coolant-cap','Coolant tank cap','cooling',[.53,.713,1.58],.027,.022,dark);
 tube('washer-neck','Windscreen washer filler (location estimated)','electrical',[[-.70,.50,2.13],[-.70,.73,2.13]],.025,ivory);
 cyl('washer-cap','Washer filler cap','electrical',[-.70,.744,2.13],.036,.013,mat('washer cap','#42758a',0,.6));
 cyl('oil-cap','Oil filler cap','engine',[.31,.828,ez-.12],.035,.022,black);
 ring('dipstick','Oil dipstick handle (approximate)','engine',[.37,.77,ez+.23],.018,.004,amber,'z');
 box('radiator','Radiator core','cooling',[0,.56,2.08],[.90,.43,.045],steel,.008);
 for(let i=0;i<36;i++)box('radiator-fin-'+i,'Radiator fin study','cooling',[-.43+i*.0245,.56,2.109],[.004,.37,.006],alloy,.001);
 box('radiator-top','Radiator upper tank','cooling',[0,.785,2.08],[.92,.065,.085],black,.012);
 tube('upper-hose','Upper radiator hose (route estimated)','cooling',[[.25,.77,2.07],[.24,.72,1.94],[.12,.66,1.72]],.022,dark);
 tube('lower-hose','Lower radiator hose (route estimated)','cooling',[[-.31,.38,2.07],[-.30,.36,1.87],[-.16,.44,1.67]],.022,dark);
 const fans=c.gen===1?[0]:[-.225,.225];
 fans.forEach((x,i)=>{ring('fan-shroud-'+i,'Cooling fan shroud','cooling',[x,.55,2.005],c.gen===1?.20:.18,.016,black);cyl('fan-hub-'+i,'Cooling fan hub','cooling',[x,.55,2.005],.043,.045,black,'z');for(let j=0;j<7;j++){const a=j*2*Math.PI/7;const blade=box(`fan-blade-${i}-${j}`,'Cooling fan blade','cooling',[x+Math.sin(a)*.115,.55+Math.cos(a)*.115,2.005],[.060,.16,.012],black,.02);blade.rotation.z=-a+.2;}});
 cyl('crank-pulley','Crankshaft pulley','engine',[0,.48,1.67],.079,.043,black,'z');
 cyl('alternator','Alternator body (approximate)','electrical',[-.29,.47,1.67],.075,.12,alloy,'z');
 for(let j=0;j<9;j++)box('alternator-slot-'+j,'Alternator housing vent study','electrical',[-.34+j*.012,.495,1.735],[.004,.06,.002],dark,.001);
 cyl('alternator-pulley','Alternator pulley','electrical',[-.29,.47,1.75],.035,.020,black,'z');
 tube('accessory-belt','Accessory belt schematic route','engine',[[0,.40,1.78],[-.31,.44,1.78],[-.30,.51,1.78],[.18,.67,1.78],[.24,.64,1.78],[.07,.44,1.78]],.006,dark,true);
 if(c.gen===1){
  box('radiator-air-guide','Radiator upper air guide','cooling',[0,.82,2.085],[1.36,.045,.25],black,.035);
  for(const sign of [-1,1]){ring('condenser-fan-guard-'+sign,'Condenser fan guard','cooling',[sign*.21,.57,2.15],.18,.006,black);for(let k=0;k<3;k++)ring('condenser-guard-ring-'+sign+'-'+k,'Condenser fan guard ring','cooling',[sign*.21,.57,2.151],.06+k*.043,.003,black);}
 }
 if(c.gen>1){
  // Later decorative covers are intentionally separable from the anatomy beneath.
  add('engine-cover','Removable decorative engine cover','engine',surface((u,v)=>{const z=lerp(.99,1.64,u),x=(v*2-1)*(c.gen===4?.40:.32)*(1-.12*Math.cos(u*Math.PI));return [x,.87+.046*Math.sin(v*Math.PI)+.012*Math.sin(u*Math.PI),z];},28,28),c.gen===2?black:alloy);
  for(let j=0;j<5;j++)box('engine-cover-rib-'+j,'Decorative engine cover ridge','engine',[0,.922,1.10+j*.086],[.21,.007,.007],c.gen===2?alloy:black,.002);
 }
 if(c.gen===4){for(const s of [-1,1])box('bay-shroud-'+s,'Engine-bay side finishing panel','structure',[s*.57,.845,1.57],[.28,.03,1.06],black,.02);box('bay-front-shroud','Engine-bay front finishing panel','structure',[0,.825,1.97],[1.40,.025,.22],black,.025);}
 if(c.gen===1)refineUcf10({root,c,parts,add,box,tube,cyl,ring,mat,surface,front,rear,fw,rw,rad,wr});
 tri=0;root.traverse(o=>{if(o.isMesh)tri+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
 root.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3());
 return {root,manifest:{id:c.id,revision:1,author:'Wrenchwise',license:'MIT',kind:'original-provisional-study',target:{year:c.year,market:c.market,engine:c.engine},nominalDimensionsMetres:{length:c.length,widthExcludingMirrors:c.width,height:c.height,wheelbase:c.wheelbase},wheelCentersMetres:{front:fw,rear:rw},boundsMetres:{x:size.x,y:size.y,z:size.z},sourceIds:c.sourceIds,verifiedParts:0,triangleCount:tri,parts,limitations:['Original photo-informed approximation, not a scan, manufacturer CAD, or validated 1:1 replica.','Published overall dimensions constrain the envelope; panel curvature, clearances and local part dimensions are estimates.','Engine-bay component placement, hidden geometry, wiring and hose routing remain provisional; do not use for repair, fitment or torque decisions.','Cabin, underside and suspension are incomplete. Decorative engine covers can be hidden as a learning view, not a service removal sequence.','A single representative configuration does not cover every year, market, facelift, wheel option or powertrain in the generation.']}};
}
if(process.argv[1]?.endsWith('build.mjs')){
 const selected=process.argv[2];
 if(selected&&!configurations.some(c=>c.id===selected))throw Error('Unknown LS generation: '+selected);
 const previous=selected?JSON.parse(fs.readFileSync('research/lexus-ls-originals.json')):null;
 const index={version:1,author:'Wrenchwise',license:'MIT',scope:'Original, provisional Lexus LS generation studies. Not approved repair replicas.',sources,models:[]};
 for(const c of configurations){
  if(selected&&c.id!==selected){index.models.push(previous.models.find(m=>m.id===c.id));continue;}
  const {root,manifest}=buildCar(c);
  if(c.gen===1){manifest.revision=2;manifest.refinement='1990 UK pre-facelift: rounded body surfaces, lattice grille, wraparound lamps, pierced alloy faces and RHD engine bay';}
  root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,pos=g.attributes.position,idx=g.index,keep=[],a=new T.Vector3(),b=new T.Vector3(),d=new T.Vector3();for(let i=0;i<(idx?idx.count:pos.count);i+=3){const ids=[0,1,2].map(k=>idx?idx.getX(i+k):i+k);a.fromBufferAttribute(pos,ids[0]);b.fromBufferAttribute(pos,ids[1]);d.fromBufferAttribute(pos,ids[2]);if(b.sub(a).cross(d.sub(a)).lengthSq()>1e-20)keep.push(...ids);}g.setIndex(keep);g.computeVertexNormals();const n=g.attributes.normal;for(let i=0;i<n.count;i++)if(n.getX(i)**2+n.getY(i)**2+n.getZ(i)**2<.01)n.setXYZ(i,0,1,0);});
  const buffer=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:false}));
  // Embed explicit provenance in the asset header without adding external dependencies.
  const jl=buffer.readUInt32LE(12),json=JSON.parse(buffer.toString('utf8',20,20+jl));json.asset.copyright='Original geometry © Wrenchwise. MIT. Provisional educational study; not manufacturer CAD.';
  let j=Buffer.from(JSON.stringify(json));j=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]);const tail=buffer.subarray(20+jl),header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+j.length+tail.length,8);header.writeUInt32LE(j.length,12);header.writeUInt32LE(0x4e4f534a,16);const glb=Buffer.concat([header,j,tail]);
  manifest.bytes=glb.length;manifest.sha256=crypto.createHash('sha256').update(glb).digest('hex');
  fs.writeFileSync(`${out}/${c.id}.glb`,glb);fs.writeFileSync(`${out}/${c.id}-parts.json`,JSON.stringify(manifest,null,2)+'\n');
  index.models.push({id:c.id,name:c.name,make:'Lexus',family:'LS',author:'Wrenchwise',bodyStyle:'Sedan',generation:c.code+' · '+['first','second','third','fourth'][c.gen-1]+' generation',bodyGroup:'Lexus LS · '+(c.gen===4?'XF40':c.code)+' · '+['first','second','third','fourth'][c.gen-1]+' generation',sourceYear:c.year,years:['1990–1994','1995–2000','2001–2006','2007–2017'][c.gen-1],market:c.market,engine:c.engine,engineName:c.engineName,assetUrl:`/models/ls/${c.id}.glb`,manifestUrl:`/models/ls/${c.id}-parts.json`,kind:'Original anatomy study',sha256:manifest.sha256,bytes:manifest.bytes,sourceIds:c.sourceIds,nominalDimensionsMetres:manifest.nominalDimensionsMetres,parts:manifest.parts.filter(p=>!/(rib|bolt|fastener|tread|groove|spoke|lug|seal|surround|fin-|flute|slot|cover-rib)/.test(p.id)&&!p.id.startsWith('wheel-'))});
  console.log(`${c.id}: ${partsSummary(manifest)}`);
 }
 fs.writeFileSync('research/lexus-ls-originals.json',JSON.stringify(index,null,2)+'\n');fs.writeFileSync('public/research/lexus-ls-originals.json',JSON.stringify(index,null,2)+'\n');
}
function partsSummary(m){return `${m.parts.length} selectable meshes, ${m.triangleCount} triangles, ${(m.bytes/1024/1024).toFixed(2)} MiB`;}
