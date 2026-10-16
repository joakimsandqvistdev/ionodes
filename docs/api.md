# React API and custom renderers

## Controlled and uncontrolled state

```tsx
<GraphEditor defaultGraph={initialGraph} onChange={saveDraft} />
```

For controlled state, pass `graph` and update it from `onChange`:

```tsx
<GraphEditor graph={graph} onChange={setGraph} onSelectionChange={setSelection} />
```

Props include `palette`, `validateConnection`, `showConnectionWarnings`, `onSelectionChange`, `selectedNodeId`, `onGraphEvent`, `showPalette`, `showInspector`, `showStatusBar`, `showEmptyState`, `className`, `theme`, `canvas`, `icons`, `renderGraphIcon`, `renderConnectorLabel`, `renderNodeEditor`, `nodeEditorLabel`, `renderNodeActions`, `showValidationMessages`, `showErrorMessages`, `renderMessage`, and `messageClassNames`. Set `selectedNodeId` to a node ID to select it programmatically, or to `null` to clear node selection. Leaving it undefined keeps selection internal. The bottom status bar is visible by default and can be hidden with `showStatusBar={false}`. The built-in empty-graph prompt can be hidden with `showEmptyState={false}`. Palette entries contain a label, optional description/icon, and a `create()` function that returns a generic `GraphNode`. Undo/redo is kept internally for uncontrolled mode and disabled in the toolbar for controlled mode; controlled consumers should provide their own history through `graph` and `onChange`.

Use `renderNodeActions` to render consumer-provided controls on the right side of the built-in node header. The controls are inside a `nodrag` region so using them does not start a node drag.

## Compact nodes with attached editors

Use `renderNodeEditor` to put a node-specific configuration panel inside the built-in node. Nodes start compact and collapsed; the accessible toggle opens an overlay below the connector rows without expanding the node's layout or moving its connection handles. Open state is local UI state and is not included in serialized graph data. The callback receives the node and an update function for its generic graph fields.

```tsx
<GraphEditor
  graph={graph}
  onChange={setGraph}
  nodeEditorLabel="Configure"
  renderNodeEditor={(node, updateNode) => (
    <label>
      Node title
      <input value={node.title} onChange={(event) => updateNode({ title: event.target.value })} />
    </label>
  )}
/>
```

The editor overlay stops pointer actions from initiating node drags. Consumers should style their form controls and overlay using scoped `.ionodes-node-editor` selectors and existing theme variables.

## Validation and error messages

Validation feedback and editor error feedback are enabled by default. Hide either category independently with `showValidationMessages={false}` or `showErrorMessages={false}`. Hiding validation feedback does not disable connection validation; invalid connections remain invalid.

Set `showConnectionWarnings={false}` to hide warnings for failed connection attempts and invalid existing connections. Connector direction, cardinality, and the `validateConnection` rule remain enforced, so invalid connections are still rejected. The default is `true`.

`renderMessage` receives a discriminated `EditorMessage`: `{ kind: 'validation', issue }` for a `GraphIssue`, or `{ kind: 'error', message }` for editor errors. It may return text or any React node. Return `null` to suppress that particular message. These types are exported from `ionodes`.

```tsx
import { GraphEditor, type EditorMessage } from 'ionodes';

const renderMessage = (message: EditorMessage) => {
  if (message.kind === 'validation') {
    return <strong>{message.issue.message}</strong>;
  }
  return <span>Editor error: {message.message}</span>;
};

<GraphEditor
  defaultGraph={graph}
  className="my-editor"
  showValidationMessages
  showErrorMessages
  renderMessage={renderMessage}
  messageClassNames={{ validation: 'my-validation', error: 'my-error' }}
/>;
```

`messageClassNames` attaches consumer-defined classes to the built-in message containers, in addition to `.ionodes-validation` and `.ionodes-toast`. Scope CSS under the editor's `className` to style just that instance:

```css
.my-editor .my-validation {
  color: #8a4b08;
  background: #fff4d6;
}
.my-editor .my-error {
  color: #8b1e1e;
  background: #ffe3e3;
}
```

`renderMessage` and the visibility props apply to feedback rendered by `GraphEditor`. Exceptions from graph helper functions used directly by the consuming app remain the consumer's responsibility.

## Theme and canvas

