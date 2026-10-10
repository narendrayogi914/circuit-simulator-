# 🔌 Live Circuit Simulator - Complete Explanation & Implementation Guide

## 📋 **Overview**

You need to build a **browser-based node graph editor** where:
- Users drag nodes (Add, Multiply, Divide, etc.) onto a canvas
- Users connect outputs to inputs with wires
- A Python backend runs **ngspice** to calculate the graph
- Results update on the canvas in real-time

**Not a real circuit simulator** - it's a node graph that maps to ngspice netlists.

---

## 🏗️ **Tech Stack (MANDATORY)**

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | React + React Flow (@xyflow/react) | Node editor UI |
| **API** | Node.js + Express | REST API between frontend & backend |
| **Simulation** | Python + FastAPI | Build netlist, run ngspice |
| **Database** | MongoDB | Save/load graphs |
| **Container** | Docker Compose | Orchestrate everything |

**You choose:** UI libraries, form validation, error handling, testing frameworks, etc.

---

## 📖 **Understanding Nodes & Functions**

### **The 5 Node Types (Steps 1-4)**

#### **1. Number Node**
- **Inputs:** None (user types a value)
- **Outputs:** 1 output port
- **Function:** Outputs whatever number user enters
- **ngspice:** `V1 out 0 DC 5` (if user enters 5)
  - Creates a voltage source with value 5

#### **2. Add Node**
- **Inputs:** `a` (left), `b` (right)
- **Outputs:** 1 output port
- **Function:** `a + b`
- **ngspice:** `B1 out 0 V = V(a) + V(b)`
  - B = Behavioral source (like a function)
  - Reads values from nets `a` and `b`, outputs their sum

#### **3. Multiply Node**
- **Inputs:** `a`, `b`
- **Outputs:** 1 output port
- **Function:** `a × b`
- **ngspice:** `B2 out 0 V = V(a) * V(b)`

#### **4. Divide Node**
- **Inputs:** `a`, `b`
- **Outputs:** 1 output port
- **Function:** `a ÷ b`
- **ngspice:** `B3 out 0 V = V(a) / V(b)`
- **Error case:** Dividing by 0 → error on this node

#### **5. Display Node** (NEW in Step 5: Formula)
- **Inputs:** `x` (displays what it receives)
- **Outputs:** None
- **Function:** Shows value on canvas
- **ngspice:** No line in netlist (just reads the input value)

---

## 🔌 **How Wires Work**

**Wire = connects output to input on the same "net"**

### **Example Graph 1:**
```
Number(5) --wire--> Add
Number(3) --wire--> Add --wire--> Display

Expected result: Display shows 5 + 3 = 8
```

### **Netlist for Graph 1:**
```
V1 net1 0 DC 5          # Number node outputs 5 on net1
V2 net2 0 DC 3          # Number node outputs 3 on net2
B1 net3 0 V = V(net1) + V(net2)  # Add node: net3 = net1 + net2
.op
.end
```

**Then ngspice runs and returns:**
```
net1 = 5
net2 = 3
net3 = 8
```

**Display node reads net3 and shows 8**

---

## 📝 **Steps 1-4: Build the Basic Editor**

### **Step 1: Nodes on Canvas**
- React Flow canvas with node palette
- 5 draggable node types
- Each node has input/output handles (ports)
- Users can drag nodes around

```
[Number] ← drag onto canvas
[Add]    ← creates node with 2 input handles, 1 output handle
[Multiply]
[Divide]
[Display]
```

### **Step 2: Wire Them**
- Click output handle on one node
- Drag to input handle on another node
- Wire appears connecting them

**Rules:**
- ✅ Output → Input (allowed)
- ❌ Input → Input (blocked)
- ❌ Output → Output (blocked)
- ❌ Node → itself (blocked)
- ⚠️ Each input accepts only 1 wire (but output can go to many inputs)

