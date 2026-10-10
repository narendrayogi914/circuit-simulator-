import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Minus, AlertCircle } from 'lucide-react';
import { NodeData } from '../../types';

export const SubtractNode: React.FC<NodeProps> = ({ id, data }) => {
  const nodeData = data as NodeData;
  const error = nodeData?.results?.errors?.[id];

  return (
    <div className={`md-node md-node-operator ${error ? 'md-node-error' : ''}`}>
      <div className="md-node-header">
        <div className="md-node-icon md-icon-rose">
          <Minus size={15} />
        </div>
        <div className="md-node-header-text">
          <span className="md-node-title">Subtract</span>
          <span className="md-node-type">a - b</span>
        </div>
      </div>

      <div className="md-port-labels">
        <div className="md-port-in-group">
          <span className="md-port-name">in_a</span>
          <span className="md-port-name">in_b</span>
        </div>
        <span className="md-port-name">out</span>
      </div>

      {error && (
        <div className="md-error-banner">
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}

      {/* Input Ports */}
      <Handle
        type="target"
        position={Position.Left}
        id="a"
        style={{ top: '56%' }}
        className="md-handle md-handle-target"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="b"
        style={{ top: '80%' }}
        className="md-handle md-handle-target"
      />

      {/* Output Port */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ top: '68%' }}
        className="md-handle md-handle-source"
      />
    </div>
  );
};
