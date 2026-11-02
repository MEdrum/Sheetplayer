export type ScoreFormat = "musicxml" | "mxl" | "mscz";

export interface Score {
  id: string;
  name: string;
  path: string;
  format: ScoreFormat;
  modifiedAt: string | null;
  size: number | null;
  ready: boolean;
}

export type VoiceId = "soprano" | "mezzo" | "alto" | "tenor" | "bass" | string;

export interface Voice {
  id: VoiceId;
  name: string;
  abbreviation?: string;
  order: number;
}

export type AudioSource = "virtual" | "recorded" | "muted";

export interface Settings {
  voiceVolumes: Record<string, number>;
  emphasizedVoices: string[];
  mutedVoices: string[];
  tempo: number;
  globalAudioSource: Exclude<AudioSource, "muted">;
  voiceMixes: Record<string, AudioSource>;
}
