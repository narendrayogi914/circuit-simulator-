import { validateGraph } from '../src/services/validator';
import { Node, Edge } from '../src/types';

describe('Validator Unit Tests', () => {
  test('detects directed cycle / loop between nodes', () => {
    const nodes: Node[] = [
      { id: 'add1', type: 'Add', position: { x: 0, y: 0 }, data: {} },
      { id: 'mul1', type: 'Multiply', position: { x: 200, y: 0 }, data: {} },
    ];

    const edges: Edge[] = [
      { source: 'add1', target: 'mul1', targetHandle: 'a' },
      { source: 'mul1', target: 'add1', targetHandle: 'b' },
    ];

    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.errors['add1'] || result.errors['mul1']).toBe('Node is part of a loop');
  });

  test('flags missing inputs on operator nodes', () => {
    const nodes: Node[] = [
      { id: 'num1', type: 'Number', position: { x: 0, y: 0 }, data: { value: 10 } },
      { id: 'add1', type: 'Add', position: { x: 200, y: 0 }, data: {} },
    ];

    // Only wire to input 'a'
    const edges: Edge[] = [
      { source: 'num1', target: 'add1', targetHandle: 'a' },
    ];

    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.errors['add1']).toBe('Input "b" not connected');
  });

  test('flags self-loop edge', () => {
    const nodes: Node[] = [
      { id: 'add1', type: 'Add', position: { x: 0, y: 0 }, data: {} },
    ];

    const edges: Edge[] = [
      { source: 'add1', target: 'add1', targetHandle: 'a' },
    ];

    const result = validateGraph(nodes, edges);
    expect(result.isValid).toBe(false);
    expect(result.errors['add1']).toBeDefined();
  });
});
