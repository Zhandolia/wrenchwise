import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const base=process.env.PAGES_BASE_PATH || '/wrenchwise/';
if(!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base))throw Error('PAGES_BASE_PATH must be an absolute directory path ending in /');
export default defineConfig({
 root:root+'pages',base,publicDir:root+'public',
 plugins:[react()],resolve:{alias:{'@':root}},
 define:{__GITHUB_PAGES__:'true',__APP_BASE_PATH__:JSON.stringify(base)},
 css:{postcss:root},
 build:{outDir:root+'dist-pages',emptyOutDir:true},
 server:{host:'127.0.0.1'},preview:{host:'127.0.0.1'}
});
