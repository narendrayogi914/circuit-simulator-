# 🔌 Circuit Simulator - Quick Reference & Common Pitfalls

## ⚡ Quick Reference

### **5 Node Types at a Glance**

| Node | Inputs | Output | Ngspice | Example |
|------|--------|--------|---------|---------|
| **Number** | None (user enters) | 1 | `V1 net1 0 DC 5` | User types 5 |
| **Add** | a, b | 1 | `B1 net3 0 V = V(net1) + V(net2)` | 2 + 3 = 5 |
| **Multiply** | a, b | 1 | `B2 net3 0 V = V(net1) * V(net2)` | 3 × 4 = 12 |
| **Divide** | a, b | 1 | `B3 net3 0 V = V(net1) / V(net2)` | 10 ÷ 2 = 5 |
| **Display** | x | None | (no line) | Shows value |
| **Formula** (Step 5) | a, b | 1 | `B4 net3 0 V = a*2+b` | a × 2 + b |

### **Wiring Rules**

```
✅ ALLOWED:
- Output → Input
- One output to many inputs
- Same input wired twice (e.g., Number(7) to both inputs of Multiply)

❌ BLOCKED:
- Input → Input
- Output → Output
- Node → itself
- Input already has a wire (each input accepts max 1)
```

### **Data Flow Pipeline**

```
Frontend Graph (JSON)
    ↓
Node.js API /api/execute
    ↓
Convert to Netlist (your code!)
    ↓
POST to Python /simulate
    ↓
Write netlist to file
    ↓
Run: ngspice -b circuit.cir
    ↓
Parse output (V(net1) = 5, etc.)
    ↓
Return values + errors to frontend
    ↓
Frontend displays results
```

---

## 🚀 Step-by-Step Implementation Checklist

### **Step 1: Frontend Setup (2 hours)**
- [ ] `npx create-react-app` + install @xyflow/react
- [ ] Create NumberNode, AddNode, MultiplyNode, DivideNode, DisplayNode components
- [ ] Set up Canvas.tsx with React Flow
- [ ] Drag nodes onto canvas
- [ ] Button to add each node type
- [ ] Display nodes on canvas with positions

### **Step 2: Wiring (1.5 hours)**
- [ ] Implement `onConnect` callback
- [ ] Block input-to-input connections
- [ ] Block self-loops
- [ ] Block output-to-output
- [ ] Show error when input already connected
- [ ] Visual wires between nodes

### **Step 3: Save & Load (1 hour)**
- [ ] Create Graph schema in MongoDB
- [ ] POST /api/save endpoint
- [ ] GET /api/load endpoint
- [ ] Save button in frontend
- [ ] Load button in frontend
- [ ] Verify positions and edges load correctly

### **Step 4: Basic Execution (2 hours)**
- [ ] Create netlister.ts (graph → netlist)
- [ ] Create Python FastAPI server
- [ ] POST /api/execute endpoint in Node.js
- [ ] Call Python from Node.js
- [ ] Parse ngspice output
- [ ] Display values on canvas
- [ ] Test all 3 basic graphs (1, 2, 7)

### **Step 5: Live Sync (2 hours)**
- [ ] Remove Run button, auto-execute on changes
- [ ] Debounce rapid edits (500ms)
- [ ] Version numbering to prevent stale results
- [ ] Add Formula node type
- [ ] Formula validation (whitelist approach)
- [ ] Loop detection algorithm
- [ ] Error propagation (show errors on right nodes)
- [ ] Timeout + recovery
- [ ] Test all 8 graphs

---

## 🐛 Common Pitfalls & Solutions

### **Pitfall 1: Stale Results from Out-of-Order Responses**

**Problem:**
```
User types: 1 → 10 → 100
Requests sent: req1, req2, req3
Responses: res3 arrives, res1 arrives, res2 arrives

Frontend shows: 100 → 1 → 10 (WRONG!)
```

