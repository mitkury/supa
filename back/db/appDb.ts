import { Profile, Thread, ThreadMessage } from "@shared/models.ts";
import { ensureDir } from "https://deno.land/std/fs/mod.ts";
import { join } from "https://deno.land/std/path/mod.ts";
import { AgentConfig, ModelProviderConfig } from "../../shared/models.ts";
import { defaultAgent } from "../agents/defaultAgent.ts";

export class AppDb {
  constructor(private workspaceDir: string) {}

  private resolvePath(...paths: string[]): string {
    return join(this.workspaceDir, ...paths);
  }

  getSecret(key: string): string {
    const secrets = JSON.parse(
      Deno.readTextFileSync(this.resolvePath("secrets.json")),
    );

    return secrets[key] || "";
  }

  deleteSecret(key: string): void {
    const secrets = JSON.parse(
      Deno.readTextFileSync(this.resolvePath("secrets.json")),
    );
    delete secrets[key];
    Deno.writeTextFileSync(
      this.resolvePath("secrets.json"),
      JSON.stringify(secrets),
    );
  }

  async getProfile(): Promise<Profile | null> {
    try {
      const profileStr = await Deno.readTextFile(
        this.resolvePath("profile.json"),
      );

      if (profileStr) {
        return JSON.parse(profileStr);
      }

      return null;
    } catch (_) {
      return null;
    }
  }

  async insertProfile(profile: Profile): Promise<Profile> {
    await Deno.writeTextFile(
      this.resolvePath("profile.json"),
      JSON.stringify(profile),
    );

    return profile;
  }

  async insertSecrets(
    secrets: Record<string, string>,
  ): Promise<Record<string, string>> {
    const existingSecrets = JSON.parse(
      Deno.readTextFileSync(this.resolvePath("secrets.json")),
    );
    const updatedSecrets = { ...existingSecrets, ...secrets };

    await Deno.writeTextFile(
      this.resolvePath("secrets.json"),
      JSON.stringify(updatedSecrets),
    );

    return updatedSecrets;
  }

  async getAgents(): Promise<AgentConfig[]> {
    await ensureDir(this.resolvePath("agent-configs"));
    const agents = this.getFiles(
      this.resolvePath("agent-configs"),
      "_config.json",
    );

    const configs = [
      ...agents.map((agentFile) => {
        const agentStr = Deno.readTextFileSync(agentFile);
        return JSON.parse(agentStr);
      }),
    ]

    const defaultAgentIndex = configs.findIndex((agent) =>
      agent.id === defaultAgent.id
    );
    if (defaultAgentIndex !== -1) {
      const overrideForDefaultAgent = JSON.parse(Deno.readTextFileSync(agents[defaultAgentIndex])) as AgentConfig;

      // Merge the default agent config with the overriding config
      configs[defaultAgentIndex] = {
        ...defaultAgent,
        ...overrideForDefaultAgent,
      };
    } else {
      // If there is no overriding config, just use the default agent
      configs.push(defaultAgent);
    }

    return configs;
  }

