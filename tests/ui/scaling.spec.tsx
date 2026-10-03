import { describe, expect, it } from 'vitest';
import { getIntegerViewportScale } from '../../src/ui/kit/GameViewport';

describe('integer GBA viewport scale', () => {
  it.each([
    [1280, 720, 4],
    [960, 640, 4],
    [720, 480, 3],
    [640, 360, 2],
    [600, 400, 2],
    [390, 844, 1],
    [844, 390, 2],
    [320, 240, 1],
  ])('fits %ix%i at integer scale %i', (width, height, expectedScale) => {
    const scale = getIntegerViewportScale(width, height);
    expect(scale).toBe(expectedScale);
    expect(Number.isInteger(scale)).toBe(true);
    expect((240 * scale) / (160 * scale)).toBe(3 / 2);
    expect(240 * scale).toBeLessThanOrEqual(width);
    expect(160 * scale).toBeLessThanOrEqual(height);
  });

  it('falls back to 1x for unavailable measurements', () => {
    expect(getIntegerViewportScale(0, 0)).toBe(1);
    expect(getIntegerViewportScale(Number.NaN, 720)).toBe(1);
  });
});
