'use client';

/**
 * CUSTOMIZATION: tag on the selected object area
 *
 * Shows ratio and size of the selected empty area in its top-left corner, also while it is
 * resized. Inside the area, because the space above and below it belongs to the canvas menu and
 * the rotate handle; an area too small to hold the tag gets it on its right side.
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { useEffect, useState } from 'react';
import { blockSize, ratioLabel, roleOf } from '@/editor/engine/blocks';
import { useEditorState } from '../store';
import { measure, type Rect } from './canvasFrame';

type Tag = { left: number; top: number; view: Rect; ratio: string; size: string };

export function AreaTag({ cesdk, host }: { cesdk: CreativeEditorSDK; host: HTMLElement | null }) {
  const { markArea } = useEditorState();
  const [tag, setTag] = useState<Tag | null>(null);

  useEffect(() => {
    if (!host) return;
    let raf = 0;
    let last = 'null';
    const tick = () => {
      let next: Tag | null = null;
      try {
        const { engine } = cesdk;
        const selected = engine.block.findAllSelected();
        if (selected.length === 1 && roleOf(engine, selected[0]) === 'area') {
          const frame = measure(cesdk, host, selected[0]);
          const { width, height } = blockSize(engine, selected[0]);
          if (frame) {
            const fits = frame.block.width >= 130 && frame.block.height >= 40;
            next = { left: frame.block.left - frame.view.left + (fits ? 6 : frame.block.width + 10), top: frame.block.top - frame.view.top + (fits ? 6 : 0), view: frame.view, ratio: ratioLabel(width, height), size: `${Math.round(width)} × ${Math.round(height)}` };
          }
        }
      } catch {
        // The engine is going away; the component unmounts with it.
      }
      const key = JSON.stringify(next);
      if (key !== last) {
        last = key;
        setTag(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cesdk, host]);

  if (!tag || markArea) return null;
  return (
    <div className="absolute overflow-hidden pointer-events-none" style={tag.view}>
      <span className="absolute text-xs leading-none text-(--cs-on-accent) bg-(--cs-accent) px-2 py-[5px] rounded-[3px] whitespace-nowrap" style={{ left: tag.left, top: tag.top }}>
        <b className="font-bold">{tag.ratio}</b> · {tag.size}
      </span>
    </div>
  );
}
