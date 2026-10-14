/** Versioned, domain-neutral persisted graph document. Viewport and React Flow state are editor-only. */
export const GRAPH_SCHEMA_VERSION = 1 as const;
export type Direction = 'input' | 'output';
export type Cardinality = 'one' | 'many';
export type Point = { x: number; y: number };
export type IconDescriptor = { name: string; [key: string]: unknown };
export type Connector = {
  id: string;
  direction: Direction;
  label?: string;
  color?: string;
  icon?: IconDescriptor;
  type?: string;
  cardinality?: Cardinality;
  metadata?: Record<string, unknown>;
};
export type GraphNode = {
  id: string;
  title: string;
  description?: string;
  icon?: IconDescriptor;
  position: Point;
  connectors: Connector[];
  metadata?: Record<string, unknown>;
};
export type Connection = {
  id: string;
  sourceNodeId: string;
  sourceConnectorId: string;
  targetNodeId: string;
  targetConnectorId: string;
  label?: string;
  color?: string;
  metadata?: Record<string, unknown>;
};
export type GraphDocument = {
  schemaVersion: typeof GRAPH_SCHEMA_VERSION;
  id: string;
  nodes: GraphNode[];
  connections: Connection[];
  metadata?: Record<string, unknown>;
};
export type GraphIssue = {
  elementId: string;
  elementType: 'graph' | 'node' | 'connector' | 'connection';
  message: string;
};
export type CompatibilityRule = (
  source: Connector,
  target: Connector,
  graph: GraphDocument
) => boolean | string;

