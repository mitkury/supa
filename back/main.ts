import { Chat } from "./chat.ts";
import { v4 as uuidv4 } from "npm:uuid";
import { Application, Router as Router } from "https://deno.land/x/oak/mod.ts";
import { Router as NeoRouter } from "../shared/restOnSockets/Router.ts";
import { AppDb } from "./db/appDb.ts";
import { load } from "https://deno.land/std@0.202.0/dotenv/mod.ts";
import { ProcessPortMsg } from "@shared/serverProcessMessages.ts";
import { ensureDir } from "https://deno.land/std/fs/mod.ts";
import { ChatMessage } from "@shared/models.ts";
import { Profile, Agent } from "../shared/models.ts";
import { defaultAgent } from "./agents/defaultAgent.ts";

const app = new Application();
const httpRouter = new Router();
const neoRouter = new NeoRouter();

// Let's load the .env varialbes explicitly at the very beginning.
await load({ export: true });

export const SERVER_HOST: string = Deno.env.get("SERVER_HOST");
export const SERVER_PORT: number = parseInt(Deno.env.get("SERVER_PORT"));

if (!SERVER_HOST) {
  throw new Error("SERVER_HOST is not set in the .env file");
}
if (!SERVER_PORT) {
  throw new Error("SERVER_PORT is not set in the .env file");
}

let dataPath = "data-dev/";

if (Deno.args.length > 0) {
  dataPath = Deno.args[0];
}

await ensureDir(dataPath);

const db = new AppDb(dataPath);
const aiChat = new Chat();
await aiChat.init();

console.log(`HTTP server is running. Access it at: ${SERVER_HOST}/`);

httpRouter.get("/", (context) => {
  if (!context.isUpgradable) {
    context.response.body = "Supamind API is running!";
    return;
  }
  const socket = context.upgrade();
  const connSecret = context.request.url.searchParams.get("connsecret");

  neoRouter.addSocket(socket, connSecret);
});

neoRouter
  .onPost("setup", async (ctx) => {
    await db.insertProfile({ name: ctx.data.name });
    await db.insertSecrets({ openai: ctx.data.openai });
  })
  .onGet("profile", async (ctx) => {
    const profile = await db.getProfile();
    ctx.response = profile;
  })
  .onPost("profile", async (ctx) => {
    const profile = ctx.data as Profile;
    await db.insertProfile(profile);
    neoRouter.broadcast(ctx.route, profile);
  })
  .onValidateBroadcast("profile", (conn, params) => {
    return true;
  })
  .onGet("agents", async (ctx) => {
    const agents = await db.getAgents();
    ctx.response = agents;
  })
  .onPost("agents", async (ctx) => {
    const agentForm = JSON.parse(ctx.data);

    const newAgent: Agent = {
      id: uuidv4(),
      name: agentForm.name,
      button: agentForm.buttonText,
      description: agentForm.description,
      targetLLM: 'openai/gpt-4-turbo',
      instructions: agentForm.instructions,
    };

    await db.insertAgent(newAgent);
    neoRouter.broadcast(ctx.route, newAgent);
  })
  .onGet("threads", async (ctx) => {
    const chats = await db.getChats();
    ctx.response = chats;
  })
  .onPost("threads", async (ctx) => {
    const agentId = ctx.data as string;

    const chat = await db.createChat({
      id: uuidv4(),
      agentId,
      createdAt: Date.now(),
      updatedAt: null,
      title: "",
    });

    ctx.response = chat;

    neoRouter.broadcast(ctx.route, chat);
  })
  .onDelete("threads/:threadId", async (ctx) => {
    const threadId = ctx.params.threadId;
    await db.deleteChat(threadId);
    neoRouter.broadcastDeletion("threads", threadId);
  })
  .onGet("threads/:threadId", async (ctx) => {
    const threadId = ctx.params.threadId;
    const chat = await db.getChat(threadId);

    if (chat === null) {
      ctx.error = "Couldn't get thread";
      return;
    }

    const messages = await db.getChatMessages(threadId);

    ctx.response = messages;
  })
  .onValidateBroadcast("threads", (conn, params) => {
    return true;
  })
  .onValidateBroadcast("threads/:threadId", (conn, params) => {
    return true;
  })
  .onPost("threads/:threadId", async (ctx) => {
    const chatId = ctx.params.threadId;
    const chat = await db.getChat(chatId);
    const chatMessage = ctx.data as ChatMessage;

    if (await db.checkChatMessage(chatId, chatMessage.id)) {
      ctx.error = "Message already exists";
      return;
    }

    const messages = await db.getChatMessages(chatId);

    await db.createChatMessage(chatId, chatMessage);
    neoRouter.broadcast(ctx.route, chatMessage);

    const dbChatReply = await db.createChatMessage(chatId, {
      id: uuidv4(),
      role: "assistant",
      text: "Thinking...",
      inProgress: 1,
      createdAt: Date.now(),
      updatedAt: null,
    });

    neoRouter.broadcast(ctx.route, dbChatReply);

    const agent = await db.getAgent(chat.agentId) || defaultAgent;

    const systemPrompt = agent.instructions + "\n\n" + 'Preferably use markdown for formatting. If you write code examples: use tick marks for inline code and triple tick marks for code blocks.';

    await aiChat.ask(chatMessage.text, messages, systemPrompt, (res) => {
      dbChatReply.text = res.answer;
      neoRouter.broadcast(ctx.route, dbChatReply);
      // And save the message to the database
      db.updateChatMessage(chatId, dbChatReply);
    });

    dbChatReply.inProgress = 0;
    dbChatReply.updatedAt = Date.now();
    dbChatReply.inProgress = 0;
    await db.updateChatMessage(chatId, dbChatReply);
    neoRouter.broadcast(ctx.route, dbChatReply);

    messages.push(chatMessage);
    messages.push(dbChatReply);

    if (!chat.title && messages.length >= 2) {
      const title = await aiChat.comeUpWithThreadTitle(messages);
      chat.title = title;
      await db.updateChat(chat);
      neoRouter.broadcastUpdate("threads", chat);
    }
  });

app.use((ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    "*",
  );
  ctx.response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE",
  );
  return next();
});

app.use(httpRouter.routes());
app.use(httpRouter.allowedMethods());

async function startServer(
  app: Application,
  startingPort: number,
  callback: (port: number) => void,
) {
  let port = startingPort;
  while (true) {
    try {
      console.log(`Started the server on port ${port}.`);
      callback(port);
      await app.listen({ port });
      break;
    } catch (error) {
      if (error instanceof Deno.errors.AddrInUse) {
        console.log(
          `Port ${port} is already in use. Trying port ${port + 1}...`,
        );
        port++; // Try the next port
      } else {
        console.log(`Failed to start server: ${error}`);
        break; // Exit the loop if there's a different error
      }
    }
  }
}

startServer(app, SERVER_PORT, (port) => {
  console.log(JSON.stringify({ type: "port", value: port } as ProcessPortMsg));
});
