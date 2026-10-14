import { describe, expect, it } from 'vitest';
import {
  addConnection,
  addNode,
  createGraph,
  deserializeGraph,
  removeConnection,
  removeConnector,
  removeNode,
  serializeGraph,
  updateNode,
  upsertConnector,
  validateConnection
} from '../src/graph';
import { commit, createHistory, redo, undo } from '../src/history';
import type { GraphNode } from '../src/graph';

const a: GraphNode = {
  id: 'a',
  title: 'A',
  position: { x: 0, y: 0 },
  connectors: [{ id: 'ao', direction: 'output', label: 'Out', type: 'text', cardinality: 'one' }]
};
const b: GraphNode = {
  id: 'b',
  title: 'B',
  position: { x: 2, y: 3 },
  connectors: [{ id: 'bi', direction: 'input', label: 'In', type: 'text', cardinality: 'one' }]
};
const base = () => addNode(addNode(createGraph('g'), a), b);

describe('graph operations and validation', () => {
  it('adds nodes and rejects duplicate IDs', () => {
    expect(base().nodes).toHaveLength(2);
    expect(() => addNode(base(), a)).toThrow('already exists');
    expect(() =>
      addNode(base(), {
        id: 'c',
        title: 'C',
        position: { x: 0, y: 0 },
        connectors: [{ id: 'ao', direction: 'input' }]
      })
    ).toThrow(/Connector id/);
  });
  it('updates nodes and adds, edits, and removes connectors', () => {
    const graph = base();
    const updated = updateNode(graph, 'a', { title: 'Updated A' });
    expect(updated.nodes[0]?.title).toBe('Updated A');
    const withPort = upsertConnector(updated, 'a', {
      id: 'ai',
      direction: 'input',
      label: 'In'
    });
    expect(withPort.nodes[0]?.connectors).toHaveLength(2);
    const editedPort = upsertConnector(withPort, 'a', {
      id: 'ai',
      direction: 'input',
      label: 'Renamed'
    });
    expect(editedPort.nodes[0]?.connectors[1]?.label).toBe('Renamed');
    expect(removeConnector(editedPort, 'a', 'ai').nodes[0]?.connectors).toHaveLength(1);
    expect(() => upsertConnector(editedPort, 'b', { id: 'ao', direction: 'input' })).toThrow(
      /Connector id/
    );
  });
  it('validates direction, compatibility, and cardinality', () => {
    const graph = base();
    expect(
      validateConnection(
        graph,
        { sourceNodeId: 'a', sourceConnectorId: 'ao', targetNodeId: 'b', targetConnectorId: 'bi' },
        (source, target) => source.type === target.type
      )
    ).toBeUndefined();
    expect(
      validateConnection(
        graph,
        { sourceNodeId: 'a', sourceConnectorId: 'ao', targetNodeId: 'b', targetConnectorId: 'bi' },
        () => 'Types do not match'
      )?.message
    ).toBe('Types do not match');
    expect(
      validateConnection(graph, {
        sourceNodeId: 'b',
        sourceConnectorId: 'bi',
        targetNodeId: 'a',
        targetConnectorId: 'ao'
      })?.message
    ).toMatch(/output connector/);
    const connected = addConnection(graph, {
      id: 'e1',
      sourceNodeId: 'a',
      sourceConnectorId: 'ao',
      targetNodeId: 'b',
      targetConnectorId: 'bi'
    });
    expect(
      validateConnection(connected, {
        sourceNodeId: 'a',
        sourceConnectorId: 'ao',
        targetNodeId: 'b',
        targetConnectorId: 'bi'
      })?.message
    ).toMatch(/one connection/);
  });
  it('removes nodes and connectors together with their connections', () => {
    const connected = addConnection(base(), {
      id: 'edge',
      sourceNodeId: 'a',
      sourceConnectorId: 'ao',
      targetNodeId: 'b',
      targetConnectorId: 'bi'
    });
    expect(removeConnector(connected, 'a', 'ao').connections).toHaveLength(0);
    expect(removeNode(connected, 'b').nodes).toHaveLength(1);
    expect(removeNode(connected, 'b').connections).toHaveLength(0);
    expect(removeConnection(connected, 'edge').connections).toHaveLength(0);
  });
  it('round-trips JSON and rejects malformed or unsupported documents', () => {
    const graph = base();
    expect(deserializeGraph(serializeGraph(graph))).toEqual(graph);
    expect(() => deserializeGraph('{')).toThrow(/valid JSON/);
    expect(() => deserializeGraph('{"schemaVersion":99}')).toThrow(
      /Unsupported graph schema version/
    );
    expect(() =>
      deserializeGraph('{"schemaVersion":1,"id":"x","nodes":[{}],"connections":[]}')
    ).toThrow(/Invalid graph document/);
    expect(() =>
      deserializeGraph(
        '{"schemaVersion":1,"id":"x","nodes":[{"id":"n","title":"N","position":{"x":0,"y":0},"connectors":[{"id":"p","direction":"input","cardinality":"sometimes"}]}],"connections":[]}'
      )
    ).toThrow(/documented types/);
  });
});
describe('history', () => {
  it('undoes and redoes graph edits', () => {
    const before = createGraph('history');
    const after = addNode(before, a);
    const history = commit(createHistory(before), after);
    expect(undo(history).present).toEqual(before);
    expect(redo(undo(history)).present).toEqual(after);
  });
});