`theme` accepts standard CSS properties and `--ionodes-*` custom properties, applied to the individual editor root. This allows multiple differently themed editors on one page. Defaults are defined in `src/style.css`; override any detail using `className` and the namespaced `.ionodes-*` selectors. React Flow selectors such as `.react-flow__handle`, `.react-flow__edge-path`, and `.react-flow__controls` can be scoped under the same class.

```tsx
const theme = {
  '--ionodes-bg': '#f4f6fa',
  '--ionodes-panel': '#fff',
  '--ionodes-text': '#202938',
  '--ionodes-accent': '#6750d8',
  '--ionodes-focus-ring': '#6750d8'
} satisfies GraphEditorTheme;

<GraphEditor className="product-editor" theme={theme} defaultGraph={graph} />;
```

`canvas` controls the default React Flow background and overlays:

```tsx
<GraphEditor
  defaultGraph={graph}
  canvas={{
    backgroundColor: '#323b47',
    backgroundGap: 22,
    backgroundSize: 1,
    showBackground: true,
    showControls: true,
    showMiniMap: false,
    connectionColor: '#78a8ff',
    invalidConnectionColor: '#f17870',
    invalidNodeColor: '#f17870',
    miniMapMaskColor: 'rgba(11,15,20,.72)',
    miniMapNodeColor: (node, invalid) => (invalid ? '#f17870' : '#44546a')
  }}
/>
```

The `background`, `controls`, and `miniMap` fields accept React elements to replace the defaults. Keep custom controls/overlays inside the React Flow context. `showBackground`, `showControls`, and `showMiniMap` can turn each built-in surface off.

## Icons and connectors

`icons` replaces built-in UI symbols with any React node, such as an SVG or an icon-library component. It is a partial map; omitted keys keep the defaults. Keys: `node`, `validation`, `palette-add`, `undo`, `redo`, `delete`, `connector-add`, `connector-remove`, `export`, `import`, `close`, `selection-node`, `selection-connection`, `empty-graph`, `data-export`, `data-import`, `dismiss`, `error`, `input-add`, `output-add`, `connection`, `selection-empty`, `input-direction`, `output-direction`, and `fit-shortcut`.

`renderGraphIcon(name, context)` converts persisted node or connector icon descriptor names to React output. `renderConnectorLabel(connector)` replaces the built-in connector label content while preserving the React Flow handles needed to make connections. For total control of node and connector layout, use custom React Flow `nodeTypes` as described below. Connector and connection colors/labels/icons can also be set in graph data. These presentation options do not change the versioned graph schema.

## Custom node rendering

Register React Flow renderers with `nodeTypes`, then map graph nodes to a renderer key with `getNodeType`. Custom renderer `data` has `graphNode`, optional `invalid`, and `updateGraphNode(patch)`. Use `Handle` from `@xyflow/react` and the connector IDs as handle IDs when drawing custom ports. Return stable `nodeTypes` and `getNodeType` references to avoid unnecessary React Flow updates.

```tsx
const palette = [
  {
    label: 'Review item',
    create: () => ({
      id: createId('node'),
      title: 'Review item',
      position: { x: 100, y: 100 },
      connectors: [{ id: createId('port'), direction: 'input', label: 'Item', type: 'record' }]
    })
  }
];
<GraphEditor defaultGraph={createGraph()} palette={palette} />;
```

```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GraphEditor, type GraphNodeRendererData } from 'ionodes';

function CompactNode({ data }: NodeProps) {
  const { graphNode } = data as GraphNodeRendererData;
  return (
    <div className="compact-node">
      <strong>{graphNode.title}</strong>
      {graphNode.connectors.map((port) => (
        <div key={port.id}>
          {port.direction === 'input' && (
            <Handle id={port.id} type="target" position={Position.Left} />
          )}
          {port.label}
          {port.direction === 'output' && (
            <Handle id={port.id} type="source" position={Position.Right} />
          )}
        </div>
      ))}
    </div>
  );
}
const nodeTypes = { compact: CompactNode };
<GraphEditor defaultGraph={graph} nodeTypes={nodeTypes} getNodeType={() => 'compact'} />;
```

Theme tokens use the `--ionodes-*` prefix and can be overridden from a parent class, including font families, panel padding, control height, border, radius, and focus color. Import `ionodes/style.css` once in the consuming app.
