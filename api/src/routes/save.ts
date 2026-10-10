import { Router, Request, Response } from 'express';
import { GraphStorage } from '../models/Graph';

export const saveRouter = Router();

saveRouter.post('/save', async (req: Request, res: Response) => {
  try {
    const { name, nodes, edges } = req.body;
    if (!nodes || !edges) {
      return res.status(400).json({ error: 'Missing nodes or edges in payload' });
    }

    const id = await GraphStorage.save({ name, nodes, edges });
    return res.json({ id, message: 'Graph successfully saved' });
  } catch (error: any) {
    console.error('Save router error:', error);
    return res.status(500).json({ error: error.message || 'Failed to save graph' });
  }
});
