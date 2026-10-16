import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GraphEditor, GraphNodeView } from '../src/GraphEditor';
import { addNode, createGraph } from '../src/graph';

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReactFlow: () => ({ fitView: () => Promise.resolve(true) }),
    ReactFlow: ({
      nodes,
      onNodesChange,
      onSelectionChange
    }: {
      nodes: Array<{
        id: string;
        type?: string;
        selected?: boolean;
        measured?: { width: number; height: number };
      }>;
      onSelectionChange: (selection: {
        nodes: Array<{ id: string; selected?: boolean }>;
        edges: Array<{ id: string }>;
      }) => void;
      onNodesChange: (
        changes: Array<
          | {
              type: 'dimensions';
              id: string;
              dimensions: { width: number; height: number };
              resizing: false;
            }
          | { type: 'select'; id: string; selected: boolean }
        >
      ) => void;
    }) => {
      React.useEffect(() => {
        onNodesChange(
          nodes.map((node) => ({
            type: 'dimensions',
            id: node.id,
            dimensions: { width: 200, height: 100 },
            resizing: false
          }))
        );
        onSelectionChange({ nodes: nodes.filter((node) => node.selected), edges: [] });
      }, [nodes, onNodesChange, onSelectionChange]);
      return (
        <div>
          {nodes.map((node) => (
            <span
              key={node.id}
              data-testid="node-renderer-type"
              data-node-width={node.measured?.width}
            >
              {node.type}
            </span>
          ))}
          {nodes.map((node) => (
            <button
              key={`select-${node.id}`}
              aria-label={`Select ${node.id}`}
              onClick={() =>
                onNodesChange(
                  nodes.map((item) => ({
                    type: 'select',
                    id: item.id,
                    selected: item.id === node.id
                  }))
                )
              }
            >
              Select {node.id}
            </button>
          ))}
        </div>
      );
    },
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null
  };
});

describe('GraphEditor', () => {
  it('exposes labeled accessible editor controls and adds a palette node', () => {
    const customNodeTypes = { custom: () => <div>Custom node</div> };
    const { container } = render(
      <div style={{ width: 1000, height: 700 }}>
        <GraphEditor
          nodeTypes={customNodeTypes}
          getNodeType={() => 'custom'}
          graphTitle="Demo graph"
        />
      </div>
    );
    expect(screen.getByRole('region', { name: 'Graph canvas' })).toBeInTheDocument();
    expect(container.querySelector('.ionodes-canvas-label')).toHaveTextContent('Demo graph');
    expect(container.querySelector('.ionodes-status')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Node palette' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add node/ }));
    expect(screen.getByText('1 nodes · 0 connections')).toBeInTheDocument();
    expect(screen.getByTestId('node-renderer-type')).toHaveTextContent('custom');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    const title = screen.getByLabelText('Title');
    fireEvent.change(title, { target: { value: 'Renamed node' } });
    expect(title).toHaveValue('Renamed node');
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(screen.getByText('0 nodes · 0 connections')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByText('1 nodes · 0 connections')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }));
    expect(screen.getByRole('dialog', { name: 'Export graph' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('can hide the bottom status bar', () => {
    const { container } = render(
      <div style={{ width: 1000, height: 700 }}>
        <GraphEditor showStatusBar={false} showPalette={false} showInspector={false} />
      </div>
    );

    expect(container.querySelector('.ionodes-status')).not.toBeInTheDocument();
  });
  it('keeps in-node configuration collapsed until expanded by the user', () => {
    const graph = addNode(createGraph('workflow'), {
      id: 'compact-node',
      title: 'Image processor',
      position: { x: 0, y: 0 },
      connectors: []
    });
    const node = graph.nodes[0]!;
    render(
      <GraphNodeView
        data={{
          graphNode: node,
          updateGraphNode: vi.fn(),
          renderNodeEditor: () => (
            <label>
              Duration
              <input aria-label="Duration" />
            </label>
          ),
          nodeEditorLabel: 'Configure'
        }}
      />
    );
    expect(screen.queryByLabelText('Duration')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
    expect(screen.getByLabelText('Duration')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configure' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });
  it('renders consumer actions immediately after the node header icon', () => {
    const graph = addNode(createGraph('workflow'), {
      id: 'actions-node',
      title: 'Image processor',
      position: { x: 0, y: 0 },
      connectors: []
    });
    const { container } = render(
      <GraphNodeView
        data={{
          graphNode: graph.nodes[0]!,
          updateGraphNode: vi.fn(),
          renderNodeActions: () => <button type="button">Duplicate node</button>
        }}
      />
    );
    const header = container.querySelector('.ionodes-node-header');
    expect(header?.children[0]).toHaveClass('ionodes-node-icon');
    expect(header?.children[1]).toHaveClass('ionodes-node-header-actions');
    expect(header?.children[1]).toHaveTextContent('Duplicate node');
    expect(header?.children[2]).toHaveTextContent('Image processor');
  });
  it('retains measured dimensions and does not loop on repeated empty selection notifications', () => {
    const graph = addNode(createGraph('workflow'), {
      id: 'node',
      title: 'Node',
      position: { x: 0, y: 0 },
      connectors: []
    });
    const { container } = render(
      <div style={{ width: 1000, height: 700 }}>
        <GraphEditor graph={graph} showPalette={false} showInspector={false} />
      </div>
    );
    expect(container.querySelector('.ionodes-canvas-count')).toHaveTextContent(
      '1 nodes · 0 connections'
    );
    expect(container.querySelector('[data-node-width="200"]')).toBeInTheDocument();
  });

  it('keeps a single node selection stable when React Flow repeats selection notifications', () => {
    const graph = addNode(
      addNode(createGraph('workflow'), {
        id: 'first',
        title: 'First',
        position: { x: 0, y: 0 },
        connectors: []
      }),
      { id: 'second', title: 'Second', position: { x: 200, y: 0 }, connectors: [] }
    );
    const onSelectionChange = vi.fn();
    render(
      <div style={{ width: 1000, height: 700 }}>
        <GraphEditor
          graph={graph}
          onSelectionChange={onSelectionChange}
          showPalette={false}
          showInspector={false}
        />
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select first' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select second' }));

    expect(onSelectionChange).toHaveBeenCalledTimes(2);
    expect(onSelectionChange).toHaveBeenLastCalledWith({ nodeIds: ['second'], connectionIds: [] });
  });
});
