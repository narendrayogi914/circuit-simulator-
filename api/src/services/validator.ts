import { Node, Edge, ValidationResult } from '../types';

/**
 * Validates a formula string to ensure safety against injection attacks
 * and syntax correctness.
 */
export function validateFormulaString(formula: string | undefined): { isValid: boolean; error?: string } {
  if (!formula || !formula.trim()) {
    return { isValid: false, error: 'Formula cannot be empty' };
  }

  // Strict whitelist: only digits, variables 'a' & 'b', operators +, -, *, /, parenthesis, spaces, decimals
  const allowedRegex = /^[0-9ab\+\-\*\/\(\)\s\.]+$/i;
  if (!allowedRegex.test(formula)) {
    return {
      isValid: false,
      error: 'Invalid formula. Only numbers, a, b, +, -, *, /, and () are allowed',
    };
  }

  // Guard against consecutive invalid tokens (e.g., //, **, ++)
  if (/[\+\-\*\/]{2,}/.test(formula.replace(/\s+/g, ''))) {
    return { isValid: false, error: 'Formula has invalid operator sequence' };
  }

  // Balance of parentheses
  let openCount = 0;
  for (const char of formula) {
    if (char === '(') openCount++;
    if (char === ')') openCount--;
    if (openCount < 0) {
      return { isValid: false, error: 'Unbalanced parentheses in formula' };
    }
  }
  if (openCount !== 0) {
    return { isValid: false, error: 'Unbalanced parentheses in formula' };
  }

  return { isValid: true };
}

/**
 * Validates the entire node graph for cycles, missing inputs, and unsafe formulas.
 */
export function validateGraph(nodes: Node[], edges: Edge[]): ValidationResult {
  const errors: Record<string, string> = {};

  // 1. Check self loops in edges
  for (const edge of edges) {
    if (edge.source === edge.target) {
      errors[edge.source] = 'Node connected to itself';
    }
  }

  // 2. Cycle Detection using DFS (3-color tracking: 0 = unvisited, 1 = visiting, 2 = visited)
  const adj = new Map<string, string[]>();
  for (const node of nodes) {
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    if (adj.has(edge.source)) {
      adj.get(edge.source)!.push(edge.target);
    }
  }

  const state = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
  const cycleNodes = new Set<string>();

  function dfs(nodeId: string, path: string[]): boolean {
    state.set(nodeId, 1);
    path.push(nodeId);

    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      const neighborState = state.get(neighbor) || 0;
      if (neighborState === 1) {
        // Cycle found: mark all nodes in the current path from neighbor to end
        const cycleStartIndex = path.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          for (let i = cycleStartIndex; i < path.length; i++) {
            cycleNodes.add(path[i]);
          }
        } else {
          cycleNodes.add(neighbor);
          cycleNodes.add(nodeId);
        }
      } else if (neighborState === 0) {
        dfs(neighbor, path);
      }
    }

    path.pop();
    state.set(nodeId, 2);
    return cycleNodes.size > 0;
  }

  for (const node of nodes) {
    if ((state.get(node.id) || 0) === 0) {
      dfs(node.id, []);
    }
  }

  for (const cycleNodeId of cycleNodes) {
    errors[cycleNodeId] = 'Node is part of a loop';
  }

  // 3. Check for missing inputs on operator nodes (only if not already flagged as part of a loop)
  for (const node of nodes) {
    if (cycleNodes.has(node.id)) {
      continue; // Loop detection takes precedence
    }

    if (node.type === 'Add' || node.type === 'Subtract' || node.type === 'Multiply' || node.type === 'Divide') {
      const hasA = edges.some(e => e.target === node.id && (e.targetHandle === 'a' || !e.targetHandle));
      const hasB = edges.some(e => e.target === node.id && e.targetHandle === 'b');

      if (!hasA && !hasB) {
        errors[node.id] = 'Inputs "a" and "b" not connected';
      } else if (!hasA) {
        errors[node.id] = 'Input "a" not connected';
      } else if (!hasB) {
        errors[node.id] = 'Input "b" not connected';
      }
    } else if (node.type === 'Formula') {
      const formulaVal = node.data?.formula || 'a + b';
      const formulaCheck = validateFormulaString(formulaVal);
      if (!formulaCheck.isValid) {
        errors[node.id] = formulaCheck.error || 'Invalid formula';
      } else {
        const hasA = edges.some(e => e.target === node.id && (e.targetHandle === 'a' || !e.targetHandle));
        const hasB = edges.some(e => e.target === node.id && e.targetHandle === 'b');
        if (!hasA && !hasB) {
          errors[node.id] = 'Inputs "a" and "b" not connected';
        } else if (!hasA) {
          errors[node.id] = 'Input "a" not connected';
        } else if (!hasB) {
          errors[node.id] = 'Input "b" not connected';
        }
      }
    } else if (node.type === 'Display') {
      const hasInput = edges.some(e => e.target === node.id && (e.targetHandle === 'x' || !e.targetHandle));
      if (!hasInput) {
        errors[node.id] = 'Input "x" not connected';
      }
    }
  }

  const isValid = Object.keys(errors).length === 0;
  return { isValid, errors };
}
