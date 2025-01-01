import { type AppConfig, type ThreadMessage } from "../models";
import Space from "../spaces/Space";
import { AgentServices } from "../agents/AgentServices.ts";
import { SimpleChatAgent } from "../agents/SimpleChatAgent.ts";
import { ThreadTitleAgent } from "../agents/ThreadTitleAgent.ts";
import { ChatAppData } from "../spaces/ChatAppData";
import type { ReplicatedTree } from "../replicatedTree/ReplicatedTree";

export default class ChatAppBackend {
  private data: ChatAppData;

  constructor(private space: Space, private appTree: ReplicatedTree) {
    this.data = new ChatAppData(this.space, appTree);

    this.processMessages(this.data.messages);

    this.data.observeNewMessages((messages) => {
      this.processMessages(messages);
    });
  }

  private processMessages(messages: ThreadMessage[]) {
    console.log("Processing messages", messages);

    if (messages.length === 0) {
      return;
    }

    if (messages[messages.length - 1].role === "user") {
      this.replyToMessage(messages);
    }
  }

  private async replyToMessage(messages: ThreadMessage[]) {
    console.log("replyToMessage", messages);

    const config: AppConfig | undefined = this.data.configId ?
      this.space.getAppConfig(this.data.configId) : undefined;

    if (!config) {
      throw new Error("No config found");
    }

    const agentServices = new AgentServices(this.space);
    const simpleChatAgent = new SimpleChatAgent(agentServices, config);
    const threadTitleAgent = new ThreadTitleAgent(agentServices, config);

    const newMessage = this.data.newMessage("assistant", "thinking...");

    const messagesForLang = [
      { role: "system", text: config.instructions },
      ...messages.map((m) => ({
        role: m.role,
        text: m.text,
      }))];

    const response = await simpleChatAgent.input(messagesForLang, (resp) => {
      const wipResponse = resp as string;
      this.appTree.setTransientVertexProperty(newMessage.id, "text", wipResponse);
      console.log(wipResponse);
    }) as string;

    // Update the message with the final response
    this.appTree.setVertexProperty(newMessage.id, "text", response);

    messages.push({ ...newMessage, text: response });

    const newTitle = await threadTitleAgent.input({
      messages,
      title: this.data.title
    }) as string;

    if (newTitle !== this.data.title) {
      this.data.title = newTitle;
    }
  }
}