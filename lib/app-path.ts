declare const __GITHUB_PAGES__: boolean;
declare const __APP_BASE_PATH__: string;
export const localWorkshop = typeof __GITHUB_PAGES__ !== 'undefined' && __GITHUB_PAGES__;
const base = typeof __APP_BASE_PATH__ !== 'undefined' ? __APP_BASE_PATH__ : '/';
/** Prefix only app-root URLs. Preserve fragments, external URLs and blob imports. */
export function appPath(path: string): string {
 if (!path.startsWith('/') || path.startsWith('//') || base === '/') return path;
 if (path === base.slice(0,-1) || path.startsWith(base)) return path;
 return base + path.slice(1);
}