### **Step 3: Save & Load**
Send graph to API as JSON:
```json
{
  "nodes": [
    {
      "id": "node1",
      "type": "Number",
      "position": { "x": 100, "y": 200 },
      "data": { "value": 5 }
    },
    {
      "id": "node2",
      "type": "Add",
      "position": { "x": 300, "y": 200 },
      "data": {}
    }
  ],
  "edges": [
    {
      "source": "node1",
      "sourceHandle": "output",
      "target": "node2",
      "targetHandle": "a"
    }
  ]
}
```

API saves to MongoDB, loads back identically (positions, values, wires).

### **Step 4: Run Once**
1. User clicks **Run** button
2. Frontend sends graph to Python backend
3. Backend builds netlist (see below)
4. Runs ngspice
5. Returns results
6. Frontend shows values on canvas

---

## 🔧 **The Critical Part: Graph → Netlist Conversion**

This is **your job** - convert the graph into ngspice netlist format.

### **Algorithm:**

```
1. For each node in the graph:
   - If Number: V<id> <output_net> 0 DC <value>
   - If Add: B<id> <output_net> 0 V = V(<input_a_net>) + V(<input_b_net>)
   - If Multiply: B<id> <output_net> 0 V = V(<input_a_net>) * V(<input_b_net>)
   - If Divide: B<id> <output_net> 0 V = V(<input_a_net>) / V(<input_b_net>)
   - If Display: (no netlist line, just read the input net)

2. Build the graph:
   - For each wire (edge):
     - Output net and input net must be the same
     - This connects them

3. Add .op and .end
4. Write to file, run ngspice
5. Parse output, extract values
```

### **Example: Graph 1 Converted to Netlist**

```
Graph:
[Number 5] → out: net1
[Number 3] → out: net2
[Add] → in_a: net1, in_b: net2, out: net3
[Display] → in: net3

Netlist:
V1 net1 0 DC 5
V2 net2 0 DC 3
B1 net3 0 V = V(net1) + V(net2)
.op
.end

Ngspice output:
V(net1) = 5
V(net2) = 3
V(net3) = 8

Display node reads net3 → shows 8 ✓
```

---

## 🚀 **Step 5: The Hard Part - Live Sync**

Remove the Run button. **Every change triggers automatic re-execution.**

### **Changes that trigger re-run:**
- ✏️ User edits Number value
- ➕ User adds node
- ➖ User deletes node
- 🔗 User adds/removes wire
- ✏️ User edits Formula expression

### **Challenge 1: Fast Edits (No Stale Results)**

**Problem:**
```
User types: 1 → 10 → 100 (3 rapid requests)
Request 1 sent: graph with value=1
Request 2 sent: graph with value=10
Request 3 sent: graph with value=100

Responses arrive:
Response 3 arrives first: display shows 100 ✓
Response 1 arrives: display updates to 1 ✗ (STALE!)
Response 2 arrives: display updates to 10 ✗ (STALE!)
```

**Solution: Request versioning**
```
Each request gets a version number:
Request 1: version=1, graph with value=1
Request 2: version=2, graph with value=10
Request 3: version=3, graph with value=100

Response includes version number:
Response 1: version=1, result with value=1
Response 2: version=2, result with value=10
Response 3: version=3, result with value=100

Frontend only updates if response.version >= currentVersion:
Response 3 (v3) arrives: v3 >= 3 ✓ update
Response 1 (v1) arrives: v1 < 3 ✗ ignore
Response 2 (v2) arrives: v2 < 3 ✗ ignore

Final display: 100 ✓
```

### **Challenge 2: Errors on the Right Node**

**Problem:**
```
Graph:
[Number 10] → [Divide] ← [Number 0]
                  ↓
              [Display]

When user types 0:
- Divide by 0 error
- Currently shows generic "error" on entire canvas
- User doesn't know which node is broken
```

