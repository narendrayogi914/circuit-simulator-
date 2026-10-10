import os
import subprocess
import tempfile
import uuid
from typing import Tuple

def run_ngspice_simulation(netlist: str, timeout_seconds: float = 5.0) -> Tuple[str, int]:
    """
    Executes ngspice in batch mode (-b) on the given netlist string.
    Returns (combined_output_log, return_code).
    """
    unique_id = uuid.uuid4().hex
    temp_dir = tempfile.gettempdir()
    cir_path = os.path.join(temp_dir, f"circuit_{unique_id}.cir")
    out_path = os.path.join(temp_dir, f"output_{unique_id}.log")

    try:
        with open(cir_path, "w", encoding="utf-8") as f:
            f.write(netlist)

        cmd = ["ngspice", "-b", cir_path, "-o", out_path]
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout_seconds
        )

        output_content = ""
        if os.path.exists(out_path):
            with open(out_path, "r", encoding="utf-8", errors="replace") as f:
                output_content = f.read()

        # Combine with stdout / stderr if log was empty or partial
        combined = (output_content + "\n" + proc.stdout + "\n" + proc.stderr).strip()
        return combined, proc.returncode

    finally:
        # Cleanup temp files
        for p in [cir_path, out_path]:
            try:
                if os.path.exists(p):
                    os.remove(p)
            except OSError:
                pass
