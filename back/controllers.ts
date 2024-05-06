import { Router } from "../shared/restOnSockets/Router.ts";
import { Chat } from "./chat.ts";
import { v4 as uuidv4 } from "npm:uuid";
import { AppDb } from "./db/appDb.ts";
import { ThreadMessage } from "@shared/models.ts";
import { AgentConfig, Profile } from "../shared/models.ts";
import { defaultAgent } from "./agents/defaultAgent.ts";
import { createWorkspaceInDocuments, setWorkspacePath } from "./workspace.ts";
import { fs } from "./tools/fs.ts";
import { SimpleChatAgent } from "./agents/simpleChatAgent.ts";
import { AgentServices } from "./agents/agentServices.ts";
import { validateKey } from "./tools/providerKeyValidators.ts";

async function checkWorkspaceDir(path: string): Promise<boolean> {
  const pathToWorkspace = path + "/_workspace.json";

  return await fs.fileExists(pathToWorkspace);
}

export function controllers(router: Router) {
  const aiChat = new Chat();

  let db: AppDb | null = null;

  const DB_ERROR = "Database is not initialized";

  router
    .onPost("new-workspace", async (ctx) => {
      try {
        const path = await createWorkspaceInDocuments();
        db = new AppDb(path);
        ctx.response = path;
      } catch (e) {
        ctx.error = e.message;
      }
    })
    .onPost("workspace", async (ctx) => {
      try {
        const path = ctx.data as string;
        const exists = await checkWorkspaceDir(path);
        ctx.response = exists;

        if (exists) {
          db = new AppDb(ctx.data as string);
          await setWorkspacePath(path);
        }
      } catch (e) {
        ctx.error = e.message;
        return;
      }
    })
    .onPost("workspace-exists", async (ctx) => {
      try {
        const path = ctx.data as string;
        ctx.response = await checkWorkspaceDir(path);
      } catch (e) {
        ctx.error = e.message;
        return;
      }
    })
    .onPost("setup", async (ctx) => {
      if (db === null) {
        ctx.error = DB_ERROR;
        return;
      }

      if (!ctx.data) {
        ctx.error = "Data is required";
        return;
      }

      const data = ctx.data as { name: string; key_openai: string };
      if (!data.name || !data.key_openai) {
        ctx.error = "Name and OpenAI key are required";
        return;
      }

      try {
        const profile = await db.insertProfile({ name: data.name });
        await db.insertSecrets({ openai: data.key_openai });
        router.broadcast("profile", profile);
        ctx.response = profile;
      } catch (e) {
        ctx.error = e.message;
        return;
      }
    })
    .onGet("profile", async (ctx) => {
      if (db === null) {
        ctx.error = DB_ERROR;
        return;
      }

      try {
        const profile = await db.getProfile();
        ctx.response = profile;
      } catch (e) {
        ctx.error = e.message;
        return;
      }
    })
    .onPost("profile", async (ctx) => {
      if (db === null) {
        ctx.error = DB_ERROR;
        return;
      }

      const profile = ctx.data as Profile;
      await db.insertProfile(profile);
      router.broadcast(ctx.route, profile);
    })
    .onValidateBroadcast("profile", (conn, params) => {
      return true;
    })
    .onValidateBroadcast("session", (conn, params) => {
      return true;
    })
    .onGet("agent-configs", async (ctx) => {
      if (db === null) {
        ctx.error = DB_ERROR;
        return;
      }

      try {
        const agents = await db.getAgents();
        ctx.response = agents;
      } catch (e) {
        ctx.error = e.message;
        return;
      }
    })
    .onGet("agent-configs/:configId", async (ctx) => {
      if (db === null) {
        ctx.error = DB_ERROR;
        return;
      }

      const configId = ctx.params.configId;
      const agent = await db.getAgent(configId);

      if (agent === null) {
        ctx.error = "Couldn't get agent";
        return;
      }

      ctx.response = agent;
    })
    .onPost("agent-configs/:configId", async (ctx) => {
      if (db === null) {
        ctx.error = DB_ERROR;
        return;
      }

      if (ctx.data === null) {
        ctx.error = "Data is required";
        return;
      }

      const configId = ctx.params.configId;
      const agent = await db.getAgent(configId);

      if (agent === null) {
        ctx.error = "Agent doesn't exist";
        return;
      }

      const config = ctx.data as AgentConfig;
      await db.updateAgent(config);
      router.broadcast("agent-configs", config);
    })
    .onPost("agent-configs", async (ctx) => {
      if (db === null) {
        ctx.error = DB_ERROR;
        return;
      }

      if (!ctx.data) {
        ctx.error = "Data is required";
        return;
      }

      const config = JSON.parse(ctx.data as string) as AgentConfig;
      await db.insertAgent(config);
      router.broadcast("agent-configs", config);
    })
    .onValidateBroadcast("agent-configs", (conn, params) => {
      return true;
    })
    .onPost("validate-key/:provider", async (ctx) => {
      const provider = ctx.params.provider;
      const key = ctx.data as string;
      const keyIsValid = await validateKey(provider, key);
      ctx.response = keyIsValid;
    })
    .onPost("secrets/:key", async (ctx) => { 
      if (db === null) {
        ctx.error = DB_ERROR;
        return;
      }

      const key = ctx.params.key;
      const value = ctx.data as string;
      await db.insertSecrets({ [key]: value });
    })
    .onGet("secrets/:key", (ctx) => {
      if (db === null) {
        ctx.error = DB_ERROR;
        return;
      }

      const key = ctx.params.key;
      const value = db.getSecret(key);
      ctx.response = value;
    })
    .onDelete("secrets/:key", (ctx) => {
      if (db === null) {
        ctx.error = DB_ERROR;
        return;
      }

      const key = ctx.params.key;
      db.deleteSecret(key);
    })
    .onGet("threads", async (ctx) => {
      if (db === null) {
        ctx.error = DB_ERROR;
        return;
      }

      try {
        const threads = await db.getThreads();
        ctx.response = threads;
      } catch (e) {
        ctx.error = e.message;
        return;
      }
    })
    .onPost("threads", async (ctx) => {
      if (db === null) {
        ctx.error = DB_ERROR;
        return;
      }

      const agentId = ctx.data as string;

      const thread = await db.createThread({
        id: uuidv4(),
        agentId,
        createdAt: Date.now(),
        updatedAt: null,
        title: "",
      });

      ctx.response = thread;

      router.broadcast(ctx.route, thread);
    })
    .onDelete("threads/:threadId", async (ctx) => {
      if (db === null) {
        ctx.error = DB_ERROR;
        return;
      }

      const threadId = ctx.params.threadId;
      await db.deleteThread(threadId);
      router.broadcastDeletion("threads", threadId);
    })
    .onGet("threads/:threadId", async (ctx) => {
      if (db === null) {
        ctx.error = DB_ERROR;
        return;
      }

      const threadId = ctx.params.threadId;
      const thread = await db.getThread(threadId);

      if (thread === null) {
        ctx.error = "Couldn't get thread";
        return;
      }

      const messages = await db.getThreadMessages(threadId);

      ctx.response = messages;
    })
    .onValidateBroadcast("threads", (conn, params) => {
      return true;
    })
    .onValidateBroadcast("threads/:threadId", (conn, params) => {
      return true;
    })
    .onPost("threads/:threadId", async (ctx) => {
      if (db === null) {
        ctx.error = DB_ERROR;
        return;
      }

      const threadId = ctx.params.threadId;
      const thread = await db.getThread(threadId);

      if (thread === null) {
        ctx.error = "Thread doesn't exist";
        return;
      }

      const message = ctx.data as ThreadMessage;

      if (await db.checkThreadMessage(threadId, message.id)) {
        ctx.error = "Message already exists";
        return;
      }

      // First create a message sent by the user
      await db.createThreadMessage(threadId, message);
      router.broadcast(ctx.route, message);

      // Get all the messages in the thread (new message included)
      const messages = await db.getThreadMessages(threadId);

      // Create an in-progress message for the agent
      const dbThreadReply = await db.createThreadMessage(threadId, {
        id: uuidv4(),
        role: "assistant",
        text: "Thinking...",
        inProgress: 1,
        createdAt: Date.now(),
        updatedAt: null,
      });
      router.broadcast(ctx.route, dbThreadReply);

      // @TODO: get the actual config that we can pass to the agent
      const config = await db.getAgent(thread.agentId) || defaultAgent;

      const agentServices = new AgentServices(db);

      // Let's run the messages through the agent
      const chatAgent = new SimpleChatAgent(agentServices, config);
      const response = await chatAgent.input(messages, (resp) => {
        dbThreadReply.text = resp as string;
        router.broadcast(ctx.route, dbThreadReply);
        // And save the message to the database
        if (db !== null) {
          db.updateThreadMessage(threadId, dbThreadReply);
        }
      });

      dbThreadReply.text = response as string;
      dbThreadReply.inProgress = 0;
      dbThreadReply.updatedAt = Date.now();
      dbThreadReply.inProgress = 0;
      await db.updateThreadMessage(threadId, dbThreadReply);
      router.broadcast(ctx.route, dbThreadReply);

      // @TODO: make this with an agent
      if (!thread.title && messages.length >= 2) {
        const title = await aiChat.comeUpWithThreadTitle(
          messages,
          db.getSecret("key_openai"),
        );
        thread.title = title;
        await db.updateThread(thread);
        router.broadcastUpdate("threads", thread);
      }
    });
}
