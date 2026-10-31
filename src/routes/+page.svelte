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

  $: visibleScores = scores.filter((score) => score.name.toLowerCase().includes(query.trim().toLowerCase()));

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
        <button class:selected={selected?.id === score.id} class="score-item" type="button" on:click={() => (selected = score)}>
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
        <div class="staff"><span>𝄞</span><span class="notes">♩ ♪ ♫ ♩ ♫ ♪</span></div>
        <p>{selected.format.toUpperCase()} · {selected.path}</p>
        <p class="notice">Score rendering is client-side. Connect a MusicXML or MuseScore-compatible renderer to display notation.</p>
      </div>
    {:else}
      <div class="empty">Select a score from the catalog to begin.</div>
    {/if}
    <div class="controls">
      <button type="button" disabled={!selected} on:click={() => (playing = !playing)}>{playing ? "❚❚ Pause" : "▶ Play"}</button>
      <label for="tempo">Tempo <input id="tempo" bind:value={settings.tempo} on:change={saveSettings} type="range" min="20" max="300" /><output>{settings.tempo} BPM</output></label>
    </div>
  </section>
</main>
