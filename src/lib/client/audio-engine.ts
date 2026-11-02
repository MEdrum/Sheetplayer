import type { AudioSource } from "$lib/types";

export interface RecordedTrack {
  voice: string;
  url: string;
}

interface ActiveSource {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export class RecordedVoiceEngine {
  private context: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private active: ActiveSource[] = [];
  private offset = 0;
  private startedAt = 0;
  private playing = false;

  async load(tracks: RecordedTrack[]): Promise<void> {
    this.context ??= new AudioContext();
    await Promise.all(tracks.map(async (track) => {
      if (this.buffers.has(track.voice)) return;
      const response = await fetch(track.url);
      if (!response.ok) throw new Error(`Recorded ${track.voice} audio is unavailable.`);
      this.buffers.set(track.voice, await this.context!.decodeAudioData(await response.arrayBuffer()));
    }));
  }

  async play(selection: Record<string, AudioSource>, volumes: Record<string, number>): Promise<void> {
    if (!this.context) this.context = new AudioContext();
    await this.context.resume();
    this.stopSources();
    const when = this.context.currentTime + 0.05;
    for (const [voice, buffer] of this.buffers) {
      const sourceMode = selection[voice] ?? "virtual";
      if (sourceMode !== "recorded") continue;
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      gain.gain.value = volumes[voice] ?? 1;
      source.buffer = buffer;
      source.connect(gain).connect(this.context.destination);
      source.start(when, this.offset);
      this.active.push({ source, gain });
    }
    this.startedAt = when - this.offset;
    this.playing = true;
  }

  pause(): void {
    if (!this.context || !this.playing) return;
    this.offset = Math.max(0, this.context.currentTime - this.startedAt);
    this.stopSources();
    this.playing = false;
  }

  stop(): void {
    this.offset = 0;
    this.stopSources();
    this.playing = false;
  }

  seek(seconds: number): void {
    this.offset = Math.max(0, seconds);
    if (this.playing) this.pause();
  }

  destroy(): void {
    this.stop();
    void this.context?.close();
    this.context = null;
    this.buffers.clear();
  }

  private stopSources(): void {
    for (const active of this.active) {
      try { active.source.stop(); } catch { /* source may already have ended */ }
      active.source.disconnect();
      active.gain.disconnect();
    }
    this.active = [];
  }
}
