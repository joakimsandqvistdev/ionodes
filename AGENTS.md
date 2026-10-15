# AGENTS.md

These repository instructions are public guidance for human and AI contributors. Keep them focused on durable project requirements. Do not add credentials, private user data, or machine-specific local paths.

## Project purpose

Build a reusable node graph editor library using React, TypeScript, and React Flow (`@xyflow/react`). The editor should support general-purpose graph data and a clear visual-scripting interface.

React and React Flow are deliberate project choices. Do not add abstractions or package boundaries intended to support other UI frameworks.

The library must remain domain-neutral. Do not design its graph schema around one application, AI orchestration product, database schema, or backend.

## Core principles

- Use React components and React Flow APIs directly where they simplify the editor.
- Keep graph concepts generic: nodes, connectors, connections, metadata, validation, and editor operations.
- Separate persisted graph data from transient React Flow state where practical.
- Keep the library usable without a backend or database.
- Use stable identifiers for nodes, connectors, and connections.
- Prefer small, composable, typed APIs and sensible defaults.
- Avoid dependencies unless they materially improve the MVP.
- Document public APIs and compatibility expectations.

## Minimum graph capabilities

The graph model and editor must support:

- Multiple input and output connectors per node.
- Connector labels, colors, and optional icons.
- Node titles, optional header icons, and optional descriptions.
- Creating, selecting, moving, editing, and removing nodes.
- Creating, editing, and removing connectors.
- Creating, selecting, editing, and removing connections between connectors.
- Configurable connector direction, cardinality, and connection validation.
- Graph serialization and deserialization using a documented, versioned JSON format.
- Validation results that identify the affected graph element and explain the problem.

The editor should support pan, zoom, fit-to-view, keyboard shortcuts, and undo/redo. Keep the graph’s meaning separate from these editing interactions.

## Architecture

Use React and React Flow throughout the editor implementation. Organize responsibilities clearly without introducing multi-framework compatibility layers.

1. **Graph types and operations**  
   Generic TypeScript graph types, immutable operations, identifiers, and serialization.

2. **Validation**  
   Structural graph validation and configurable connection rules. Validation must not assume a particular application domain.

3. **React editor**  
   React components built on React Flow for the canvas, nodes, connectors, wires, controls, and editor panels.

4. **Editor state and commands**  
   Selection, viewport, editing operations, undo/redo, and interaction state. Use React Flow state and APIs where appropriate.

5. **Examples and demo**  
   Demonstrate the React editor with domain-neutral graphs. Examples are not part of the core graph schema.

Do not add framework adapters or a framework-independent rendering abstraction. Keep the graph data format usable by any consumer that can read JSON, but optimize the editor API for React.

Do not add workflow execution, AI integrations, model-provider logic, database access, authentication, or application-specific node types unless explicitly requested.

## Data and persistence

- Do not require a database or server.
- Provide stable JSON serialization and deserialization.
- Include a schema version so persisted graphs can be migrated in future releases.
- Keep transient React Flow state, such as selection, dragging, open menus, and hover state, out of the persisted graph unless explicitly documented.
- Decide and document whether viewport position and zoom are persisted.
- Validate imported data and return understandable errors for malformed or unsupported documents.

## User interface

- Follow the project design system and accessible interaction patterns.
- Reuse design tokens and shared UI components.
- Provide keyboard-accessible controls and visible focus states.
- Do not rely on color alone to communicate connector types or validation status.
- Give icon-only buttons and graph controls accessible names.
- Make node and connector labels available to assistive technology.
- Make the default theme customizable without hardcoding another product’s branding.
- Use a visual-scripting style without copying third-party assets, logos, or branding.

## Public API and documentation

Document:

- Installation and React setup.
- The graph JSON schema and version policy.
- Creating and configuring the editor.
- Custom React node renderers.
- Connector appearance and configuration.
- Connection validation.
- Editor events and controlled/uncontrolled state.
- Serialization and loading.
- Keyboard shortcuts and accessibility behavior.

Keep common use concise. Clearly identify experimental APIs and breaking changes.

## Testing and quality

Add tests for:

- Graph creation and update operations.
- Adding and removing nodes, connectors, and connections.
- Direction, compatibility, and cardinality validation.
- Serialization and deserialization, including invalid schema versions.
- Undo/redo.
- Important React editor interactions and accessibility behavior.

Run relevant tests, linting, formatting, type checks, and demo builds. Report checks that were not run or failed. Keep tests deterministic and independent of network services.

## Working practices

- Inspect existing implementation, tests, and documentation before changing behavior.
- For broad changes, outline the implementation approach before making changes.
- Prefer focused changes and preserve unrelated user work.
- Record lasting architectural decisions in `docs/decisions/`.
- Keep current-work notes in `docs/working/CURRENT.md` concise and actionable if that file exists.
- When finishing, summarize changes, important files, checks performed, documentation updated, and remaining work.
- When a task leaves unstaged changes, include a suggested commit message in the completion summary.
