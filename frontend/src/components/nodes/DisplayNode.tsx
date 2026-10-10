import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Gauge, AlertCircle, CheckCircle2 } from 'lucide-react';
import { NodeData } from '../../types';

export const DisplayNode: React.FC<NodeProps> = ({ id, data }) => {
  const nodeData = data as NodeData;
  const error = nodeData?.results?.errors?.[id];
  const value = nodeData?.results?.values?.[id];

  const hasValue = typeof value === 'number';
  const formattedValue = hasValue ? Number(value.toFixed(4)).toString() : 'NO SIGNAL';

  return (
    <div className={`md-node md-node-display ${error ? 'md-node-error' : hasValue ? 'md-node-active' : ''}`}>
      <div className="md-node-header">
        <div className="md-node-icon md-icon-amber">
          <Gauge size={15} />
        </div>
        <div className="md-node-header-text">
          <span className="md-node-title">Voltmeter</span>
          <span className="md-node-type">PROBE</span>
        </div>
        <div className="md-status-chip">
          {error ? (
            <span className="md-chip-error">BLOCKED</span>
          ) : hasValue ? (
            <span className="md-chip-success">
              <CheckCircle2 size={10} style={{ marginRight: 3 }} />
              ACTIVE
            </span>
          ) : (
            <span className="md-chip-idle">STANDBY</span>
          )}
        </div>
      </div>

      <div className="md-display-readout-panel">
        <div className="md-readout-row">
          <span className="md-readout-value">{error ? 'ERR' : formattedValue}</span>
          {hasValue && !error && <span className="md-readout-unit">V</span>}
        </div>
      </div>

      <div className="md-node-footer">
        <span className="md-port-name">in_probe (x)</span>
      </div>

      {error && (
        <div className="md-error-banner">
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}

      {/* Input Port x */}
      <Handle
        type="target"
        position={Position.Left}
        id="x"
        style={{ top: '65%' }}
        className="md-handle md-handle-target"
      />
    </div>
  );
};
