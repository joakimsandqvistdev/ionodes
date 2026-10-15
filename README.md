# ionodes

A reusable, domain-neutral node graph editor for React, TypeScript, and [`@xyflow/react`](https://reactflow.dev/). It provides editable nodes and connectors, validation, undo and redo, and a versioned JSON format. The editor ships with a dark, customizable theme and a small interactive demo.

[Source code](https://github.com/joakimsandqvistdev/ionodes) · [Changelog](CHANGELOG.md) · [License](LICENSE)

## Quick start

```bash
npm install ionodes @xyflow/react react react-dom
```

```tsx
import { GraphEditor, createGraph } from 'ionodes';
import 'ionodes/style.css';

export function App() {
  return <GraphEditor defaultGraph={createGraph('example')} />;
}
```

The demo is available in the repository with `npm install` followed by `npm run dev`.

## Customize the editor

The editor is designed to be themed by the consuming React app. `theme` applies inline CSS properties and `--ionodes-*` custom properties to this editor instance, so separate editors can use separate themes. Built-in tokens are `--ionodes-bg`, `--ionodes-panel`, `--ionodes-panel-raised`, `--ionodes-border`, `--ionodes-text`, `--ionodes-muted`, `--ionodes-subtle`, `--ionodes-accent`, `--ionodes-accent-strong`, `--ionodes-danger`, `--ionodes-success`, `--ionodes-font-sans`, `--ionodes-font-mono`, `--ionodes-panel-padding`, `--ionodes-control-height`, `--ionodes-focus-ring`, and `--ionodes-radius`.

```tsx
import { GraphEditor, createGraph, type GraphEditorTheme } from 'ionodes';

const theme = {
  '--ionodes-bg': '#f4f6fa',
  '--ionodes-panel': '#ffffff',
  '--ionodes-panel-raised': '#edf1f7',
  '--ionodes-border': '#cbd3df',
  '--ionodes-text': '#202938',
  '--ionodes-muted': '#586579',
  '--ionodes-subtle': '#778397',
  '--ionodes-accent': '#6750d8',
  '--ionodes-accent-strong': '#4f39ba',
  '--ionodes-focus-ring': '#6750d8',
  '--ionodes-radius': '12px'
} satisfies GraphEditorTheme;

<GraphEditor defaultGraph={createGraph('example')} theme={theme} className="brand-graph" />;
```

`className` is placed on the editor root. Use it to override detailed surface styles, including node bodies, headers, connector rows and handles, connections, inspector fields, canvas controls, and the background. Selectors are namespaced with `.ionodes-*`; React Flow selectors such as `.react-flow__edge-path` can be used for wires and controls.

```css
.brand-graph .ionodes-node {
  background: #fff;
  border: 1px solid #cbd3df;
  box-shadow: 0 8px 24px #23304a18;
}

.brand-graph .ionodes-node-header {
  background: #edf1f7;
}
.brand-graph .ionodes-connector-label {
  color: #344054;
}
.brand-graph .react-flow__edge-path {
  stroke-width: 3;
}
```

The `canvas` prop configures or replaces the React Flow background, controls, and minimap. The background can be supplied as a React element; controls and minimap can be hidden or replaced. Grid spacing/color, minimap colors, and default connection/validation colors are configurable. `nodeTypes` and `getNodeType` replace built-in node markup entirely. `renderConnectorLabel` customizes connector content while retaining graph handles; `renderGraphIcon` maps graph icon descriptor names to React elements. The `icons` prop replaces built-in UI symbols, and each palette entry can provide its own `icon` element. Connector and connection `color` values remain in graph data.

```tsx
<GraphEditor
  defaultGraph={graph}
  theme={theme}
  canvas={{
    backgroundColor: '#d6deeb',
    backgroundGap: 28,
    backgroundSize: 1.5,
    connectionColor: '#6750d8',
    invalidConnectionColor: '#c03952',
    showMiniMap: false
  }}
  icons={{ undo: <UndoIcon />, redo: <RedoIcon />, 'palette-add': <PlusIcon /> }}
  renderGraphIcon={(name) => <MyIcon name={name} />}
/>
```

The `icons` keys are `node`, `validation`, `palette-add`, `undo`, `redo`, `delete`, `connector-add`, `connector-remove`, `export`, `import`, `close`, `selection-node`, `selection-connection`, `empty-graph`, `data-export`, `data-import`, `dismiss`, `error`, `input-add`, `output-add`, `connection`, `selection-empty`, `input-direction`, `output-direction`, and `fit-shortcut`. Omitted entries keep the default symbol. The customization types are exported from the package entry point.

### Validation and error messages

Validation feedback and editor errors can be hidden independently. Hiding validation feedback does not disable validation or allow an invalid connection:

```tsx
<GraphEditor defaultGraph={graph} showValidationMessages={false} showErrorMessages={false} />
```

Use `renderMessage` to replace message content with text or any React element. Validation messages include the full `GraphIssue` (including its `message` and affected `elementId`); error messages include the original error text. Return `null` to suppress one message while leaving the other messages visible:

```tsx
import { GraphEditor, type EditorMessage } from 'ionodes';

function renderMessage(message: EditorMessage) {
  if (message.kind === 'validation') {
    return <strong>Connection issue: {message.issue.message}</strong>;
  }
  return <span role="alert">Could not complete action: {message.message}</span>;
}

<GraphEditor defaultGraph={graph} renderMessage={renderMessage} />;
```

Style the built-in message containers with `className` and the exported `messageClassNames` hooks. The default classes are `.ionodes-validation` and `.ionodes-toast`:

```tsx
<GraphEditor
  defaultGraph={graph}
  className="brand-graph"
  messageClassNames={{ validation: 'brand-validation', error: 'brand-error' }}
/>
```

```css
.brand-graph .brand-validation {
  color: #7c2d12;
  background: #ffedd5;
  border: 1px solid #fdba74;
  border-radius: 8px;
}

.brand-graph .brand-error {
  color: #7f1d1d;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 8px;
}
```

These controls cover validation feedback and errors displayed by the editor, such as import/export and connection errors. Errors from graph helper functions called directly by the consuming app should be caught and displayed by that app.

## API

`GraphEditor` accepts `graph` for controlled state or `defaultGraph` for internal state. Use `onChange` to receive graph edits. `palette` supplies React-friendly node creation actions. `validateConnection` can reject a proposed connection with a boolean or an explanatory message. Optional panels can be hidden with `showPalette` and `showInspector`. `showValidationMessages`, `showErrorMessages`, `renderMessage`, and `messageClassNames` control feedback visibility, content, and styling. `onSelectionChange` and `onGraphEvent` expose editor events. `theme`, `canvas`, `icons`, and rendering hooks customize the appearance without changing the persisted graph format.

The library exports graph types and immutable helpers including `createGraph`, `addNode`, `removeNode`, `upsertConnector`, `removeConnector`, `addConnection`, `removeConnection`, `validateGraph`, `serializeGraph`, and `deserializeGraph`. See [API and custom nodes](docs/api.md) for the full TypeScript API and extension example.

## Documentation

- [Graph schema and persistence](docs/schema.md)
- [Connection validation](docs/validation.md)
- [Accessibility and keyboard shortcuts](docs/accessibility.md)
- [API and custom nodes](docs/api.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog and version policy](CHANGELOG.md)

## Development

Scripts: `npm run dev`, `npm run build`, `npm run build:lib`, `npm run build:demo`, `npm test`, `npm run lint`, `npm run typecheck`, and `npm run format:check`.

## License

Apache-2.0. See [LICENSE](LICENSE).
