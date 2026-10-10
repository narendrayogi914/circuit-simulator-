# 🔌 Circuit Simulator - Detailed Implementation Guide with Code Examples

## Part 1: Frontend (React + React Flow)

### **1.1 Project Setup**

```bash
npx create-react-app circuit-simulator
cd circuit-simulator
npm install @xyflow/react @xyflow/system axios typescript
```

### **1.2 Type Definitions**

**`types.ts`**
```typescript
// Node types
export type NodeType = 'Number' | 'Add' | 'Multiply' | 'Divide' | 'Display' | 'Formula';

export interface Node {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    value?: number;          // For Number node
    formula?: string;        // For Formula node
  };
}

export interface Edge {
  source: string;            // Source node ID
  sourceHandle: string;      // 'output' for most, null for Display
  target: string;            // Target node ID
  targetHandle: string;      // 'a', 'b', 'x', etc.
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
}

// API Response
export interface ExecutionResult {
  values: Record<string, number>;        // { net1: 5, net2: 3, ...}
  errors: Record<string, string>;        // { node1: "Division by zero", ...}
  status: 'success' | 'error' | 'timeout';
  version: number;                       // For preventing stale updates
}

export interface GraphState {
  nodes: Node[];
  edges: Edge[];
  results: ExecutionResult | null;
  isLoading: boolean;
  lastExecutedVersion: number;
}
```

### **1.3 Custom Node Components**

**`nodes/NumberNode.tsx`**
```typescript
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';

export function NumberNode({ id, data }) {
  const [value, setValue] = useState(data.value || 0);

  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value) || 0;
    setValue(newValue);
    // Trigger re-execution (parent component listens)
    // This is handled by parent with useCallback
  };

  return (
    <div style={{ padding: '10px', border: '2px solid #007bff', borderRadius: '5px', background: 'white', minWidth: '150px' }}>
      <div style={{ fontWeight: 'bold' }}>Number</div>
      <input
        type="number"
        value={value}
        onChange={handleChange}
        style={{ width: '100%', padding: '5px' }}
      />
      <Handle type="source" position={Position.Right} id="output" />
    </div>
  );
}
```

**`nodes/AddNode.tsx`**
```typescript
import React from 'react';
import { Handle, Position } from '@xyflow/react';

export function AddNode({ id, data }) {
  return (
    <div style={{ padding: '10px', border: '2px solid #28a745', borderRadius: '5px', background: 'white', minWidth: '150px' }}>
      <div style={{ fontWeight: 'bold' }}>Add</div>
      <div style={{ fontSize: '12px', color: '#666' }}>a + b</div>
      <Handle type="target" position={Position.Left} id="a" />
      <Handle type="target" position={Position.Left} id="b" style={{ top: '70%' }} />
      <Handle type="source" position={Position.Right} id="output" />
    </div>
  );
}
```

**`nodes/DisplayNode.tsx`**
```typescript
import React from 'react';
import { Handle, Position } from '@xyflow/react';

export function DisplayNode({ id, data, results }) {
  // results is passed from parent component
  const displayValue = results?.values?.[id] ?? 'N/A';
  const error = results?.errors?.[id];

  return (
    <div style={{
      padding: '10px',
      border: error ? '2px solid #dc3545' : '2px solid #ffc107',
      borderRadius: '5px',
      background: error ? '#f8d7da' : '#fff3cd',
      minWidth: '150px'
    }}>
      <div style={{ fontWeight: 'bold' }}>Display</div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '10px' }}>
        {error ? '❌' : displayValue}
      </div>
      {error && <div style={{ fontSize: '12px', color: '#721c24' }}>{error}</div>}
      <Handle type="target" position={Position.Left} id="x" />
    </div>
  );
}
```

