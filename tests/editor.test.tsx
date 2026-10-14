import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GraphEditor } from '../src/GraphEditor';
import { addNode, createGraph } from '../src/graph';

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReactFlow: () => ({ fitView: () => Promise.resolve(true) }),
    ReactFlow: ({ nodes, onNodesChange }: { nodes: Array<{ id: string; type?: string }>; onNodesChange: (changes: Array<{ type: 'dimensions'; id: string; dimensions: { width: number; height: number }; resizing: false }>) => void }) => {
      React.useEffect(() => {
        onNodesChange(nodes.map((node) => ({ type: 'dimensions', id: node.id, dimensions: { width: 200, height: 100 }, resizing: false })));
      }, [nodes, onNodesChange]);
      return <div>{nodes.map((node) => <span key={node.id} data-testid="node-renderer-type">{node.type}</span>)}</div>;
    },
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null
  };
});

describe('GraphEditor', () => {
  it('exposes labeled accessible editor controls and adds a palette node', () => {
    const customNodeTypes = { custom: () => <div>Custom node</div> };
    render(
      <div style={{ width: 1000, height: 700 }}>
        <GraphEditor nodeTypes={customNodeTypes} getNodeType={() => 'custom'} />
      </div>
    );
    expect(screen.getByRole('region', { name: 'Graph canvas' })).toBeInTheDocument();
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
  it('does not update node measurements repeatedly when React Flow reports unchanged dimensions', () => {
    const graph = addNode(createGraph('workflow'), {
      id: 'node', title: 'Node', position: { x: 0, y: 0 }, connectors: []
    });
    const { container } = render(
      <div style={{ width: 1000, height: 700 }}>
        <GraphEditor graph={graph} showPalette={false} showInspector={false} />
      </div>
    );
    expect(container.querySelector('.ionodes-canvas-count')).toHaveTextContent('1 nodes · 0 connections');
  });
});
