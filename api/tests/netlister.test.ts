import { graphToNetlist } from '../src/services/netlister';
import { Node, Edge } from '../src/types';

describe('Netlister Unit Tests', () => {
  test('generates valid SPICE lines for Number and Add nodes', () => {
    const nodes: Node[] = [
      { id: 'num1', type: 'Number', position: { x: 0, y: 0 }, data: { value: 5 } },
      { id: 'num2', type: 'Number', position: { x: 0, y: 100 }, data: { value: 3 } },
      { id: 'add1', type: 'Add', position: { x: 200, y: 50 }, data: {} },
      { id: 'disp1', type: 'Display', position: { x: 400, y: 50 }, data: {} },
    ];

    const edges: Edge[] = [
      { source: 'num1', sourceHandle: 'output', target: 'add1', targetHandle: 'a' },
      { source: 'num2', sourceHandle: 'output', target: 'add1', targetHandle: 'b' },
      { source: 'add1', sourceHandle: 'output', target: 'disp1', targetHandle: 'x' },
    ];

    const result = graphToNetlist(nodes, edges);
    expect(result.netlist).toContain('V_num1');
    expect(result.netlist).toContain('DC 5');
    expect(result.netlist).toContain('V_num2');
    expect(result.netlist).toContain('DC 3');
    expect(result.netlist).toContain('B_add1');
    expect(result.netlist).toContain('V = V(');
    expect(result.netlist).toContain('.op');
    expect(result.netlist).toContain('.end');
    expect(result.displayNetMap['disp1']).toBeDefined();
  });

  test('generates behavioral lines for Multiply, Divide, and Subtract', () => {
    const nodes: Node[] = [
      { id: 'num1', type: 'Number', position: { x: 0, y: 0 }, data: { value: 10 } },
      { id: 'num2', type: 'Number', position: { x: 0, y: 100 }, data: { value: 2 } },
      { id: 'mul1', type: 'Multiply', position: { x: 200, y: 0 }, data: {} },
      { id: 'div1', type: 'Divide', position: { x: 200, y: 100 }, data: {} },
      { id: 'sub1', type: 'Subtract', position: { x: 200, y: 200 }, data: {} },
    ];

    const edges: Edge[] = [
      { source: 'num1', target: 'mul1', targetHandle: 'a' },
      { source: 'num2', target: 'mul1', targetHandle: 'b' },
      { source: 'num1', target: 'div1', targetHandle: 'a' },
      { source: 'num2', target: 'div1', targetHandle: 'b' },
      { source: 'num1', target: 'sub1', targetHandle: 'a' },
      { source: 'num2', target: 'sub1', targetHandle: 'b' },
    ];

    const result = graphToNetlist(nodes, edges);
    expect(result.netlist).toContain('*');
    expect(result.netlist).toContain('/');
    expect(result.netlist).toContain('-');
  });

  test('expands variables in Formula node', () => {
    const nodes: Node[] = [
      { id: 'num1', type: 'Number', position: { x: 0, y: 0 }, data: { value: 3 } },
      { id: 'num2', type: 'Number', position: { x: 0, y: 100 }, data: { value: 4 } },
      { id: 'form1', type: 'Formula', position: { x: 200, y: 50 }, data: { formula: 'a * 2 + b' } },
    ];

    const edges: Edge[] = [
      { source: 'num1', target: 'form1', targetHandle: 'a' },
      { source: 'num2', target: 'form1', targetHandle: 'b' },
    ];

    const result = graphToNetlist(nodes, edges);
    const net1 = result.nodeNetMap['num1'];
    const net2 = result.nodeNetMap['num2'];
    expect(result.netlist).toContain(`V(${net1}) * 2 + V(${net2})`);
  });
});
