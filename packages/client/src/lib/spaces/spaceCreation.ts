import { api, API_BASE_URL } from "$lib/utils/api";
import type { SpaceCreationResponse } from "@core/apiTypes";
import { createNewInBrowserSpaceSync, createNewInBrowserSpaceSyncWithOps, InBrowserSpaceSync, loadExistingInBrowserSpaceSync } from "./InBrowserSpaceSync";
import { spaceStore } from "./spaceStore.svelte";
import { RepTree, uuid } from "@core";
import Space from "@core/spaces/Space";

export async function createNewLocalSpace() {
  const sync = await createNewInBrowserSpaceSync();
  spaceStore.addSpaceConnection(sync, "browser://" + sync.space.getId());
  spaceStore.currentSpaceId = sync.space.getId();
}

export async function createNewSyncedSpace() {
  const response = await api.post<SpaceCreationResponse>('/spaces');

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to create space');
  }

  const sync = await createNewInBrowserSpaceSyncWithOps(response.data.operations);
  spaceStore.addSpaceConnection(sync, `${API_BASE_URL}/spaces/` + sync.space.getId());
  spaceStore.currentSpaceId = sync.space.getId();
}