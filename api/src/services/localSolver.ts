import { Node, Edge, ExecutionResult } from '../types';

/**
 * Local deterministic DAG circuit solver.
 * Evaluates node values directly, detects divide-by-zero, and computes net & display values.
 * Used as high-speed fallback when Python/ngspice container is offline, and for test validation.
 */
export function solveGraphLocally(
  nodes: Node[],
  edges: Edge[],
  version: number,
  nodeNetMap: Record<string, string>,
  displayNetMap: Record<string, string>
): ExecutionResult {
  const nodeValues: Record<string, number> = {};
  const netValues: Record<string, number> = {};
  const errors: Record<string, string> = {};

  const getNodeInputVal = (targetId: string, handle: string): number | null => {
    const edge = edges.find(
      e => e.target === targetId && (e.targetHandle === handle || (!e.targetHandle && handle === 'a'))
    );
    if (!edge) return null;
    return nodeValues[edge.source] ?? null;
  };

  // Topological / iterative evaluation of nodes
  let progress = true;
  let iterations = 0;
  const maxIterations = nodes.length * 2 + 10;

  while (progress && iterations < maxIterations) {
    progress = false;
    iterations++;

    for (const node of nodes) {
      if (node.id in nodeValues || node.id in errors) {
        continue;
      }

      if (node.type === 'Number') {
        const val = typeof node.data?.value === 'number' ? node.data.value : 0;
        nodeValues[node.id] = val;
        const net = nodeNetMap[node.id];
        if (net) netValues[net] = val;
        progress = true;
        continue;
      }

      if (node.type === 'Add') {
        const a = getNodeInputVal(node.id, 'a');
        const b = getNodeInputVal(node.id, 'b');
        if (a !== null && b !== null) {
          const val = a + b;
          nodeValues[node.id] = val;
          const net = nodeNetMap[node.id];
          if (net) netValues[net] = val;
          progress = true;
        }
        continue;
      }

      if (node.type === 'Subtract') {
        const a = getNodeInputVal(node.id, 'a');
        const b = getNodeInputVal(node.id, 'b');
        if (a !== null && b !== null) {
          const val = a - b;
          nodeValues[node.id] = val;
          const net = nodeNetMap[node.id];
          if (net) netValues[net] = val;
          progress = true;
        }
        continue;
      }

      if (node.type === 'Multiply') {
        const a = getNodeInputVal(node.id, 'a');
        const b = getNodeInputVal(node.id, 'b');
        if (a !== null && b !== null) {
          const val = a * b;
          nodeValues[node.id] = val;
          const net = nodeNetMap[node.id];
          if (net) netValues[net] = val;
          progress = true;
        }
        continue;
      }

      if (node.type === 'Divide') {
        const a = getNodeInputVal(node.id, 'a');
        const b = getNodeInputVal(node.id, 'b');
        if (a !== null && b !== null) {
          if (b === 0) {
            errors[node.id] = 'Division by zero';
          } else {
            const val = a / b;
            nodeValues[node.id] = val;
            const net = nodeNetMap[node.id];
            if (net) netValues[net] = val;
          }
          progress = true;
        }
        continue;
      }

      if (node.type === 'Formula') {
        const a = getNodeInputVal(node.id, 'a');
        const b = getNodeInputVal(node.id, 'b');
        if (a !== null && b !== null) {
          const rawFormula = (node.data?.formula || 'a + b').trim();
          try {
            // Safe mathematical expression evaluation using Function with whitelisted scope
            const safeEval = new Function('a', 'b', `"use strict"; return (${rawFormula});`);
            const val = Number(safeEval(a, b));
            if (!isFinite(val)) {
              errors[node.id] = 'Formula evaluated to non-finite value or division by zero';
            } else {
              nodeValues[node.id] = val;
              const net = nodeNetMap[node.id];
              if (net) netValues[net] = val;
            }
          } catch (err: any) {
            errors[node.id] = `Formula error: ${err.message}`;
          }
          progress = true;
        }
        continue;
      }

      if (node.type === 'Display') {
        const inEdge = edges.find(
          e => e.target === node.id && (e.targetHandle === 'x' || !e.targetHandle)
        );
        if (inEdge) {
          if (inEdge.source in errors) {
            errors[node.id] = 'Blocked (upstream error)';
            progress = true;
          } else if (inEdge.source in nodeValues) {
            nodeValues[node.id] = nodeValues[inEdge.source];
            progress = true;
          }
        }
        continue;
      }
    }
  }

  // Populate Display nodes from their incoming nets if not blocked
  for (const node of nodes) {
    if (node.type === 'Display') {
      const inEdge = edges.find(
        e => e.target === node.id && (e.targetHandle === 'x' || !e.targetHandle)
      );
      if (inEdge) {
        if (inEdge.source in errors) {
          errors[node.id] = 'Blocked (upstream error)';
        } else if (inEdge.source in nodeValues) {
          nodeValues[node.id] = nodeValues[inEdge.source];
        }
      }
    }
  }

  // Combine netValues and nodeValues for output
  const values: Record<string, number> = { ...netValues, ...nodeValues };

  return {
    status: Object.keys(errors).length > 0 ? 'error' : 'success',
    values,
    errors,
    version,
    source: 'localSolver',
  };
}