**Solution:**
```typescript
// Add version to every request and response
request: { nodes, edges, version: 1 }
response: { values, errors, version: 1 }

// Only update if newer
if (response.version >= currentVersion) {
  setResults(response);
}
```

**Why it works:** Old responses are ignored, only newest matters.

---

### **Pitfall 2: Forgetting to Validate Before Netlist**

**Problem:**
```
Graph has a loop: A → B → A
You send to ngspice anyway
Ngspice hangs or returns weird errors
```

**Solution:**
```typescript
// ALWAYS validate first
const error = validateGraph(nodes, edges);
if (error) {
  return {status: 'error', errors: error.errors};
}

// THEN convert to netlist
const netlist = graphToNetlist(nodes, edges);
```

**Validation checks:**
- ✅ Loop detection (DFS)
- ✅ Missing inputs (Add with only 1 input)
- ✅ Display node can't have outputs

---

### **Pitfall 3: Ngspice Output Parsing**

**Problem:**
```
Ngspice output format varies:
"V(net1) = 5"
"V(net1)=5"
"V(net1)= 5"

Your regex only matches one format
```

**Solution:**
```python
# Flexible regex
pattern = r'V\(([\w]+)\)\s*=\s*([-+]?\d*\.?\d+([eE][-+]?\d+)?)'

# Split by newlines, iterate through all
for line in output.split('\n'):
    match = re.search(pattern, line)
    if match:
        net_name = match.group(1)
        value = float(match.group(2))
```

---

### **Pitfall 4: Division by Zero Not Caught**

**Problem:**
```
Divide node: 10 / 0
Ngspice returns error
But you don't extract it properly
Frontend shows generic "error" instead of error on Divide node
```

**Solution:**
```typescript
// Parse ngspice errors and map to nodes
function parseNgspiceErrors(output: string, nodes: any[]): Record<string, string> {
  const errors = {};
  
  if (output.includes("Divide by zero") || output.includes("divide")) {
    // Find which B node caused it (B1, B2, etc.)
    const match = output.match(/around line (\d+)|B(\d+)/);
    if (match) {
      const nodeId = findNodeByNgspiceId(match[2], nodes);
      errors[nodeId] = "Division by zero";
    }
  }
  
  return errors;
}
```

---

### **Pitfall 5: Formula Injection Attack**

**Problem:**
```
User inputs: "a + b\n.control\nshell ls"

Netlist becomes:
B1 out 0 V = a + b
.control
shell ls
.end

Ngspice EXECUTES THE SHELL COMMAND!
```

**Solution:**
```typescript
// Whitelist-based validation
function validateFormula(formula: string): boolean {
  // Only allow: 0-9, a, b, +, -, *, /, (, ), spaces, decimal
  const allowed = /^[0-9a-b+\-*/()\s.]+$/;
  return allowed.test(formula);
}

// In Formula node component
if (!validateFormula(formula)) {
  setError("Invalid characters. Only: 0-9, a, b, +, -, *, /, (, )");
  return;
}
```

---

### **Pitfall 6: Ngspice Timeout = Frozen UI**

**Problem:**
```
Ngspice hangs for 10 seconds
Frontend waits forever
User can't interact
App appears dead
```

**Solution:**
```typescript
// Timeout on every request
const result = await axios.post('/api/execute', graph, {
  timeout: 5000, // 5 seconds
});

// Handle timeout gracefully
try {
  const result = await API.post('/execute', graph);
  setResults(result);
} catch (error) {
  if (error.code === 'ECONNABORTED') {
    setResults({
      status: 'timeout',
      errors: { global: 'Backend took too long. Retrying...' },
      values: {},
    });
    // Retry with exponential backoff
    scheduleRetry();
  }
}
```

---

### **Pitfall 7: Node ID Mapping Gets Confused**

