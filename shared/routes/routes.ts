export const routes = {
  root: "/",

  /* Workspaces */
  workspace: "workspace",
  newWorkspace: "new-workspace",
  workspaceExists: "workspace-exists",
  setup: "setup",
  profile: "profile",
  session: "session",

  /* Providers */
  providers: "providers",
  provider: (providerId = ":providerId") => `providers/${providerId}`,
  providerConfigs: "provider-configs",
  providerConfig: (providerId = ":providerId") =>
    `provider-configs/${providerId}`,
  validateProviderConfig: (providerId = ":providerId") =>
    `provider-configs/${providerId}/validate`,
  providerModel: (providerId = ":providerId") =>
    `provider-configs/${providerId}/models`,
  validateProviderKey: (provider = ":provider") => `validate-key/${provider}`,

  /* Agents */
  agents: "apps",
  agentConfigs: "app-configs",
  agentConfig: (configId = ":configId") => `app-configs/${configId}`,

  /* Threads */
  threads: "threads",
  thread: (threadId = ":threadId") => `threads/${threadId}`,
  retryThread: (threadId = ":threadId") => `threads/${threadId}/messages/retry`,
  threadMessages: (threadId = ":threadId") => `threads/${threadId}/messages`,
};
