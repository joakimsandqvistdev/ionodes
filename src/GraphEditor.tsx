import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode
} from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection as FlowConnection,
  type EdgeChange,
  type Edge,
  type Node,
  type NodeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './style.css';
import {
  addConnection,
  addNode,
  createGraph,
  createId,
  removeConnector,
  removeConnection,
  removeNode,
  serializeGraph,
  deserializeGraph,
  updateNode,
  upsertConnector,
  validateConnection,
  type CompatibilityRule,
  type Connector,
  type GraphDocument,
  type GraphIssue,
  type GraphNode
} from './graph';
import { commit, createHistory, redo, undo } from './history';

export type PaletteItem = {
  label: string;
  description?: string;
  icon?: ReactNode;
  create: () => GraphNode;
};
export type EditorIconName =
  | 'node'
  | 'validation'
  | 'palette-add'
  | 'undo'
  | 'redo'
  | 'delete'
  | 'connector-add'
  | 'connector-remove'
  | 'export'
  | 'import'
  | 'close'
  | 'selection-node'
  | 'selection-connection'
  | 'empty-graph'
  | 'data-export'
  | 'data-import'
  | 'dismiss'
  | 'error'
  | 'input-add'
  | 'output-add'
  | 'connection'
  | 'selection-empty'
  | 'input-direction'
  | 'output-direction'
  | 'fit-shortcut';
export type GraphEditorIcons = Partial<Record<EditorIconName, ReactNode>>;
export type GraphEditorTheme = CSSProperties & {
  [name: `--ionodes-${string}`]: string | number | undefined;
};
export type EditorMessage =
  { kind: 'validation'; issue: GraphIssue } | { kind: 'error'; message: string };
export type EditorMessageKind = EditorMessage['kind'];
export type GraphEditorMessageClassNames = Partial<Record<EditorMessageKind, string>>;
export type GraphEditorCanvas = {
  background?: ReactNode;
  controls?: ReactNode;
  miniMap?: ReactNode;
  /** Hide React Flow's attribution link. The xyflow team encourages supporting its maintenance when doing so. */
  hideAttribution?: boolean;
  backgroundColor?: string;
  backgroundGap?: number;
  backgroundSize?: number;
  showBackground?: boolean;
  showControls?: boolean;
  showMiniMap?: boolean;
  miniMapNodeColor?: (node: GraphNode, invalid: boolean) => string;
  invalidNodeColor?: string;
  miniMapMaskColor?: string;
  connectionColor?: string;
  invalidConnectionColor?: string;
};
export type GraphEditorProps = {
  graph?: GraphDocument;
  defaultGraph?: GraphDocument;
  onChange?: (graph: GraphDocument) => void;
  onSelectionChange?: (selection: { nodeIds: string[]; connectionIds: string[] }) => void;
  onGraphEvent?: (event: {
    type: 'node-added' | 'node-removed' | 'connection-added' | 'connection-removed' | 'imported';
    graph: GraphDocument;
  }) => void;
  validateConnection?: CompatibilityRule;
  /** Additional React Flow renderers. Each receives graphNode, invalid, and updateGraphNode in data. */
  nodeTypes?: NodeTypes;
  /** Selects a registered renderer for each graph node. Defaults to "ionode". */
  getNodeType?: (node: GraphNode) => string;
  /** Inline CSS properties and custom properties (for example `--ionodes-accent`). */
  theme?: GraphEditorTheme;
  /** Replaces the default canvas, grid, controls and minimap settings. */
  canvas?: GraphEditorCanvas;
  /** Show the bottom status bar. Defaults to true. */
  showStatusBar?: boolean;
  /** Replace any built-in icon. Omitted entries keep their defaults. */
  icons?: GraphEditorIcons;
  /** Render graph-provided icon descriptor names as React elements. */
  renderGraphIcon?: (name: string, context: 'node' | 'connector') => ReactNode;
  /** Customize connector label content while retaining the built-in React Flow handles. */
  renderConnectorLabel?: (connector: Connector) => ReactNode;
  /** Hide validation feedback while keeping validation rules active. Defaults to true. */
  showValidationMessages?: boolean;
  /** Hide warnings when a connection fails validation, without allowing invalid connections. Defaults to true. */
  showConnectionWarnings?: boolean;
  /** Hide import/export/connection error feedback. Defaults to true. */
  showErrorMessages?: boolean;
  /** Replace the visible message content. Return null to suppress an individual message. */
  renderMessage?: (message: EditorMessage) => ReactNode;
  /** Add consumer classes to the validation and error message containers. */
  messageClassNames?: GraphEditorMessageClassNames;
  /** Display a consumer-provided graph name in the canvas label. Defaults to "Untitled graph". */
  graphTitle?: string;
  palette?: PaletteItem[];
  showPalette?: boolean;
  showInspector?: boolean;
  className?: string;
};
export type GraphNodeRendererData = {
  graphNode: GraphNode;
  invalid?: boolean;
  updateGraphNode: (patch: Partial<Omit<GraphNode, 'id' | 'connectors'>>) => void;
  renderGraphIcon?: GraphEditorProps['renderGraphIcon'];
  renderConnectorLabel?: GraphEditorProps['renderConnectorLabel'];
  icons?: GraphEditorIcons;
};
type FlowNode = Node<GraphNodeRendererData, string>;

