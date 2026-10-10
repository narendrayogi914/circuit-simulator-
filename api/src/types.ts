export type NodeType =
  | 'Number'
  | 'Add'
  | 'Subtract'
  | 'Multiply'
  | 'Divide'
  | 'Display'
  | 'Formula';

export interface NodeData {
  value?: number;
  formula?: string;
  [key: string]: any;
}

export interface Node {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export interface Edge {
  id?: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
}

export interface Graph {
  _id?: string;
  id?: string;
  name?: string;
  nodes: Node[];
  edges: Edge[];
  createdAt?: Date;
}

export interface ExecutionResult {
  status: 'success' | 'error' | 'timeout';
  values: Record<string, number>;
  errors: Record<string, string>;
  version: number;
  netlist?: string;
  source?: 'ngspice' | 'localSolver';
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}
