# ionodes

A reusable, domain-neutral node graph editor for React, TypeScript, and [`@xyflow/react`](https://reactflow.dev/). It provides editable nodes and connectors, validation, undo and redo, and a versioned JSON format. The editor ships with a dark, customizable theme and a small interactive demo.

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

## API

`GraphEditor` accepts `graph` for controlled state or `defaultGraph` for internal state. Use `onChange` to receive graph edits. `palette` supplies React-friendly node creation actions. `validateConnection` can reject a proposed connection with a boolean or an explanatory message. Optional panels can be hidden with `showPalette` and `showInspector`. `onSelectionChange` and `onGraphEvent` expose editor events.

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
