import axios from 'axios';
import { Node, Edge, ExecutionResult } from '../types';
import { NetlistResult } from './netlister';
import { solveGraphLocally } from './localSolver';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

interface PythonSimulateResponse {
  values: Record<string, number>;
  errors: Record<string, string>;
}

export async function executeWithPythonService(
  netlistResult: NetlistResult,
  nodes: Node[],
  edges: Edge[],
  version: number
): Promise<ExecutionResult> {
  const { netlist, nodeNetMap, displayNetMap } = netlistResult;

  try {
    const response = await axios.post<PythonSimulateResponse>(
      `${PYTHON_SERVICE_URL}/simulate`,
      {
        netlist,
        nodes: nodes.map(n => ({ id: n.id, type: n.type })),
      },
      {
        timeout: 5000, // 5s timeout per requirements
      }
    );

    const { values, errors } = response.data;

    // Propagate errors and map display values
    const finalValues: Record<string, number> = { ...values };
    const finalErrors: Record<string, string> = { ...errors };

    // For every display node, find its incoming net and assign the voltage
    for (const [dispId, netName] of Object.entries(displayNetMap)) {
      // Check if upstream node has an error
      const inputEdge = edges.find(
        e => e.target === dispId && (e.targetHandle === 'x' || !e.targetHandle)
      );
      if (inputEdge && finalErrors[inputEdge.source]) {
        finalErrors[dispId] = 'Blocked (upstream error)';
      } else if (netName.toLowerCase() in finalValues) {
        finalValues[dispId] = finalValues[netName.toLowerCase()];
      }
    }

    // Map each node to its net voltage as well so frontend can display values on nodes directly
    for (const [nodeId, netName] of Object.entries(nodeNetMap)) {
      if (netName.toLowerCase() in finalValues) {
        finalValues[nodeId] = finalValues[netName.toLowerCase()];
      }
    }

    return {
      status: Object.keys(finalErrors).length > 0 ? 'error' : 'success',
      values: finalValues,
      errors: finalErrors,
      version,
      netlist,
      source: 'ngspice',
    };
  } catch (error: any) {
    // If connection was refused or unavailable, use local solver fallback for seamless local dev
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.warn(
        `[Notice] Python service at ${PYTHON_SERVICE_URL} unavailable. Using local solver fallback.`
      );
      const localRes = solveGraphLocally(nodes, edges, version, nodeNetMap, displayNetMap);
      localRes.netlist = netlist;
      return localRes;
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        status: 'timeout',
        values: {},
        errors: { global: 'Simulation timed out (backend took >5s)' },
        version,
        netlist,
      };
    }

    return {
      status: 'error',
      values: {},
      errors: { global: error.response?.data?.detail || error.message || 'Simulation error' },
      version,
      netlist,
    };
  }
}