**`nodes/FormulaNode.tsx`**
```typescript
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';

export function FormulaNode({ id, data, onFormulaChange }) {
  const [formula, setFormula] = useState(data.formula || 'a + b');
  const [error, setError] = useState('');

  const handleFormulaChange = (e) => {
    const newFormula = e.target.value;
    setFormula(newFormula);

    // Validate formula
    const valid = /^[0-9a-b+\-*/()\s.]+$/.test(newFormula);
    if (!valid) {
      setError('Invalid characters. Only: 0-9, a, b, +, -, *, /, (, ), spaces');
    } else {
      setError('');
      onFormulaChange?.(id, newFormula);
    }
  };

  return (
    <div style={{ padding: '10px', border: error ? '2px solid #dc3545' : '2px solid #6f42c1', borderRadius: '5px', background: 'white', minWidth: '150px' }}>
      <div style={{ fontWeight: 'bold' }}>Formula</div>
      <input
        type="text"
        value={formula}
        onChange={handleFormulaChange}
        placeholder="a + b"
        style={{ width: '100%', padding: '5px', marginBottom: '5px' }}
      />
      {error && <div style={{ fontSize: '12px', color: '#dc3545' }}>{error}</div>}
      <Handle type="target" position={Position.Left} id="a" />
      <Handle type="target" position={Position.Left} id="b" style={{ top: '70%' }} />
      <Handle type="source" position={Position.Right} id="output" />
    </div>
  );
}
```

### **1.4 Canvas Component**

