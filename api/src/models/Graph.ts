import mongoose, { Schema, Document } from 'mongoose';
import { Graph as GraphType } from '../types';

export interface IGraphDocument extends Document, Omit<GraphType, 'id' | '_id'> {}

const GraphSchema: Schema = new Schema(
  {
    name: { type: String, default: 'Untitled Circuit' },
    nodes: { type: Array, required: true },
    edges: { type: Array, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const MongoGraphModel = mongoose.model<IGraphDocument>('Graph', GraphSchema);

// In-Memory Fallback Storage for offline/non-docker local development
const memoryStorage = new Map<string, any>();

export const GraphStorage = {
  async save(graphData: { name?: string; nodes: any[]; edges: any[] }): Promise<string> {
    if (mongoose.connection.readyState === 1) {
      const doc = new MongoGraphModel(graphData);
      const saved = await doc.save();
      return saved._id.toString();
    } else {
      const id = 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      memoryStorage.set(id, {
        _id: id,
        id,
        name: graphData.name || 'Untitled Circuit',
        nodes: graphData.nodes,
        edges: graphData.edges,
        createdAt: new Date(),
      });
      return id;
    }
  },

  async getById(id: string): Promise<any | null> {
    if (mongoose.connection.readyState === 1) {
      try {
        const doc = await MongoGraphModel.findById(id);
        if (doc) return doc;
      } catch (err) {
        // Fallback to memory
      }
    }
    return memoryStorage.get(id) || null;
  },

  async listAll(): Promise<any[]> {
    if (mongoose.connection.readyState === 1) {
      try {
        return await MongoGraphModel.find().sort({ createdAt: -1 }).limit(20);
      } catch (err) {
        // Fallback to memory
      }
    }
    return Array.from(memoryStorage.values()).reverse();
  },
};
