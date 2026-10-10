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
  results?: ExecutionResult | null;
  onValueChange?: (id: string, value: number) => void;
  onFormulaChange?: (id: string, formula: string) => void;
  [key: string]: any;
}

export interface CircuitNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export interface CircuitEdge {
  id: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
  animated?: boolean;
}

export interface ExecutionResult {
  status: 'success' | 'error' | 'timeout';
  values: Record<string, number>;
  errors: Record<string, string>;
  version: number;
  netlist?: string;
  source?: 'ngspice' | 'localSolver';
}

export interface GraphPayload {
  name?: string;
  nodes: CircuitNode[];
  edges: CircuitEdge[];
  version?: number;
}
