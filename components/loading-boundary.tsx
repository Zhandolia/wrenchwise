'use client';
import {Component, type ReactNode} from 'react';
import {appPath} from '@/lib/app-path';

export default class LoadingBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <section role="alert" className="loading-recovery">
      <h2>This workspace couldn’t load.</h2>
      <p>Your saved notes and local models are kept on this device. Reload to fetch the current application files.</p>
      <button className="secondary-btn" onClick={() => window.location.reload()}>Reload workspace</button>
      <a href={appPath('/')}>Return to workshop</a>
    </section>;
  }
}
