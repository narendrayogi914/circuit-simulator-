import { Router, Request, Response } from 'express';
import { GraphStorage } from '../models/Graph';

export const loadRouter = Router();

loadRouter.get('/load/:id', async (req: Request, res: Response) => {
  try {
    const graph = await GraphStorage.getById(req.params.id);
    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }
    return res.json(graph);
  } catch (error: any) {
    console.error('Load router error:', error);
    return res.status(500).json({ error: error.message || 'Failed to load graph' });
  }
});

loadRouter.get('/list', async (_req: Request, res: Response) => {
  try {
    const graphs = await GraphStorage.listAll();
    return res.json(graphs);
  } catch (error: any) {
    console.error('List router error:', error);
    return res.status(500).json({ error: error.message || 'Failed to list graphs' });
  }
});
