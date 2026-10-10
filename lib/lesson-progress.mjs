/** Validate persisted state against the current lesson, not arbitrary storage contents. */
export function readLessonProgress(raw, steps) {
 let value; try {value=JSON.parse(raw);} catch {}
 const step=Number.isInteger(value?.step)&&value.step>=0&&value.step<steps.length?value.step:0;
 const answers=/** @type {Record<string,string>} */({});
 for(const item of steps)if(item.check.options.some(option=>option.id===value?.answers?.[item.id]))answers[item.id]=value.answers[item.id];
 return {step,answers};
}
export function recordLessonAnswer(progress, step, optionId) {
 if(!step.check.options.some(option=>option.id===optionId))return progress;
 return {...progress,answers:{...progress.answers,[step.id]:optionId}};
}
