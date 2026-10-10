// Original educational summaries of RM718U, not a replacement for its full procedure.
const manual = 'https://zinref.ru/avtomobili/Lexus/190_Lexus%20GS300_400_2000%20year_english/';
export const timingSources = [
  {id:'access',title:'RM718U · EM-14–17 · Components, access & positioning',url:manual+'130.htm'},
  {id:'removal',title:'RM718U · EM-18–21 · Removal & inspection',url:manual+'131.htm'},
  {id:'installation',title:'RM718U · EM-22–25 · Inspection & installation',url:manual+'132.htm'},
  {id:'verification',title:'RM718U · EM-26–28 · Tension, timing check & reassembly',url:manual+'133.htm'},
];
export type TimingStep = {
  id:string; title:string; phase:string; studyId:string; objective:string;
  actions:string[]; checkpoint:string; reference:string; sourceIds:string[];
  parts:{id:string; role:string}[];
};
export const timingLesson = {
  id:'2jz-ge-vvti-timing-belt',revision:1,
  configurationId:'lexus-gs-jzs160-us-2000-2jz-ge-auto',
  title:'Understand a timing-belt replacement',
  configuration:'2000 Lexus GS300 · US · LHD · 2JZ-GE VVT-i',
  scope:'A visual companion to the factory procedure. The phases below summarize the job; use the linked manual for every substep, tool, torque and diagram. The 3D reconstruction is not an alignment or fitment reference.',
  steps:[
    {id:'prepare',title:'Identify the engine & prepare',phase:'Preparation',studyId:'engine-layout',
      objective:'Understand which engine and service information this walkthrough covers.',
      actions:['Confirm the engine, year and market against the car before choosing parts. This walkthrough covers the naturally aspirated VVT-i 2JZ-GE, not every 2JZ.', 'Read the complete timing-belt chapter and its linked cooling, charging and engine-control procedures. Plan the job on a cold engine.', 'Prepare the specified holding and pulling tools, torque tools, hex tools, tensioner press equipment and fluid handling equipment from the manual.'],
      checkpoint:'Have the vehicle-specific manual and correct equipment before starting physical work. Viewing this lesson does not confirm repair readiness.',reference:'EM-14–15; EM-16; EM-23; EM-26',sourceIds:['access','installation','verification'],
      parts:[{id:'vvti-gear',role:'The intake cam pulley includes VVT-i hardware.'},{id:'timing-belt',role:'Connects the crankshaft timing pulley to the camshaft pulleys.'}]},
    {id:'access',title:'Make room at the engine front',phase:'Access',studyId:'engine-layout',
      objective:'Locate the systems that obstruct the timing covers.',
      actions:['The factory access sequence includes the under-cover, coolant drain, radiator assembly and accessory belt.', 'It then addresses the power-steering pump/front bracket, upper timing covers and accessory tensioner before the crankshaft pulley bolt is loosened with the holding tools.'],
      checkpoint:'Keep the accessory belt and timing belt distinct. The 3D view omits surrounding vehicle structure; it does not prove tool clearance.',reference:'EM-16, steps 1–9; linked CO-18 and CH-1',sourceIds:['access'],
      parts:[{id:'radiator',role:'The factory procedure removes the radiator assembly for access.'},{id:'accessory-belt',role:'The external accessory drive is separate from valve timing.'},{id:'timing-cover-upper',role:'No.2 cover protects the upper timing drive.'}]},
    {id:'position',title:'Understand the timing references',phase:'Positioning',studyId:'timing-drive',
      objective:'Distinguish the TDC marks from the removal-position dot marks.',
      actions:['EM-17 establishes the compression reference, then specifies approximately 60° before TDC for removal. Read the illustrated sequence, including its rotation directions.', 'Compare the real crankshaft and camshaft marks with the factory drawings. Incorrect crank positioning with the belt disengaged can allow piston-to-valve contact.'],
      checkpoint:'Do not align a real engine to this mesh. The displayed pulley orientation, teeth and belt position are illustrative; they do not represent a timed engine.',reference:'EM-17, step 10 · diagrams A02656, A02671 and A02660',sourceIds:['access'],
      parts:[{id:'crank-pulley',role:'The toothed timing pulley is separate from the external crankshaft damper.'},{id:'exhaust-cam-sprocket',role:'The exhaust cam has its own timing references.'},{id:'vvti-gear',role:'The VVT-i pulley has distinct dot and timing references.'}]},
    {id:'remove',title:'Understand the removal sequence',phase:'Removal',studyId:'timing-drive',
      objective:'See the belt, idler, tensioner and surrounding layers as separate components.',
      actions:['The factory chapter releases the hydraulic tensioner and disconnects the belt at the cam pulleys.', 'Its full disassembly sequence also covers cam pulleys, head-cover/intake access and VVT-i oil hardware, followed by the crankshaft pulley, lower cover, guide, belt, idler and crankshaft timing pulley. Open EM-18–20 for the complete dependencies.'],
      checkpoint:'Do not loosen the five factory-set VVT-i pulley bolts. This summary is not permission to remove every highlighted part during a belt-only job.',reference:'EM-18–20, removal steps 11–24',sourceIds:['removal'],
      parts:[{id:'timing-tensioner',role:'Hydraulic actuator loads the idler mechanism.'},{id:'timing-idler',role:'The idler is a separate rotating component.'},{id:'vvti-gear-locked-fasteners',role:'Factory-set pulley bolts: not service-removal targets.'}]},
    {id:'inspect',title:'Inspect before installing',phase:'Inspection',studyId:'timing-drive',
      objective:'Separate visual condition checks from measurements that require real parts.',
      actions:['Inspect the belt for damage or contamination and investigate the cause of abnormal wear. Avoid twisting, folding or turning the belt inside out.', 'Check the idler and accessory tensioner for smooth operation. Inspect the hydraulic tensioner for leakage, pushrod resistance and the specified protrusion; apply the manual’s replacement criteria.'],
      checkpoint:'The viewer cannot measure bearing condition, belt wear or tensioner protrusion. Record these checks on the actual components.',reference:'EM-21–22 · belt, idler and tensioner inspections',sourceIds:['removal','installation'],
      parts:[{id:'timing-belt',role:'Inspect teeth, edges and backing on the actual belt.'},{id:'timing-idler-bearing',role:'Bearing condition requires physical inspection.'},{id:'timing-tensioner-rod',role:'The actual pushrod requires a protrusion measurement.'}]},
    {id:'install',title:'Rebuild the drive in sequence',phase:'Installation',studyId:'timing-drive',
      objective:'Understand the dependencies before the belt is connected to both cams.',
      actions:['On a cold engine, the installation chapter starts with the keyed crankshaft timing pulley, retaining plate and idler; it then places the clean belt on the lower drive.', 'The guide, lower cover and crankshaft pulley precede the VVT-i pulley/oil hardware and other removed assemblies. Follow EM-23–25 for orientations, replacement seals, adhesive, holding methods and torques.'],
      checkpoint:'A separated view shows component relationships, not an approved installation path. Verify each keyed interface and the actual timing references in the manual.',reference:'EM-23–25, installation steps 1–13',sourceIds:['installation'],
      parts:[{id:'crank-pulley',role:'Keyed interface locates the timing pulley on the crankshaft.'},{id:'timing-idler',role:'Its pivot hardware and free movement need the specified checks.'},{id:'timing-cover-lower',role:'No.1 cover carries a reference used by the factory sequence.'}]},
    {id:'tension',title:'Connect the belt & set tension',phase:'Tensioning',studyId:'timing-drive',
      objective:'Locate the parts involved in the final belt connection and tensioner release.',
      actions:['After the specified pulley positioning, the manual connects the belt to the cam pulleys while checking the crank-to-intake run.', 'It specifies slow press compression and a retaining pin for the tensioner, followed by fitting the dust boot, alternately tightening its two mounting bolts and withdrawing the pin. Read the exact force, pin size and torque in EM-26–27.'],
      checkpoint:'Do not infer belt tension, tooth engagement or pin-release readiness from the model. Those decisions require the factory procedure and the real assembly.',reference:'EM-26–27, installation steps 14–16',sourceIds:['verification'],
      parts:[{id:'timing-belt',role:'Routing and engagement must be checked against the actual pulleys.'},{id:'timing-tensioner-boot',role:'Dust boot belongs on the hydraulic tensioner.'},{id:'timing-tensioner-bolt-1',role:'One of the two tensioner mounting bolts.'}]},
    {id:'verify',title:'Verify timing & restore systems',phase:'Verification',studyId:'engine-layout',
      objective:'Understand the checks that come before returning the engine to service.',
      actions:['EM-27 checks valve timing after two slow clockwise crankshaft revolutions from TDC to TDC. If the specified marks disagree, the belt must be reinstalled.', 'After timing verification, follow the crankshaft-bolt tightening and reassembly sequence. Restore removed systems, refill coolant, check for leaks and recheck its level as specified.'],
      checkpoint:'A completed learning checklist is not a completed repair. Actual alignment, fastening, fluid and operating checks remain essential.',reference:'EM-27–28, installation steps 17–29',sourceIds:['verification'],
      parts:[{id:'crank-damper-bolt',role:'Final tightening uses the specified holding tools and torque.'},{id:'timing-cover-upper',role:'Protective covers and gaskets return after the timing checks.'},{id:'radiator',role:'Cooling-system restoration includes fluid and leak checks.'}]},
  ] satisfies TimingStep[],
};

export const timingPartIds = ['timing-belt','exhaust-cam-sprocket','exhaust-cam-sprocket-center','vvti-gear','vvti-gear-center','vvti-gear-locked-fasteners','crank-pulley','crank-pulley-center','timing-idler','timing-idler-arm','timing-idler-bearing','timing-idler-bolt','timing-tensioner','timing-tensioner-rod','timing-tensioner-boot','timing-tensioner-bolt-1','timing-tensioner-bolt-2'];
export const timingSeparation:Record<string,[number,number,number]> = Object.fromEntries(timingPartIds.map(id=>[id,[0,0,id==='timing-belt'?.20:id.startsWith('timing-tensioner')?.10:0]]));
