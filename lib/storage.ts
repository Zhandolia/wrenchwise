import { env } from 'cloudflare:workers';
export function db(){if(!env.DB)throw new Error('Database unavailable');return env.DB;}
export function bucket(){const b=(env as unknown as {BUCKET:R2Bucket}).BUCKET;if(!b)throw new Error('File storage unavailable');return b;}
export function error(message:string,status=400){return Response.json({error:message},{status});}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;}
export const vehicleIds=['gs300','gs400','gs430','ls400','ls430','es300','es330','rx300','rx330','gx470','lx470'];