**Solution: Error propagation**
```
1. Catch errors before ngspice:
   - Loop detection (A → B → A) ← detect in frontend
   - Unconnected inputs (Add with only one input) ← frontend
   
2. Catch errors from ngspice:
   - Parse error messages: "Divide by zero at node B3"
   - Map back to node: Divide node (B3)
   - Highlight only that node

3. Propagate errors:
   - Divide node shows error ✗
   - Display shows "blocked" (not an old value) ✗
   
Result:
✗ Divide node: "Division by zero"
✗ Display node: "Blocked (upstream error)"
✓ Correct error attribution
```

### **Challenge 3: Backend Trouble (Ngspice Hangs/Crashes)**

**Problem:**
```
ngspice process hangs or crashes
→ Frontend waits forever for response
→ User can't interact
→ App appears frozen
```

**Solution: Timeout + Recovery**
```
1. Set timeout on every request: 5 seconds
   
2. If timeout expires:
   - Cancel request
   - Show "Backend unavailable" message
   - Keep app interactive
   
3. Auto-recovery:
   - Show "Retrying..." with exponential backoff
   - User can still edit graph
   - When backend comes back, auto-sync
   
4. Graceful UI state:
   - Values become gray/faded (not fresh)
   - Checkbox: "Results may be out of date"
   - Button: "Refresh now"
```

### **Challenge 4: Untrusted Formulas (SECURITY!)**

**Problem:**
```
NEW node type: Formula (step 5)
User inputs: a + b (safe)
But user could input: a\n.control\nshell ls

This becomes netlist:
B1 out 0 V = a
.control
shell ls
.end

Ngspice EXECUTES THE SHELL COMMAND! ⚠️
```

**Solution: Formula validation**
```
Allowed characters: numbers, a, b, +, -, *, /, (, ), spaces
Regex: /^[0-9a-b+\-*/()\s]+$/

If formula = "a * 2 + b" → ✓ valid
If formula = "a\n.control\nshell ls" → ✗ rejected

Show error: "Formula can only contain numbers, a, b, and operators"

NEVER let untrusted input reach ngspice!
```

---

## 📊 **The 8 Acceptance Graphs**

These are test cases. Your app must produce exact results.

### **Graph 1: Simple Add**
```
Number(2) → Add ← Number(3)
                ↓
             Display
             
Expected: Display = 5
Netlist:
V1 net1 0 DC 2
V2 net2 0 DC 3
B1 net3 0 V = V(net1) + V(net2)
.op
.end

Result: net3 = 5 ✓
```

### **Graph 2: Chain (Add → Multiply)**
```
Number(2) → Add ← Number(3)
             ↓
           Multiply ← Number(4)
             ↓
          Display

Expected: Display = (2+3) * 4 = 20
```

### **Graph 3: Same Input Twice**
```
Number(7) → Multiply ← Number(7)
     ↓
  Display
  
Expected: Display = 7 * 7 = 49
```

### **Graph 4: Divide by Zero Error**
```
Number(10) → Divide ← Number(0)
                ↓
            Display

Expected: 
- Divide node shows error ✗
- Display shows "blocked" (not old value)
```

### **Graph 5: Missing Input**
```
Add (only one input wired)
    ↓
  Display

Expected:
- Add node highlighted with error: "Input 'b' not connected"
- Display shows "blocked"
```

### **Graph 6: Loop Detection**
```
Add → Multiply → back into same Add
(cycle)

Expected:
- All nodes in cycle highlighted: "Loop detected"
- No execution
```

### **Graph 7: Formula Node**
```
Formula: a * 2 + b
Input a = 3
Input b = 4
   ↓
Display

Expected: Display = 3*2 + 4 = 10
```

### **Graph 8: Formula Injection Attack**
```
Formula: a + b followed by newline and .control shell ls

Input: "a + b\n.control\nshell ls"

Expected:
- Rejected immediately
- Error: "Invalid formula"
- Nothing sent to ngspice
```

---

