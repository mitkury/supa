<script lang="ts">
  import { EllipsisVertical } from "lucide-svelte";
  import { goto } from "$app/navigation";
  import ContextMenu from "$lib/comps/ui/ContextMenu.svelte";
  import { spaceStore } from "$lib/spaces/spaceStore.svelte";

  let { appTreeId }: { appTreeId: string } = $props();
  let openState = $state(false);

  function popoverClose() {
    openState = false;
  }

  function startRenamingThread() {
    // @TODO: implement renaming
    popoverClose();
  }

  function openInNewTab() {
    // @TODO: implement opening in new tab
    popoverClose();
  }

  function duplicateThread() {
    // @TODO: implement duplication
    popoverClose();
  }

  async function deleteThread() {
    spaceStore.currentSpace?.deleteAppTree(appTreeId);
    goto("/");
    popoverClose();
  }
</script>

<div class="flex justify-center items-center mt-1 mr-2">
  <ContextMenu
    open={openState}
    onOpenChange={(e) => (openState = e.open)}
    placement="bottom"
    triggerClassNames=""
  >
    {#snippet trigger()}
      <EllipsisVertical size={14} />
    {/snippet}

    {#snippet content()}
      <div class="flex flex-col gap-1">
        <button class="btn btn-sm text-left" onclick={openInNewTab}
          >Open in a new tab</button
        >
        <button class="btn btn-sm text-left" onclick={startRenamingThread}
          >Rename</button
        >

        <div class="border-t border-surface-200-800 my-2"></div>

        <button class="btn btn-sm text-left" onclick={duplicateThread}
          >Duplicate</button
        >
        <button
          class="btn btn-sm preset-filled-error-500 text-left"
          onclick={deleteThread}>Delete</button
        >
      </div>
    {/snippet}
  </ContextMenu>
</div>