**Problem:**
```
Frontend node ID: "Add-1634567890"
Ngspice ID: "B1"
Parsing output: "B1 has divide by zero"
How to map B1 back to "Add-1634567890"?

You hardcode B1, B2, B3, etc.
But if user adds nodes in different order, IDs shift!
```

**Solution:**
```typescript
// Create deterministic mapping
const nodeMap = new Map<string, string>(); // node.id → ngspice ID

let bCount = 1;
let vCount = 1;

for (const node of nodes) {
  if (node.type === 'Number') {
    nodeMap.set(node.id, `V${vCount}`);
    vCount++;
  } else if (['Add', 'Multiply', 'Divide', 'Formula'].includes(node.type)) {
    nodeMap.set(node.id, `B${bCount}`);
    bCount++;
  }
}

// When parsing errors, use the map
const ngspiceId = 'B1';
const nodeId = Array.from(nodeMap.entries()).find(([_, v]) => v === ngspiceId)?.[0];
```

**Better solution:** Pass node IDs to Python and get them back:
```
Request: { netlist, nodeMap: {'node1': 'B1', 'node2': 'B2'} }
Response: { values, errors, nodeMap } // Errors use node IDs, not ngspice IDs
```

---

### **Pitfall 8: Display Node Gets Wrong Value**

**Problem:**
```
Graph: Number(5) → Display

Netlist:
V1 net1 0 DC 5
* Display nodes: {"display1":"net1"}
.op
.end

Ngspice output:
V(net1) = 5

But you forget to parse Display mapping
Display shows "N/A" instead of 5
```

**Solution:**
```typescript
// Parse the comment line to know which Display reads which net
const displayLineRegex = /\* Display nodes: (.*)/;
const match = netlastOutput.match(displayLineRegex);
if (match) {
  const displayMap = JSON.parse(match[1]); // {"display1": "net1"}
  
  for (const [displayId, netName] of Object.entries(displayMap)) {
    values[displayId] = values[netName];
  }
}
```

---

### **Pitfall 9: Forgot to Add `.op` and `.end`**

**Problem:**
```
Netlist you generate:
V1 net1 0 DC 5
B1 net2 0 V = V(net1) * 2

(missing .op and .end)

Ngspice won't run it!
```

**Solution:**
```typescript
// ALWAYS add these at the end
netlist += '.op\n.end\n';
```

`.op` = operating point analysis (DC)
`.end` = end of netlist

---

### **Pitfall 10: Docker Compose Networking**

**Problem:**
```
Node.js calls Python at "localhost:8000"
Inside Docker, localhost is the container itself, not the Python service!
Connection refused error
```

**Solution:**
```typescript
// Use service name from docker-compose.yml
const pythonURL = process.env.PYTHON_SERVICE_URL || 'http://python-service:8000';

axios.post(pythonURL + '/simulate', { netlist });
```

In docker-compose.yml:
```yaml
services:
  api:
    environment:
      - PYTHON_SERVICE_URL=http://python-service:8000  # Use service name!
```

---

## 💡 Pro Tips

### **Tip 1: Use UUID for Node IDs**
```typescript
import { v4 as uuid } from 'uuid';

const nodeId = uuid(); // "a1b2c3d4-e5f6-7g8h-9i0j..."
```
Better than timestamps because collision-proof.

### **Tip 2: Test Netlist Generation in Isolation**
```typescript
// Don't need running backend to test netlist generation
test('Add node generates correct netlist', () => {
  const graph = { nodes: [...], edges: [...] };
  const netlist = graphToNetlist(graph.nodes, graph.edges);
  expect(netlist).toContain('B');
});
```

### **Tip 3: Log Everything in Python**
```python
print("Input netlist:", netlist)
print("Running ngspice...")
print("Output:", output)
```
When debugging, print every step. This saves hours!

### **Tip 4: Use Ngspice Batch Mode**
```bash
ngspice -b circuit.cir -o output.log
# -b = batch mode (no GUI)
# -o = output file

# Don't use interactive mode in backend!
```