## 🎯 **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                                                                   │
│  [Canvas with nodes & wires] ──→ [React Flow editor]           │
│           ↓                                                       │
│  [Send graph JSON] ──→ [Node.js API] ──→ [Response with values] │
│           ↑                                                       │
│  [Display results] ←──────────────────────────────────────────    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  API (Node.js + Express)                         │
│                                                                   │
│  POST /api/execute ← receives graph JSON                        │
│       ↓                                                           │
│  [Convert to netlist] (your logic)                              │
│       ↓                                                           │
│  POST http://python-service:8000/simulate ← send netlist        │
│       ↓                                                           │
│  [Parse response] ← receive ngspice output                      │
│       ↓                                                           │
│  [Return to frontend] ← values + errors + node mapping          │
│                                                                   │
│  POST /api/save ← save graph to MongoDB                         │
│  GET /api/load ← load graph from MongoDB                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              BACKEND (Python + FastAPI)                          │
│                                                                   │
│  POST /simulate ← receives netlist text                         │
│       ↓                                                           │
│  [Write netlist to file]                                         │
│       ↓                                                           │
│  [Run: ngspice -b netlist.cir -o output.log]                   │
│       ↓                                                           │
│  [Parse output] ← extract V(net1) = 5, etc.                     │
│       ↓                                                           │
│  [Return JSON] ← {"net1": 5, "net2": 3, ...}                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   DATABASE (MongoDB)                             │
│                                                                   │
│  Collection: "graphs"                                            │
│  {                                                               │
│    _id: ObjectId,                                                │
│    name: "Graph 1",                                             │
│    nodes: [...],                                                │
│    edges: [...]                                                 │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  DOCKER COMPOSE                                  │
│                                                                   │
│  Service 1: react-app (port 3000)                               │
│  Service 2: node-api (port 3001)                                │
│  Service 3: python-service (port 8000)                          │
│  Service 4: mongodb (port 27017)                                │
│                                                                   │
│  ngspice is installed in python-service container               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💻 **Implementation Steps (Coding Order)**

### **Day 1 (3-4 hours): Frontend Basics**
1. React Flow setup with canvas
2. Create 5 node component types
3. Add node palette
4. Implement drag-and-drop
5. Implement wiring (output → input)
6. Validation (no input-input, no self-wiring, etc.)

### **Day 1-2 (2-3 hours): Backend API**
1. Express server with `/api/execute` endpoint
2. Graph → netlist converter
3. Call Python service
4. Parse response
5. `/api/save` and `/api/load` endpoints

### **Day 2 (2-3 hours): Python Service**
1. FastAPI server
2. Netlist → ngspice runner
3. Output parser
4. Error handling

### **Day 2-3 (1-2 hours): Step 5 Features**
1. Auto-execute on changes
2. Request versioning (prevent stale results)
3. Error propagation (show errors on correct nodes)
4. Formula node type
5. Formula validation
6. Timeout + recovery

### **Day 3 (1 hour): Testing & Docker**
1. Unit tests for netlist conversion
2. Integration tests for graphs 1-8
3. Docker Compose setup
4. `docker compose up --build` works

---

## 🧪 **Testing Strategy**

### **Unit Tests**

**Netlist Conversion:**
```
test("Graph 1: Number(5) + Number(3) = 5+3"):
  - Input: {nodes: [Number(5), Number(3), Add], edges: [...]}
  - Expected netlist: "V1 net1 0 DC 5\nV2 net2 0 DC 3\nB1 net3 0 V = V(net1) + V(net2)\n.op\n.end"
  - Assert generated netlist matches expected
```

**Loop Detection:**
```
test("Detect cycle: Add → Multiply → Add"):
  - Input: graph with cycle
  - Expected: returns error "Cycle detected at nodes [Add, Multiply]"
```

**Formula Validation:**
```
test("Reject formula with injection"):
  - Input: "a + b\n.control\nshell ls"
  - Expected: thrown error "Invalid formula characters"
  
test("Accept valid formula"):
  - Input: "a * 2 + b"
  - Expected: accepted, processed
```

### **Integration Tests**

Run all 8 acceptance graphs:
```
test("Graph 1"):
  - Build graph in frontend
  - Execute via API
  - Assert Display = 5

test("Graph 4 - Error case"):
  - Build divide by zero graph
  - Assert Divide node shows error
  - Assert Display shows "blocked"

...etc for all 8 graphs
```

---

## 📋 **README.md Structure**

### **1. How to Run**
```bash
docker compose up --build
# Frontend: http://localhost:3000
# API: http://localhost:3001
# Python: http://localhost:8000
# MongoDB: localhost:27017

npm test          # Run tests
```

### **2. Architecture Diagram**
Simple ASCII or embedded image showing:
- Frontend box → API box → Python box
- MongoDB alongside
- Data flow with arrows

### **3. Graph → Netlist Conversion**
```
How you implemented it:
1. Iterate through nodes
2. For each node type, generate corresponding netlist line
3. For each edge (wire), connect nets
4. Add .op and .end
5. Handle special cases (Display, Formula)

Loop detection:
- Build adjacency list
- DFS from each node
- If node visited twice in same path → cycle
```

### **4. Step 5 Solutions**

**Fast Edits (No Stale Results):**
```
Implemented request versioning. Each request gets version number.
Frontend only updates if response version >= current version.
Older responses are ignored.
```

**Errors on Right Node:**
```
Pre-ngspice validation catches loops and missing inputs (frontend).
Ngspice errors parsed and mapped back to node ID (e.g., "B3" → Divide node).
Error state propagates to dependent nodes.
```

**Backend Trouble:**
```
5-second timeout on API calls. If timeout, show "Unavailable" message.
App stays interactive. Auto-retry with exponential backoff.
Graceful degradation: old values shown as stale.
```

**Untrusted Formulas:**
```
Whitelist approach: only allow [0-9a-b+\-*/()\s].
Reject anything else with clear error message.
Never pass user input directly to ngspice.
```

### **5. Known Issues / Edge Cases**

```
One case that breaks:
- If user edits graph while ngspice is executing, 
  we might run version N+1 before N completes.
  Solution: queue requests, execute serially.
```

### **6. What I'd Do Next**
```
- Add Subtract node type
- Add three-input node (Sum of three)
- Undo/redo functionality
- Graph templates/library
- Export netlist as file
- More sophisticated error recovery
```

---

## 🎓 **Key Concepts to Understand**

### **1. Nets = Wires**
In ngspice, a "net" is a connection point. When you wire output to input, they share the same net name.

### **2. Behavioral Sources (B)**
`B1 out 0 V = expression` creates a voltage source that outputs the result of the expression.

### **3. Node ID Mapping**
Your nodes have IDs (node1, node2). You need to map them to ngspice source IDs (V1, B1, B2).

```
node1 (Number) → V1
node2 (Add) → B1
node3 (Multiply) → B2
...
```

### **4. Netlist Execution Order**
Ngspice figures it out. You don't need to topologically sort. Just provide all equations and ngspice solves the system.

### **5. Error Recovery**
Three types:
1. **Validation errors** (detected before ngspice)
2. **Ngspice errors** (parsed from output)
3. **Network/timeout errors** (handled with retry)

---

## ⏱️ **Time Budget (6-8 hours)**

- **Frontend setup (1.5h):** React Flow, nodes, wiring
- **API & netlist conversion (1.5h):** Express, graph processor
- **Python backend (1.5h):** FastAPI, ngspice runner
- **Step 5 features (1.5h):** Auto-sync, versioning, error handling
- **Testing & Docker (1h):** Tests, docker compose
- **README & polish (0.5h):** Documentation

---

## 🎯 **Success Criteria (Scoring)**

| Criterion | Points | What You Need |
|-----------|--------|---|
| **Step 5: Live Sync** | 35 | No stale results, errors on right nodes, backend recovery, safe formulas |
| **Correctness** | 20 | All 8 graphs give correct results |
| **Live Session** | 20 | Explain code, add new node type (Subtract) in 10 min |
| **Steps 1-4** | 15 | Canvas works, wiring rules enforced, save/load works |
| **Code Quality** | 10 | Clean code, meaningful tests, good structure |

**Total: 100 points**

---

## ❓ **FAQ**

**Q: Do I need to understand circuit theory?**
A: No. It's just data flow. Think of it as a calculator with nodes and wires.

**Q: What if ngspice crashes?**
A: Catch the error, show to user, recover gracefully. App should keep working.

**Q: Can I use existing libraries?**
A: Yes! Use whatever you want except those 4 mandatory ones.

**Q: How long is the live session?**
A: 45 minutes. They ask you to add a new node type (Subtract, etc.) and explain your code.

**Q: What should I commit?**
A: Commit frequently. They read commit history. Show progress.

**Q: Secrets in repo?**
A: NO! No API keys, passwords, or MongoDB connection strings. Use environment variables.

---

## 🚀 **Recommended Project Structure**

```
circuit-simulator/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas.tsx
│   │   │   ├── nodes/
│   │   │   │   ├── NumberNode.tsx
│   │   │   │   ├── AddNode.tsx
│   │   │   │   ├── MultiplyNode.tsx
│   │   │   │   ├── DivideNode.tsx
│   │   │   │   ├── DisplayNode.tsx
│   │   │   │   └── FormulaNode.tsx
│   │   ├── api.ts (API client)
│   │   ├── types.ts (TypeScript types)
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── api/
│   ├── src/
│   │   ├── app.ts (Express server)
│   │   ├── routes/
│   │   │   ├── execute.ts (POST /api/execute)
│   │   │   ├── save.ts (POST /api/save)
│   │   │   └── load.ts (GET /api/load)
│   │   ├── services/
│   │   │   ├── netlister.ts (graph → netlist)
│   │   │   ├── validator.ts (loop detection)
│   │   │   └── pythonClient.ts (call Python)
│   │   └── types.ts
│   ├── package.json
│   └── Dockerfile
├── python/
│   ├── main.py (FastAPI server)
│   ├── ngspice_runner.py (run ngspice)
│   ├── parser.py (parse ngspice output)
│   ├── requirements.txt
│   └── Dockerfile
├── tests/
│   ├── netlister.test.ts
│   ├── validator.test.ts
│   ├── graphs.integration.test.ts
│   └── formula.test.ts
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

## 🎬 **Live Session Tips**

**They will ask:**

1. "Walk us through your code"
   - Start from frontend
   - Show how graph flows to API
   - Show netlist generation
   - Show how Python executes it
   - Show error handling

2. "Add Subtract node type"
   - You should be able to add it in ~10 minutes
   - It's just: `B<id> <out> 0 V = V(<a>) - V(<b>)`
   - Show which files you touch
   - Demonstrate it works

3. "What was your biggest challenge?"
   - Probably Step 5 (live sync, stale results)
   - Explain your solution

4. "What would you do differently?"
   - Show your README "What I'd do next"

---

## 📚 **Resources**

**ngspice documentation:**
- Behavioral voltage sources: `B sources`
- Output format with `.op`
- Error parsing

**React Flow docs:**
- Custom nodes
- Edge handling
- Event listeners

**MongoDB:**
- Basic CRUD operations
- Connection string from Docker

---

## ✨ **Final Checklist**

- [ ] `docker compose up --build` works from clean clone
- [ ] All 8 acceptance graphs give correct results
- [ ] Step 5: No stale results from fast edits
- [ ] Step 5: Errors appear on correct nodes
- [ ] Step 5: Backend trouble doesn't crash frontend
- [ ] Step 5: Formula injection prevented
- [ ] Tests for netlist conversion
- [ ] Tests for loop detection
- [ ] Tests for all 8 acceptance graphs
- [ ] README complete with architecture & Step 5 explanations
- [ ] Clean commit history
- [ ] No secrets in repo
- [ ] Code is readable and well-structured

---

Good luck! This is a well-designed task that tests real-world skills: APIs, data transformation, error handling, and distributed systems thinking. 🎯
