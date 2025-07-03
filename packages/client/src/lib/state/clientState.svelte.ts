import { AuthStore, type User } from './auth.svelte';
import { SpaceStore } from './spaceStore.svelte';
import { SpaceSocketStore } from './spacesocket.svelte';
import { ThemeStore } from './theme.svelte';
import { isDevMode, spaceInspectorOpen } from './devMode';
import { txtStore } from './txtStore';
import { ttabs, sidebar, layoutRefs } from './layout.svelte';
import { setupSwins } from './swinsLayout';
import { createNewLocalSpace, createNewSyncedSpace } from '../spaces/spaceCreation';

interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * Central orchestration hub for client-side state management.
 * Coordinates multiple focused stores and provides unified workflows.
 */
export class ClientState {
  // Direct references to focused stores
  auth = new AuthStore();
  spaces = new SpaceStore();
  sockets = new SpaceSocketStore();
  private themeStore = new ThemeStore(); // @TODO: refactor to use ThemeStore just as "theme"

  get theme() {
    return {
      current: {
        colorScheme: this.themeStore.colorScheme,
        themeName: this.themeStore.themeName
      },
      loadSpaceTheme: () => this.themeStore.loadSpaceTheme(this.spaces.currentSpaceId),
      setThemeName: (name: string) => this.themeStore.setThemeName(name, this.spaces.currentSpaceId),
      setColorScheme: (colorScheme: 'light' | 'dark') => this.themeStore.setColorScheme(colorScheme, this.spaces.currentSpaceId)
    };
  }
  dev = {
    isDevMode,
    spaceInspectorOpen
  }; // @TODO: upd to use runes
  text = txtStore; // @TODO: upd to use runes

  // Layout and UI orchestration - create fresh instances to avoid initialization order issues
  layout = {
    ttabs,
    sidebar,
    swins: setupSwins(),
    layoutRefs,

    openSettings: () => {
      this.layout.swins.open('settings', {}, 'Settings');
    },
    openSpaces: () => {
      this.layout.swins.open('spaces', {}, 'Spaces');
    }
  };

  /**
   * Orchestrated sign-in workflow
   * Handles: auth → space filtering → theme loading → socket connection
   */
  async signIn(tokens: AuthTokens, user: User): Promise<void> {
    await this.auth.setAuth(tokens, user);
    await this.spaces.filterSpacesForCurrentUser();
    await this.theme.loadSpaceTheme();
    this.sockets.setupSocketConnection();
  }

  /**
   * Orchestrated sign-out workflow
   * Handles: auth logout → space filtering → socket cleanup → theme reset
   */
  async signOut(): Promise<void> {
    await this.auth.logout();
    await this.spaces.handleUserSignOut();
    this.sockets.cleanupSocketConnection();
    await this.theme.loadSpaceTheme(); // Reset to defaults
  }

  /**
   * Orchestrated space switching workflow
   * Handles: space selection → theme loading → potential sync updates
   */
  async switchSpace(spaceId: string): Promise<void> {
    this.spaces.currentSpaceId = spaceId;
    await this.theme.loadSpaceTheme();

    // Future: Could trigger layout updates, sync state, etc.
    // this.layout.ttabs.refreshLayout();
    // await this.syncSpaceState(spaceId);
  }

  /**
   * Orchestrated space creation workflow
   * Handles: space creation → theme loading → UI updates
   */
  async createNewSpace(type: 'local' | 'synced' = 'local'): Promise<void> {
    if (type === 'local') {
      await createNewLocalSpace();
    } else {
      await createNewSyncedSpace();
    }
    // Space creation functions already handle spaces updates
    await this.theme.loadSpaceTheme();
  }

  /**
   * Initialize the entire client state system
   * Used during app startup
   */
  async initialize(): Promise<void> {
    // Check authentication state
    await this.auth.checkAuth();

    // If authenticated, set up connections
    if (this.auth.isAuthenticated) {
      this.sockets.setupSocketConnection();
    }

    // Load theme for current space
    await this.theme.loadSpaceTheme();
  }

  /**
   * Cleanup all client state
   * Used during app shutdown or navigation away
   */
  async cleanup(): Promise<void> {
    await this.spaces.disconnectAllSpaces();
    this.sockets.cleanupSocketConnection();
  }

  // Cross-system reactive derivations

  /**
   * Check if the application is fully initialized and ready
   */
  get isFullyInitialized(): boolean {
    return this.auth.isAuthenticated !== undefined &&
      this.spaces.pointers.length >= 0; // Could be 0 for new users
  }

  /**
   * Get comprehensive current workspace status
   */
  get currentWorkspaceStatus() {
    return {
      user: this.auth.user,
      spaceCount: this.spaces.pointers.length,
      currentSpace: this.spaces.currentSpace?.name || null,
      theme: this.theme.current.themeName,
      colorScheme: this.theme.current.colorScheme,
      connected: this.sockets.socketConnected,
      layoutReady: !!this.layout.layoutRefs.contentGrid
    };
  }

  /**
   * Check if user can create new spaces
   */
  get canCreateSpaces(): boolean {
    return this.auth.isAuthenticated ||
      this.spaces.pointers.some(p => p.userId === null);
  }

  /**
   * Get current space theme information
   */
  get currentSpaceThemeInfo() {
    return {
      space: this.spaces.currentSpace,
      theme: this.theme.current.themeName,
      colorScheme: this.theme.current.colorScheme,
      spaceId: this.spaces.currentSpaceId
    };
  }

  /**
   * Check if current space is ready for use
   */
  get isCurrentSpaceReady(): boolean {
    return !!(this.spaces.currentSpaceId && this.spaces.currentSpace);
  }

  /**
   * Get authentication and space readiness status
   */
  get appReadinessStatus() {
    return {
      authChecked: this.auth.isAuthenticated !== undefined,
      authenticated: this.auth.isAuthenticated,
      hasSpaces: this.spaces.pointers.length > 0,
      currentSpaceReady: this.isCurrentSpaceReady,
      fullyReady: this.isFullyInitialized && this.isCurrentSpaceReady
    };
  }
}

export const clientState = new ClientState(); 