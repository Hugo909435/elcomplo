import { ResourceBounds, ResourceDelta, ResourceKey, ResourceState } from '../types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class ResourceManager {
  static applyDelta(state: ResourceState, delta: ResourceDelta, bounds: ResourceBounds): ResourceState {
    const next = { ...state };
    for (const key of Object.values(ResourceKey)) {
      const change = delta[key] ?? 0;
      next[key] = clamp(next[key] + change, bounds.min, bounds.max);
    }
    return next;
  }

  static isCollapsed(state: ResourceState, threshold: number): boolean {
    return Object.values(state).some((value) => value <= threshold);
  }

  static meetsSurvivalThreshold(state: ResourceState, threshold: number): boolean {
    return Object.values(state).every((value) => value >= threshold);
  }
}
