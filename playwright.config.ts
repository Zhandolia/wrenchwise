import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser', timeout:60000, fullyParallel:false, workers:1,
 use:{baseURL:'http://127.0.0.1:4179/wrenchwise/',viewport:{width:1280,height:900},trace:'retain-on-failure',launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
 webServer:{command:'node node_modules/vite/bin/vite.js preview --config vite.pages.config.ts --port 4179',url:'http://127.0.0.1:4179/wrenchwise/',reuseExistingServer:!process.env.CI},
 reporter:[['list']],
});
