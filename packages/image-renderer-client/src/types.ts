export type RenderType = 'player-achievement' | 'match-summary' | 'totw';

export interface RenderJob {
  type: RenderType;
  data: Record<string, unknown>;
}
