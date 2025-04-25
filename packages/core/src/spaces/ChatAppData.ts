import type { Vertex } from "../replicatedTree/Vertex";
import type Space from "./Space";
import type { VertexPropertyType } from "../replicatedTree/treeTypes";
import type { ThreadMessage } from "../models";
import AppTree from "./AppTree";

export class ChatAppData {
  private root: Vertex;
  private referenceInSpace: Vertex;

  static createNewChatTree(space: Space, configId: string): AppTree {
    const tree = space.newAppTree("default-chat").tree;
    tree.setVertexProperty(tree.rootVertexId, "configId", configId);
    tree.newNamedVertex(tree.rootVertexId, "messages");
    tree.newNamedVertex(tree.rootVertexId, "jobs");

    return new AppTree(tree);
  }

  constructor(private space: Space, private appTree: AppTree) {
    this.root = appTree.tree.getVertex(appTree.tree.rootVertexId)!;
    this.referenceInSpace = space.getVertexReferencingAppTree(appTree.tree.rootVertexId)!;
  }

  get messagesVertex(): Vertex | undefined {
    return this.appTree.tree.getVertexByPath("messages");
  }

  get configId(): string | undefined {
    return this.root.getProperty("configId") as string;
  }

  set configId(configId: string) {
    this.root.setProperty("configId", configId);
  }

  get title(): string | undefined {
    return this.root.getProperty("title") as string;
  }

  set title(title: string) {
    console.log("setting title", title);
    this.root.setProperty("title", title);
    this.referenceInSpace.setProperty("title", title);
  }

  rename(newTitle: string) {
    if (newTitle.trim() === "") return;

    this.title = newTitle;
    this.space.setAppTreeName(this.threadId, newTitle);
  }

  get messageVertices(): Vertex[] {
    const vs: Vertex[] = [];
    const start = this.messagesVertex;
    if (!start) return [];
    let current: Vertex = start;
    while (true) {
      const children: Vertex[] = current.children;
      if (children.length === 0) break;
      const next: Vertex =
        children.length === 1
          ? children[0]
          : (children.find((c: Vertex) => c.getProperty("main") === true) as Vertex) || children[0];
      vs.push(next);
      current = next;
    }
    return vs;
  }

  triggerEvent(eventName: string, data: any) {
    this.appTree.triggerEvent(eventName, data);
  }

  observe(callback: (data: Record<string, VertexPropertyType>) => void): () => void {
    callback(this.root.getProperties());

    return this.root.observe((_) => {
      callback(this.root.getProperties());
    });
  }

  observeMessages(callback: (vertices: Vertex[]) => void): () => void {
    // @TODO: observe NOT only new messages but also when messages are updated
    return this.appTree.tree.observeVertexMove((vertex, _) => {
      const text = vertex.getProperty("text");
      if (text) {
        callback(this.messageVertices);
      }
    });
  }

  observeNewMessages(callback: (vertices: Vertex[]) => void): () => void {
    return this.appTree.tree.observeVertexMove((vertex, isNew) => {
      if (!isNew) {
        return;
      }

      const text = vertex.getProperty("text");
      if (text) {
        callback(this.messageVertices);
      }

    });
  }

  observeMessage(id: string, callback: (message: ThreadMessage) => void): () => void {
    const vertex = this.appTree.tree.getVertex(id);
    if (!vertex) {
      throw new Error(`Vertex ${id} not found`);
    }

    return this.appTree.tree.observeVertex(id, (vertex) => {
      callback(vertex.getAsTypedObject<ThreadMessage>());
    });
  }

  newMessage(role: "user" | "assistant" | "error", text: string, thinking?: string): ThreadMessage {
    const lastMsgVertex = this.getLastMsgParentVertex();

    const properties: Record<string, any> = {
      _n: "message",
      createdAt: Date.now(),
      text,
      role,
    };

    if (thinking) {
      properties.thinking = thinking;
    }

    const newMessageVertex = this.appTree.tree.newVertex(lastMsgVertex.id, properties);

    const props = newMessageVertex.getProperties();
    return {
      id: newMessageVertex.id,
      ...props,
    } as ThreadMessage;
  }

  askForReply(messageId: string): void {
    /*
    this.appTree.tree.newVertex(this.jobsVertex.id, {
      _n: "job",
      type: "reply",
      messageId,
    });
    */
  }

  retryMessage(messageId: string): void {
    throw new Error("Not implemented");
  }

  stopMessage(messageId: string): void {
    this.triggerEvent("stop-message", { messageId });
  }

  editMessage(messageId: string, newText: string) {
    const vertex = this.appTree.tree.getVertex(messageId);
    if (!vertex) throw new Error("Message " + messageId + " not found");
    const parent = vertex.parent;
    if (!parent) throw new Error("Cannot edit root message");
    const props = vertex.getProperties();

    const newProps: Record<string, any> = {
      _n: "message",
      createdAt: Date.now(),
      text: newText,
      role: props.role,
      main: true,
    };

    const newVertex = vertex.parent.newChild(newProps);
    const siblings = parent.children;

    for (const sib of siblings) {
      if (sib.id !== newVertex.id && sib.getProperty("main") === true) {
        sib.setProperty("main", false);
      }
    }
  }

  switchMain(childId: string): void {
    const child = this.appTree.tree.getVertex(childId);
    if (!child) throw new Error("Vertex " + childId + " not found");
    const parent = child.parent;
    if (!parent) return;
    for (const sib of parent.children) {
      sib.setProperty("main", sib.id === childId);
    }
  }

  private getLastMsgParentVertex(): Vertex {
    let targetVertex = this.messagesVertex;

    if (!targetVertex) {
      // Create messages vertex if it doesn't exist
      targetVertex = this.appTree.tree.newVertex(this.appTree.tree.rootVertexId, {
        _n: "messages",
      });
    }

    // Get the last message vertex
    while (targetVertex.children.length > 0) {
      targetVertex = targetVertex.children[0];
    }

    return targetVertex;
  }

  isLastMessage(messageId: string): boolean {
    const vertex = this.appTree.tree.getVertex(messageId);
    if (!vertex) {
      return false;
    }
    return vertex.children.length === 0;
  }

  isMessageInProgress(messageId: string): boolean {
    const vertex = this.appTree.tree.getVertex(messageId);
    if (!vertex) {
      return false;
    }

    return vertex.getProperty("inProgress") === true;
  }

  getMessageRole(messageId: string): "user" | "assistant" | undefined {
    const vertex = this.appTree.tree.getVertex(messageId);
    if (!vertex) {
      return undefined;
    }

    return vertex.getProperty("role") as "user" | "assistant";
  }

  getMessageProperty(messageId: string, property: string): any {
    const vertex = this.appTree.tree.getVertex(messageId);
    if (!vertex) {
      return undefined;
    }

    return vertex.getProperty(property);
  }

  get threadId(): string {
    return this.appTree.tree.rootVertexId;
  }
}
