import { Router, Request, Response } from 'express';
import { validateGraph } from '../services/validator';
import { graphToNetlist } from '../services/netlister';
import { executeWithPythonService } from '../services/pythonClient';
import { Node, Edge } from '../types';

export const executeRouter = Router();

executeRouter.post('/execute', async (req: Request, res: Response) => {
  const version = typeof req.body.version === 'number' ? req.body.version : 1;
  const nodes: Node[] = req.body.nodes || [];
  const edges: Edge[] = req.body.edges || [];

  // Step 1: Pre-simulation validation (cycle detection, missing inputs, unsafe formulas)
  const validation = validateGraph(nodes, edges);
  if (!validation.isValid) {
    return res.status(400).json({
      status: 'error',
      errors: validation.errors,
      values: {},
      version,
    });
  }

  try {
    // Step 2: Convert graph to ngspice SPICE deck
    const netlistResult = graphToNetlist(nodes, edges);

    // Step 3: Execute simulation (Python FastAPI ngspice or resilient fallback)
    const result = await executeWithPythonService(netlistResult, nodes, edges, version);

    // Step 4: Return result
    return res.json(result);
  } catch (error: any) {
    console.error('Execution router error:', error);
    return res.status(500).json({
      status: 'error',
      errors: { global: error.message || 'Server execution error' },
      values: {},
      version,
    });
  }
});
