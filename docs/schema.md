# Graph schema and persistence

Persisted documents use JSON and have `schemaVersion: 1`. A document contains a stable graph `id`, a `nodes` array, and a `connections` array. Optional `metadata` objects on the graph, nodes, connectors, and connections are opaque to ionodes and reserved for consuming applications.

Nodes have stable IDs, titles, optional descriptions and icon descriptors, graph-coordinate positions, and connector arrays. Connector IDs are **unique across the entire graph**, which also makes them stable React Flow handle IDs. Each connector declares `direction` (`input` or `output`); optional label, color, icon descriptor, generic type key, cardinality (`one` or `many`), and metadata are supported. A connection refers to the source node and output connector and target node and input connector by ID; label, color, and metadata are optional.

Example:

```json
{
  "schemaVersion": 1,
  "id": "example",
  "nodes": [
    {
      "id": "read",
      "title": "Read",
      "position": { "x": 80, "y": 100 },
      "connectors": [
        {
          "id": "read-out",
          "direction": "output",
          "label": "Text",
          "type": "text",
          "cardinality": "many"
        }
      ]
    }
  ],
  "connections": []
}
```

`serializeGraph` validates structure before emitting stable, indented JSON. `deserializeGraph` rejects invalid JSON, malformed structure, duplicate IDs, dangling endpoints, invalid direction, and unsupported schema versions with an explanatory error. It never silently drops graph elements. The current schema has no migration from earlier versions. A future incompatible schema will get a new integer version and an explicit migration function; this version rejects unknown versions.

Viewport position, zoom, selection, hover, dragging, open dialogs, and other React Flow/editor interaction state are not part of the document. Consumers can persist viewport separately if their application needs it.
