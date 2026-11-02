<script lang="ts">
  import type { PageData } from "./$types";
  import type { Score, Settings } from "$lib/types";
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
  let renderer: { destroy?: () => void } | null = null;
  let renderError = "";
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
      api.load(`/api/scores/${score.id}/musicxml`);
      renderer = api;
    } catch (error) {
      renderError = error instanceof Error ? error.message : "The score could not be rendered.";
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
        <div class="notation" bind:this={scoreHost}></div>
        <p class="notice">{selected.format.toUpperCase()} · notation and lyrics are rendered client-side.</p>
      </div>
    {:else}
      <div class="empty">Select a score from the catalog to begin.</div>
    {/if}
    <div class="controls">
      <button type="button" disabled={!selected} on:click={() => (playing = !playing)}>{playing ? "❚❚ Pause" : "▶ Play"}</button>
      <label for="tempo">Tempo <input id="tempo" bind:value={settings.tempo} on:change={saveSettings} type="range" min="20" max="300" /><output>{settings.tempo} BPM</output></label>
      <label for="audio-source">All voices
        <select id="audio-source" bind:value={settings.globalAudioSource} on:change={saveSettings}>
          <option value="virtual">Virtual instruments</option>
          <option value="recorded">Recorded voices</option>
        </select>
      </label>
    </div>
    <fieldset class="voice-mix"><legend>Voice audio</legend>
      {#each voices as voice}
        <label><span>{voice}</span><select bind:value={settings.voiceMixes[voice]} on:change={saveSettings}><option value="virtual">Virtual</option><option value="recorded">Recorded</option><option value="muted">Muted</option></select></label>
      {/each}
    </fieldset>
  </section>
</main>
