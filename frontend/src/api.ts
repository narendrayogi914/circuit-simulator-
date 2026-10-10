import axios from 'axios';
import { CircuitNode, CircuitEdge, ExecutionResult } from './types';

const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:3001/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000, // 5s timeout
});

export async function executeGraph(
  nodes: CircuitNode[],
  edges: CircuitEdge[],
  version: number
): Promise<ExecutionResult> {
  try {
    const cleanNodes = nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: {
        value: n.data?.value,
        formula: n.data?.formula,
      },
    }));

    const cleanEdges = edges.map(e => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle,
      target: e.target,
      targetHandle: e.targetHandle,
    }));

    const response = await client.post<ExecutionResult>('/execute', {
      nodes: cleanNodes,
      edges: cleanEdges,
      version,
    });

    return response.data;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        status: 'timeout',
        values: {},
        errors: { global: 'Simulation timed out (>5s)' },
        version,
      };
    }

    if (error.response?.data) {
      return {
        status: 'error',
        values: error.response.data.values || {},
        errors: error.response.data.errors || { global: error.message },
        version,
        netlist: error.response.data.netlist,
      };
    }

    return {
      status: 'error',
      values: {},
      errors: { global: error.message || 'Cannot reach API backend' },
      version,
    };
  }
}

export async function saveGraph(name: string, nodes: CircuitNode[], edges: CircuitEdge[]): Promise<string> {
  const cleanNodes = nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { value: n.data?.value, formula: n.data?.formula },
  }));
  const response = await client.post('/save', { name, nodes: cleanNodes, edges });
  return response.data.id;
}

export async function loadGraph(id: string): Promise<{ name: string; nodes: CircuitNode[]; edges: CircuitEdge[] }> {
  const response = await client.get(`/load/${id}`);
  return response.data;
}

export async function listGraphs(): Promise<any[]> {
  const response = await client.get('/list');
  return response.data;
}
