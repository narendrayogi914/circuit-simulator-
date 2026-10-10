import { CircuitNode, CircuitEdge } from './types';

export interface PresetGraph {
  id: string;
  title: string;
  category: 'Arithmetic' | 'Error Handling' | 'Advanced';
  description: string;
  expectedResult: string;
  nodes: CircuitNode[];
  edges: CircuitEdge[];
}

export const PRESET_GRAPHS: PresetGraph[] = [
  {
    id: 'graph-1',
    title: 'Graph 1: Addition',
    category: 'Arithmetic',
    description: 'Number(2) + Number(3)',
    expectedResult: 'Display = 5.0000',
    nodes: [
      { id: 'num1', type: 'Number', position: { x: 100, y: 120 }, data: { value: 2 } },
      { id: 'num2', type: 'Number', position: { x: 100, y: 280 }, data: { value: 3 } },
      { id: 'add1', type: 'Add', position: { x: 380, y: 190 }, data: {} },
      { id: 'disp1', type: 'Display', position: { x: 650, y: 190 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'num1', sourceHandle: 'output', target: 'add1', targetHandle: 'a', animated: true },
      { id: 'e2', source: 'num2', sourceHandle: 'output', target: 'add1', targetHandle: 'b', animated: true },
      { id: 'e3', source: 'add1', sourceHandle: 'output', target: 'disp1', targetHandle: 'x', animated: true },
    ],
  },
  {
    id: 'graph-2',
    title: 'Graph 2: Arithmetic Chain',
    category: 'Arithmetic',
    description: '(2 + 3) * 4',
    expectedResult: 'Display = 20.0000',
    nodes: [
      { id: 'num1', type: 'Number', position: { x: 80, y: 100 }, data: { value: 2 } },
      { id: 'num2', type: 'Number', position: { x: 80, y: 220 }, data: { value: 3 } },
      { id: 'add1', type: 'Add', position: { x: 320, y: 150 }, data: {} },
      { id: 'num3', type: 'Number', position: { x: 320, y: 320 }, data: { value: 4 } },
      { id: 'mul1', type: 'Multiply', position: { x: 560, y: 220 }, data: {} },
      { id: 'disp1', type: 'Display', position: { x: 800, y: 220 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'num1', sourceHandle: 'output', target: 'add1', targetHandle: 'a', animated: true },
      { id: 'e2', source: 'num2', sourceHandle: 'output', target: 'add1', targetHandle: 'b', animated: true },
      { id: 'e3', source: 'add1', sourceHandle: 'output', target: 'mul1', targetHandle: 'a', animated: true },
      { id: 'e4', source: 'num3', sourceHandle: 'output', target: 'mul1', targetHandle: 'b', animated: true },
      { id: 'e5', source: 'mul1', sourceHandle: 'output', target: 'disp1', targetHandle: 'x', animated: true },
    ],
  },
  {
    id: 'graph-3',
    title: 'Graph 3: Dual Port Connection',
    category: 'Arithmetic',
    description: 'Number(7) connected to both inputs',
    expectedResult: 'Display = 49.0000',
    nodes: [
      { id: 'num1', type: 'Number', position: { x: 120, y: 180 }, data: { value: 7 } },
      { id: 'mul1', type: 'Multiply', position: { x: 380, y: 180 }, data: {} },
      { id: 'disp1', type: 'Display', position: { x: 640, y: 180 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'num1', sourceHandle: 'output', target: 'mul1', targetHandle: 'a', animated: true },
      { id: 'e2', source: 'num1', sourceHandle: 'output', target: 'mul1', targetHandle: 'b', animated: true },
      { id: 'e3', source: 'mul1', sourceHandle: 'output', target: 'disp1', targetHandle: 'x', animated: true },
    ],
  },
  {
    id: 'graph-4',
    title: 'Graph 4: Zero Division Handling',
    category: 'Error Handling',
    description: 'Number(10) / Number(0)',
    expectedResult: 'Divide: Division by zero | Display: Blocked',
    nodes: [
      { id: 'num1', type: 'Number', position: { x: 100, y: 120 }, data: { value: 10 } },
      { id: 'num2', type: 'Number', position: { x: 100, y: 260 }, data: { value: 0 } },
      { id: 'div1', type: 'Divide', position: { x: 380, y: 180 }, data: {} },
      { id: 'disp1', type: 'Display', position: { x: 650, y: 180 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'num1', sourceHandle: 'output', target: 'div1', targetHandle: 'a', animated: true },
      { id: 'e2', source: 'num2', sourceHandle: 'output', target: 'div1', targetHandle: 'b', animated: true },
      { id: 'e3', source: 'div1', sourceHandle: 'output', target: 'disp1', targetHandle: 'x', animated: true },
    ],
  },
  {
    id: 'graph-5',
    title: 'Graph 5: Missing Connection',
    category: 'Error Handling',
    description: 'Single input connected to Add',
    expectedResult: 'Add: Input "b" not connected',
    nodes: [
      { id: 'num1', type: 'Number', position: { x: 120, y: 150 }, data: { value: 5 } },
      { id: 'add1', type: 'Add', position: { x: 380, y: 180 }, data: {} },
      { id: 'disp1', type: 'Display', position: { x: 640, y: 180 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'num1', sourceHandle: 'output', target: 'add1', targetHandle: 'a', animated: true },
      { id: 'e2', source: 'add1', sourceHandle: 'output', target: 'disp1', targetHandle: 'x', animated: true },
    ],
  },
  {
    id: 'graph-6',
    title: 'Graph 6: Cycle Validation',
    category: 'Error Handling',
    description: 'Closed loop dependency Add -> Multiply -> Add',
    expectedResult: 'Validation: Loop detected (halted)',
    nodes: [
      { id: 'add1', type: 'Add', position: { x: 220, y: 180 }, data: {} },
      { id: 'mul1', type: 'Multiply', position: { x: 500, y: 180 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'add1', sourceHandle: 'output', target: 'mul1', targetHandle: 'a', animated: true },
      { id: 'e2', source: 'mul1', sourceHandle: 'output', target: 'add1', targetHandle: 'b', animated: true },
    ],
  },
  {
    id: 'graph-7',
    title: 'Graph 7: Behavioral Formula',
    category: 'Advanced',
    description: 'Formula "a * 2 + b" with a=3, b=4',
    expectedResult: 'Display = 10.0000',
    nodes: [
      { id: 'num1', type: 'Number', position: { x: 100, y: 120 }, data: { value: 3 } },
      { id: 'num2', type: 'Number', position: { x: 100, y: 260 }, data: { value: 4 } },
      { id: 'form1', type: 'Formula', position: { x: 380, y: 180 }, data: { formula: 'a * 2 + b' } },
      { id: 'disp1', type: 'Display', position: { x: 670, y: 180 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'num1', sourceHandle: 'output', target: 'form1', targetHandle: 'a', animated: true },
      { id: 'e2', source: 'num2', sourceHandle: 'output', target: 'form1', targetHandle: 'b', animated: true },
      { id: 'e3', source: 'form1', sourceHandle: 'output', target: 'disp1', targetHandle: 'x', animated: true },
    ],
  },
  {
    id: 'graph-8',
    title: 'Graph 8: Input Security Filter',
    category: 'Error Handling',
    description: 'Formula containing disallowed tokens',
    expectedResult: 'Validation: Formula rejected by security whitelist',
    nodes: [
      { id: 'num1', type: 'Number', position: { x: 100, y: 120 }, data: { value: 1 } },
      { id: 'num2', type: 'Number', position: { x: 100, y: 260 }, data: { value: 2 } },
      {
        id: 'form1',
        type: 'Formula',
        position: { x: 380, y: 180 },
        data: { formula: 'a + b\n.control\nshell ls' },
      },
      { id: 'disp1', type: 'Display', position: { x: 670, y: 180 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'num1', sourceHandle: 'output', target: 'form1', targetHandle: 'a', animated: true },
      { id: 'e2', source: 'num2', sourceHandle: 'output', target: 'form1', targetHandle: 'b', animated: true },
      { id: 'e3', source: 'form1', sourceHandle: 'output', target: 'disp1', targetHandle: 'x', animated: true },
    ],
  },
  {
    id: 'graph-bonus',
    title: 'Graph 9: Subtraction Node',
    category: 'Arithmetic',
    description: 'Number(10) - Number(4)',
    expectedResult: 'Display = 6.0000',
    nodes: [
      { id: 'num1', type: 'Number', position: { x: 100, y: 120 }, data: { value: 10 } },
      { id: 'num2', type: 'Number', position: { x: 100, y: 260 }, data: { value: 4 } },
      { id: 'sub1', type: 'Subtract', position: { x: 380, y: 180 }, data: {} },
      { id: 'disp1', type: 'Display', position: { x: 650, y: 180 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'num1', sourceHandle: 'output', target: 'sub1', targetHandle: 'a', animated: true },
      { id: 'e2', source: 'num2', sourceHandle: 'output', target: 'sub1', targetHandle: 'b', animated: true },
      { id: 'e3', source: 'sub1', sourceHandle: 'output', target: 'disp1', targetHandle: 'x', animated: true },
    ],
  },
];
