// Shared pieces that show where a statement comes from, and how well it is
// established. Nothing in the interface states a value without one of these.

import type { ReactNode } from 'react';
import {
  sourceIsLinkable,
  sourcesById,
  type Caution,
  type SourceRef,
  type VerificationAxis,
} from '../content/catalog';

/** How much weight a status carries, so the pill reads at a glance. */
const STATUS_LEVEL: Record<string, 'weak' | 'neutral' | 'strong'> = {
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

const STATUS_LABEL: Record<string, string> = {
  'not-established': 'not established',
  'not-entered': 'not entered',
  'mirror-derived': 'mirror-derived',
  'not-applicable': 'n/a',
  'educational-overview': 'educational overview',
};

export function StatusPill({ status, prefix }: { status: string; prefix?: string }) {
  const level = STATUS_LEVEL[status] ?? 'neutral';
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span className="wr-pill" data-level={level}>
      {prefix ? `${prefix}: ` : ''}
      {label}
    </span>
  );
}

/** The five verification axes, each shown separately — they are not one flag. */
export function VerificationAxes({
  verification,
}: {
  verification: Record<string, VerificationAxis>;
}) {
  const order = ['identity', 'dimensions', 'placement', 'fitment', 'procedure'];
  return (
    <div className="wr-axes">
      {order.map((axis) => (
        <span className="wr-axis" key={axis}>
          <span>{axis}</span>
          <StatusPill status={verification[axis].status} />
        </span>
      ))}
    </div>
  );
}

/**
 * Cite a source. Unauthorized mirrors are named but never linked, so the
 * interface does not drive traffic to them.
 */
export function SourceCitation({ reference }: { reference: SourceRef }) {
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
  return (
    <span>
      {text} <StatusPill status={source.usageRights.status === 'unauthorized-mirror' ? 'mirror-derived' : 'documented'} />
    </span>
  );
}

export function SourceList({ references, label = 'Sources' }: { references: SourceRef[]; label?: string }) {
  if (!references.length) return null;
  return (
    <section className="wr-block">
      <h2>{label}</h2>
      <ul>
        {references.map((reference, index) => (
          <li key={`${reference.sourceId}-${index}`}>
            <SourceCitation reference={reference} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Cautions({ cautions }: { cautions: Caution[] }) {
  if (!cautions.length) return null;
  return (
    <section className="wr-block">
      <h2>Cautions</h2>
      <ul>
        {cautions.map((caution, index) => (
          <li className="wr-banner" key={index} role={caution.level === 'warning' ? 'alert' : undefined}>
            <strong>{caution.level === 'warning' ? 'Warning' : 'Caution'}</strong>
            <span>{caution.text}</span>
            {caution.sourceRef ? (
              <span>
                (<SourceCitation reference={caution.sourceRef} />)
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Gaps({ gaps, label = 'Known gaps' }: { gaps: string[]; label?: string }) {
  if (!gaps.length) return null;
  return (
    <section className="wr-block">
      <h2>{label}</h2>
      <ul>
        {gaps.map((gap, index) => (
          <li key={index} style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>
            {gap}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="wr-block">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
