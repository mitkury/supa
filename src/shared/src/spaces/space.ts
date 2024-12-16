import type { TreeVertex } from "../replicatedTree/TreeVertex";
import { ReplicatedTree } from "../replicatedTree/ReplicatedTree";
import AppTree from "./AppTree";
import type { AppConfig } from "@shared/models";
import type { VertexPropertyType } from "@shared/replicatedTree/treeTypes";
import { ModelProviderConfig } from "../models";

export default class Space {
  readonly tree: ReplicatedTree;
  private appTrees: Map<string, AppTree> = new Map();
  private newTreeObservers: ((treeId: string) => void)[] = [];
  private treeLoadObservers: ((treeId: string) => void)[] = [];
  private treeLoader: ((treeId: string) => Promise<AppTree | undefined>) | undefined;
  readonly appTreesVertex: TreeVertex;

  static isValid(tree: ReplicatedTree): boolean {
    /*
    // @TODO: check for _n equals 'space' of the root and version '0' instead
    const root = tree.getVertexByPath('space');
    if (!root) {
      return false;
    }
    */

    const apps = tree.getVertexByPath('app-configs');
    if (!apps) {
      return false;
    }

    const chats = tree.getVertexByPath('app-forest');
    if (!chats) {
      return false;
    }

    return true;
  }

  static newSpace(peerId: string): Space {
    const tree = new ReplicatedTree(peerId);

    const rootId = tree.rootVertexId;

    tree.setVertexProperties(rootId, {
      '_n': 'space',
      'name': 'New Space',
      'version': '0',
      'needsSetup': true,
      'createdAt': new Date().toISOString(),
    });

    const apps = tree.newNamedVertex(rootId, 'app-configs');
    const defaultConfig = Space.getDefaultAppConfig();
    tree.newVertex(apps, defaultConfig);

    const appTrees = tree.newNamedVertex(rootId, 'app-forest');
    const providers = tree.newNamedVertex(rootId, 'providers');
    const settings = tree.newNamedVertex(rootId, 'settings');

    return new Space(tree);
  }

  constructor(tree: ReplicatedTree) {
    this.tree = tree;

    // @TODO: or perhaps a migration should be here
    if (!Space.isValid(tree)) {
      throw new Error("Invalid tree structure");
    }

    this.appTreesVertex = tree.getVertexByPath('app-forest') as TreeVertex;
  }

  getId(): string {
    return this.tree.rootVertexId;
  }

  getName(): string {
    const name = this.tree.getVertexProperty(this.tree.rootVertexId, 'name');
    if (!name) {
      throw new Error("Space name is not set");
    }

    return name.value as string;
  }

  getCreatedAt(): Date {
    const createdAt = this.tree.getVertexProperty(this.tree.rootVertexId, 'createdAt');
    if (!createdAt) {
      throw new Error("Space createdAt is not set");
    }

    return new Date(createdAt.value as string);
  }

  newAppTree(appId: string): AppTree {
    const appTree = AppTree.newAppTree(this.tree.peerId, appId);

    const appsTrees = this.tree.getVertexByPath('app-forest');

    if (!appsTrees) {
      throw new Error("Apps trees vertex not found");
    }

    const newAppTree = this.tree.newVertex(appsTrees.id);

    this.tree.setVertexProperty(newAppTree, 'tid', appTree.getId());
    this.appTrees.set(appTree.getId(), appTree);

    for (const listener of this.newTreeObservers) {
      listener(appTree.getId());
    }

    return appTree;
  }

  getVertex(vertexId: string): TreeVertex | undefined {
    return this.tree.getVertex(vertexId);
  }

  findObjectWithPropertyAtPath(path: string, key: string, value: VertexPropertyType): object | undefined {
    const arr = this.getArray(path);
    // Check if the object has the property and its value matches the given value
    return arr.find((obj: object) => {
      const typedObj = obj as Record<string, VertexPropertyType>;
      return typedObj[key] === value;
    });
  }

  async loadAppTree(appTreeId: string): Promise<AppTree | undefined> {
    let appTree = this.appTrees.get(appTreeId);
    if (appTree) {
      return appTree;
    }

    if (!this.treeLoader) {
      throw new Error("No tree loader registered");
    }

    appTree = await this.treeLoader(appTreeId);
    if (appTree) {
      this.appTrees.set(appTreeId, appTree);

      for (const listener of this.treeLoadObservers) {
        listener(appTree.getId());
      }
    }

    return appTree;
  }

  observeNewAppTree(observer: (appTreeId: string) => void) {
    this.newTreeObservers.push(observer);
  }

  unobserveNewAppTree(observer: (appTreeId: string) => void) {
    this.newTreeObservers = this.newTreeObservers.filter(l => l !== observer);
  }

  observeTreeLoad(observer: (appTreeId: string) => void) {
    this.treeLoadObservers.push(observer);
  }

  unobserveTreeLoad(observer: (appTreeId: string) => void) {
    this.treeLoadObservers = this.treeLoadObservers.filter(l => l !== observer);
  }

