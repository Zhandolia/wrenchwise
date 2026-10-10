import library from '@/research/model-library.json';
import generations from '@/research/lexus-ls-generation-review.json';

// The mechanical assembly predates the community exterior collection. Keep it
// in the same chooser without claiming it is a newly acquired exterior asset.
export const s160Vehicle = {
  id: 'lexus-gs300-s160', name: 'Lexus GS 300', make: 'Lexus', family: 'GS',
  author: 'Wrenchwise', bodyStyle: 'Sedan', generation: 'S160 · second generation',
  bodyGroup: 'Lexus GS · S160 · second generation', sourceYear: 2000,
  assetUrl: '/models/gs300-assembly.glb',
};
export const learningVehicles = [s160Vehicle, ...library.models, ...generations.generations];
