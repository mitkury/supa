<script lang="ts">
  import ModelProviderSelector from "../models/ModelProviderSelector.svelte";
  import ModelProviders from "../models/ModelProviders.svelte";
  import { txtStore } from "$lib/stores/txtStore";
  import { swins } from "$lib/swins";

  let {
    selectedModel,
    onModelSelect,
  }: {
    selectedModel: string | null;
    onModelSelect: (model: string) => void;
  } = $props();

  type Status = "selecting" | "managing";
  let status: Status = $state("selecting");

  function onRequestClose() {
    swins.pop();
  }
</script>

<div class="md:min-w-[500px]">
  {#if status === "selecting"}
    <ModelProviderSelector {selectedModel} {onModelSelect} />
    <div class="grid gap-4 mt-4">
      <button
        class="btn preset-outlined-surface-500"
        onclick={() => (status = "managing")}>{$txtStore.modelSelection.manageProviders}</button
      >
      <button class="btn preset-filled-primary-500" onclick={onRequestClose}>{$txtStore.modelSelection.done}</button>
    </div>
  {:else}
    <ModelProviders />
    <div class="grid">
      <button
        class="btn preset-outlined-surface-500"
        onclick={() => (status = "selecting")}>{$txtStore.modelSelection.backToSelection}</button
      >
    </div>
  {/if}
</div>
