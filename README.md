# 🔌 Live Circuit Simulator

A high-performance visual node graph editor that generates **ngspice** SPICE netlists in real time and renders simulation operating points on canvas.

Built with **React Flow (@xyflow/react)**, **Node.js + Express**, **Python + FastAPI**, and **ngspice**, with container orchestration via **Docker Compose**.

---

## 🚀 Quick Start & Installation

### Option 1: Docker Compose (Full Stack with ngspice)
Ensure Docker is installed and running, then execute:
```bash
docker compose up --build
```

**Services:**
- 🖥️ **Frontend:** [http://localhost:3000](http://localhost:3000)
- 🌐 **Node.js API:** [http://localhost:3001](http://localhost:3001)
- 🐍 **Python Simulation Service:** [http://localhost:8000](http://localhost:8000)
- 🍃 **MongoDB:** `localhost:27017`

### Option 2: Local Development (Instant Startup)
The system contains a resilient local solver engine so the entire frontend and API can be launched immediately without Docker:

```bash
# Terminal 1: Run Node.js API
cd api
npm install
npm run dev

# Terminal 2: Run React Frontend
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

The repository includes a comprehensive test suite covering netlist generation, cycle/loop detection, formula injection security, and all 8 acceptance graphs:

```bash
cd api
npm test
```

**Test Results:**
- `netlister.test.ts`: SPICE netlist syntax, behavioral voltage sources (`B`), DC sources (`V`), `.op`, `.end`.
- `validator.test.ts`: Directed cycle DFS loop detection, missing input detection, self-loops.
- `formula.test.ts`: Shell injection prevention, whitespace/operator sequence checking, variable whitelisting.
- `graphs.integration.test.ts`: End-to-end evaluation for all 8 acceptance graphs + live session bonus.

---

## 🏗️ Architecture & Data Flow Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                             FRONTEND (React)                                 │
│  - React Flow Canvas with custom node palette                                │
│  - Debounced auto-execution on graph modifications (350ms)                  │
│  - Monotonic versioning (ignores stale responses)                            │
│  - Direct 1-Click presets for all 8 Acceptance Graphs                        │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ POST /api/execute (nodes, edges, version)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           API (Node.js + Express)                            │
│  1. Pre-simulation validation (DFS cycle detection, input checking)          │
│  2. Graph -> SPICE netlist conversion (assigns nets, expands variables)      │
│  3. Forwards to Python or executes fallback engine                           │
│  4. Graph persistence to MongoDB (with in-memory fallback)                   │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ POST /simulate (netlist text)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    SIMULATION ENGINE (Python + FastAPI)                      │
│  1. Writes circuit to temporary SPICE deck                                   │
│  2. Subprocess execution: `ngspice -b circuit.cir -o output.log` (5s timeout)│
│  3. Parses node voltages V(netX) & maps errors back to source nodes          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Graph → Netlist Conversion

Each visual node is converted into an equivalent SPICE deck directive:

| Visual Node | SPICE Element | Netlist Format |
|---|---|---|
| **Number** | Independent Voltage Source | `V_<id> <outNet> 0 DC <value>` |
| **Add** | Behavioral Source | `B_<id> <outNet> 0 V = V(<netA>) + V(<netB>)` |
| **Subtract** | Behavioral Source | `B_<id> <outNet> 0 V = V(<netA>) - V(<netB>)` |
| **Multiply** | Behavioral Source | `B_<id> <outNet> 0 V = V(<netA>) * V(<netB>)` |
| **Divide** | Behavioral Source | `B_<id> <outNet> 0 V = V(<netA>) / V(<netB>)` |
| **Formula** | Behavioral Source | `B_<id> <outNet> 0 V = <expandedFormula>` |
| **Display** | Measurement Probe | Reads voltage of connected net (no active source) |

Netlist generation ends with:
```spice
.op
.end
```

---

## ⚡ Step 5 Solutions (Critical Implementation Details)

### 1. Fast Edits & Monotonic Request Versioning
- **The Problem:** Rapid typing (e.g. `1` → `10` → `100`) sends 3 asynchronous requests. If Request 1 finishes *after* Request 3, displaying Request 1 would render stale data.
- **The Solution:** Every request increments a monotonic `version` counter. When the API returns a response, the client discards any response where `response.version < versionRef.current`.

### 2. Precise Error Attribution
- **Pre-Simulation (Validator):** Loops and missing input wires are detected before invoking the simulator using a 3-color DFS cycle detector.
- **Runtime (Ngspice):** Divide-by-zero outputs from ngspice are mapped directly back to the offending `Divide` node. Upstream errors propagate to connected `Display` nodes, highlighting them as `Blocked (upstream error)` rather than generic failures.

### 3. Backend Trouble & Timeout Recovery
- **5-Second Timeout:** All simulation requests have a strict 5000ms timeout.
- **Graceful Degradation:** If the backend takes longer than 5 seconds, the UI reports `Backend Timeout` without locking the canvas. Users can continue modifying nodes.
- **Local Solver Fallback:** In development mode without Docker, the API uses a local topological solver to ensure uninterrupted testing.

### 4. Untrusted Formula Sandboxing (Injection Prevention)
- **The Threat:** Attackers inputting `a + b\n.control\nshell ls` would execute arbitrary shell commands inside ngspice.
- **The Defense:** A strict character and token whitelist (`/^[0-9ab\+\-\*\/\(\)\s\.]+$/i`). Any semicolon, newline, backtick, quotes, or keywords are immediately rejected before generating the netlist.

---

## 📊 The 8 Acceptance Graphs

1. **Graph 1: Simple Add** — `Number(2) + Number(3) = 5`
2. **Graph 2: Chain** — `(Number(2) + Number(3)) * Number(4) = 20`
3. **Graph 3: Same Input Twice** — `Number(7)` wired to both inputs of Multiply = `49`
4. **Graph 4: Divide by Zero** — `10 / 0` flags `Division by zero` on the Divide node and blocks Display.
5. **Graph 5: Missing Input** — Add node with only 1 wire connected flags `Input "b" not connected`.
6. **Graph 6: Loop Detection** — Directed cycle `Add → Multiply → Add` detects cycle and halts.
7. **Graph 7: Formula Node** — Formula `a * 2 + b` with `a=3, b=4` yields `10`.
8. **Graph 8: Formula Injection** — Malicious string `a + b\n.control\nshell ls` is rejected.
9. **Bonus (Live Session): Subtract Node** — `Number(10) - Number(4) = 6` works out-of-the-box.

---

## 🛠️ What I'd Do Next

1. **Undo / Redo History Stack:** Track canvas mutations with a command pattern.
2. **AC / Transient Simulation:** Support sine waves, capacitors, and oscilloscopes for time-domain graphs.
3. **Multi-Input Aggregators:** Add an N-ary Sum / Average node.
4. **Export to SPICE File (.cir):** Download full raw netlists for LTspice or KiCad.