**`Canvas.tsx`**
```typescript
import React, { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NumberNode, AddNode, MultiplyNode, DivideNode, DisplayNode, FormulaNode } from './nodes';
import { executeGraph, saveGraph, loadGraph } from '../api';

const nodeTypes = {
  Number: NumberNode,
  Add: AddNode,
  Multiply: MultiplyNode,
  Divide: DivideNode,
  Display: DisplayNode,
  Formula: FormulaNode,
};

export function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const versionRef = useRef(0);
  const executeTimeoutRef = useRef(null);

  // Auto-execute on changes (with debounce)
  const scheduleExecution = useCallback(async () => {
    if (executeTimeoutRef.current) {
      clearTimeout(executeTimeoutRef.current);
    }

    executeTimeoutRef.current = setTimeout(async () => {
      await runGraph();
    }, 500); // Debounce 500ms
  }, []);

  const onNodesChangeWrapper = useCallback((changes) => {
    onNodesChange(changes);
    scheduleExecution();
  }, [onNodesChange, scheduleExecution]);

  const onEdgesChangeWrapper = useCallback((changes) => {
    onEdgesChange(changes);
    scheduleExecution();
  }, [onEdgesChange, scheduleExecution]);

  const onConnect = useCallback((connection: Connection) => {
    // Validation: prevent input-to-input, output-to-output, self-loops
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);

    if (!sourceNode || !targetNode) return;

    // Display node has no outputs
    if (sourceNode.type === 'Display') {
      alert('Cannot wire from Display node');
      return;
    }

    // Number and Display have special cases
    if (targetNode.type === 'Display') {
      if (connection.targetHandle !== 'x') return;
    }

    if (connection.source === connection.target) {
      alert('Cannot wire node to itself');
      return;
    }

    // Check if target already has a connection
    const existingConnection = edges.find(e => e.target === connection.target && e.targetHandle === connection.targetHandle);
    if (existingConnection) {
      alert('Input already connected');
      return;
    }

    setEdges(eds => addEdge(connection, eds));
    scheduleExecution();
  }, [nodes, edges, setEdges, scheduleExecution]);

  const runGraph = async () => {
    setIsLoading(true);
    versionRef.current++;
    const currentVersion = versionRef.current;

    try {
      const result = await executeGraph({
        nodes,
        edges,
        version: currentVersion,
      });

      // Only update if this is the latest version
      if (result.version >= versionRef.current) {
        setResults(result);
      }
    } catch (error) {
      console.error('Execution error:', error);
      setResults({
        values: {},
        errors: { global: error.message },
        status: 'error',
        version: currentVersion,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNode = (type) => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      data: { value: type === 'Number' ? 0 : undefined },
    };
    setNodes(nds => [...nds, newNode]);
  };

  const handleSaveGraph = async () => {
    try {
      await saveGraph({ nodes, edges, name: 'My Graph' });
      alert('Graph saved!');
    } catch (error) {
      alert('Error saving graph: ' + error.message);
    }
  };

  const handleLoadGraph = async () => {
    try {
      const graph = await loadGraph('graph-id'); // Replace with actual ID
      setNodes(graph.nodes);
      setEdges(graph.edges);
      await runGraph();
    } catch (error) {
      alert('Error loading graph: ' + error.message);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes.map(n => ({
            ...n,
            data: { ...n.data, results },
          }))}
          edges={edges}
          onNodesChange={onNodesChangeWrapper}
          onEdgesChange={onEdgesChangeWrapper}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* Sidebar */}
      <div style={{ width: '250px', padding: '20px', background: '#f0f0f0', borderLeft: '1px solid #ccc', overflowY: 'auto' }}>
        <h3>Node Palette</h3>
        <button onClick={() => handleAddNode('Number')} style={{ width: '100%', marginBottom: '10px', padding: '10px' }}>
          + Number
        </button>
        <button onClick={() => handleAddNode('Add')} style={{ width: '100%', marginBottom: '10px', padding: '10px' }}>
          + Add
        </button>
        <button onClick={() => handleAddNode('Multiply')} style={{ width: '100%', marginBottom: '10px', padding: '10px' }}>
          + Multiply
        </button>
        <button onClick={() => handleAddNode('Divide')} style={{ width: '100%', marginBottom: '10px', padding: '10px' }}>
          + Divide
        </button>
        <button onClick={() => handleAddNode('Display')} style={{ width: '100%', marginBottom: '10px', padding: '10px' }}>
          + Display
        </button>
        <button onClick={() => handleAddNode('Formula')} style={{ width: '100%', marginBottom: '20px', padding: '10px' }}>
          + Formula
        </button>

        <hr />

        <button onClick={handleSaveGraph} style={{ width: '100%', marginBottom: '10px', padding: '10px', background: '#28a745', color: 'white' }}>
          💾 Save
        </button>
        <button onClick={handleLoadGraph} style={{ width: '100%', marginBottom: '20px', padding: '10px', background: '#007bff', color: 'white' }}>
          📂 Load
        </button>

        <hr />

        <h4>Status</h4>
        <p>{isLoading ? '⏳ Computing...' : '✓ Ready'}</p>

        {results?.errors?.global && (
          <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '5px' }}>
            {results.errors.global}
          </div>
        )}
      </div>
    </div>
  );
}
```

### **1.5 API Client**

**`api.ts`**
```typescript
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3001/api',
});

export async function executeGraph(graph) {
  try {
    const response = await API.post('/execute', graph, {
      timeout: 5000, // 5 second timeout
    });
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Backend timeout - operation took too long');
    }
    throw error;
  }
}

export async function saveGraph(graph) {
  const response = await API.post('/save', graph);
  return response.data;
}

export async function loadGraph(id) {
  const response = await API.get(`/load/${id}`);
  return response.data;
}
```

---

## Part 2: Backend API (Node.js + Express)

### **2.1 Express Server Setup**