function GraphNodeView({ data, selected }: { data: GraphNodeRendererData; selected?: boolean }) {
  const { graphNode, invalid, renderGraphIcon, icons } = data;
  return (
    <div className={`ionodes-node${selected ? ' is-selected' : ''}${invalid ? ' has-error' : ''}`}>
      <div className="ionodes-node-header">
        <span className="ionodes-node-icon" aria-hidden="true">
          {(graphNode.icon && renderGraphIcon?.(graphNode.icon.name, 'node')) ??
            graphNode.icon?.name ??
            icons?.node ??
            '◇'}
        </span>
        <strong>{graphNode.title || 'Untitled node'}</strong>
        {invalid && (
          <span className="ionodes-error-mark" aria-label="Validation error">
            {icons?.error ?? '!'}
          </span>
        )}
      </div>
      {graphNode.description && (
        <div className="ionodes-node-description">{graphNode.description}</div>
      )}
      <div className="ionodes-connectors">
        {graphNode.connectors
          .filter((connector) => connector.direction === 'input')
          .map((connector) => (
            <ConnectorRow
              key={connector.id}
              connector={connector}
              renderLabel={data.renderConnectorLabel}
              renderGraphIcon={renderGraphIcon}
            />
          ))}
        {graphNode.connectors.some((connector) => connector.direction === 'input') &&
          graphNode.connectors.some((connector) => connector.direction === 'output') && (
            <div className="ionodes-divider" />
          )}
        {graphNode.connectors
          .filter((connector) => connector.direction === 'output')
          .map((connector) => (
            <ConnectorRow
              key={connector.id}
              connector={connector}
              renderLabel={data.renderConnectorLabel}
              renderGraphIcon={renderGraphIcon}
            />
          ))}
      </div>
    </div>
  );
}
function ConnectorRow({
  connector,
  renderLabel,
  renderGraphIcon
}: {
  connector: Connector;
  renderLabel?: GraphEditorProps['renderConnectorLabel'];
  renderGraphIcon?: GraphEditorProps['renderGraphIcon'];
}) {
  const input = connector.direction === 'input';
  return (
    <div className={`ionodes-connector-row ${input ? 'is-input' : 'is-output'}`}>
      {input && (
        <Handle
          type="target"
          position={Position.Left}
          id={connector.id}
          aria-label={`${connector.label || 'Input'} input`}
          style={{ background: connector.color || undefined }}
        />
      )}
      <span
        className="ionodes-connector-dot"
        style={{ backgroundColor: connector.color || undefined }}
        aria-hidden="true"
      />
      <span className="ionodes-connector-label">
        {renderLabel ? (
          renderLabel(connector)
        ) : (
          <>
            {connector.icon?.name && (
              <span aria-hidden="true">
                {renderGraphIcon?.(connector.icon.name, 'connector') ?? connector.icon.name}{' '}
              </span>
            )}
            {connector.label || (input ? 'Input' : 'Output')}
          </>
        )}
      </span>
      {connector.type && <span className="ionodes-type-key">{connector.type}</span>}
      {!input && (
        <Handle
          type="source"
          position={Position.Right}
          id={connector.id}
          aria-label={`${connector.label || 'Output'} output`}
          style={{ background: connector.color || undefined }}
        />
      )}
    </div>
  );
}
const defaultPalette: PaletteItem[] = [
  {
    label: 'Add node',
    description: 'A generic node with one input and one output.',
    create: () => ({
      id: createId('node'),
      title: 'New node',
      description: '',
      position: { x: 180, y: 120 },
      connectors: [
        { id: createId('port'), direction: 'input', label: 'Input', cardinality: 'many' },
        { id: createId('port'), direction: 'output', label: 'Output', cardinality: 'many' }
      ]
    })
  }
];

