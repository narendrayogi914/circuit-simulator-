import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { executeRouter } from './routes/execute';
import { saveRouter } from './routes/save';
import { loadRouter } from './routes/load';

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/circuit-sim';

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'circuit-simulator-api',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected (using memory store)',
  });
});

// Mount Routes
app.use('/api', executeRouter);
app.use('/api', saveRouter);
app.use('/api', loadRouter);

// Attempt MongoDB connection asynchronously
mongoose
  .connect(MONGODB_URL, { serverSelectionTimeoutMS: 2000 })
  .then(() => {
    console.log(`[Database] Connected to MongoDB at ${MONGODB_URL}`);
  })
  .catch((err) => {
    console.warn(`[Database Notice] MongoDB not available (${err.message}). Using in-memory fallback store.`);
  });

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[API Server] Running on http://localhost:${PORT}`);
  });
}

export default app;
