'use client';
import {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, CheckCircle2} from 'lucide-react';
import {s160OrientationLesson as lesson} from '@/lib/s160-lessons';
import {readLessonProgress, recordLessonAnswer} from '@/lib/lesson-progress.mjs';

type Props = {
  onStudy: (id: string) => void;
  onPart: (id: string) => void;
  activeStudy: string | null;
  parts: {id:string; name:string}[];
  sources: {id:string; title:string; url:string}[];
};
const storageKey = 'wrenchwise:lesson:' + lesson.id + ':v1';
export default function GuidedLesson({onStudy, onPart, activeStudy, parts, sources}: Props) {
  const [progress, setProgress] = useState(() => {
    try {return readLessonProgress(localStorage.getItem(storageKey), lesson.steps);} catch {return readLessonProgress(null, lesson.steps);}
  });
  const [storageNotice, setStorageNotice] = useState('');
  const actions = useRef({onStudy}); actions.current = {onStudy};
  const step = lesson.steps[progress.step];
  const answer = step.check.options.find(option => option.id === progress.answers[step.id]);
  const correct = answer?.id === step.check.correctOptionId;
  const completed = lesson.steps.filter(item => progress.answers[item.id] === item.check.correctOptionId).length;
  useEffect(() => {actions.current.onStudy(step.studyId);}, [step.studyId]);
  useEffect(() => {
    try {localStorage.setItem(storageKey, JSON.stringify(progress));}
    catch {setStorageNotice('Progress is available for this visit; this browser could not save it.');}
  }, [progress]);
  return <section className="guided-lesson" aria-label="Guided engine-bay lesson">
    <div className="lesson-heading"><div><span className="eyebrow orange">LEARN BY EXPLORING</span><h2>{lesson.title}</h2><p>{lesson.configuration}</p></div><span className="lesson-progress-label" role="status">{completed} / {lesson.steps.length} checks complete</span></div>
    <div className="lesson-progress" aria-label="Lesson steps">{lesson.steps.map((item,index) => <button key={item.id} aria-current={index === progress.step ? 'step' : undefined} onClick={() => setProgress(current => ({...current, step:index}))}><span>{progress.answers[item.id] === item.check.correctOptionId ? <CheckCircle2 size={16}/> : index + 1}</span>{item.title}</button>)}</div>
    <div className="lesson-body"><div><p className="lesson-step-count">STEP {progress.step + 1} OF {lesson.steps.length}</p><h3>{step.title}</h3><p>{step.objective}</p><ol>{step.observations.map(text => <li key={text}>{text}</li>)}</ol><div className="lesson-parts" aria-label="Find a component">{step.partIds.map(id => <button key={id} onClick={() => {onStudy(step.studyId); onPart(id);}}>{parts.find(part => part.id === id)?.name || id}</button>)}</div>{activeStudy !== step.studyId && <button className="secondary-btn" onClick={() => onStudy(step.studyId)}>Return to this lesson’s 3D view</button>}</div>
    <div className="lesson-check"><fieldset><legend>{step.check.question}</legend>{step.check.options.map(option => <label key={option.id}><input type="radio" name={'check-' + step.id} value={option.id} checked={answer?.id === option.id} onChange={() => setProgress(current => recordLessonAnswer(current, step, option.id))}/><span>{option.label}</span></label>)}</fieldset>{answer && <p className={correct ? 'check-feedback correct' : 'check-feedback'} role="status">{answer.explanation}</p>}<div className="lesson-navigation"><button className="secondary-btn" disabled={progress.step === 0} onClick={() => setProgress(current => ({...current, step:current.step - 1}))}><ArrowLeft size={15}/>Back</button>{progress.step < lesson.steps.length - 1 && <button className="learn-primary" disabled={!correct} onClick={() => setProgress(current => ({...current, step:current.step + 1}))}>Next step <ArrowRight size={15}/></button>}</div>{!correct && <p className="lesson-hint">Explore the 3D view, then answer the check to continue.</p>}</div></div>
    {completed === lesson.steps.length && <div className="lesson-complete" role="status"><CheckCircle2 size={23}/><p>{lesson.completionMessage}</p><button className="secondary-btn" onClick={() => setProgress(readLessonProgress(null, lesson.steps))}>Restart lesson</button></div>}
    <details className="lesson-evidence"><summary>What this study is based on</summary><p>{step.limitation}</p>{step.sourceIds.map(id => {const source=sources.find(item => item.id === id);return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : null;})}</details><p className="lesson-hint">Anatomy learning only · Progress saved on this device. {storageNotice}</p>
  </section>;
}