export function GraphEditor(props: GraphEditorProps) {
  return (
    <ReactFlowProvider>
      <GraphEditorInner {...props} />
    </ReactFlowProvider>
  );
}
function GraphEditorInner({
  graph: controlledGraph,
  defaultGraph,
  onChange,
  onSelectionChange,
  onGraphEvent,
  validateConnection: rule,
  palette = defaultPalette,
  showPalette = true,
  showInspector = true,
  className = '',
  nodeTypes: customNodeTypes,
  getNodeType,
  theme,
  canvas = {},
  icons = {},
  renderGraphIcon,
  renderConnectorLabel,
  showValidationMessages = true,
  showConnectionWarnings = true,
  showErrorMessages = true,
  showStatusBar = true,
  renderMessage,
  messageClassNames,
  graphTitle
}: GraphEditorProps) {
  const [history, setHistory] = useState(() =>
    createHistory(defaultGraph ?? controlledGraph ?? createGraph(createId('graph')))
  );
  const graph = controlledGraph ?? history.present;
  const [selection, setSelection] = useState<{ nodeIds: string[]; connectionIds: string[] }>({
    nodeIds: [],
    connectionIds: []
  });
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const updateSelection = useCallback((next: { nodeIds: string[]; connectionIds: string[] }) => {
    const current = selectionRef.current;
    const sameIds = (left: string[], right: string[]) =>
      left.length === right.length && left.every((id) => right.includes(id));
    if (sameIds(current.nodeIds, next.nodeIds) && sameIds(current.connectionIds, next.connectionIds))
      return;
    selectionRef.current = next;
    setSelection(next);
    onSelectionChangeRef.current?.(next);
  }, []);
  const [positionOverrides, setPositionOverrides] = useState<Record<string, GraphNode['position']>>(
    {}
  );
  const [nodeMeasurements, setNodeMeasurements] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [error, setError] = useState('');
  const [json, setJson] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [jsonMode, setJsonMode] = useState<'import' | 'export'>('import');
  const fileInput = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const { fitView } = useReactFlow();
  const selectedNode = graph.nodes.find((node) => selection.nodeIds.includes(node.id));
  const issues = useMemo(
    () =>
      showConnectionWarnings
        ? graph.connections.flatMap((edge) => {
            const issue = validateConnection(graph, edge, rule);
            return issue ? [issue] : [];
          })
        : [],
    [graph, rule, showConnectionWarnings]
  );
  const validationIssue = issues[0];
  const validationMessage = validationIssue
    ? renderMessage
      ? renderMessage({ kind: 'validation', issue: validationIssue })
      : validationIssue.message
    : null;
  const errorMessage = error
    ? renderMessage
      ? renderMessage({ kind: 'error', message: error })
      : error
    : null;
  const invalidNodeIds = useMemo(() => {
    const invalid = new Set<string>();
    for (const issue of issues) {
      const node = graph.nodes.find(
        (item) =>
          item.id === issue.elementId ||
          item.connectors.some((connector) => connector.id === issue.elementId)
      );
      if (node) invalid.add(node.id);
      const edge = graph.connections.find((item) => item.id === issue.elementId);
      if (edge) {
        invalid.add(edge.sourceNodeId);
        invalid.add(edge.targetNodeId);
      }
    }
    return invalid;
  }, [graph.nodes, graph.connections, issues]);
  const commitGraph = useCallback(
    (next: GraphDocument) => {
      if (!controlledGraph) setHistory((current) => commit(current, next));
      onChange?.(next);
    },
    [controlledGraph, onChange]
  );
  const setGraph = useCallback((next: GraphDocument) => commitGraph(next), [commitGraph]);
  const updateGraphNode = useCallback(
    (id: string, patch: Partial<Omit<GraphNode, 'id' | 'connectors'>>) =>
      commitGraph(updateNode(graph, id, patch)),
    [graph, commitGraph]
  );
  const flowNodes = useMemo<FlowNode[]>(
    () =>
      graph.nodes.map((item) => ({
        id: item.id,
        type: getNodeType?.(item) ?? 'ionode',
        position: positionOverrides[item.id] ?? item.position,
        measured: nodeMeasurements[item.id],
        data: {
          graphNode: item,
          invalid: invalidNodeIds.has(item.id),
          updateGraphNode: (patch) => updateGraphNode(item.id, patch),
          renderGraphIcon,
          renderConnectorLabel,
          icons
        },
        selected: selection.nodeIds.includes(item.id),
        draggable: true
      })),
    [
      graph.nodes,
      invalidNodeIds,
      nodeMeasurements,
      selection.nodeIds,
      positionOverrides,
      getNodeType,
      updateGraphNode,
      renderGraphIcon,
      renderConnectorLabel,
      icons
    ]
  );
  const flowEdges = useMemo<Edge[]>(
    () =>
      graph.connections.map((edge) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        sourceHandle: edge.sourceConnectorId,
        target: edge.targetNodeId,
        targetHandle: edge.targetConnectorId,
        label: edge.label,
        selected: selection.connectionIds.includes(edge.id),
        style: {
          stroke: issues.some((issue) => issue.elementId === edge.id)
            ? canvas.invalidConnectionColor || '#f17870'
            : edge.color || canvas.connectionColor || '#77a9ff',
          strokeWidth: 2
        },
        animated: false
      })),
    [
      graph.connections,
      issues,
      canvas.connectionColor,
      canvas.invalidConnectionColor,
      selection.connectionIds
    ]
  );
  const nodeTypes = useMemo<NodeTypes>(
    () => ({ ionode: GraphNodeView as never, ...customNodeTypes }),
    [customNodeTypes]
  );
  const onNodesChange = useCallback(
    (changes: Parameters<typeof applyNodeChanges>[0]) => {
      const dimensionChanges = changes.flatMap((change) =>
        change.type === 'dimensions' && change.dimensions
          ? [{ id: change.id, dimensions: change.dimensions }]
          : []
      );
      if (dimensionChanges.length) {
        setNodeMeasurements((current) => {
          let next = current;
          for (const change of dimensionChanges) {
            const previous = current[change.id];
            if (
              previous?.width !== change.dimensions.width ||
              previous?.height !== change.dimensions.height
            ) {
              if (next === current) next = { ...current };
              next[change.id] = change.dimensions;
            }
          }
          return next;
        });
      }
      const moved = applyNodeChanges(changes, flowNodes);
      if (changes.some((change) => change.type === 'select')) {
        updateSelection({
          ...selectionRef.current,
          nodeIds: moved.filter((node) => node.selected).map((node) => node.id)
        });
      }
      const next = {
        ...graph,
        nodes: graph.nodes.map((item) => {
          const flowNode = moved.find((node) => node.id === item.id);
          return flowNode ? { ...item, position: flowNode.position } : item;
        })
      };
      if (changes.some((change) => change.type === 'position' && change.dragging === false)) {
        commitGraph(next);
        setPositionOverrides({});
      } else if (changes.some((change) => change.type === 'position' && change.dragging))
        setPositionOverrides(Object.fromEntries(moved.map((node) => [node.id, node.position])));
    },
    [flowNodes, graph, commitGraph, updateSelection]
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const updatedEdges = applyEdgeChanges(changes, flowEdges);
      if (changes.some((change) => change.type === 'select')) {
        updateSelection({
          ...selectionRef.current,
          connectionIds: updatedEdges.filter((edge) => edge.selected).map((edge) => edge.id)
        });
      }
      const removed = changes
        .filter((change) => change.type === 'remove')
        .map((change) => change.id);
      if (removed.length) {
        const next = removed.reduce(removeConnection, graph);
        commitGraph(next);
        removed.forEach(() => onGraphEvent?.({ type: 'connection-removed', graph: next }));
      }
    },
    [graph, flowEdges, commitGraph, onGraphEvent, updateSelection]
  );
  const handleConnect = useCallback(
    (connection: FlowConnection) => {
      if (
        !connection.source ||
        !connection.target ||
        !connection.sourceHandle ||
        !connection.targetHandle
      )
        return;
      const item = {
        id: createId('connection'),
        sourceNodeId: connection.source,
        sourceConnectorId: connection.sourceHandle,
        targetNodeId: connection.target,
        targetConnectorId: connection.targetHandle
      };
      const issue = validateConnection(graph, item, rule);
      if (issue) {
        if (showConnectionWarnings) setError(issue.message);
        return;
      }
      try {
        const next = addConnection(graph, item, rule);
        setError('');
        setGraph(next);
        onGraphEvent?.({ type: 'connection-added', graph: next });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not create connection.');
      }
    },
    [graph, rule, showConnectionWarnings, setGraph, onGraphEvent]
  );
  const addPaletteItem = (item: PaletteItem) => {
    const node = item.create();
    const next = addNode(graph, node);
    setGraph(next);
    updateSelection({ nodeIds: [node.id], connectionIds: [] });
    onGraphEvent?.({ type: 'node-added', graph: next });
  };
  const updateSelectedNode = (patch: Partial<Omit<GraphNode, 'id' | 'connectors'>>) => {
    if (selectedNode) setGraph(updateNode(graph, selectedNode.id, patch));
  };
  const updateSelectedConnector = (connector: Connector) => {
    if (selectedNode) setGraph(upsertConnector(graph, selectedNode.id, connector));
  };
  const deleteSelected = () => {
    let next = graph;
    selection.nodeIds.forEach((id) => {
      next = removeNode(next, id);
      onGraphEvent?.({ type: 'node-removed', graph: next });
    });
    selection.connectionIds.forEach((id) => {
      next = removeConnection(next, id);
      onGraphEvent?.({ type: 'connection-removed', graph: next });
    });
    if (next !== graph) setGraph(next);
    updateSelection({ nodeIds: [], connectionIds: [] });
  };
  const undoEdit = useCallback(() => {
    if (!controlledGraph)
      setHistory((current) => {
        const next = undo(current);
        if (next !== current) onChange?.(next.present);
        return next;
      });
  }, [controlledGraph, onChange]);
  const redoEdit = useCallback(() => {
    if (!controlledGraph)
      setHistory((current) => {
        const next = redo(current);
        if (next !== current) onChange?.(next.present);
        return next;
      });
  }, [controlledGraph, onChange]);
  useEffect(() => {
    const listener = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
      if (typing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redoEdit();
        else undoEdit();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redoEdit();
      } else if ((event.ctrlKey || event.metaKey) && event.key === '0') {
        event.preventDefault();
        void fitView({ padding: 0.25 });
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  });
  useEffect(() => {
    if (!showJson) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = modalRef.current;
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), textarea, input:not([type="hidden"])'
        ) ?? []
      );
    focusable()[0]?.focus();
    const keepFocusInDialog = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowJson(false);
      } else if (event.key === 'Tab') {
        const items = focusable();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', keepFocusInDialog);
    return () => {
      window.removeEventListener('keydown', keepFocusInDialog);
      previousFocus?.focus();
    };
  }, [showJson]);
  const handleSelection = useCallback(({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
    const next = { nodeIds: nodes.map((n) => n.id), connectionIds: edges.map((e) => e.id) };
    updateSelection(next);
  }, [updateSelection]);
  const exportJson = () => {
    try {
      const value = serializeGraph(graph);
      setJson(value);
      setJsonMode('export');
      setShowJson(true);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not serialize graph.');
    }
  };
  const downloadJson = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${graph.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const importJson = (value = json) => {
    try {
      const next = deserializeGraph(value);
      setGraph(next);
      updateSelection({ nodeIds: [], connectionIds: [] });
      setError('');
      setShowJson(false);
      onGraphEvent?.({ type: 'imported', graph: next });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not import graph.');
    }
  };
  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    importJson(await file.text());
    event.target.value = '';
  };
  const addConnector = (direction: Connector['direction']) => {
    if (!selectedNode) return;
    updateSelectedConnector({
      id: createId('port'),
      direction,
      label: direction === 'input' ? 'Input' : 'Output',
      cardinality: 'many'
    });
  };

  return (
    <div className={`ionodes-editor ${className}`} style={theme}>
      {showPalette && (
        <aside className="ionodes-sidebar ionodes-palette" aria-label="Node palette">
          <div className="ionodes-panel-heading">
            <div>
              <span className="ionodes-eyebrow">LIBRARY</span>
              <h2>Nodes</h2>
            </div>
          </div>
          <p className="ionodes-panel-copy">Add a node to your graph.</p>
          {palette.map((item, index) => (
            <button
              className="ionodes-palette-item"
              key={`${item.label}-${index}`}
              onClick={() => addPaletteItem(item)}
            >
              <span className="ionodes-palette-glyph">
                {item.icon ?? icons['palette-add'] ?? '＋'}
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.description ?? 'Add a configurable graph node'}</small>
              </span>
            </button>
          ))}
          <div className="ionodes-shortcuts">
            <span className="ionodes-eyebrow">SHORTCUTS</span>
            <p>
              <kbd>Ctrl Z</kbd> Undo
            </p>
            <p>
              <kbd>Ctrl Shift Z</kbd> Redo
            </p>
            <p>
              <kbd>Delete</kbd> Remove selection
            </p>
          </div>
        </aside>
      )}
      <main className="ionodes-workspace">
        <header className="ionodes-toolbar">
          <div className="ionodes-brand">
            <span className="ionodes-brand-mark">io</span>
            <span>
              <strong>ionodes</strong>
              <small>GRAPH EDITOR</small>
            </span>
          </div>
          <div className="ionodes-toolbar-actions">
            <button
              className="ionodes-button quiet"
              onClick={undoEdit}
              disabled={!!controlledGraph}
              aria-label="Undo"
              title="Undo (Ctrl Z)"
            >
              {icons.undo ?? '↶'} <span>Undo</span>
            </button>
            <button
              className="ionodes-button quiet"
              onClick={redoEdit}
              disabled={!!controlledGraph}
              aria-label="Redo"
              title="Redo (Ctrl Shift Z)"
            >
              {icons.redo ?? '↷'} <span>Redo</span>
            </button>
            <span className="ionodes-toolbar-separator" />
            <button className="ionodes-button quiet" onClick={exportJson}>
              {icons.export ?? null} Export JSON
            </button>
            <button
              className="ionodes-button primary"
              onClick={() => {
                setJsonMode('import');
                setShowJson(true);
                setJson('');
              }}
            >
              {icons.import ?? null} Load JSON
            </button>
          </div>
        </header>
        <section className="ionodes-canvas" aria-label="Graph canvas">
          <div className="ionodes-canvas-label">
            <span className="ionodes-live-dot" />
            {graphTitle?.trim() || 'Untitled graph'}{' '}
            <span className="ionodes-canvas-count">
              {graph.nodes.length} nodes · {graph.connections.length} connections
            </span>
          </div>
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onSelectionChange={handleSelection}
            proOptions={canvas.hideAttribution ? { hideAttribution: true } : undefined}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            deleteKeyCode={null}
            isValidConnection={(connection) => {
              if (
                !connection.source ||
                !connection.target ||
                !connection.sourceHandle ||
                !connection.targetHandle
              ) {
                return false;
              }
              const issue = validateConnection(
                graph,
                {
                  sourceNodeId: connection.source,
                  sourceConnectorId: connection.sourceHandle,
                  targetNodeId: connection.target,
                  targetConnectorId: connection.targetHandle
                },
                rule
              );
              if (issue) {
                if (showConnectionWarnings) {
                  setError((current) => (current === issue.message ? current : issue.message));
                }
                return false;
              }
              return true;
            }}
          >
            {canvas.background ??
              (canvas.showBackground === false ? null : (
                <Background
                  color={canvas.backgroundColor ?? '#323b47'}
                  gap={canvas.backgroundGap ?? 22}
                  size={canvas.backgroundSize ?? 1}
                />
              ))}
            {canvas.showMiniMap === false
              ? null
              : (canvas.miniMap ?? (
                  <MiniMap
                    pannable
                    zoomable
                    nodeColor={(node) => {
                      const graphNode = graph.nodes.find((item) => item.id === node.id);
                      const invalid = invalidNodeIds.has(node.id);
                      return graphNode && canvas.miniMapNodeColor
                        ? canvas.miniMapNodeColor(graphNode, invalid)
                        : invalid
                          ? (canvas.invalidNodeColor ?? '#f17870')
                          : '#44546a';
                    }}
                    maskColor={canvas.miniMapMaskColor ?? 'rgba(11,15,20,.72)'}
                  />
                ))}
            {canvas.showControls === false
              ? null
              : (canvas.controls ?? <Controls showInteractive={false} />)}
          </ReactFlow>
          {graph.nodes.length === 0 && (
            <div className="ionodes-empty">
              <span className="ionodes-empty-icon">{icons['empty-graph'] ?? '⌘'}</span>
              <strong>Your graph starts here</strong>
              <p>Add a node from the palette, then connect its ports.</p>
              <button
                className="ionodes-button primary"
                onClick={() => palette[0] && addPaletteItem(palette[0])}
              >
                {icons['palette-add'] ?? '＋'} Add your first node
              </button>
            </div>
          )}
          {showErrorMessages && error && errorMessage !== null && (
            <div className={`ionodes-toast ${messageClassNames?.error ?? ''}`} role="alert">
              <span>{icons.error ?? '!'}</span>
              {errorMessage}
              <button aria-label="Dismiss message" onClick={() => setError('')}>
                {icons.dismiss ?? '×'}
              </button>
            </div>
          )}
          {showValidationMessages && showConnectionWarnings && validationIssue && validationMessage !== null && (
            <div
              className={`ionodes-validation ${messageClassNames?.validation ?? ''}`}
              role="status"
            >
              <span className="ionodes-error-mark">{icons.validation ?? icons.error ?? '!'}</span>
              {validationMessage}
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={loadFile}
          />
        </section>
        {showStatusBar && (
          <footer className="ionodes-status">
            <span>
              {selectedNode
                ? `Selected: ${selectedNode.title}`
                : 'Select a node or connection to inspect it'}
            </span>
            <span>
              Pan: drag canvas <i /> Zoom: scroll <i /> Fit: {icons['fit-shortcut'] ?? '⌘'}0
            </span>
          </footer>
        )}
      </main>
      {showInspector && (
        <aside className="ionodes-sidebar ionodes-inspector" aria-label="Properties inspector">
          <div className="ionodes-panel-heading">
            <div>
              <span className="ionodes-eyebrow">DETAILS</span>
              <h2>Inspector</h2>
            </div>
            <button
              className="ionodes-icon-button"
              onClick={deleteSelected}
              disabled={!selection.nodeIds.length && !selection.connectionIds.length}
              aria-label="Delete selected item"
              title="Delete selection"
            >
              {icons.delete ?? '⌫'}
            </button>
          </div>
          {selectedNode ? (
            <div className="ionodes-inspector-content">
              <div className="ionodes-selection-kind">
                <span className="ionodes-node-chip">{icons['selection-node'] ?? '◇'}</span>
                <div>
                  <strong>Node properties</strong>
                  <small>{selectedNode.id}</small>
                </div>
              </div>
              <label className="ionodes-field">
                Title
                <input
                  value={selectedNode.title}
                  onChange={(e) => updateSelectedNode({ title: e.target.value })}
                />
              </label>
              <label className="ionodes-field">
                Description
                <textarea
                  rows={3}
                  value={selectedNode.description ?? ''}
                  onChange={(e) => updateSelectedNode({ description: e.target.value })}
                  placeholder="Describe what this node represents"
                />
              </label>
              <label className="ionodes-field">
                Header icon
                <input
                  value={selectedNode.icon?.name ?? ''}
                  onChange={(e) =>
                    updateSelectedNode({
                      icon: e.target.value ? { name: e.target.value } : undefined
                    })
                  }
                  placeholder="Optional text or symbol"
                />
              </label>
              <div className="ionodes-section-heading">
                <span>Connectors</span>
                <div>
                  <button className="ionodes-mini-button" onClick={() => addConnector('input')}>
                    {icons['input-add'] ?? icons['connector-add'] ?? '＋'} Input
                  </button>
                  <button className="ionodes-mini-button" onClick={() => addConnector('output')}>
                    {icons['output-add'] ?? icons['connector-add'] ?? '＋'} Output
                  </button>
                </div>
              </div>
              {selectedNode.connectors.map((connector) => (
                <ConnectorEditor
                  key={connector.id}
                  connector={connector}
                  onChange={updateSelectedConnector}
                  onRemove={() => setGraph(removeConnector(graph, selectedNode.id, connector.id))}
                  icons={icons}
                />
              ))}
            </div>
          ) : selection.connectionIds.length ? (
            <ConnectionInspector
              graph={graph}
              connectionId={selection.connectionIds[0]!}
              onChange={setGraph}
              icon={icons['selection-connection'] ?? icons.connection}
            />
          ) : (
            <div className="ionodes-inspector-empty">
              <span>{icons['selection-empty'] ?? '◎'}</span>
              <strong>Nothing selected</strong>
              <p>Choose a node or wire to see its properties.</p>
              <div className="ionodes-inspector-tip">
                Tip: drag from an output port to an input port to create a connection.
              </div>
            </div>
          )}
          <div className="ionodes-io">
            <span className="ionodes-eyebrow">GRAPH DATA</span>
            <button className="ionodes-data-action" onClick={exportJson}>
              <span>{icons['data-export'] ?? icons.export ?? '↗'}</span>Export graph as JSON
            </button>
            <button
              className="ionodes-data-action"
              onClick={() => {
                setJsonMode('import');
                setShowJson(true);
                setJson('');
              }}
            >
              <span>{icons['data-import'] ?? icons.import ?? '↙'}</span>Import graph from JSON
            </button>
          </div>
        </aside>
      )}
      {showJson && (
        <div
          className="ionodes-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowJson(false);
          }}
        >
          <section
            ref={modalRef}
            className="ionodes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ionodes-json-title"
          >
            <div className="ionodes-panel-heading">
              <div>
                <span className="ionodes-eyebrow">VERSIONED DOCUMENT</span>
                <h2 id="ionodes-json-title">
                  {jsonMode === 'export' ? 'Export graph' : 'Load graph JSON'}
                </h2>
              </div>
              <button
                className="ionodes-icon-button"
                aria-label="Close dialog"
                onClick={() => setShowJson(false)}
              >
                {icons.close ?? '×'}
              </button>
            </div>
            <p className="ionodes-panel-copy">
              Schema version 1 · Graph viewport and selection are not included.
            </p>
            <textarea
              className="ionodes-json"
              aria-label="Graph JSON"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              placeholder="Paste a version 1 graph document here…"
              spellCheck={false}
            />
            <div className="ionodes-modal-actions">
              <button className="ionodes-button quiet" onClick={() => fileInput.current?.click()}>
                Choose JSON file
              </button>
              {jsonMode === 'export' && (
                <button
                  className="ionodes-button quiet"
                  onClick={() => navigator.clipboard?.writeText(json)}
                >
                  Copy JSON
                </button>
              )}
              {jsonMode === 'export' ? (
                <button className="ionodes-button primary" onClick={downloadJson}>
                  Download JSON
                </button>
              ) : (
                <button className="ionodes-button primary" onClick={() => importJson()}>
                  Validate and load
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function ConnectorEditor({
  connector,
  onChange,
  onRemove,
  icons = {}
}: {
  connector: Connector;
  onChange: (connector: Connector) => void;
  onRemove: () => void;
  icons?: GraphEditorIcons;
}) {
  const patch = (value: Partial<Connector>) => onChange({ ...connector, ...value });
  return (
    <div className="ionodes-connector-editor">
      <div className="ionodes-connector-editor-title">
        <span className={`ionodes-direction-badge ${connector.direction}`}>
          {connector.direction === 'input'
            ? (icons['input-direction'] ?? '↓')
            : (icons['output-direction'] ?? '↑')}{' '}
          {connector.direction}
        </span>
        <button
          aria-label={`Remove ${connector.label || connector.direction} connector`}
          className="ionodes-remove-button"
          onClick={onRemove}
        >
          {icons['connector-remove'] ?? '×'}
        </button>
      </div>
      <label className="ionodes-field compact">
        Label
        <input value={connector.label ?? ''} onChange={(e) => patch({ label: e.target.value })} />
      </label>
      <div className="ionodes-field-row">
        <label className="ionodes-field compact">
          Color
          <input
            type="color"
            value={connector.color ?? '#77a9ff'}
            onChange={(e) => patch({ color: e.target.value })}
          />
        </label>
        <label className="ionodes-field compact">
          Cardinality
          <select
            value={connector.cardinality ?? 'many'}
            onChange={(e) => patch({ cardinality: e.target.value as Connector['cardinality'] })}
          >
            <option value="many">Many</option>
            <option value="one">One</option>
          </select>
        </label>
      </div>
      <div className="ionodes-field-row">
        <label className="ionodes-field compact">
          Type key
          <input
            value={connector.type ?? ''}
            onChange={(e) => patch({ type: e.target.value || undefined })}
            placeholder="Optional"
          />
        </label>
        <label className="ionodes-field compact">
          Icon
          <input
            value={connector.icon?.name ?? ''}
            onChange={(e) => patch({ icon: e.target.value ? { name: e.target.value } : undefined })}
            placeholder="Optional"
          />
        </label>
      </div>
    </div>
  );
}
function ConnectionInspector({
  graph,
  connectionId,
  onChange,
  icon
}: {
  graph: GraphDocument;
  connectionId: string;
  onChange: (graph: GraphDocument) => void;
  icon?: ReactNode;
}) {
  const connection = graph.connections.find((edge) => edge.id === connectionId);
  if (!connection) return null;
  const patch = (value: Partial<typeof connection>) =>
    onChange({
      ...graph,
      connections: graph.connections.map((edge) =>
        edge.id === connectionId ? { ...edge, ...value } : edge
      )
    });
  return (
    <div className="ionodes-inspector-content">
      <div className="ionodes-selection-kind">
        <span className="ionodes-node-chip">{icon ?? '↗'}</span>
        <div>
          <strong>Connection properties</strong>
          <small>{connection.id}</small>
        </div>
      </div>
      <label className="ionodes-field">
        Label
        <input
          value={connection.label ?? ''}
          onChange={(event) => patch({ label: event.target.value })}
        />
      </label>
      <label className="ionodes-field">
        Color
        <input
          type="color"
          value={connection.color ?? '#77a9ff'}
          onChange={(event) => patch({ color: event.target.value })}
        />
      </label>
    </div>
  );
}