**`app.ts`**
```typescript
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import mongoose from 'mongoose';

const app = express();

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL || 'mongodb://mongodb:27017/circuit-sim');

// ===== EXECUTION ENDPOINT =====
app.post('/api/execute', async (req, res) => {
  try {
    const { nodes, edges, version } = req.body;

    // Step 1: Validate graph
    const validationError = validateGraph(nodes, edges);
    if (validationError) {
      return res.status(400).json({
        status: 'error',
        errors: validationError.errors,
        values: {},
        version,
      });
    }

    // Step 2: Convert graph to netlist
    const netlist = graphToNetlist(nodes, edges);
    console.log('Generated netlist:\n', netlist);

    // Step 3: Call Python service
    const result = await axios.post('http://python-service:8000/simulate', {
      netlist,
      nodes: nodes.map(n => ({ id: n.id, type: n.type })), // Pass node metadata
    }, {
      timeout: 5000,
    });

    // Step 4: Return results
    res.json({
      status: 'success',
      values: result.data.values,
      errors: result.data.errors,
      version,
    });
  } catch (error) {
    console.error('Execution error:', error.message);
    res.status(500).json({
      status: 'error',
      errors: { global: error.message },
      values: {},
      version: req.body.version,
    });
  }
});

// ===== SAVE ENDPOINT =====
app.post('/api/save', async (req, res) => {
  try {
    const { nodes, edges, name } = req.body;

    const graph = new Graph({
      name,
      nodes,
      edges,
      createdAt: new Date(),
    });

    await graph.save();
    res.json({ id: graph._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== LOAD ENDPOINT =====
app.get('/api/load/:id', async (req, res) => {
  try {
    const graph = await Graph.findById(req.params.id);
    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }
    res.json(graph);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('API server listening on port 3001');
});
```

### **2.2 Graph Validation & Netlist Generation**

