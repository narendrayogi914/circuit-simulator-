import re
from typing import Dict, List, Any

def parse_ngspice_output(output: str) -> Dict[str, float]:
    """
    Parses ngspice simulation output to extract node voltages.
    Handles multiple output formats from ngspice (inline V(net) = X and column tables).
    """
    values: Dict[str, float] = {}

    # Format 1: V(net1) = 5 or v(net1) = 5.000000e+00 or net1 = 5
    eq_pattern = re.compile(
        r'(?:V\(|\b)([a-zA-Z0-9_]+)\)?\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)',
        re.IGNORECASE
    )
    for line in output.splitlines():
        # Skip comment/header lines
        if line.strip().startswith('*') or 'Circuit:' in line or 'Doing analysis' in line:
            continue
        for match in eq_pattern.finditer(line):
            net_name = match.group(1).lower()
            try:
                values[net_name] = float(match.group(2))
            except ValueError:
                pass

    # Format 2: Tabular operating point listing
    # Example:
    # Node                                  Voltage
    # ----                                  -------
    # net1                                  5.000000e+00
    table_pattern = re.compile(
        r'^\s*([a-zA-Z0-9_]+)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*$'
    )
    is_in_table = False
    for line in output.splitlines():
        clean_line = line.strip()
        if 'Node' in clean_line and 'Voltage' in clean_line:
            is_in_table = True
            continue
        if is_in_table:
            if clean_line.startswith('---'):
                continue
            if not clean_line or clean_line.startswith('CPU') or clean_line.startswith('Total'):
                is_in_table = False
                continue
            match = table_pattern.match(clean_line)
            if match:
                net_name = match.group(1).lower()
                try:
                    values[net_name] = float(match.group(2))
                except ValueError:
                    pass

    return values


def parse_ngspice_errors(output: str, nodes: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Parses ngspice log for runtime errors like Division by zero,
    and maps the error back to the originating node ID.
    """
    errors: Dict[str, str] = {}
    lower_output = output.lower()

    # Look for division by zero
    if "division by zero" in lower_output or "divide by zero" in lower_output or "div by zero" in lower_output:
        matched = False
        for line in output.splitlines():
            l_line = line.lower()
            if "divide" in l_line or "division" in l_line or "zero" in l_line:
                for node in nodes:
                    sanitized_id = node.get("id", "").replace("-", "_").lower()
                    if f"b_{sanitized_id}" in l_line or f"b{sanitized_id}" in l_line or sanitized_id in l_line:
                        errors[node["id"]] = "Division by zero"
                        matched = True
                        break
            if matched:
                break

        # Fallback: find any Divide node in nodes if not specifically matched by device ID
        if not matched:
            for node in nodes:
                if node.get("type") == "Divide":
                    errors[node["id"]] = "Division by zero"
                    break

    # Look for singular matrix / convergence errors
    if "singular matrix" in lower_output or "matrix is singular" in lower_output:
        errors["global"] = "Singular matrix: floating node or unconnected loop detected"

    if "syntax error" in lower_output or "unrecognized parameter" in lower_output:
        errors["global"] = "Spice syntax error during simulation"

    return errors