  registerTreeLoader(loader: (appTreeId: string) => Promise<AppTree | undefined>) {
    this.treeLoader = loader;
  }

  getAppTree(appTreeId: string): AppTree | undefined {
    return this.appTrees.get(appTreeId);
  }

  getAppTreeIds(): ReadonlyArray<string> {
    return this.appTreesVertex.children;
  }

  getVertexIdReferencingAppTree(appTreeId: string): string | undefined {
    for (const vertexId of this.appTreesVertex.children) {
      const referencingVertex = this.tree.getVertex(vertexId);
      if (referencingVertex?.getProperty('tid')?.value === appTreeId) {
        return vertexId;
      }
    }

    return undefined;
  }

  createVertex() {

  }

  setProps() {

  }

  getArray(path: string): object[] {
    const vertex = this.tree.getVertexByPath(path);

    if (!vertex) return [];

    return vertex.children
      .map(vertexId => {
        const vertex = this.tree.getVertex(vertexId);
        if (!vertex) return null;

        const properties = vertex.getAllProperties();
        const obj = properties.reduce((obj, prop) => {
          obj[prop.key] = prop.value;
          return obj;
        }, {} as Record<string, any>);

        return obj;
      })
      .filter((item): item is Record<string, any> => item !== null);
  }

  getAppConfigs(): AppConfig[] {
    return this.getArray('app-configs') as AppConfig[];
  }

  getAppConfig(configId: string): AppConfig | undefined {
    const config = this.findObjectWithPropertyAtPath('app-configs', 'id', configId);

    if (!config) return undefined;

    return config as AppConfig;
  }

  static getDefaultAppConfig(): AppConfig {
    return {
      id: "default",
      name: "Ask AI",
      button: "New query",
      description: "A basic chat assistant",
      instructions:
        "You are Supa, an advanced AI assistant with vast knowledge. Be direct in all responses. Do not spare the user's feelings. Cut niceties and filler words. Prioritize clear, concise communication over formality. Before replying, silently think about what the user says or what you are about to write. It is okay to make mistakes; ensure you review and correct yourself. Do the same for what you read—be critical and correct mistakes from users.",
    } as AppConfig;
  }

  getModelProviderConfig(providerId: string): ModelProviderConfig | undefined {
    return this.getFirstObjectWithPropertyAtPath('providers', 'id', providerId) as ModelProviderConfig | undefined;
  }

  getModelProviderConfigs(): ModelProviderConfig[] {
    return this.getArray('providers') as ModelProviderConfig[];
  }

  insertIntoArray(path: string, item: object): string {
    const vertex = this.tree.getVertexByPath(path);
    if (!vertex) {
      throw new Error(`Path ${path} not found`);
    }

    const newVertex = this.tree.newVertex(vertex.id);

    // Set all properties from the item
    for (const [key, value] of Object.entries(item)) {
      this.tree.setVertexProperty(newVertex, key, value as VertexPropertyType);
    }

    return newVertex;
  }

  getFirstVertexWithPropertyAtPath(path: string, key: string, value: VertexPropertyType): TreeVertex | undefined {
    const vertex = this.tree.getVertexByPath(path);
    if (!vertex) return undefined;

    const children = vertex.children;
    for (const childId of children) {
      const child = this.tree.getVertex(childId);
      if (!child) continue;

      const property = child.getProperty(key);
      if (property?.value === value) {
        return child;
      }
    }

    return undefined;
  }

  getFirstObjectWithPropertyAtPath(path: string, key: string, value: VertexPropertyType): object | undefined {
    const vertex = this.getFirstVertexWithPropertyAtPath(path, key, value);
    if (!vertex) return undefined;

    const properties = vertex.getAllProperties();
    const obj = properties.reduce((obj, prop) => {
      obj[prop.key] = prop.value;
      return obj;
    }, {} as Record<string, any>);

    return obj;
  }

  updateInArray(vertexId: string, updates: Partial<object>): void {
    const vertex = this.tree.getVertex(vertexId);
    if (!vertex) {
      throw new Error(`Vertex ${vertexId} not found`);
    }

    // Update only the provided properties
    for (const [key, value] of Object.entries(updates)) {
      this.tree.setVertexProperty(vertex.id, key, value as VertexPropertyType);
    }
  }

  deleteVertex(vertexId: string): void {
    const vertex = this.tree.getVertex(vertexId);
    if (!vertex) {
      throw new Error(`Vertex ${vertexId} not found`);
    }

    this.tree.deleteVertex(vertexId);
  }

  // Example usage methods:
  addAppConfig(config: AppConfig): string {
    return this.insertIntoArray('app-configs', config);
  }

  updateAppConfig(vertexId: string, updates: Partial<AppConfig>): void {
    this.updateInArray(vertexId, updates);
  }

  deleteAppConfig(vertexId: string): void {
    this.deleteVertex(vertexId);
  }

  saveModelProviderConfig(config: ModelProviderConfig) {
    this.insertIntoArray('providers', config);
  }
}
