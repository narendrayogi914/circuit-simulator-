"""
Unit tests for Python ngspice output and error parser.
"""
try:
    from circuit_parser import parse_ngspice_output, parse_ngspice_errors
except ImportError:
    from parser import parse_ngspice_output, parse_ngspice_errors

def test_parse_output():
    sample_output = """
Circuit: * Generated netlist
Doing analysis at TEMP = 27.000000 and TNOM = 27.000000

Node                                  Voltage
----                                  -------
net1                                  5.000000e+00
net2                                  3.000000e+00
net3                                  8.000000e+00
0                                     0.000000e+00
"""
    vals = parse_ngspice_output(sample_output)
    assert vals.get("net1") == 5.0, f"Expected 5.0, got {vals.get('net1')}"
    assert vals.get("net2") == 3.0, f"Expected 3.0, got {vals.get('net2')}"
    assert vals.get("net3") == 8.0, f"Expected 8.0, got {vals.get('net3')}"
    print("test_parse_output passed!")

def test_parse_divide_by_zero():
    sample_error = """
Error: division by zero in behavioral source B_div1
Simulation terminated.
"""
    nodes = [{"id": "div1", "type": "Divide"}]
    errs = parse_ngspice_errors(sample_error, nodes)
    assert errs.get("div1") == "Division by zero", f"Expected Division by zero, got {errs}"
    print("test_parse_divide_by_zero passed!")

if __name__ == "__main__":
    test_parse_output()
    test_parse_divide_by_zero()
    print("All python parser tests passed!")
