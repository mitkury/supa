import type { AppConfig } from "../models";
import type { Vertex } from "../../../reptree/src/index";
import Space from "./Space";

function enrichDefaultConfig(configs: AppConfig[]): AppConfig[] {
  // Enrich the default config with the default values
  const defaultConfigIndex = configs.findIndex((config) => config.id === "default");
  if (defaultConfigIndex !== -1) {
    const defaultConfig = Space.getDefaultAppConfig();
    configs[defaultConfigIndex] = {
      ...defaultConfig,
      ...configs[defaultConfigIndex],
    };
  }

  return configs.sort((a, b) => {
    const aDate = new Date(a._c).getTime();
    const bDate = new Date(b._c).getTime();
    return aDate - bDate;
  });
}

// @TODO: answer: should I resolve 'id' into vertex id? And same for _n to 'name'?

// @TODO: could it be based on a generic data class? SpaceArray<T>(rootVertex: Vertex)
export class AppConfigsData {
  private root: Vertex;

  constructor(root: Vertex) {
    this.root = root;

    if (!this.root) {
      throw new Error("App configs vertex not found");
    }
  }

  getAll(): AppConfig[] {
    return enrichDefaultConfig(this.root.getChildrenAsTypedArray<AppConfig>());
  }

  get(configId: string): AppConfig | undefined {
    const config = this.root.findFirstTypedChildWithProperty<AppConfig>("id", configId);

    if (config?.id === "default") {
      return enrichDefaultConfig([config])[0];
    }

    return config;
  }

  // @TODO: consider adding automatically
  add(config: AppConfig) {
    // @TODO: Require ID

    this.root.newChild({
      id: config.id,
      name: config.name,
      description: config.description,
      instructions: config.instructions,
      targetLLM: config.targetLLM,
    });
  }

  update(id: string, updates: Partial<AppConfig>) {
    const targetVertex = this.root.findFirstChildVertexWithProperty("id", id);
    if (!targetVertex) {
      throw new Error(`App config ${id} not found`);
    }

    targetVertex.setProperties(updates);
  }

  delete(entry: AppConfig) {
    const vertex = this.root.findFirstChildVertexWithProperty("id", entry.id);
    if (!vertex) {
      throw new Error(`App config ${entry.id} not found`);
    }

    vertex.delete();
  }

  observe(observer: (appConfigs: AppConfig[]) => void) {
    function observerWrapper(appConfigs: AppConfig[]) {
      observer(enrichDefaultConfig(appConfigs));
    }

    observer(this.getAll());

    return this.root.observeChildrenAsTypedArray(observerWrapper);
  }
}
