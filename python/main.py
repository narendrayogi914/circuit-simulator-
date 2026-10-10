import os
import sys
import subprocess
import re
from typing import List, Dict, Any

# Ensure the directory containing main.py is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Support both circuit_parser (to avoid standard library parser shadowing) and parser
try:
    from circuit_parser import parse_ngspice_output, parse_ngspice_errors
except ImportError:
    from parser import parse_ngspice_output, parse_ngspice_errors

from ngspice_runner import run_ngspice_simulation

app = FastAPI(title="Ngspice Circuit Simulation Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SimulationRequest(BaseModel):
    netlist: str
    nodes: List[Dict[str, Any]] = Field(default_factory=list)

class SimulationResponse(BaseModel):
    values: Dict[str, float] = Field(default_factory=dict)
    errors: Dict[str, str] = Field(default_factory=dict)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "python-ngspice-simulator"}

def fallback_netlist_evaluator(netlist: str, nodes: List[Dict[str, Any]]) -> tuple[Dict[str, float], Dict[str, str]]:
    """
    Fallback netlist solver used when ngspice binary is not installed locally on the host OS.
    Parses V sources and B sources, calculates voltages, and flags division by zero.
    """
    values: Dict[str, float] = {}
    errors: Dict[str, str] = {}

    lines = [line.strip() for line in netlist.splitlines() if line.strip() and not line.strip().startswith('*')]

    # Pass 1: Parse independent DC voltage sources (V<name> <net> 0 DC <val>)
    for line in lines:
        v_match = re.match(r'^V\w*\s+([a-zA-Z0-9_]+)\s+0\s+DC\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)', line, re.IGNORECASE)
        if v_match:
            net_name = v_match.group(1).lower()
            val = float(v_match.group(2))
            values[net_name] = val

    # Pass 2: Iteratively solve behavioral sources (B<name> <outNet> 0 V = <expr>)
    changed = True
    iterations = 0
    max_iter = len(lines) * 2 + 10

    while changed and iterations < max_iter:
        changed = False
        iterations += 1

        for line in lines:
            b_match = re.match(r'^(B\w*)\s+([a-zA-Z0-9_]+)\s+0\s+V\s*=\s*(.+)$', line, re.IGNORECASE)
            if b_match:
                device_name = b_match.group(1)
                out_net = b_match.group(2).lower()
                expr = b_match.group(3).strip()

                if out_net in values:
                    continue

                # Find node associated with this device
                target_node_id = None
                for n in nodes:
                    sanitized = n.get("id", "").replace("-", "_").lower()
                    if sanitized in device_name.lower():
                        target_node_id = n.get("id")
                        break

                # Substitute known V(net) voltages
                unresolved = False
                eval_expr = expr

                def replace_v(m):
                    nonlocal unresolved
                    v_net = m.group(1).lower()
                    if v_net in values:
                        return str(values[v_net])
                    unresolved = True
                    return m.group(0)

                eval_expr = re.sub(r'V\(([a-zA-Z0-9_]+)\)', replace_v, eval_expr, flags=re.IGNORECASE)

                if not unresolved:
                    try:
                        # Check for division by zero
                        res = eval(eval_expr, {"__builtins__": {}}, {})
                        values[out_net] = float(res)
                        changed = True
                    except ZeroDivisionError:
                        if target_node_id:
                            errors[target_node_id] = "Division by zero"
                        else:
                            errors[out_net] = "Division by zero"
                        changed = True
                    except Exception:
                        pass

    return values, errors

@app.post("/simulate", response_model=SimulationResponse)
def simulate(request: SimulationRequest):
    try:
        output_log, ret_code = run_ngspice_simulation(request.netlist, timeout_seconds=5.0)
        values = parse_ngspice_output(output_log)
        errors = parse_ngspice_errors(output_log, request.nodes)
        return SimulationResponse(values=values, errors=errors)
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=504,
            detail="Simulation timed out (ngspice took longer than 5 seconds)"
        )
    except (FileNotFoundError, OSError):
        # ngspice binary is not installed locally on this host OS:
        # Gracefully solve using fallback evaluator so development/testing never crashes!
        values, errors = fallback_netlist_evaluator(request.netlist, request.nodes)
        return SimulationResponse(values=values, errors=errors)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
