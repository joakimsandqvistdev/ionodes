import React from 'react';
import { createRoot } from 'react-dom/client';
import { GraphEditor, createGraph, createId, type GraphNode } from '../src';
import './demo.css';

const first: GraphNode = {
  id: 'node-source',
  title: 'Read document',
  description: 'Load a source file and expose its contents.',
  icon: { name: '▤' },
  position: { x: 70, y: 150 },
  connectors: [
    {
      id: 'source-file',
      direction: 'input',
      label: 'File',
      color: '#a78bfa',
      type: 'file',
      cardinality: 'one'
    },
    { id: 'source-text', direction: 'output', label: 'Text', color: '#65c9a4', type: 'text' },
    { id: 'source-meta', direction: 'output', label: 'Metadata', color: '#e7b65a', type: 'object' }
  ]
};
const second: GraphNode = {
  id: 'node-transform',
  title: 'Transform text',
  description: 'Apply a generic text transformation.',
  icon: { name: '✳' },
  position: { x: 410, y: 195 },
  connectors: [
    {
      id: 'transform-text',
      direction: 'input',
      label: 'Text',
      color: '#65c9a4',
      type: 'text',
      cardinality: 'one'
    },
    {
      id: 'transform-options',
      direction: 'input',
      label: 'Options',
      color: '#e7b65a',
      type: 'object'
    },
    { id: 'transform-result', direction: 'output', label: 'Result', color: '#72a8ff', type: 'text' }
  ]
};
const initial = {
  ...createGraph('example-graph'),
  nodes: [first, second],
  connections: [
    {
      id: 'example-edge',
      sourceNodeId: first.id,
      sourceConnectorId: 'source-text',
      targetNodeId: second.id,
      targetConnectorId: 'transform-text',
      label: 'text'
    }
  ]
};
const customPalette = [
  {
    label: 'Text processor',
    description: 'A node with text and options ports.',
    create: () => ({
      id: createId('node'),
      title: 'Text processor',
      description: 'Processes text.',
      position: { x: 220, y: 130 },
      connectors: [
        {
          id: createId('port'),
          direction: 'input' as const,
          label: 'Text',
          color: '#65c9a4',
          type: 'text'
        },
        {
          id: createId('port'),
          direction: 'input' as const,
          label: 'Options',
          color: '#e7b65a',
          type: 'object'
        },
        {
          id: createId('port'),
          direction: 'output' as const,
          label: 'Result',
          color: '#72a8ff',
          type: 'text'
        }
      ]
    })
  }
];

function Demo() {
  return (
    <div className="demo-shell">
      <div className="demo-intro">
        <span>IONODES · REACT COMPONENT LIBRARY</span>
        <h1>Build graphs that make sense.</h1>
        <p>A flexible node editor for the structures your app cares about.</p>
      </div>
      <div className="demo-editor">
        <GraphEditor
          defaultGraph={initial}
          palette={customPalette}
          validateConnection={(source, target) =>
            !source.type ||
            !target.type ||
            source.type === target.type ||
            `Type "${source.type}" cannot connect to "${target.type}".`
          }
        />
      </div>
      <div className="demo-footnote">Generic graph data · Local first · Built with React Flow</div>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Demo />
  </React.StrictMode>
);
