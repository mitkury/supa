import { browser } from "$app/environment";
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "$lib/utils/api";
import { authStore } from "./auth.svelte";

export class SpaceSocketStore {
  // Reactive state - same as SpaceEntry.svelte
  socket: Socket | null = $state(null);
  socketConnected: boolean = $state(false);
  
  // Private properties
  private pingInterval: NodeJS.Timeout | null = null;

  async setupSocketConnection() {
    if (!authStore.isAuthenticated || this.socket) return;

    console.log("Setting up WebSocket connection...");

    // Get auth header (async)
    const authHeader = await authStore.getAuthHeader();

    // Connect to server WebSocket
    this.socket = io(API_BASE_URL, {
      auth: {
        token: authHeader ? authHeader.replace("Bearer ", "") : undefined,
      },
    });

    // Connection successful
    this.socket.on("connect", () => {
      console.log("✅ WebSocket connected:", this.socket?.id);
      this.socketConnected = true;
    });

    // Connection failed/lost
    this.socket.on("disconnect", (reason) => {
      console.log("❌ WebSocket disconnected:", reason);
      this.socketConnected = false;
    });

    // Connection error
    this.socket.on("connect_error", (error) => {
      console.error("🔴 WebSocket connection error:", error);
      this.socketConnected = false;
    });

    // Simple ping/pong for connectivity testing
    this.socket.on("pong", (data) => {
      console.log("🏓 Pong received:", data);
    });

    // Send a test ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("ping", { timestamp: Date.now() });
        console.log("🏓 Ping sent");
      }
    }, 30000);
  }

  // Exact same function from SpaceEntry.svelte
  cleanupSocketConnection() {
    if (this.socket) {
      console.log("🧹 Cleaning up WebSocket connection");
      this.socket.disconnect();
      this.socket = null;
      this.socketConnected = false;
    }

    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

// Export singleton instance
export const spaceSocketStore = new SpaceSocketStore(); 