# React API and custom renderers

## Controlled and uncontrolled state

```tsx
<GraphEditor defaultGraph={initialGraph} onChange={saveDraft} />
```

For controlled state, pass `graph` and update it from `onChange`:

```tsx
<GraphEditor graph={graph} onChange={setGraph} onSelectionChange={setSelection} />
```

Props include `palette`, `validateConnection`, `onSelectionChange`, `onGraphEvent`, `showPalette`, `showInspector`, and `className`. Palette entries contain a label, optional description, and a `create()` function that returns a generic `GraphNode`. Undo/redo is kept internally for uncontrolled mode and disabled in the toolbar for controlled mode; controlled consumers should provide their own history through `graph` and `onChange`.

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
