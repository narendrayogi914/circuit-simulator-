import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Binary, AlertCircle } from 'lucide-react';
import { NodeData } from '../../types';

export const NumberNode: React.FC<NodeProps> = ({ id, data }) => {
  const nodeData = data as NodeData;
  const error = nodeData?.results?.errors?.[id];
  const value = nodeData?.value ?? 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const parsed = isNaN(val) ? 0 : val;
    nodeData?.onValueChange?.(id, parsed);
  };

  return (
    <div className={`md-node md-node-number ${error ? 'md-node-error' : ''}`}>
      <div className="md-node-header">
        <div className="md-node-icon md-icon-blue">
          <Binary size={15} />
        </div>
        <div className="md-node-header-text">
          <span className="md-node-title">Constant DC</span>
          <span className="md-node-type">V_SOURCE</span>
        </div>
      </div>

      <div className="md-node-body">
        <label className="md-input-label">Voltage (V)</label>
        <input
          type="number"
          className="md-text-input"
          value={value}
          onChange={handleChange}
          step="any"
        />
      </div>

      <div className="md-node-footer">
        <span className="md-port-name">out</span>
      </div>

      {error && (
        <div className="md-error-banner">
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="md-handle md-handle-source"
      />
    </div>
  );
};
