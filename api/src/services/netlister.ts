import { Node, Edge } from '../types';

export interface NetlistResult {
  netlist: string;
  nodeNetMap: Record<string, string>;       // nodeId -> output net name (e.g., "num1" -> "net1")
  displayNetMap: Record<string, string>;    // displayNodeId -> input net name (e.g., "disp1" -> "net3")
  deviceIdMap: Record<string, string>;      // deviceName (e.g., "b_div1") -> nodeId
}

/**
 * Converts a validated graph into a standard ngspice SPICE netlist.
 */
export function graphToNetlist(nodes: Node[], edges: Edge[]): NetlistResult {
  const nodeNetMap: Record<string, string> = {};
  const displayNetMap: Record<string, string> = {};
  const deviceIdMap: Record<string, string> = {};

  let netCounter = 1;

  // 1. Assign unique net names for every node that produces an output
  for (const node of nodes) {
    if (node.type !== 'Display') {
      nodeNetMap[node.id] = `net${netCounter++}`;
    }
  }

  // Helper to find source net for a target node and handle
  const getInputNet = (targetId: string, handle: string): string => {
    const edge = edges.find(
      e => e.target === targetId && (e.targetHandle === handle || (!e.targetHandle && handle === 'a'))
    );
    if (!edge || !nodeNetMap[edge.source]) {
      throw new Error(`Node ${targetId} is missing an input wire on port ${handle}`);
    }
    return nodeNetMap[edge.source];
  };

  let netlistLines: string[] = [
    '* Circuit Simulator Generated SPICE Netlist',
    '* Automatically generated for ngspice batch simulation',
  ];

  // 2. Generate SPICE statements for each node
  for (const node of nodes) {
    const cleanId = node.id.replace(/[^a-zA-Z0-9_]/g, '_');
    const outNet = nodeNetMap[node.id];

    switch (node.type) {
      case 'Number': {
        const val = typeof node.data?.value === 'number' ? node.data.value : 0;
        const devName = `V_${cleanId}`;
        deviceIdMap[devName.toLowerCase()] = node.id;
        netlistLines.push(`${devName} ${outNet} 0 DC ${val}`);
        break;
      }

      case 'Add': {
        const netA = getInputNet(node.id, 'a');
        const netB = getInputNet(node.id, 'b');
        const devName = `B_${cleanId}`;
        deviceIdMap[devName.toLowerCase()] = node.id;
        netlistLines.push(`${devName} ${outNet} 0 V = V(${netA}) + V(${netB})`);
        break;
      }

      case 'Subtract': {
        const netA = getInputNet(node.id, 'a');
        const netB = getInputNet(node.id, 'b');
        const devName = `B_${cleanId}`;
        deviceIdMap[devName.toLowerCase()] = node.id;
        netlistLines.push(`${devName} ${outNet} 0 V = V(${netA}) - V(${netB})`);
        break;
      }

      case 'Multiply': {
        const netA = getInputNet(node.id, 'a');
        const netB = getInputNet(node.id, 'b');
        const devName = `B_${cleanId}`;
        deviceIdMap[devName.toLowerCase()] = node.id;
        netlistLines.push(`${devName} ${outNet} 0 V = V(${netA}) * V(${netB})`);
        break;
      }

      case 'Divide': {
        const netA = getInputNet(node.id, 'a');
        const netB = getInputNet(node.id, 'b');
        const devName = `B_${cleanId}`;
        deviceIdMap[devName.toLowerCase()] = node.id;
        netlistLines.push(`${devName} ${outNet} 0 V = V(${netA}) / V(${netB})`);
        break;
      }

      case 'Formula': {
        const netA = getInputNet(node.id, 'a');
        const netB = getInputNet(node.id, 'b');
        const devName = `B_${cleanId}`;
        deviceIdMap[devName.toLowerCase()] = node.id;

        const rawFormula = (node.data?.formula || 'a + b').trim();
        // Replace variable tokens 'a' and 'b' with their SPICE net voltages V(netA) and V(netB)
        const expanded = rawFormula
          .replace(/\ba\b/gi, `V(${netA})`)
          .replace(/\bb\b/gi, `V(${netB})`);

        netlistLines.push(`${devName} ${outNet} 0 V = ${expanded}`);
        break;
      }

      case 'Display': {
        // Display nodes do not generate active sources.
        // Instead, find the incoming edge and record the net it reads.
        const inputEdge = edges.find(
          e => e.target === node.id && (e.targetHandle === 'x' || !e.targetHandle)
        );
        if (inputEdge && nodeNetMap[inputEdge.source]) {
          displayNetMap[node.id] = nodeNetMap[inputEdge.source];
        }
        break;
      }
    }
  }

  // 3. Add metadata comment for reference and debugging
  netlistLines.push(`* Node-to-Net: ${JSON.stringify(nodeNetMap)}`);
  netlistLines.push(`* Display-to-Net: ${JSON.stringify(displayNetMap)}`);

  // 4. Analysis directives
  netlistLines.push('.op');
  netlistLines.push('.end');
  netlistLines.push('');

  return {
    netlist: netlistLines.join('\n'),
    nodeNetMap,
    displayNetMap,
    deviceIdMap,
  };
}