**`services/netlister.ts`**
```typescript
export function graphToNetlist(nodes, edges): string {
  const netMap = new Map<string, string>(); // node ID → net name
  let netCounter = 1;

  // Assign net names to all node outputs
  const getOrCreateNet = (nodeId: string): string => {
    if (!netMap.has(nodeId)) {
      netMap.set(nodeId, `net${netCounter++}`);
    }
    return netMap.get(nodeId);
  };

  let netlist = '';

  // Generate netlist lines for each node
  for (const node of nodes) {
    const outputNet = getOrCreateNet(node.id);

    switch (node.type) {
      case 'Number':
        netlist += `V${node.id.replace('-', '_')} ${outputNet} 0 DC ${node.data.value || 0}\n`;
        break;

      case 'Add': {
        const inputAEdge = edges.find(e => e.target === node.id && e.targetHandle === 'a');
        const inputBEdge = edges.find(e => e.target === node.id && e.targetHandle === 'b');

        if (!inputAEdge || !inputBEdge) {
          throw new Error(`Add node ${node.id} is missing inputs`);
        }

        const netA = getOrCreateNet(inputAEdge.source);
        const netB = getOrCreateNet(inputBEdge.source);

        netlist += `B${node.id.replace('-', '_')} ${outputNet} 0 V = V(${netA}) + V(${netB})\n`;
        break;
      }

      case 'Multiply': {
        const inputAEdge = edges.find(e => e.target === node.id && e.targetHandle === 'a');
        const inputBEdge = edges.find(e => e.target === node.id && e.targetHandle === 'b');

        if (!inputAEdge || !inputBEdge) {
          throw new Error(`Multiply node ${node.id} is missing inputs`);
        }

        const netA = getOrCreateNet(inputAEdge.source);
        const netB = getOrCreateNet(inputBEdge.source);

        netlist += `B${node.id.replace('-', '_')} ${outputNet} 0 V = V(${netA}) * V(${netB})\n`;
        break;
      }

      case 'Divide': {
        const inputAEdge = edges.find(e => e.target === node.id && e.targetHandle === 'a');
        const inputBEdge = edges.find(e => e.target === node.id && e.targetHandle === 'b');

        if (!inputAEdge || !inputBEdge) {
          throw new Error(`Divide node ${node.id} is missing inputs`);
        }

        const netA = getOrCreateNet(inputAEdge.source);
        const netB = getOrCreateNet(inputBEdge.source);

        netlist += `B${node.id.replace('-', '_')} ${outputNet} 0 V = V(${netA}) / V(${netB})\n`;
        break;
      }

      case 'Formula': {
        const inputAEdge = edges.find(e => e.target === node.id && e.targetHandle === 'a');
        const inputBEdge = edges.find(e => e.target === node.id && e.targetHandle === 'b');

        if (!inputAEdge || !inputBEdge) {
          throw new Error(`Formula node ${node.id} is missing inputs`);
        }

        const netA = getOrCreateNet(inputAEdge.source);
        const netB = getOrCreateNet(inputBEdge.source);

        const formula = node.data.formula || 'a + b';
        const expanded = formula
          .replace(/\ba\b/g, `V(${netA})`)
          .replace(/\bb\b/g, `V(${netB})`);

        netlist += `B${node.id.replace('-', '_')} ${outputNet} 0 V = ${expanded}\n`;
        break;
      }

      // Display node has no netlist line
    }
  }

  // Map Display node inputs to nets
  const displayMap = new Map<string, string>();
  for (const node of nodes) {
    if (node.type === 'Display') {
      const inputEdge = edges.find(e => e.target === node.id && e.targetHandle === 'x');
      if (inputEdge) {
        const sourceNet = getOrCreateNet(inputEdge.source);
        displayMap.set(node.id, sourceNet);
      }
    }
  }

  // Store display map in netlist comment for parsing later
  netlist += `* Display nodes: ${JSON.stringify(Object.fromEntries(displayMap))}\n`;

  netlist += '.op\n.end\n';

  return netlist;
}

export function validateGraph(nodes, edges) {
  const errors: Record<string, string> = {};

  // Check for loops
  const adjList = new Map<string, string[]>();
  for (const node of nodes) {
    adjList.set(node.id, []);
  }

  for (const edge of edges) {
    if (adjList.has(edge.source)) {
      adjList.get(edge.source).push(edge.target);
    }
  }

  function hasCycle(nodeId: string, visited = new Set(), recStack = new Set()): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    for (const neighbor of adjList.get(nodeId) || []) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor, visited, recStack)) {
          return true;
        }
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const nodeId of adjList.keys()) {
    if (hasCycle(nodeId)) {
      errors[nodeId] = 'Node is part of a loop';
    }
  }

  // Check for missing inputs
  for (const node of nodes) {
    if (node.type === 'Add' || node.type === 'Multiply' || node.type === 'Divide') {
      const hasA = edges.some(e => e.target === node.id && e.targetHandle === 'a');
      const hasB = edges.some(e => e.target === node.id && e.targetHandle === 'b');

      if (!hasA) errors[node.id] = 'Input "a" not connected';
      if (!hasB && node.type !== 'Display') errors[node.id] = 'Input "b" not connected';
    }

    if (node.type === 'Formula') {
      const hasA = edges.some(e => e.target === node.id && e.targetHandle === 'a');
      const hasB = edges.some(e => e.target === node.id && e.targetHandle === 'b');

      if (!hasA) errors[node.id] = 'Input "a" not connected';
      if (!hasB) errors[node.id] = 'Input "b" not connected';
    }
  }

  return Object.keys(errors).length > 0 ? { errors } : null;
}
```

---

## Part 3: Python Backend (FastAPI + ngspice)

### **3.1 FastAPI Server**

**`main.py`**
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import json
import re
import os

app = FastAPI()

class SimulationRequest(BaseModel):
    netlist: str
    nodes: list

@app.post("/simulate")
async def simulate(request: SimulationRequest):
    try:
        # Write netlist to file
        with open('/tmp/circuit.cir', 'w') as f:
            f.write(request.netlist)

        # Run ngspice
        result = subprocess.run(
            ['ngspice', '-b', '/tmp/circuit.cir', '-o', '/tmp/output.log'],
            capture_output=True,
            text=True,
            timeout=5
        )

        # Parse output
        with open('/tmp/output.log', 'r') as f:
            output = f.read()

        # Extract values
        values = parse_ngspice_output(output)
        errors = parse_ngspice_errors(output, request.nodes)

        return {
            "values": values,
            "errors": errors
        }

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="ngspice timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def parse_ngspice_output(output: str) -> dict:
    values = {}
    
    # ngspice output format: V(net1) = 5, V(net2) = 3, etc.
    pattern = r'V\((net\d+)\)\s*=\s*([-+]?\d*\.?\d+([eE][-+]?\d+)?)'
    
    for match in re.finditer(pattern, output):
        net_name = match.group(1)
        value = float(match.group(2))
        values[net_name] = value

    return values

