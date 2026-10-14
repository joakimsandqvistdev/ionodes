# 0001: Single React package and graph document

- **Status:** Accepted
- **Date:** 2026-10-14

## Context

The MVP needs a publishable React component, a local demo, and a reusable JSON graph model without introducing framework adapters or package boundaries.

## Decision

Keep the library source, demo, and docs in one repository package. Use React Flow directly in the editor and keep graph operations and validation in a separate TypeScript module. Persist graph identity, node positions, connectors, connections, and opaque JSON metadata in schema version 1. Keep viewport, selection, and other transient editor state outside the graph document.

Use controlled `graph` / `onChange` props for consumer-owned state and `defaultGraph` for internal state with editor history. The demo builds to `demo-dist`; library JavaScript, CSS, and declarations build to `dist`.

## Consequences

Consumers can install one package and use the graph model without a server. Unsupported schema versions fail clearly. Future incompatible persisted changes need a new schema version and explicit migration. Controlled consumers own undo and redo; uncontrolled consumers get the built-in history stack.
