export type LessonCheck = {
  question: string;
  options: {id: string; label: string; explanation: string}[];
  correctOptionId: string;
};
export type LessonStep = {
  id: string;
  studyId: string;
  title: string;
  objective: string;
  observations: string[];
  partIds: string[];
  sourceIds: string[];
  limitation: string;
  check: LessonCheck;
};
export type OrientationLesson = {
  id: string;
  title: string;
  configurationId: string;
  configuration: string;
  scope: string;
  completionMessage: string;
  steps: LessonStep[];
};

export const s160OrientationLesson: OrientationLesson = {
  id: 's160-engine-bay-orientation',
  title: 'Find your way around the GS300 engine bay',
  configurationId: 'lexus-gs-jzs160-us-2000-2jz-ge-auto',
  configuration: '2000 Lexus GS300 · US · LHD · 2JZ-GE VVT-i · stock automatic target',
  scope: 'A guided anatomy lesson in the 3D viewer. Learn component names and relationships. Geometry and installed fit remain unverified; this lesson does not teach a repair procedure.',
  completionMessage: 'Orientation complete. You explored the intake, air-cleaner layers and pump drive. This records learning progress only; it does not certify repair readiness or model accuracy.',
  steps: [
    {
      id: 'recognize-layout', studyId: 'engine-layout', title: 'Orient yourself in the engine bay',
      objective: 'Locate the air cleaner, throttle and intake crossover in the installed study.',
      observations: [
        'Orbit the model and select the airbox. Follow the modeled duct toward the throttle and intake crossover.',
        'These are separately labeled groups in the GS300 study. Their displayed placement is a source-informed estimate.',
        'Open a source link to compare the study with the reference. A photograph supports visible arrangement, but cannot measure hidden surfaces.'
      ],
      partIds: ['airbox','throttle','intake-crossover'], sourceIds: ['gs300-engine-photo','rm718u-engine'],
      limitation: 'The target car has not been physically identified or measured. This view does not validate clearances, dimensions or another GS engine option.',
      check: {
        question: 'What can this photograph-informed layout help you learn?', correctOptionId: 'relationships',
        options: [
          {id: 'relationships', label: 'Component names and their approximate relationships', explanation: 'Yes. The study supports visual orientation while keeping measured placement and fitment unresolved.'},
          {id: 'clearance', label: 'Exact clearance for a replacement part', explanation: 'Clearance needs measurements and a fit check on the identified configuration. The view does not supply that evidence.'},
          {id: 'all-gs', label: 'The same engine layout for every GS model', explanation: 'This study targets the GS300 2JZ-GE. GS400 and GS430 use different engines; the shared body family does not prove mechanical compatibility.'}
        ]
      }
    },
    {
      id: 'trace-intake', studyId: 'air-intake', title: 'Trace the intake duct',
      objective: 'Distinguish the duct, flexible bellows, clamp bands and meter connector.',
      observations: [
        'Select the air-intake duct and rotate the close view to follow its curved shape.',
        'Select the bellows and clamp bands separately. They are modeled along the duct surface.',
        'Compare the MAF housing with its separately selectable connector. The connector shape is illustrative; it contains no verified pinout.'
      ],
      partIds: ['air-intake-duct','intake-bellows','intake-clamps','maf','maf-connector'], sourceIds: ['gs300-engine-photo'],
      limitation: 'Duct diameter, bellows ridge count, connector detail and installation endpoints are estimates. No removal or electrical testing is taught.',
      check: {
        question: 'Which feature is a separately selectable electrical connection in this intake study?', correctOptionId: 'maf-connector',
        options: [
          {id: 'bellows', label: 'The flexible bellows', explanation: 'The bellows is the corrugated section of the intake duct. Select the MAF connector to inspect the modeled electrical connection.'},
          {id: 'maf-connector', label: 'The MAF connector', explanation: 'Yes. The connector is a separate group beside the meter housing. Its pinout and service details remain unverified.'},
          {id: 'clamp', label: 'The duct clamp band', explanation: 'The clamp band is modeled around the duct. It is separate from the meter connector.'}
        ]
      }
    },
    {
      id: 'inspect-air-cleaner', studyId: 'air-cleaner', title: 'Inspect the air-cleaner layers',
      objective: 'Recognize the housing, lid, filter frame and filter media.',
      observations: [
        'Inspect the lower housing, then select the filter frame and pleated media independently.',
        'Rotate toward the lid outlet. The outlet stays with the lid in this authored study.',
        'The lid and filter are lifted apart only to make the layers visible. The offsets do not describe how parts move on a real car.'
      ],
      partIds: ['airbox','airbox-lid','air-filter','air-filter-pleats'], sourceIds: ['gs300-engine-photo'],
      limitation: 'The external arrangement is photo-informed. Internal shape, pleat count, clips, mounts, thickness and sealing fit are not validated.',
      check: {
        question: 'What does the separation between the lid and filter represent?', correctOptionId: 'illustration',
        options: [
          {id: 'removal', label: 'A verified removal path', explanation: 'No. The display offsets have not been checked against real clips, mounts or surrounding components.'},
          {id: 'distance', label: 'The measured operating gap', explanation: 'No. The separation is an illustration and is not a measured installed dimension.'},
          {id: 'illustration', label: 'An illustration that makes the layers visible', explanation: 'Yes. The separated view is for anatomy inspection; it does not establish removal directions or operating clearances.'}
        ]
      }
    },
    {
      id: 'distinguish-pump-drive', studyId: 'pump-drive', title: 'Distinguish the pump and its pulley',
      objective: 'Recognize the pump body and its separate accessory-drive pulley.',
      observations: [
        'Select the water-pump body and then its pulley. The pulley is offset forward in this illustration so both can be seen.',
        'The recorded RM718U cooling reference distinguishes four pulley nuts from six pump-to-block bolts.',
        'Select one example from each fastener group. A documented quantity does not establish modeled bolt position, size or tightening specification.'
      ],
      partIds: ['water-pump','water-pump-pulley','water-pump-bolt-1','water-pump-pulley-nut-1'], sourceIds: ['rm718u-pump'],
      limitation: 'This uses the existing source audit of RM718U CO-5–8. Pump shape, mating surfaces and service access remain unmeasured; this is not a pump replacement guide.',
      check: {
        question: 'Which statement matches the cooling reference recorded for this study?', correctOptionId: 'separate-groups',
        options: [
          {id: 'separate-groups', label: 'Four pulley nuts and six pump bolts are different groups', explanation: 'Yes. The source ledger identifies these separately. Those counts do not validate the modeled fastener coordinates or any repair sequence.'},
          {id: 'same-group', label: 'The pulley nuts and pump bolts are the same fasteners', explanation: 'The source distinguishes the pulley attachment from the pump-to-block attachment.'},
          {id: 'verified-fit', label: 'Correct counts prove the model will fit the real engine', explanation: 'Counts alone do not prove shape or fit. Measurements, interfaces and physical review remain missing.'}
        ]
      }
    }
  ]
};
