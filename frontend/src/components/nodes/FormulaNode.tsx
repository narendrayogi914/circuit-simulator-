import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FunctionSquare, AlertCircle, Shield } from 'lucide-react';
import { NodeData } from '../../types';

export const FormulaNode: React.FC<NodeProps> = ({ id, data }) => {
  const nodeData = data as NodeData;
  const error = nodeData?.results?.errors?.[id];
  const [formula, setFormula] = useState(nodeData?.formula || 'a + b');
  const [localValidationErr, setLocalValidationErr] = useState<string | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setFormula(newVal);

    // Strict character whitelist
    const allowed = /^[0-9ab\+\-\*\/\(\)\s\.]*$/i;
    if (!allowed.test(newVal)) {
      setLocalValidationErr('Disallowed characters. Whitelist: 0-9, a, b, +, -, *, /, (, )');
    } else {
      setLocalValidationErr(null);
    }

    nodeData?.onFormulaChange?.(id, newVal);
  };

  const displayedError = localValidationErr || error;

  return (
    <div className={`md-node md-node-formula ${displayedError ? 'md-node-error' : ''}`}>
      <div className="md-node-header">
        <div className="md-node-icon md-icon-violet">
          <FunctionSquare size={15} />
        </div>
        <div className="md-node-header-text">
          <span className="md-node-title">Expression</span>
          <span className="md-node-type">f(a, b)</span>
        </div>
        <div className="md-status-chip">
          <span className="md-chip-neutral" title="Whitelisted Sandbox">
            <Shield size={10} style={{ marginRight: 3 }} />
            SANDBOX
          </span>
        </div>
      </div>

      <div className="md-node-body">
        <label className="md-input-label">Formula Definition</label>
        <input
          type="text"
          className="md-text-input md-code-input"
          value={formula}
          onChange={handleTextChange}
          placeholder="a * 2 + b"
          spellCheck={false}
        />
      </div>

      <div className="md-port-labels">
        <div className="md-port-in-group">
          <span className="md-port-name">in_a</span>
          <span className="md-port-name">in_b</span>
        </div>
        <span className="md-port-name">out</span>
      </div>

      {displayedError && (
        <div className="md-error-banner">
          <AlertCircle size={13} />
          <span>{displayedError}</span>
        </div>
      )}

      {/* Input Ports */}
      <Handle
        type="target"
        position={Position.Left}
        id="a"
        style={{ top: '65%' }}
        className="md-handle md-handle-target"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="b"
        style={{ top: '86%' }}
        className="md-handle md-handle-target"
      />

      {/* Output Port */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ top: '75%' }}
        className="md-handle md-handle-source"
      />
    </div>
  );
};
