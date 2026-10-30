import {lazy,Suspense} from 'react';
import type {Root} from 'react-dom/client';
type HotContext={data:{root?:Root};dispose:(callback:(data:{root?:Root})=>void)=>void};
import {createRoot} from 'react-dom/client';
import {appPath} from '../lib/app-path';
import LoadingBoundary from '../components/loading-boundary';
import '../app/globals.css';
import "../app/garage-theme.css";
// Primary flow: the library, and a job worked against the model.
const Library=lazy(()=>import('../src/ui/library-page'));
const Job=lazy(()=>import('../src/ui/job-page'));
// Archive: the earlier exploration workspace, kept working at its own routes.
const Archive=lazy(()=>import('../app/page'));
const Workshop=lazy(()=>import('../app/workshop/page'));
const Catalog=lazy(()=>import('../app/catalog/page'));
const Assembly=lazy(()=>import('../app/assembly/page'));
const Components=lazy(()=>import('../app/components/page'));
const LibraryArchive=lazy(()=>import('../app/library/page'));
const Research=lazy(()=>import('../app/research/page'));
const base=appPath('/');
const route=location.pathname.slice(base.length).replace(/\/$/,'');
// `guide` is the earlier name for `job`; links already shared keep working.
const routes:Record<string,typeof Library>={'':Library,job:Job,guide:Job,archive:Archive,workshop:Workshop,catalog:Catalog,assembly:Assembly,components:Components,research:Research,library:LibraryArchive};
const Page=routes[route];
const hot = (import.meta as ImportMeta & {hot?:HotContext}).hot;
const root = hot?.data.root ?? createRoot(document.getElementById('root')!);
if (hot) hot.dispose(data => {data.root = root;});
root.render(<LoadingBoundary><Suspense fallback={<main aria-busy="true">Loading…</main>}>{Page?<Page/>:<main><h1>Page not found</h1><a href={base}>Open the library</a></main>}</Suspense></LoadingBoundary>);
