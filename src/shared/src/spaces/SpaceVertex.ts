import { ReplicatedTree } from "../replicatedTree/ReplicatedTree";
import { VertexPropertyType } from "../replicatedTree/treeTypes";

export class SpaceVertex {
  private tree: ReplicatedTree;
  readonly rootVertexId: string;

  constructor(tree: ReplicatedTree, rootVertexId: string) {
    this.tree = tree;
    this.rootVertexId = rootVertexId;
  }

  newChildVertex(): SpaceVertex {
    const vertexId = this.tree.newVertex(this.rootVertexId);
    return new SpaceVertex(this.tree, vertexId);
  }

  getProperty(key: string): VertexPropertyType | undefined {
    return this.tree.getVertexProperty(this.rootVertexId, key)?.value;
  }

  getProperties(): Record<string, VertexPropertyType> {
    return this.tree.getVertexProperties(this.rootVertexId).reduce((acc, property) => {
      acc[property.key] = property.value;
      return acc;
    }, {} as Record<string, VertexPropertyType>);
  }

  setProperty(key: string, value: VertexPropertyType): SpaceVertex {
    this.tree.setVertexProperty(this.rootVertexId, key, value);
    return this;
  }

  setProperties(properties: Record<string, VertexPropertyType>): SpaceVertex {
    for (const [key, value] of Object.entries(properties)) {
      this.setProperty(key, value);
    }
    return this;
  }
}
