// Screen-space markers over the model.
//
// React owns which markers exist; the scene owns where they are. Positions are
// written straight to the DOM from the render loop, so orbiting the camera
// costs no React renders at all.

import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { ScreenPoint } from '../viewer/assembly-scene';
import { systemStyle } from './bits';

export interface HotspotsHandle {
  apply(points: ScreenPoint[]): void;
}

export interface HotspotTarget {
  componentId: string;
  name: string;
  system: string;
}

interface Props {
  targets: HotspotTarget[];
  selected: string | null;
  /** Labels stay visible on touch, where there is no hover. */
  alwaysLabel: boolean;
  onPick: (componentId: string) => void;
}

export const Hotspots = forwardRef<HotspotsHandle, Props>(function Hotspots(
  { targets, selected, alwaysLabel, onPick },
  ref,
) {
  const nodes = useRef(new Map<string, HTMLButtonElement>());

  useImperativeHandle(ref, () => ({
    apply(points) {
      const seen = new Set<string>();

      // Markers on nearby parts land on top of each other, and two overlapping
      // labels are worse than one nudged label. Push them apart vertically,
      // nearest the camera first.
      const placed = points
        .filter((point) => !point.offscreen)
        .sort((a, b) => a.y - b.y)
        .map((point) => ({ ...point }));
      const MIN_GAP = 44;
      for (let i = 1; i < placed.length; i++) {
        const gap = placed[i].y - placed[i - 1].y;
        if (gap < MIN_GAP) placed[i].y = placed[i - 1].y + MIN_GAP;
      }

      for (const point of placed) {
        const node = nodes.current.get(point.componentId);
        if (!node) continue;
        seen.add(point.componentId);
        node.hidden = false;
        node.style.transform = `translate3d(${Math.round(point.x)}px, ${Math.round(point.y)}px, 0) translateY(-50%)`;
        node.dataset.occluded = String(point.occluded);
      }
      // Anything the scene did not report is not currently placeable.
      for (const [componentId, node] of nodes.current) {
        if (!seen.has(componentId)) node.hidden = true;
      }
    },
  }));

  return (
    <div className="ww-hotspots" aria-hidden={targets.length === 0}>
      {targets.map((target) => (
        <button
          className="ww-hotspot"
          key={target.componentId}
          type="button"
          hidden
          data-always={alwaysLabel || selected === target.componentId}
          data-selected={selected === target.componentId}
          style={systemStyle(target.system)}
          aria-label={`Open ${target.name}`}
          onClick={() => onPick(target.componentId)}
          ref={(node) => {
            if (node) nodes.current.set(target.componentId, node);
            else nodes.current.delete(target.componentId);
          }}
        >
          <span className="ww-dot" />
          <span className="ww-hotspot-label">{target.name}</span>
        </button>
      ))}
    </div>
  );
});
