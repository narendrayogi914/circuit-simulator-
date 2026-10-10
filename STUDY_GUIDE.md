# 📚 Circuit Simulator - Complete Study Guide & Interview Cheatsheet
## (Achi Understanding & Live Coding Session ke liye Complete Roadmap)

Yeh guide aapko system ke har ek component, algorithms, SPICE basics, aur live interview questions ko deeply samajhne ke liye banayi gayi hai.

---

## 1. 🧠 Core Concepts: Kya-kya padhna zaroori hai?

### A. Ngspice & SPICE Netlists Basics
* **SPICE kya hai?**
  - SPICE (*Simulation Program with Integrated Circuit Emphasis*) ek open-source analog circuit simulator engine hai.
  - ngspice ek command-line tool hai jo circuit description (jise **netlist** kehte hain) ko padh kar voltages aur currents calculate karta hai.
* **Netlist kya hoti hai?**
  - Ek text file jisme circuit ke saare components aur unke connections (nets/nodes) listed hote hain.
  - **Ground Node:** SPICE me node `0` hamesha **Ground (0 Volts reference)** hota hai.
* **Important Directives jo hamne use kiye hain:**
  1. **Independent DC Voltage Source (`V`):**
     ```spice
     V1 net1 0 DC 5
     ```
     *Matlab:* Component ka naam `V1` hai, yeh `net1` aur ground `0` ke beech connected hai, aur iska DC voltage 5V hai.
  2. **Behavioral Source (`B`):**
     ```spice
     B1 net3 0 V = V(net1) + V(net2)
     ```
     *Matlab:* Non-linear math expression source. `net3` ka voltage `net1` aur `net2` ke voltages ke sum ke barabar hoga.
  3. **Analysis Directive (`.op`):**
     * DC Operating Point calculation. Yeh steady-state DC voltages solve karta hai.
  4. **End Directive (`.end`):**
     * Netlist file ka termination marker.

---

### B. Graph Theory & Cycle Detection (DFS 3-Color Algorithm)
* **DAG (Directed Acyclic Graph):**
  - Hamara circuit ek dataflow graph hai. Calculation tabhi valid hoti hai jab graph me koi circular dependency na ho.
* **Cycle Detection (Loop detection):**
  - Jab ek node ka output ghoom kar wapas usi ke input me aa jaye (jaise `Add → Multiply → Add`), toh yeh ek infinite algebraic loop ban jata hai.
  - **Algorithm (3-Color DFS):**
    - `0 = UNVISITED` (Node abhi explore nahi hua).
    - `1 = VISITING` (Node current recursion call-stack me hai).
    - `2 = VISITED` (Node aur uske saare descendants explore ho chuke hain).
    - *Key Rule:* Agar DFS traversal ke dauran hum kisi aise neighbor node pe pohachte hain jo pehle se `VISITING (1)` state me hai, iska matlab **Cycle (Loop) mil gaya!**

---

### C. Race Conditions & Request Versioning (Out-of-Order Updates)
* **Interview Trap:** "Jab user fast typing kare (e.g. `1` → `10` → `100`), tab kya problem aayegi?"
* **Problem:**
  - Network requests asynchronous hoti hain. Ho sakta hai Request 3 (`100`) pehle return ho jaye, aur purani Request 1 (`1`) baad me return ho. Agar frontend ne purani request render kar di, toh screen pe galat value show hogi!
* **Solution (Monotonic Version Numbering):**
  - Har frontend request ke sath ek incrementing integer `version` bheja jata hai (`1, 2, 3...`).
  - Response aane par frontend check karta hai:
    ```typescript
    if (response.version >= versionRef.current) {
      setResults(response); // Accept
    } else {
      // Discard stale response!
    }
    ```

---

### D. Security: SPICE Command Injection Prevention
* **Interview Question:** "Formula node me user untrusted input enter kare toh kya risk hai?"
* **Risk:**
  - ngspice me `.control` block hota hai jisme `shell` command execute ho sakti hai:
    ```spice
    a + b
    .control
    shell rm -rf /
    .end
    ```
  - Agar yeh string backend ngspice ko bhej di gayi, toh container ke andar arbitrary command execute ho jayegi!
* **Solution (Strict Whitelist Validation):**
  - Kabhi bhi blacklist use mat karo. Strict whitelist regex use karo:
    ```typescript
    /^[0-9ab\+\-\*\/\(\)\s\.]+$/i
    ```
  - Agar user semicolon `;`, newline `\n`, quotes `"`, backticks, ya alphabets other than `a` and `b` daalta hai, toh frontend aur API dono request ko simulate hone se pehle hi reject kar dete hain!

