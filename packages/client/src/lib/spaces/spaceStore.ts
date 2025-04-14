import type { Readable, Writable } from "svelte/store";
import { writable, get, derived } from "svelte/store";
import { persisted, type Persisted } from 'svelte-persisted-store';
import type { SpacePointer } from "./SpacePointer";
import type Space from "@core/spaces/Space";
import { loadSpaceFromPointer } from "./LocalSpaceSync";

/**
 * A persistent store of pointers to spaces.
 * We use pointers to connect to spaces.
 */
export const spacePointersStore: Persisted<SpacePointer[]> = persisted(
  "spacePointers",
  [],
);

/**
 * The current space id. It's used in pair with spacesStore.
 */
export const currentSpaceIdStore: Persisted<string | null> = persisted(
  "currentSpaceId",
  null,
);

/**
 * A store of actual connected spaces constructed from space pointers.
 */
export const spaceStore: Writable<Space[]> = writable<Space[]>([]);

/**
 * A derived store of the current space.
 * It's used to get the current space from the spacesStore.
 * @returns The current space or null.
 */
export const currentSpaceStore: Readable<Space | null> = derived(
  [currentSpaceIdStore, spaceStore],
  ([$currentSpaceId, $space]) => {
    return $space.find(space => space.getId() === $currentSpaceId) || null;
  }
);

/**
 * A shortcut to get the current space id.
 * @returns The current space id or null.
 */
export function getCurrentSpaceId(): string | null {
  return get(currentSpaceIdStore);
}

/**
 * Create spaces from pointers and return the current one.
 * Use it only once on startup.
 * @returns The current space or null.
 */
export async function loadSpacesAndConnectToCurrent(): Promise<Space | null> {
  if (get(spaceStore).length > 0) {
    throw new Error("Spaces already loaded. Can do it only once.");
  }

  const spaces: Space[] = [];
  let currentSpace: Space | null = null;

  // Try loading spaces from pointers
  for (const pointer of get(spacePointersStore)) {
    try {
      const space = await loadAndConnectToSpace(pointer);
      spaces.push(space);

      if (space.getId() === get(currentSpaceIdStore)) {
        currentSpace = space;
      }
    } catch (error) {
      console.error("Could not load space", pointer, error);
    }
  }

  // If we couldn't connect to the current space in the previous loop, 
  // use the first one as the current space.
  if (!currentSpace && spaces.length > 0) {
    currentSpace = spaces[0];
    currentSpaceIdStore.set(currentSpace.getId());
  }

  spaceStore.set(spaces);

  return currentSpace;
}

export function setLastPageUrlInSpace(url: string) {
  const currentSpace = get(currentSpaceStore);

  if (!currentSpace) {
    return;
  }

  // Get the pointer corresponding to the current space
  const pointer = get(spacePointersStore).find((pointer) => pointer.id === currentSpace?.getId());
  if (pointer) {
    pointer.lastPageUrl = url;
    // Update the pointer in the store
    spacePointersStore.set(get(spacePointersStore));
  }
}

export function getCurrentSpacePointer(): SpacePointer | null {
  return get(spacePointersStore).find((pointer) => pointer.id === get(currentSpaceIdStore)) || null;
}

async function loadAndConnectToSpace(pointer: SpacePointer): Promise<Space> {
  const uri = pointer.uri;

  if (uri.startsWith("http")) {
    throw new Error("Remote spaces are not implemented yet");
  }

  const spaceSync = await loadSpaceFromPointer(pointer);
  return spaceSync.space;
}

export function addLocalSpace(space: Space, path: string) {
  spaceStore.update((spaces) => {
    return [...spaces, space];
  });

  const pointer: SpacePointer = {
    id: space.getId(),
    uri: path,
    name: space.name || null,
    createdAt: space.createdAt,
  }

  spacePointersStore.update((pointers) => {
    return [...pointers, pointer];
  });
}

export function getLoadedSpaceFromPointer(pointer: SpacePointer): Space | null {
  return get(spaceStore).find((space) => space.getId() === pointer.id) || null;
}

export function removeSpace(pointerId: string) {
  // Remove from pointers
  const pointers = get(spacePointersStore);
  const updatedPointers = pointers.filter(p => p.id !== pointerId);
  spacePointersStore.set(updatedPointers);

  // Remove from loaded spaces
  const spaces = get(spaceStore);
  spaceStore.set(spaces.filter(s => s.getId() !== pointerId));

  // If this was the current space, try to select another one
  if (get(currentSpaceIdStore) === pointerId) {
    const nextSpace = updatedPointers[0];
    currentSpaceIdStore.set(nextSpace?.id || null);
  }
}