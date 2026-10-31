export type ScoreFormat = "musicxml" | "mxl" | "mscz";

export interface Score {
  id: string;
  name: string;
  path: string;
  format: ScoreFormat;
  modifiedAt: string | null;
  size: number | null;
}

export interface Settings {
  voiceVolumes: Record<string, number>;
  emphasizedVoices: string[];
  mutedVoices: string[];
  tempo: number;
}
