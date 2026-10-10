// Store only learning acknowledgements; never represent repair completion.
export function readWorkthroughProgress(raw, steps) {
  try {
    const value=JSON.parse(raw), ids=new Set(steps.map(s=>s.id));
    return {step:ids.has(value?.step)?value.step:steps[0].id,reviewed:Array.isArray(value?.reviewed)?[...new Set(value.reviewed.filter(id=>ids.has(id)))]:[]};
  } catch {return {step:steps[0].id,reviewed:[]};}
}
