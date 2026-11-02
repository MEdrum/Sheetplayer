<script lang="ts">
  import type { PageData } from "./$types";
  import type { AudioSource, Score, Settings } from "$lib/types";
  import { RecordedVoiceEngine } from "$lib/client/audio-engine";
  import { onMount } from "svelte";

  export let data: PageData;
  let scores: Score[] = [];
  let selected: Score | null = null;
  let query = "";
  let status = "Loading catalog…";
  let settings: Settings = data.initialSettings;
  let playing = false;
  let catalogLoaded = false;
  let scoreHost: HTMLDivElement;
  let renderer: import("@coderline/alphatab").AlphaTabApi | null = null;
  let renderError = "";
  let audioError = "";
  let audioEngine: RecordedVoiceEngine | null = null;
  let loop = false;
  let metronome = false;
  let countIn = false;
  let speed = 1;
  let zoom = 1;
  let follow = true;
  let page = 1;
  let totalPages = 1;
  let position = "00:00.00";
  let trackMutes: Record<number, boolean> = {};
  let trackSolos: Record<number, boolean> = {};
  let trackVolumes: Record<number, number> = {};
  const voices = ["soprano", "mezzo", "alto", "tenor", "bass"];

  $: visibleScores = scores.filter((score) => score.name.toLowerCase().includes(query.trim().toLowerCase()));

  async function loadScore(score: Score) {
    renderError = "";
    selected = score;
    try {
      const { AlphaTabApi } = await import("@coderline/alphatab");
      renderer?.destroy?.();
      scoreHost.replaceChildren();
      const api = new AlphaTabApi(scoreHost, { player: { enablePlayer: true, enableCursor: true } });
      api.scoreLoaded.on(() => {
        totalPages = (api.renderer as unknown as { totalPages?: number })?.totalPages ?? 1;
        page = 1;
      });
      api.playerPositionChanged.on((args) => {
        const current = Math.floor(args.currentTime / 1000);
        position = `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(current % 60).padStart(2, "0")}.${String(Math.floor((args.currentTime % 1000) / 10)).padStart(2, "0")}`;
        if (follow) {
          const p = Math.min(totalPages, Math.max(1, Math.ceil((args.currentTick / Math.max(1, args.endTick)) * totalPages)));
          if (p !== page) page = p;
        }
      });
      api.load(`/api/scores/${score.id}/musicxml`);
      renderer = api;
      audioEngine?.destroy();
      audioEngine = new RecordedVoiceEngine();
      await Promise.all(voices.map(async (voice) => {
        try {
          await audioEngine!.load([{ voice, url: `/api/scores/${score.id}/audio/${voice}` }]);
        } catch {
          // A missing voice recording is valid; virtual playback remains available.
        }
      }));
    } catch (error) {
      renderError = error instanceof Error ? error.message : "The score could not be rendered.";
    }

    }

    function sourceFor(voice: string): AudioSource {
      return settings.voiceMixes[voice] ?? settings.globalAudioSource;
    }

    function toggleLoop() {
      loop = !loop;
      if (renderer) renderer.isLooping = loop;
    }

    function toggleMetronome() {
      metronome = !metronome;
      if (renderer) renderer.metronomeVolume = metronome ? 1 : 0;
    }

    function toggleCountIn() {
      countIn = !countIn;
      if (renderer) renderer.countInVolume = countIn ? 1 : 0;
    }

    function setSpeed(value: number) {
      speed = value;
      if (renderer) renderer.playbackSpeed = value;
    }

    function setZoom(value: number) {
      zoom = Math.min(2, Math.max(0.5, value));
      if (renderer?.settings) {
        renderer.settings.display.scale = zoom;
        renderer.updateSettings();
      }
    }

    function setPage(value: number) {
      page = Math.min(totalPages, Math.max(1, value));
      const facade = renderer?.uiFacade as unknown as { getScrollElement?: () => { scrollHeight?: number }; scrollToY?: (el: unknown, offset: number, speed: number) => void };
      const scroll = facade?.getScrollElement?.();
      if (scroll) {
        const height = scroll.scrollHeight ?? 0;
        facade?.scrollToY?.(scroll, ((page - 1) * height) / Math.max(1, totalPages), 0);
      }
    }

    function toggleFollow() {
      follow = !follow;
    }

    function setTrackMute(index: number, mute: boolean) {
      trackMutes[index] = mute;
      if (renderer?.score?.tracks?.[index]) renderer.changeTrackMute([renderer.score.tracks[index]], mute);
    }

    function setTrackSolo(index: number, solo: boolean) {
      trackSolos[index] = solo;
      if (renderer?.score?.tracks?.[index]) renderer.changeTrackSolo([renderer.score.tracks[index]], solo);
    }

    function setTrackVolume(index: number, volume: number) {
      trackVolumes[index] = volume;
      if (renderer?.score?.tracks?.[index]) renderer.changeTrackVolume([renderer.score.tracks[index]], volume);
    }

    async function togglePlayback() {
      if (!renderer || !selected) return;
      audioError = "";
      try {
        const hasRecorded = voices.some((voice) => sourceFor(voice) === "recorded");
        const hasVirtual = voices.some((voice) => sourceFor(voice) === "virtual");
        if (playing) {
          renderer.pause?.();
          audioEngine?.pause();
        } else {
          if (hasRecorded) await audioEngine?.play(settings.voiceMixes, settings.voiceVolumes);
          if (hasVirtual) renderer.play?.();
        }
        playing = !playing;
      } catch (error) {
        audioError = error instanceof Error ? error.message : "Audio playback could not start.";
      }
    }

  async function loadCatalog() {
    try {
      const response = await fetch("/api/catalog");
      const result = await response.json();
      scores = result.scores;
      status = result.error ?? `${scores.length} score${scores.length === 1 ? "" : "s"}`;
    } catch {
      status = "Catalog unavailable";
    } finally {
      catalogLoaded = true;
    }
  }

  async function saveSettings() {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings)
    });
  }

  async function clearData() {
    await fetch("/api/settings", { method: "DELETE" });
    location.reload();
  }

  async function toggleFullscreen() {
    await document.documentElement.requestFullscreen?.();
  }

  onMount(() => {
    loadCatalog();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
</script>

<svelte:head>
  <title>Sheetplayer</title>
  <meta name="theme-color" content="#111318" />
</svelte:head>

<header class="topbar">
  <strong>Sheetplayer</strong>
  <span class="status" role="status">{status}</span>
  <button type="button" on:click={clearData}>Clear data</button>
</header>

<main class="layout">
  <aside class="catalog" aria-label="Score catalog">
    <h1>Scores</h1>
    <label class="sr-only" for="filter">Filter scores</label>
    <input id="filter" bind:value={query} type="search" placeholder="Filter scores" />
    {#if !catalogLoaded}
      <p class="muted">Loading catalog…</p>
    {:else if !visibleScores.length}
      <p class="muted">{scores.length ? "No matching scores." : "No scores are available."}</p>
    {:else}
      {#each visibleScores as score}
        <button class:selected={selected?.id === score.id} class="score-item" type="button" on:click={() => loadScore(score)}>
          <span>{score.name}</span>
          <small>{score.format.toUpperCase()}{score.modifiedAt ? ` · ${new Date(score.modifiedAt).toLocaleDateString()}` : ""}</small>
        </button>
      {/each}
    {/if}
  </aside>

  <section class="player" aria-label="Score player">
    <div class="player-head">
      <div><p class="eyebrow">Now selected</p><h2>{selected?.name ?? "Choose a score"}</h2></div>
      <button type="button" on:click={toggleFullscreen}>Fullscreen</button>
    </div>
    {#if selected}
      <div class="score">
        {#if renderError}<p class="error">{renderError}</p>{/if}
        {#if audioError}<p class="error">{audioError}</p>{/if}
        <div class="notation" bind:this={scoreHost}></div>
        <p class="notice">{selected.format.toUpperCase()} · notation and lyrics are rendered client-side.</p>
      </div>
    {:else}
      <div class="empty">Select a score from the catalog to begin.</div>
    {/if}
    <div class="controls">
      <button type="button" disabled={!selected} on:click={togglePlayback}>{playing ? "❚❚ Pause" : "▶ Play"}</button>
      <button type="button" disabled={!selected} on:click={() => { renderer?.stop?.(); audioEngine?.stop(); playing = false; }}>⏹ Stop</button>
      <button class:active={loop} type="button" disabled={!selected} on:click={toggleLoop}>🔁 Loop</button>
      <button class:active={metronome} type="button" disabled={!selected} on:click={toggleMetronome}>Klick</button>
      <button class:active={countIn} type="button" disabled={!selected} on:click={toggleCountIn}>Vorzähler</button>
      <label>Speed <select value={speed} on:change={(event) => setSpeed(Number(event.currentTarget.value))}><option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1">1x</option><option value="1.5">1.5x</option><option value="2">2x</option></select></label>
      <label>Zoom <input type="range" min="0.5" max="2" step="0.1" value={zoom} on:input={(event) => setZoom(Number(event.currentTarget.value))} /><output>{Math.round(zoom * 100)}%</output></label>
      <button class:active={follow} type="button" on:click={toggleFollow}>Folgen</button>
      <span class="position">{position}</span>
      <label for="tempo">Tempo <input id="tempo" bind:value={settings.tempo} on:change={saveSettings} type="range" min="20" max="300" /><output>{settings.tempo} BPM</output></label>
      <label for="audio-source">All voices
        <select id="audio-source" bind:value={settings.globalAudioSource} on:change={saveSettings}>
          <option value="virtual">Virtual instruments</option>
          <option value="recorded">Recorded voices</option>
        </select>
      </label>
    </div>
    {#if selected}
      <div class="page-nav">
        <button type="button" disabled={page <= 1} on:click={() => setPage(page - 1)}>‹ Vorherige</button>
        <span>{page} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages} on:click={() => setPage(page + 1)}>Nächste ›</button>
      </div>
    {/if}
    {#if selected && renderer?.score?.tracks?.length}
      <fieldset class="track-mix"><legend>Spuren</legend>
        {#each renderer.score.tracks as track, index}
          <div class="track-row">
            <span>{track.name}</span>
            <button class:active={trackMutes[index]} type="button" on:click={() => setTrackMute(index, !trackMutes[index])}>M</button>
            <button class:active={trackSolos[index]} type="button" on:click={() => setTrackSolo(index, !trackSolos[index])}>S</button>
            <input type="range" min="0" max="1" step="0.05" value={trackVolumes[index] ?? 1} on:input={(event) => setTrackVolume(index, Number(event.currentTarget.value))} />
          </div>
        {/each}
      </fieldset>
    {/if}
    <fieldset class="voice-mix"><legend>Voice audio</legend>
      {#each voices as voice}
        <label><span>{voice}</span><select bind:value={settings.voiceMixes[voice]} on:change={saveSettings}><option value="virtual">Virtual</option><option value="recorded">Recorded</option><option value="muted">Muted</option></select></label>
      {/each}
    </fieldset>
  </section>
</main>
