// Small shared pieces.
//
// The rule everywhere: plain language on the surface, evidence one tap down.
// Nothing claims more than its sources support, and nothing hides a warning.

import type { CSSProperties, ReactNode } from 'react';
import {
  sourceIsLinkable,
  sourcesById,
  type Caution,
  type SourceRef,
  type VerificationAxis,
} from '../content/catalog';

/** How much weight a status carries, so a tag reads at a glance. */
const LEVEL: Record<string, 'weak' | 'neutral' | 'strong'> = {
  'not-established': 'weak',
  'not-entered': 'weak',
  estimated: 'weak',
  'mirror-derived': 'weak',
  'not-applicable': 'neutral',
  photographic: 'neutral',
  catalog: 'neutral',
  documented: 'neutral',
  published: 'strong',
  measured: 'strong',
  scanned: 'strong',
  reviewed: 'strong',
  verified: 'strong',
};

/** Plain-English for a status, for people who do not live in this vocabulary. */
const PLAIN: Record<string, string> = {
  'not-established': 'not established yet',
  'not-entered': 'not filled in yet',
  estimated: 'estimated, not measured',
  'mirror-derived': 'from an unofficial copy',
  'not-applicable': 'not applicable',
  photographic: 'from photographs',
  catalog: 'from a parts catalog',
  documented: 'documented',
  published: 'published figure',
  measured: 'measured',
  scanned: 'from a scan',
  reviewed: 'reviewed',
  verified: 'verified',
  'educational-overview': 'learning guide',
};

export function statusText(status: string): string {
  return PLAIN[status] ?? status.replace(/-/g, ' ');
}

export function Tag({ status, label }: { status: string; label?: string }) {
  return (
    <span className="ww-tag" data-level={LEVEL[status] ?? 'neutral'}>
      {label ? `${label}: ` : ''}
      {statusText(status)}
    </span>
  );
}

/**
 * Colour by the system a part belongs to. The same hues run through chips,
 * hotspots, the part panel and the generated illustration.
 */
const SYSTEM_HUE: Record<string, string> = {
  'timing-drive': '#38bdf8',
  'accessory-drive': '#4ade80',
  cooling: '#fbbf24',
  'engine-structure': '#94a3b8',
  lubrication: '#c084fc',
  intake: '#22d3ee',
  exhaust: '#f87171',
  fuel: '#facc15',
  electrical: '#a78bfa',
  body: '#64748b',
};

export function systemStyle(system: string | undefined): CSSProperties {
  return { '--sys': SYSTEM_HUE[system ?? 'body'] ?? '#64748b' } as CSSProperties;
}

export function systemLabel(system: string): string {
  return system.replace(/-/g, ' ');
}

/** Cite a source. Unauthorized mirrors are named but never linked. */
export function Source({ reference }: { reference: SourceRef }) {
  const source = sourcesById.get(reference.sourceId);
  if (!source) return <span>{reference.sourceId}</span>;
  const text = reference.locator ? `${source.title} — ${reference.locator}` : source.title;
  if (sourceIsLinkable(source)) {
    return (
      <a href={source.access.url} rel="noreferrer noopener" target="_blank">
        {text}
      </a>
    );
  }
  return <span>{text}</span>;
}

/** Warnings and cautions are never folded away. */
export function Alerts({ cautions }: { cautions: Caution[] }) {
  if (!cautions.length) return null;
  return (
    <>
      {cautions.map((caution, index) => (
        <p
          className="ww-alert"
          data-level={caution.level}
          key={index}
          role={caution.level === 'warning' ? 'alert' : undefined}
        >
          <span>{caution.text}</span>
        </p>
      ))}
    </>
  );
}

/** The "dig deeper" container. Closed by default, always available. */
export function More({
  title,
  hint,
  children,
  open,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="ww-more" open={open}>
      <summary>
        {title}
        {hint !== undefined ? <small>{hint}</small> : null}
      </summary>
      <div className="ww-more-body">{children}</div>
    </details>
  );
}

export function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ww-block">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

const AXES = ['identity', 'dimensions', 'placement', 'fitment', 'procedure'] as const;

/** The five verification axes, shown separately — they are not one flag. */
export function Verification({ verification }: { verification: Record<string, VerificationAxis> }) {
  return (
    <dl className="ww-kv">
      {AXES.map((axis) => (
        <div key={axis} style={{ display: 'contents' }}>
          <dt>{axis === 'procedure' ? 'Used in a procedure' : axis}</dt>
          <dd>
            <Tag status={verification[axis].status} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SourceLines({ references }: { references: SourceRef[] }) {
  if (!references.length) return null;
  return (
    <ul>
      {references.map((reference, index) => (
        <li key={`${reference.sourceId}-${index}`}>
          <Source reference={reference} />
        </li>
      ))}
    </ul>
  );
}

export function GapLines({ gaps }: { gaps: string[] }) {
  if (!gaps.length) return null;
  return (
    <ul>
      {gaps.map((gap, index) => (
        <li key={index}>{gap}</li>
      ))}
    </ul>
  );
}