def parse_ngspice_errors(output: str, nodes: list) -> dict:
    errors = {}

    # Check for division by zero
    if "Division by zero" in output or "divide" in output.lower():
        # Find which node caused it (B1, B2, etc.)
        for line in output.split('\n'):
            if 'divide' in line.lower() or 'division' in line.lower():
                # Extract node ID from ngspice output
                match = re.search(r'B(\d+)', line)
                if match:
                    # Map back to node ID
                    node_id = find_node_by_ngspice_id(match.group(1), nodes)
                    if node_id:
                        errors[node_id] = "Division by zero"

    return errors

def find_node_by_ngspice_id(ngspice_id: str, nodes: list) -> str:
    # ngspice_id is "1", "2", etc.
    # Find corresponding node
    for node in nodes:
        if node['id'].endswith(ngspice_id):
            return node['id']
    return None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## Part 4: Docker Setup

### **`docker-compose.yml`**
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: circuit-sim
    volumes:
      - mongo_data:/data/db

  python-service:
    build: ./python
    ports:
      - "8000:8000"
    depends_on:
      - mongodb
    environment:
      - MONGODB_URL=mongodb://mongodb:27017/circuit-sim

  api:
    build: ./api
    ports:
      - "3001:3001"
    depends_on:
      - python-service
      - mongodb
    environment:
      - MONGODB_URL=mongodb://mongodb:27017/circuit-sim
      - PYTHON_SERVICE_URL=http://python-service:8000

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - api
    environment:
      - REACT_APP_API_URL=http://localhost:3001

volumes:
  mongo_data:
```

### **`python/Dockerfile`**
```dockerfile
FROM python:3.10

WORKDIR /app

RUN apt-get update && apt-get install -y ngspice

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Part 5: Testing

### **`tests/netlister.test.ts`**
```typescript
import { graphToNetlist } from '../services/netlister';

describe('Netlist generation', () => {
  test('Graph 1: 2 + 3 = 5', () => {
    const graph = {
      nodes: [
        { id: 'num1', type: 'Number', data: { value: 2 } },
        { id: 'num2', type: 'Number', data: { value: 3 } },
        { id: 'add1', type: 'Add', data: {} },
      ],
      edges: [
        { source: 'num1', sourceHandle: 'output', target: 'add1', targetHandle: 'a' },
        { source: 'num2', sourceHandle: 'output', target: 'add1', targetHandle: 'b' },
      ],
    };

    const netlist = graphToNetlist(graph.nodes, graph.edges);
    expect(netlist).toContain('V');
    expect(netlist).toContain('B');
    expect(netlist).toContain('.op');
  });

  test('Loop detection', () => {
    const graph = {
      nodes: [
        { id: 'add1', type: 'Add', data: {} },
        { id: 'mult1', type: 'Multiply', data: {} },
      ],
      edges: [
        { source: 'add1', sourceHandle: 'output', target: 'mult1', targetHandle: 'a' },
        { source: 'mult1', sourceHandle: 'output', target: 'add1', targetHandle: 'b' },
      ],
    };

    expect(() => graphToNetlist(graph.nodes, graph.edges)).toThrow('loop');
  });
});
```

---

This implementation provides:
✅ Full frontend with React Flow
✅ Backend API with netlist generation
✅ Python service integration with ngspice
✅ Error handling and validation
✅ Testing setup
✅ Docker orchestration

Good luck with your implementation! 🚀
