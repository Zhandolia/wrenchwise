"""Review-only checks against the provisional exterior, not real-world validation."""
import bpy,sys,json
from pathlib import Path
from mathutils import Vector
base,out=map(Path,sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(base))
hood=next(o for o in bpy.context.scene.objects if o.get('partId')=='hood');inv=hood.matrix_world.inverted()
results=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or o.get('modelVersion')!=5:continue
 if o.get('system') not in ['engine','intake','electrical','cooling','structure']:continue
 above=[];sampled=0
 for v in o.data.vertices:
  p=o.matrix_world@v.co
  if p.y<-.86 and p.z>.5:
   hit,point,normal,idx=hood.ray_cast(inv@Vector((p.x,p.y,2)),Vector((0,0,-1)))
   if hit:
    sampled+=1;delta=p.z-(hood.matrix_world@point).z
    if delta>.003:above.append(delta)
 if above:results.append({'partId':o.get('partId'),'verticesAboveHood':len(above),'maxPenetrationMetres':max(above),'sampled':sampled})
report={'scope':'Vertex-to-exterior hood surface check on this provisional asset only. Not factory fit verification. No full collision detection.','hoodSurfacePenetrations':results,'maxPenetrationMetres':max((r['maxPenetrationMetres'] for r in results),default=0)}
out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