  async getAgent(agentId: string): Promise<AgentConfig | null> {
    await ensureDir(this.resolvePath("agent-configs"));

    try {
      const agentStr = Deno.readTextFileSync(
        this.resolvePath("agent-configs", agentId, "_config.json"),
      );

      if (agentId === "default") {
        return {
          ...defaultAgent,
          ...JSON.parse(agentStr),
        };
      }

      if (agentStr) {
        return JSON.parse(agentStr);
      }

      return null;
    } catch (_) {
      if (agentId === "default") {
        return defaultAgent;
      }

      return null;
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    try {
      await Deno.remove(this.resolvePath("agent-configs", agentId), {
        recursive: true,
      });
    } catch (error) {
      console.error("Couldn't remove the agent", error);
    }
  }

  async insertAgent(agent: AgentConfig): Promise<AgentConfig> {
    await ensureDir(this.resolvePath("agent-configs", agent.id));

    Deno.writeTextFileSync(
      this.resolvePath("agent-configs", agent.id, "_config.json"),
      JSON.stringify(agent),
    );

    return agent;
  }

  async updateAgent(agent: AgentConfig): Promise<void> {
    await ensureDir(this.resolvePath("agent-configs", agent.id));

    Deno.writeTextFileSync(
      this.resolvePath("agent-configs", agent.id, "_config.json"),
      JSON.stringify(agent),
    );
  }

  async createThread(thread: Thread): Promise<Thread> {
    // @TODO: make them async!
    await ensureDir(this.resolvePath(`threads/${thread.id}`));

    // Create a file with id of the thread and a folder with the same id for messages
    await Deno.writeTextFile(
      this.resolvePath(`threads/${thread.id}/_thread.json`),
      JSON.stringify(thread),
    );
    await ensureDir(this.resolvePath("threads", thread.id));

    return thread;
  }

  async deleteThread(threadId: string): Promise<void> {
    try {
      await Deno.remove(this.resolvePath("threads", threadId), {
        recursive: true,
      });
    } catch (error) {
      console.error("Couldn't remove the thread", error);
    }
  }

  async getThread(threadId: string): Promise<Thread | null> {
    await ensureDir(this.resolvePath(`threads/${threadId}`));

    try {
      const threadStr = Deno.readTextFileSync(
        this.resolvePath(`threads/${threadId}/_thread.json`),
      );

      if (threadStr) {
        return JSON.parse(threadStr);
      }

      return null;
    } catch (_) {
      return null;
    }
  }

  async updateThread(thread: Thread): Promise<void> {
    await ensureDir(this.resolvePath(`threads/${thread.id}`));

    await Deno.writeTextFile(
      this.resolvePath(`threads/${thread.id}/_thread.json`),
      JSON.stringify(thread),
    );
  }

  async getThreads(): Promise<Thread[]> {
    await ensureDir(this.resolvePath("threads"));

    const threadFiles = this.getFiles(
      this.resolvePath("threads"),
      "_thread.json",
    );
    const threads: Thread[] = [];

    for (const threadFile of threadFiles) {
      const threadStr = await Deno.readTextFile(threadFile);
      threads.push(JSON.parse(threadStr));
    }

    return threads;
  }

  private getFiles(folderPath: string, targetFilename: string): string[] {
    const threadFiles: string[] = [];
    const entries = Deno.readDirSync(folderPath);

    for (const entry of entries) {
      const entryPath = folderPath + "/" + entry.name;

      if (entry.isFile && entry.name === targetFilename) {
        threadFiles.push(entryPath);
      } else if (entry.isDirectory) {
        const subThreadFiles = this.getFiles(entryPath, targetFilename);
        threadFiles.push(...subThreadFiles);
      }
    }

    return threadFiles;
  }

  async createThreadMessage(
    threadId: string,
    message: ThreadMessage,
  ): Promise<ThreadMessage> {
    await ensureDir(this.resolvePath("threads", threadId));

    // Create a file with the id of the message
    Deno.writeTextFileSync(
      this.resolvePath("threads", threadId, `${message.id}.json`),
      JSON.stringify(message),
    );

    return message;
  }

  async checkThreadMessage(
    threadId: string,
    messageId: string,
  ): Promise<boolean> {
    try {
      await Deno.readTextFile(
        this.resolvePath("threads", threadId, `${messageId}.json`),
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  async updateThreadMessage(
    threadId: string,
    message: ThreadMessage,
  ): Promise<void> {
    await Deno.writeTextFile(
      this.resolvePath("threads", threadId, `${message.id}.json`),
      JSON.stringify(message),
    );
  }

  async getThreadMessages(threadId: string): Promise<ThreadMessage[]> {
    // Get all messages in the folder with the thread id
    const messageFiles = Deno.readDirSync(
      this.resolvePath("threads", threadId),
    );

    const messages: ThreadMessage[] = [];

    for (const messageFile of messageFiles) {
      if (messageFile.isFile && messageFile.name.endsWith(".json")) {
        if (messageFile.name === "_thread.json") {
          continue;
        }

        const messageStr = await Deno.readTextFile(
          this.resolvePath("threads", threadId, messageFile.name),
        );
        try {
          messages.push(JSON.parse(messageStr));
        } catch {
          console.error("Invalid message file", messageFile.name);
        }
      }
    }

    messages.sort((a, b) => a.createdAt - b.createdAt);

    return messages;
  }

  async getModelProviders(): Promise<ModelProviderConfig[]> {
    const providerFiles = Deno.readDirSync(
      this.resolvePath("provider-configs"),
    );

    const providers: ModelProviderConfig[] = [];

    for (const providerFile of providerFiles) {
      if (providerFile.isFile && providerFile.name.endsWith(".json")) {
        const providerStr = await Deno.readTextFile(
          this.resolvePath("provider-configs", providerFile.name),
        );
        try {
          providers.push(JSON.parse(providerStr));
        } catch {
          console.error("Invalid provider file", providerFile.name);
        }
      }
    }

    return providers;
  }

  async getProviderConfig(
    providerId: string,
  ): Promise<ModelProviderConfig | null> {
    await ensureDir(this.resolvePath("provider-configs"));

    try {
      const providerStr = Deno.readTextFileSync(
        this.resolvePath("provider-configs", `${providerId}.json`),
      );

      if (providerStr) {
        return JSON.parse(providerStr);
      }

      return null;
    } catch (_) {
      return null;
    }
  }

  async deleteProviderConfig(providerId: string): Promise<void> {
    await Deno.remove(
      this.resolvePath("provider-configs", `${providerId}.json`),
    );
  }

  async insertProviderConfig(
    provider: ModelProviderConfig,
  ): Promise<ModelProviderConfig> {
    await ensureDir(this.resolvePath("provider-configs"));

    Deno.writeTextFileSync(
      this.resolvePath("provider-configs", `${provider.id}.json`),
      JSON.stringify(provider),
    );

    return provider;
  }
}
