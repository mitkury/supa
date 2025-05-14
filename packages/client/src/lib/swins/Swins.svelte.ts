import { type Component } from 'svelte';

/**
 * Represents a component entry in the registry
 */
export interface ComponentEntry {
  /** The actual Svelte component */
  component: Component;
  /** Default props to pass to the component */
  defaultProps?: Record<string, any>;
}

/**
 * Represents a window entry in the stack
 */
export interface WindowEntry {
  /** Unique identifier for this window instance */
  id: string;
  /** ID of the component in the registry */
  componentId: string;
  /** Title to display in the header */
  title?: string;
  /** Props to pass to the component */
  props?: Record<string, any>;
}

/**
 * SWins - Stack-Based Windows Manager
 * 
 * This class handles a stack of windows and component registry.
 * It uses Svelte's $state for reactivity.
 */
export class SWins {
  // Component registry - stores all available components
  componentRegistry: Record<string, ComponentEntry> = $state({});
  
  // Stack of windows
  windows: WindowEntry[] = $state([]);
  
  /**
   * Register a component that can be used in windows
   * 
   * @param id Unique ID for the component
   * @param component The Svelte component to register
   * @param defaultProps Default props to pass to the component
   */
  register(id: string, component: Component, defaultProps: Record<string, any> = {}) {
    this.componentRegistry[id] = { component, defaultProps };
    return this; // For chaining
  }
  
  /**
   * Open a new window on top of the stack
   * 
   * @param componentId ID of the registered component
   * @param props Props to pass to the component
   * @param title Optional title for the window
   */
  open(componentId: string, props: Record<string, any> = {}, title?: string) {    
    // Check if component exists
    if (!this.componentRegistry[componentId]) {
      console.error(`Component with ID "${componentId}" not found in registry`);
      return this; // For chaining
    }
    
    // Create a unique ID for this window instance
    const id = `${componentId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Add to stack
    this.windows = [...this.windows, { id, componentId, props, title }];
    
    return this; // For chaining
  }
  
  /**
   * Remove the top window from the stack
   */
  pop() {
    if (this.windows.length > 0) {
      this.windows = this.windows.slice(0, -1);
    }
    return this; // For chaining
  }
  
  /**
   * Pop until reaching a specific window
   * 
   * @param windowId ID of the window to navigate to
   */
  popTo(windowId: string) {
    const windowIndex = this.windows.findIndex(window => window.id === windowId);
    if (windowIndex !== -1) {
      this.windows = this.windows.slice(0, windowIndex + 1);
    }
    return this; // For chaining
  }
  
  /**
   * Replace the current window with a new one
   * 
   * @param componentId ID of the component to use
   * @param props Props for the component
   * @param title Optional title for the window
   */
  replace(componentId: string, props: Record<string, any> = {}, title?: string) {
    if (this.windows.length === 0) {
      return this.open(componentId, props, title);
    }
    
    // Create a unique ID for this window instance
    const id = `${componentId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Replace the top window
    this.windows = [
      ...this.windows.slice(0, -1),
      { id, componentId, props, title }
    ];
    
    return this;
  }
  
  /**
   * Clear all windows from the stack
   */
  clear() {
    this.windows = [];
    return this; // For chaining
  }
  
  /**
   * Check if a specific component is currently shown
   * 
   * @param componentId ID of the component to check
   */
  isShowing(componentId: string): boolean {
    return this.windows.some(win => win.componentId === componentId);
  }
  
  /**
   * Get the current top window if exists
   */
  get current(): WindowEntry | undefined {
    if (this.windows.length === 0) return undefined;
    return this.windows[this.windows.length - 1];
  }
}
