import ChatAppLoader from "$lib/comps/apps/ChatAppLoader.svelte";
import Sidebar from "$lib/comps/sidebar/Sidebar.svelte";
import { currentSpaceIdStore } from "$lib/spaces/spaceStore";
import { createTtabs } from "ttabs-svelte";
import { SKELETON_THEME } from "$lib/ttabs/themes/skeleton";

export const ttabs = createTtabs({
  theme: {
    ...SKELETON_THEME
  }
});

ttabs.registerComponent('sidebar', Sidebar);
ttabs.registerComponent('chat', ChatAppLoader);

let contentGrid: string | undefined;

function setupTtabs() {
  ttabs.resetState();
  const root = ttabs.rootGridId as string;
  const row = ttabs.addRow(root, 100);

  const sidebarColumn = ttabs.addColumn(row, 20); // allow to add with in pixels "200px"
  ttabs.setComponent(sidebarColumn, 'sidebar'); // should I have the same function for tabs and columns?

  const parentColumn = ttabs.addColumn(row, 80);
  contentGrid = ttabs.addGrid(parentColumn);
  ttabs.updateTile(contentGrid, { dontClean: true });
  const newRow = ttabs.addRow(contentGrid, 100);
  const newColumn = ttabs.addColumn(newRow, 100);
  const panel = ttabs.addPanel(newColumn);
}

function findTabByTreeId(treeId: string): string | undefined {
  // Search through all content tiles to find one with the matching treeId
  for (const tileId in ttabs.tiles) {
    const tile = ttabs.tiles[tileId];
    if (tile.type === 'tab') {
      const content = ttabs.getTabContent(tile.id);
      if (
        content?.componentId === 'chat' && 
        content?.data?.componentProps?.treeId === treeId
      ) {
        return tile.id;
      }
    }
  }
  return undefined;
}

export function openChatTab(treeId: string, name: string) {
  // First, check if a tab with this treeId already exists
  const existingTabId = findTabByTreeId(treeId);
  
  if (existingTabId) {
    // If tab exists, just activate it
    ttabs.setFocusedActiveTab(existingTabId);
    return;
  }
  
  // Original logic for creating a new tab
  const grid = ttabs.getGrid(contentGrid!);
  let tab: string;
  
  // Check for a lazy tab and if it exists, update it
  const lazyTabs = ttabs.getLazyTabs(grid.id);
  
  if (lazyTabs.length > 0) {
    // Reuse the first lazy tab we found
    const lazyTab = lazyTabs[0];
    tab = lazyTab.id;
    
    // Update the tab name
    ttabs.updateTile(tab, { 
      name
    });
  } else {
    // No lazy tabs found, create a new one
    tab = ttabs.addTab(grid.id, name, true, true);
  }
  
  // Set the component for the tab
  ttabs.setComponent(tab, 'chat', { treeId });
  ttabs.setFocusedActiveTab(tab);
}

currentSpaceIdStore.subscribe((spaceId) => {
  console.log("Setup ttabs for space", spaceId);
  setupTtabs();
});
