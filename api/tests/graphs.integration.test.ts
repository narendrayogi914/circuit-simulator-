import { validateGraph } from '../src/services/validator';
import { graphToNetlist } from '../src/services/netlister';
import { solveGraphLocally } from '../src/services/localSolver';
import { Node, Edge } from '../src/types';

describe('8 Acceptance Graphs Integration Tests', () => {
  // Graph 1: Number(2) + Number(3) = 5 -> Display
  test('Graph 1: Simple Add (2 + 3 = 5)', () => {
    const nodes: Node[] = [
      { id: 'num1', type: 'Number', position: { x: 0, y: 0 }, data: { value: 2 } },
      { id: 'num2', type: 'Number', position: { x: 0, y: 100 }, data: { value: 3 } },
      { id: 'add1', type: 'Add', position: { x: 200, y: 50 }, data: {} },
      { id: 'disp1', type: 'Display', position: { x: 400, y: 50 }, data: {} },
    ];
    const edges: Edge[] = [
      { source: 'num1', sourceHandle: 'output', target: 'add1', targetHandle: 'a' },
      { source: 'num2', sourceHandle: 'output', target: 'add1', targetHandle: 'b' },
      { source: 'add1', sourceHandle: 'output', target: 'disp1', targetHandle: 'x' },
    ];

    const validation = validateGraph(nodes, edges);
    expect(validation.isValid).toBe(true);

    const netlistRes = graphToNetlist(nodes, edges);
    expect(netlistRes.netlist).toContain('V_num1');
    expect(netlistRes.netlist).toContain('B_add1');

    const result = solveGraphLocally(nodes, edges, 1, netlistRes.nodeNetMap, netlistRes.displayNetMap);
    expect(result.status).toBe('success');
    expect(result.values['disp1']).toBe(5);
  });

  // Graph 2: (2 + 3) * 4 = 20 -> Display
  test('Graph 2: Chain (Add -> Multiply: (2 + 3) * 4 = 20)', () => {
    const nodes: Node[] = [
      { id: 'num1', type: 'Number', position: { x: 0, y: 0 }, data: { value: 2 } },
      { id: 'num2', type: 'Number', position: { x: 0, y: 100 }, data: { value: 3 } },
      { id: 'add1', type: 'Add', position: { x: 200, y: 50 }, data: {} },
      { id: 'num3', type: 'Number', position: { x: 200, y: 200 }, data: { value: 4 } },
      { id: 'mul1', type: 'Multiply', position: { x: 400, y: 100 }, data: {} },
      { id: 'disp1', type: 'Display', position: { x: 600, y: 100 }, data: {} },
    ];
    const edges: Edge[] = [
      { source: 'num1', target: 'add1', targetHandle: 'a' },
      { source: 'num2', target: 'add1', targetHandle: 'b' },
      { source: 'add1', target: 'mul1', targetHandle: 'a' },
      { source: 'num3', target: 'mul1', targetHandle: 'b' },
      { source: 'mul1', target: 'disp1', targetHandle: 'x' },
    ];

    const validation = validateGraph(nodes, edges);
    expect(validation.isValid).toBe(true);

    const netlistRes = graphToNetlist(nodes, edges);
    const result = solveGraphLocally(nodes, edges, 1, netlistRes.nodeNetMap, netlistRes.displayNetMap);
    expect(result.status).toBe('success');
    expect(result.values['disp1']).toBe(20);
  });

  // Graph 3: Same input twice: Number(7) to both inputs of Multiply = 49
  test('Graph 3: Same Input Twice (7 * 7 = 49)', () => {
    const nodes: Node[] = [
      { id: 'num1', type: 'Number', position: { x: 0, y: 0 }, data: { value: 7 } },
      { id: 'mul1', type: 'Multiply', position: { x: 200, y: 0 }, data: {} },
      { id: 'disp1', type: 'Display', position: { x: 400, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { source: 'num1', target: 'mul1', targetHandle: 'a' },
      { source: 'num1', target: 'mul1', targetHandle: 'b' },
      { source: 'mul1', target: 'disp1', targetHandle: 'x' },
    ];

    const validation = validateGraph(nodes, edges);
    expect(validation.isValid).toBe(true);

    const netlistRes = graphToNetlist(nodes, edges);
    const result = solveGraphLocally(nodes, edges, 1, netlistRes.nodeNetMap, netlistRes.displayNetMap);
    expect(result.status).toBe('success');
    expect(result.values['disp1']).toBe(49);
  });

  // Graph 4: Divide by Zero: 10 / 0
  test('Graph 4: Divide by Zero Error Attribution', () => {
    const nodes: Node[] = [
      { id: 'num1', type: 'Number', position: { x: 0, y: 0 }, data: { value: 10 } },
      { id: 'num2', type: 'Number', position: { x: 0, y: 100 }, data: { value: 0 } },
      { id: 'div1', type: 'Divide', position: { x: 200, y: 50 }, data: {} },
      { id: 'disp1', type: 'Display', position: { x: 400, y: 50 }, data: {} },
    ];
    const edges: Edge[] = [
      { source: 'num1', target: 'div1', targetHandle: 'a' },
      { source: 'num2', target: 'div1', targetHandle: 'b' },
      { source: 'div1', target: 'disp1', targetHandle: 'x' },
    ];

    const validation = validateGraph(nodes, edges);
    expect(validation.isValid).toBe(true);

    const netlistRes = graphToNetlist(nodes, edges);
    const result = solveGraphLocally(nodes, edges, 1, netlistRes.nodeNetMap, netlistRes.displayNetMap);
    expect(result.status).toBe('error');
    expect(result.errors['div1']).toBe('Division by zero');
    expect(result.errors['disp1']).toBe('Blocked (upstream error)');
  });

  // Graph 5: Missing Input: Add node with only 1 wire
  test('Graph 5: Missing Input on Add Node', () => {
    const nodes: Node[] = [
      { id: 'num1', type: 'Number', position: { x: 0, y: 0 }, data: { value: 5 } },
      { id: 'add1', type: 'Add', position: { x: 200, y: 0 }, data: {} },
      { id: 'disp1', type: 'Display', position: { x: 400, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { source: 'num1', target: 'add1', targetHandle: 'a' },
      { source: 'add1', target: 'disp1', targetHandle: 'x' },
    ];

    const validation = validateGraph(nodes, edges);
    expect(validation.isValid).toBe(false);
    expect(validation.errors['add1']).toContain('Input "b" not connected');
  });

  // Graph 6: Loop Detection: Add -> Multiply -> back to Add
  test('Graph 6: Loop Detection (Cycle)', () => {
    const nodes: Node[] = [
      { id: 'add1', type: 'Add', position: { x: 0, y: 0 }, data: {} },
      { id: 'mul1', type: 'Multiply', position: { x: 200, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { source: 'add1', target: 'mul1', targetHandle: 'a' },
      { source: 'mul1', target: 'add1', targetHandle: 'b' },
    ];

    const validation = validateGraph(nodes, edges);
    expect(validation.isValid).toBe(false);
    expect(validation.errors['add1'] || validation.errors['mul1']).toContain('loop');
  });

  // Graph 7: Formula Node: 3 * 2 + 4 = 10
  test('Graph 7: Formula Node (a * 2 + b with a=3, b=4)', () => {
    const nodes: Node[] = [
      { id: 'num1', type: 'Number', position: { x: 0, y: 0 }, data: { value: 3 } },
      { id: 'num2', type: 'Number', position: { x: 0, y: 100 }, data: { value: 4 } },
      { id: 'form1', type: 'Formula', position: { x: 200, y: 50 }, data: { formula: 'a * 2 + b' } },
      { id: 'disp1', type: 'Display', position: { x: 400, y: 50 }, data: {} },
    ];
    const edges: Edge[] = [
      { source: 'num1', target: 'form1', targetHandle: 'a' },
      { source: 'num2', target: 'form1', targetHandle: 'b' },
      { source: 'form1', target: 'disp1', targetHandle: 'x' },
    ];

    const validation = validateGraph(nodes, edges);
    expect(validation.isValid).toBe(true);

    const netlistRes = graphToNetlist(nodes, edges);
    const result = solveGraphLocally(nodes, edges, 1, netlistRes.nodeNetMap, netlistRes.displayNetMap);
    expect(result.status).toBe('success');
    expect(result.values['disp1']).toBe(10);
  });

  // Graph 8: Formula Injection Attack Rejection
  test('Graph 8: Formula Injection Attack Blocked', () => {
    const nodes: Node[] = [
      { id: 'num1', type: 'Number', position: { x: 0, y: 0 }, data: { value: 1 } },
      { id: 'num2', type: 'Number', position: { x: 0, y: 100 }, data: { value: 2 } },
      {
        id: 'form1',
        type: 'Formula',
        position: { x: 200, y: 50 },
        data: { formula: 'a + b\n.control\nshell ls' },
      },
    ];
    const edges: Edge[] = [
      { source: 'num1', target: 'form1', targetHandle: 'a' },
      { source: 'num2', target: 'form1', targetHandle: 'b' },
    ];

    const validation = validateGraph(nodes, edges);
    expect(validation.isValid).toBe(false);
    expect(validation.errors['form1']).toContain('Invalid formula');
  });

  // Live Interview Bonus: Subtract Node
  test('Bonus: Subtract Node (10 - 4 = 6)', () => {
    const nodes: Node[] = [
      { id: 'num1', type: 'Number', position: { x: 0, y: 0 }, data: { value: 10 } },
      { id: 'num2', type: 'Number', position: { x: 0, y: 100 }, data: { value: 4 } },
      { id: 'sub1', type: 'Subtract', position: { x: 200, y: 50 }, data: {} },
      { id: 'disp1', type: 'Display', position: { x: 400, y: 50 }, data: {} },
    ];
    const edges: Edge[] = [
      { source: 'num1', target: 'sub1', targetHandle: 'a' },
      { source: 'num2', target: 'sub1', targetHandle: 'b' },
      { source: 'sub1', target: 'disp1', targetHandle: 'x' },
    ];

    const validation = validateGraph(nodes, edges);
    expect(validation.isValid).toBe(true);

    const netlistRes = graphToNetlist(nodes, edges);
    const result = solveGraphLocally(nodes, edges, 1, netlistRes.nodeNetMap, netlistRes.displayNetMap);
    expect(result.status).toBe('success');
    expect(result.values['disp1']).toBe(6);
  });
});
