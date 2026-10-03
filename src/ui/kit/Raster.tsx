'use client';
import { useContext, useLayoutEffect, useRef, CSSProperties } from 'react';
import { PixelContext } from './PixelContext';
import { BitmapImage } from './bitmap';
/** The compositor snaps pixelated images to CSS pixels. Anchor the canvas at a whole
 * CSS coordinate, then encode the desired device-pixel offset as transparent raster
 * padding. Glyph cells still occupy exactly n×n physical pixels. */
export function Raster({ image, className = '', style }: { image: BitmapImage; className?: string; style?: CSSProperties }) {
  const { dpr,motionFrame } = useContext(PixelContext);
  const ref = useRef<HTMLCanvasElement>(null);
  const physicalWidth = Math.ceil(image.width / dpr) * dpr;
  const physicalHeight = Math.ceil(image.height / dpr) * dpr;
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas || typeof CanvasRenderingContext2D === 'undefined') return;
    const draw = () => {
      canvas.style.left = typeof style?.left === 'number' ? `${style.left}px` : style?.left ?? '0px';
      canvas.style.top = typeof style?.top === 'number' ? `${style.top}px` : style?.top ?? '0px';
      const rect = canvas.getBoundingClientRect();
      const anchorX = Math.floor(rect.left), anchorY = Math.floor(rect.top);
      const prefixX = Math.round(rect.left * dpr) - Math.round(anchorX * dpr);
      const prefixY = Math.round(rect.top * dpr) - Math.round(anchorY * dpr);
      const width = Math.ceil((image.width + prefixX) / dpr) * dpr;
      const height = Math.ceil((image.height + prefixY) / dpr) * dpr;
      canvas.width = width; canvas.height = height;
      canvas.style.width = `${width / dpr}px`; canvas.style.height = `${height / dpr}px`;
      canvas.style.left = `calc(${typeof style?.left === 'number' ? `${style.left}px` : style?.left ?? '0px'} + ${anchorX - rect.left}px)`;
      canvas.style.top = `calc(${typeof style?.top === 'number' ? `${style.top}px` : style?.top ?? '0px'} + ${anchorY - rect.top}px)`;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.imageSmoothingEnabled = false;
      context.putImageData(new ImageData(image.data as Uint8ClampedArray<ArrayBuffer>, image.width, image.height), prefixX, prefixY);
      canvas.dataset.ready = 'true';
    };
    draw();
    // Parent positioning can change after Window measurement or viewport centering.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(draw);
    if (canvas.parentElement) observer?.observe(canvas.parentElement);
    window.addEventListener('resize', draw);
    return () => { observer?.disconnect(); window.removeEventListener('resize', draw); };
  }, [image, dpr, motionFrame, style?.left, style?.top]);
  return <canvas ref={ref} data-bitmap="true" aria-hidden="true" className={className}
    width={physicalWidth} height={physicalHeight} style={{ position:'relative', width:physicalWidth/dpr, height:physicalHeight/dpr, imageRendering:'pixelated', display:'block', pointerEvents:'none', ...style }} />;
}
