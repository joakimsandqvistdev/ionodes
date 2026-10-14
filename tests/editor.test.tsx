import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GraphEditor } from '../src/GraphEditor';

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReactFlow: () => ({ fitView: () => Promise.resolve(true) }),
    ReactFlow: ({ nodes }: { nodes: Array<{ id: string; type?: string }> }) => (
      <div>
        {nodes.map((node) => (
          <span key={node.id} data-testid="node-renderer-type">
            {node.type}
          </span>
        ))}
      </div>
    ),
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
});