export function createGraph(id = createId()): GraphDocument {
  return { schemaVersion: GRAPH_SCHEMA_VERSION, id, nodes: [], connections: [] };
}
export function createId(prefix = 'id'): string {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11)}`;
}
export function cloneGraph<T extends GraphDocument>(graph: T): T {
  return structuredClone(graph);
}
export function updateNode(
  graph: GraphDocument,
  nodeId: string,
  patch: Partial<Omit<GraphNode, 'id' | 'connectors'>>
): GraphDocument {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node))
  };
}
export function addNode(graph: GraphDocument, node: GraphNode): GraphDocument {
  if (!node.id) throw new Error('Node id must be a non-empty string.');
  if (graph.nodes.some((item) => item.id === node.id))
    throw new Error(`Node id "${node.id}" already exists.`);
  const connectorIds = new Set(
    graph.nodes.flatMap((item) => item.connectors.map((port) => port.id))
  );
  for (const connector of node.connectors) {
    if (!connector.id || connectorIds.has(connector.id))
      throw new Error(`Connector id "${connector.id}" is empty or already exists in this graph.`);
    connectorIds.add(connector.id);
  }
  return { ...graph, nodes: [...graph.nodes, structuredClone(node)] };
}
export function removeNode(graph: GraphDocument, nodeId: string): GraphDocument {
  const connectors = new Set(
    graph.nodes.find((node) => node.id === nodeId)?.connectors.map((c) => c.id) ?? []
  );
  return {
    ...graph,
    nodes: graph.nodes.filter((node) => node.id !== nodeId),
    connections: graph.connections.filter(
      (edge) =>
        edge.sourceNodeId !== nodeId &&
        edge.targetNodeId !== nodeId &&
        !connectors.has(edge.sourceConnectorId) &&
        !connectors.has(edge.targetConnectorId)
    )
  };
}
export function upsertConnector(
  graph: GraphDocument,
  nodeId: string,
  connector: Connector
): GraphDocument {
  if (!graph.nodes.some((node) => node.id === nodeId))
    throw new Error(`Node id "${nodeId}" does not exist.`);
  const duplicate = graph.nodes.some(
    (node) => node.id !== nodeId && node.connectors.some((item) => item.id === connector.id)
  );
  if (!connector.id || duplicate)
    throw new Error(`Connector id "${connector.id}" is empty or already exists in this graph.`);
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (node.id !== nodeId) return node;
      const found = node.connectors.some((item) => item.id === connector.id);
      return {
        ...node,
        connectors: found
          ? node.connectors.map((item) =>
              item.id === connector.id ? structuredClone(connector) : item
            )
          : [...node.connectors, structuredClone(connector)]
      };
    })
  };
}
export function removeConnector(
  graph: GraphDocument,
  nodeId: string,
  connectorId: string
): GraphDocument {
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === nodeId
        ? { ...node, connectors: node.connectors.filter((item) => item.id !== connectorId) }
        : node
    ),
    connections: graph.connections.filter(
      (edge) =>
        !(edge.sourceNodeId === nodeId && edge.sourceConnectorId === connectorId) &&
        !(edge.targetNodeId === nodeId && edge.targetConnectorId === connectorId)
    )
  };
}
export function addConnection(
  graph: GraphDocument,
  connection: Connection,
  rule?: CompatibilityRule
): GraphDocument {
  const result = validateConnection(graph, connection, rule);
  if (result) throw new Error(result.message);
  if (graph.connections.some((edge) => edge.id === connection.id))
    throw new Error(`Connection id "${connection.id}" already exists.`);
  return { ...graph, connections: [...graph.connections, structuredClone(connection)] };
}
export function removeConnection(graph: GraphDocument, connectionId: string): GraphDocument {
  return { ...graph, connections: graph.connections.filter((edge) => edge.id !== connectionId) };
}
export function validateConnection(
  graph: GraphDocument,
  edge: Pick<
    Connection,
    'sourceNodeId' | 'sourceConnectorId' | 'targetNodeId' | 'targetConnectorId'
  >,
  rule?: CompatibilityRule
): GraphIssue | undefined {
  const sourceNode = graph.nodes.find((node) => node.id === edge.sourceNodeId);
  const targetNode = graph.nodes.find((node) => node.id === edge.targetNodeId);
  const source = sourceNode?.connectors.find((item) => item.id === edge.sourceConnectorId);
  const target = targetNode?.connectors.find((item) => item.id === edge.targetConnectorId);
  const issue = (message: string): GraphIssue => ({
    elementId: source?.id ?? target?.id ?? edge.sourceNodeId,
    elementType: 'connection',
    message
  });
  if (!sourceNode || !targetNode || !source || !target)
    return issue('Both endpoint nodes and connectors must exist.');
  if (source.direction !== 'output' || target.direction !== 'input')
    return issue('Connections must go from an output connector to an input connector.');
  if (rule) {
    const allowed = rule(source, target, graph);
    if (allowed !== true)
      return issue(typeof allowed === 'string' ? allowed : 'These connectors are not compatible.');
  }
  const inbound = graph.connections.filter(
    (item) => item.targetNodeId === targetNode.id && item.targetConnectorId === target.id
  );
  const outbound = graph.connections.filter(
    (item) => item.sourceNodeId === sourceNode.id && item.sourceConnectorId === source.id
  );
  if (target.cardinality === 'one' && inbound.length)
    return issue(`Input "${target.label ?? target.id}" accepts one connection.`);
  if (source.cardinality === 'one' && outbound.length)
    return issue(`Output "${source.label ?? source.id}" accepts one connection.`);
  return undefined;
}
export function validateGraph(graph: GraphDocument, rule?: CompatibilityRule): GraphIssue[] {
  const issues: GraphIssue[] = [],
    nodeIds = new Set<string>(),
    connectorIds = new Set<string>(),
    edgeIds = new Set<string>();
  if (!graph.id)
    issues.push({
      elementId: graph.id,
      elementType: 'graph',
      message: 'Graph id must be a non-empty string.'
    });
  if (graph.schemaVersion !== GRAPH_SCHEMA_VERSION)
    issues.push({
      elementId: graph.id,
      elementType: 'graph',
      message: `Unsupported graph schema version "${String(graph.schemaVersion)}".`
    });
  for (const node of graph.nodes) {
    if (!node.id || nodeIds.has(node.id))
      issues.push({
        elementId: node.id,
        elementType: 'node',
        message: `Duplicate or empty node id "${node.id}".`
      });
    nodeIds.add(node.id);
    if (!Number.isFinite(node.position?.x) || !Number.isFinite(node.position?.y))
      issues.push({
        elementId: node.id,
        elementType: 'node',
        message: 'Node position must use finite x and y coordinates.'
      });
    for (const connector of node.connectors) {
      if (!connector.id || connectorIds.has(connector.id))
        issues.push({
          elementId: connector.id,
          elementType: 'connector',
          message: `Connector ids must be unique across the graph; "${connector.id}" is duplicated or empty.`
        });
      connectorIds.add(connector.id);
    }
  }
  for (const edge of graph.connections) {
    if (!edge.id || edgeIds.has(edge.id))
      issues.push({
        elementId: edge.id,
        elementType: 'connection',
        message: `Duplicate or empty connection id "${edge.id}".`
      });
    edgeIds.add(edge.id);
    const invalid = validateConnection(
      { ...graph, connections: graph.connections.filter((item) => item.id !== edge.id) },
      edge,
      rule
    );
    if (invalid) issues.push({ ...invalid, elementId: edge.id });
  }
  return issues;
}
export function serializeGraph(graph: GraphDocument): string {
  const issues = validateGraph(graph);
  if (issues.length) throw new Error(`Cannot serialize invalid graph: ${issues[0]!.message}`);
  return JSON.stringify(graph, null, 2);
}
export function deserializeGraph(json: string): GraphDocument {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error('Graph JSON is not valid JSON.');
  }
  if (!isRecord(value)) throw new Error('Graph document must be a JSON object.');
  if (value.schemaVersion !== GRAPH_SCHEMA_VERSION)
    throw new Error(
      `Unsupported graph schema version "${String(value.schemaVersion)}". This editor supports version ${GRAPH_SCHEMA_VERSION}.`
    );
  if (
    typeof value.id !== 'string' ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.connections) ||
    !optional(value.metadata, isRecord)
  )
    throw new Error('Graph document must contain an id, nodes array, and connections array.');
  if (!value.nodes.every(isNode) || !value.connections.every(isConnection))
    throw new Error(
      'Invalid graph document: each node and connection must contain the required fields with the documented types.'
    );
  const issues = validateGraph(value as GraphDocument);
  if (issues.length) throw new Error(`Invalid graph document: ${issues[0]!.message}`);
  return value as GraphDocument;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isNode(value: unknown): value is GraphNode {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    !isRecord(value.position) ||
    typeof value.position.x !== 'number' ||
    typeof value.position.y !== 'number' ||
    !Array.isArray(value.connectors)
  )
    return false;
  if (
    !optional(value.description, (item) => typeof item === 'string') ||
    !optional(value.icon, isIcon) ||
    !optional(value.metadata, isRecord)
  )
    return false;
  return value.connectors.every(
    (connector) =>
      isRecord(connector) &&
      typeof connector.id === 'string' &&
      (connector.direction === 'input' || connector.direction === 'output') &&
      optional(connector.label, (item) => typeof item === 'string') &&
      optional(connector.color, (item) => typeof item === 'string') &&
      optional(connector.icon, isIcon) &&
      optional(connector.type, (item) => typeof item === 'string') &&
      optional(connector.cardinality, (item) => item === 'one' || item === 'many') &&
      optional(connector.metadata, isRecord)
  );
}
function isConnection(value: unknown): value is Connection {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.sourceNodeId === 'string' &&
    typeof value.sourceConnectorId === 'string' &&
    typeof value.targetNodeId === 'string' &&
    typeof value.targetConnectorId === 'string' &&
    optional(value.label, (item) => typeof item === 'string') &&
    optional(value.color, (item) => typeof item === 'string') &&
    optional(value.metadata, isRecord)
  );
}
function isIcon(value: unknown): boolean {
  return isRecord(value) && typeof value.name === 'string';
}
function optional(value: unknown, check: (value: unknown) => boolean): boolean {
  return value === undefined || check(value);
}