### **Tip 5: Handle Empty Results Gracefully**
```typescript
// User might delete all nodes
// Or disconnect all wires

if (nodes.length === 0) {
  return { values: {}, errors: {}, status: 'ok' };
}
```

### **Tip 6: Show Loading State**
```typescript
{isLoading && <div>⏳ Computing...</div>}
{!isLoading && results && <div>✓ Ready</div>}
```
Users need feedback that something is happening.

---

## 📋 Pre-Submission Checklist

### **Functional Requirements**
- [ ] `docker compose up --build` starts everything
- [ ] Frontend loads without errors
- [ ] Can drag nodes onto canvas
- [ ] Can wire nodes (with validation)
- [ ] Can save and load graphs
- [ ] Graph 1: 2 + 3 = 5 ✓
- [ ] Graph 2: (2 + 3) × 4 = 20 ✓
- [ ] Graph 3: 7 × 7 = 49 ✓
- [ ] Graph 4: Divide by zero error on right node ✓
- [ ] Graph 5: Missing input highlighted ✓
- [ ] Graph 6: Loop detected ✓
- [ ] Graph 7: Formula a × 2 + b = 10 ✓
- [ ] Graph 8: Formula injection rejected ✓

### **Step 5 Requirements**
- [ ] Auto-execute on changes (no Run button)
- [ ] Fast edits don't show stale results
- [ ] Errors on correct nodes
- [ ] Backend timeout doesn't freeze UI
- [ ] Formula validation prevents injection

### **Code Quality**
- [ ] Tests for netlist generation
- [ ] Tests for loop detection
- [ ] Tests for formula validation
- [ ] Clean folder structure
- [ ] Meaningful variable names
- [ ] Comments on complex logic

### **Documentation**
- [ ] README.md (max 2 pages)
- [ ] How to run
- [ ] Architecture diagram
- [ ] Netlist generation explanation
- [ ] Step 5 solutions (2-4 lines each)
- [ ] Known edge case that breaks

### **Version Control**
- [ ] Commits as you go (not one final commit)
- [ ] Meaningful commit messages
- [ ] No secrets (API keys, passwords, connection strings)
- [ ] .gitignore excludes node_modules, .env, etc.

### **Docker**
- [ ] docker-compose.yml is clean
- [ ] All services have Dockerfiles
- [ ] No hardcoded paths or IPs
- [ ] Uses environment variables for config

---

## 🎯 Time Management

**Total: 6-8 hours**

- **0-1.5h:** Frontend setup (nodes, palette, canvas)
- **1.5-3h:** Backend & netlist generation
- **3-4.5h:** Python service + basic execution
- **4.5-6.5h:** Step 5 (auto-sync, errors, timeout, formulas)
- **6.5-8h:** Testing, Docker, README, polish

If you're running behind, prioritize:
1. ✅ Make Steps 1-4 work
2. ✅ Make Step 5 work (even if basic)
3. ❓ Tests (if time permits)

---

## 🚨 Red Flags = You're on the wrong track

🚩 Docker doesn't start
🚩 Can't execute a simple graph
🚩 Results are different than expected (e.g., 2 + 3 = 7)
🚩 Fast edits show stale results
🚩 Errors don't appear on the right node
🚩 Backend crash freezes the UI
🚩 Formula injection isn't prevented

If you hit any of these, **stop and debug immediately**. Don't move forward.

---

## 📞 When to Ask for Help

**Totally fine to ask:**
- ngspice documentation questions
- React Flow API questions
- Docker networking issues
- MongoDB connection questions

**Don't ask (you're supposed to figure out):**
- "How do I convert graph to netlist?"
- "How do I prevent stale results?"
- "Should I use websockets or HTTP?"

These are the core of the task. Figure them out!

---

Good luck! You've got this. 🚀
