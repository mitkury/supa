<script lang="ts">
  import { onMount } from "svelte";
  import Loading from "$lib/comps/basic/Loading.svelte";
  import TauriWindowSetup from "$lib/comps/tauri/TauriWindowSetup.svelte";
  import { isTauri } from "$lib/tauri/isTauri";
  import { spaceStore } from "$lib/spaces/spaceStore.svelte";
  import FreshStartWizard from "$lib/comps/wizards/FreshStartWizard.svelte";
  import {
    initializeDatabase,
    savePointers,
    saveCurrentSpaceId,
    saveConfig,
  } from "$lib/localDb";
  import {
    theme,
  } from "$lib/stores/theme.svelte";
  import { getCurrentColorScheme } from "$lib/utils/updateColorScheme";
  import TauriUpdater from "./TauriUpdater.svelte";
  import ThemeManager from "./themes/ThemeManager.svelte";

  type Status = "initializing" | "needsSpace" | "ready";

  let { children } = $props();
  let status: Status = $state("initializing");

  onMount(() => {
    if (!isTauri()) {
      throw new Error(
        "We don't support regular browsers yet. We have to run this from Tauri",
      );
    }

    // Initialize with system color scheme
    const systemColorScheme = getCurrentColorScheme();
    theme.colorScheme = systemColorScheme;

    initializeSpaceData();

    return () => {
      spaceStore.disconnectAllSpaces();
    };
  });

  async function initializeSpaceData() {
    try {
      // Explicitly set status to initializing (already the default, but making it explicit)
      status = "initializing";

      // Initialize data from database
      const { pointers, currentSpaceId, config } = await initializeDatabase();

      // Set initial state to the spaceStore
      spaceStore.setInitialState({
        pointers,
        currentSpaceId,
        config,
      });

      const connection = await spaceStore.loadSpacesAndConnectToCurrent();

      // Only change status after loading is complete
      status = connection ? "ready" : "needsSpace";
    } catch (error) {
      console.error("Failed to initialize space state from database:", error);
      // Keep initializing state on error? Or maybe add an error state?
    }
  }

  // Effects for persisting state changes
  $effect(() => {
    if (status === "ready") {
      savePointers(spaceStore.pointers);
    }
  });

  $effect(() => {
    if (status === "ready" && spaceStore.currentSpaceId !== null) {
      saveCurrentSpaceId(spaceStore.currentSpaceId);
    }
  });

  $effect(() => {
    if (status === "ready") {
      saveConfig(spaceStore.config);
    }
  });

  // Track the number of spaces and switch to setup state when there are none
  $effect(() => {
    // Only check when we're in ready state and have access to the pointers
    if (status === "ready" && spaceStore.pointers.length === 0) {
      console.log("No spaces left, switching to setup state");
      status = "needsSpace";
    }
  });

  async function onSpaceSetup(spaceId: string) {
    status = "ready";
  }
</script>

<!-- Check for a theme and load it (either the default or the space theme) -->
<ThemeManager />

{#if status === "initializing"}
  <Loading />
{:else if status === "needsSpace"}
  <FreshStartWizard {onSpaceSetup} />
{:else if status === "ready"}
  {@render children?.()}
{/if}

{#if isTauri()}
  <!-- Save and load the window size and position -->
  <TauriWindowSetup />

  <!-- Check for a new version of the app -->
  <TauriUpdater />
{/if}