---

### E. Error Attribution & Propagation
* Divide by zero pe SPICE error deta hai: `division by zero in B_div1`.
* Backend regex us device ID ko parse karke exact `Divide` node par error tag karta hai: `{ "div1": "Division by zero" }`.
* Us node ke aage jude hue Display node par automatically error propagate hota hai: `Blocked (upstream error)`.

---

## 2. 🎯 Live Session & Coding Interview Preparation

### Question 1: "Walk me through your code architecture (5-minute pitch)"
**Aapka Answer:**
1. **Frontend (`/frontend`):**
   - React Flow (`@xyflow/react`) use karta hai canvas management ke liye.
   - Har node ek custom React component hai (`NumberNode`, `AddNode`, `DisplayNode`, etc.).
   - Wiring validation rules client-side pe enforce hoti hain (no self loops, output ➔ input only, max 1 incoming wire per input port).
   - Auto-sync debounced hai (350ms) with request versioning.
2. **API Layer (`/api`):**
   - Express server jo pre-simulation validation run karta hai (DFS cycle detection aur missing inputs).
   - `netlister.ts` visual graph ko ngspice SPICE deck me convert karta hai.
   - Resilient design: Agar Docker/Python offline ho, toh local topological solver seamlessly answer compute karta hai.
3. **Simulation Layer (`/python`):**
   - FastAPI server jo temporary SPICE file likhta hai aur `ngspice -b` batch mode me subprocess run karta hai 5-second timeout ke sath.
   - Output parser voltages aur runtime errors ko extract karke return karta hai.
4. **Database & Orchestration:**
   - MongoDB graphs save/load karne ke liye, `docker-compose.yml` sabhi services ko coordinate karta hai.

---

### Question 2: "Live Challenge: Add a Subtract node in 5 minutes"
*(Good news: Humne Subtract node pehle se hi beautifully implement karke ready kar diya hai!)*
Agar interviewer kahe "Subtract node add karke dikhao", toh aap confidently bol sakte hain ki sirf 3 files touch karni hoti hain:
1. **`api/src/services/netlister.ts`:**
   ```typescript
   case 'Subtract': {
     const netA = getInputNet(node.id, 'a');
     const netB = getInputNet(node.id, 'b');
     netlistLines.push(`B_${cleanId} ${outNet} 0 V = V(${netA}) - V(${netB})`);
     break;
   }
   ```
2. **`frontend/src/components/nodes/SubtractNode.tsx`:**
   - Subtract component with handles `a` and `b` on left and `output` on right.
3. **`frontend/src/types.ts`:**
   - `NodeType` union me `'Subtract'` add karna.

---

## 3. 🧪 All 8 Acceptance Graphs Quick Reference

| # | Graph Name | Topology | Expected Result |
|---|---|---|---|
| **1** | Simple Add | Number(2) + Number(3) ➔ Display | Display = 5 |
| **2** | Chain | (Number(2) + Number(3)) × Number(4) ➔ Display | Display = 20 |
| **3** | Same Input Twice | Number(7) wired to both inputs of Multiply | Display = 49 |
| **4** | Divide by Zero | Number(10) ÷ Number(0) | Divide: ❌ Division by zero, Display: ❌ Blocked |
| **5** | Missing Input | Add node with only 1 wire | Add: ❌ Input "b" not connected |
| **6** | Loop Detection | Add ➔ Multiply ➔ Add (cycle) | ❌ Node is part of a loop (No execution) |
| **7** | Formula Node | Formula: `a * 2 + b` (a=3, b=4) | Display = 10 |
| **8** | Injection Attack | `a + b\n.control\nshell ls` | Formula: ❌ Invalid formula characters |
| **Bonus**| Subtract Node | Number(10) - Number(4) | Display = 6 |

---

## 4. 📖 Key Topics Summary to Revise
1. **SPICE syntax:** `V` for DC sources, `B` for behavioral formulas, `.op` for operating point.
2. **DFS Cycle Detection:** White/Gray/Black or 0/1/2 color tracking.
3. **Concurrency:** Request versioning to drop out-of-order stale packets.
4. **Input Sanitization:** Whitelist-only regex matching.
5. **Testing:** Jest unit tests & integration tests (`npm test`).
