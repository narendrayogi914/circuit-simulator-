import React, { useState } from 'react';
import { X, Copy, Check, Terminal } from 'lucide-react';

interface NetlistViewerProps {
  isOpen: boolean;
  onClose: () => void;
  netlist: string | undefined;
  engineSource?: string;
}

export const NetlistViewer: React.FC<NetlistViewerProps> = ({
  isOpen,
  onClose,
  netlist,
  engineSource,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!netlist) return;
    navigator.clipboard.writeText(netlist);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="md-dialog-scrim" onClick={onClose}>
      <div className="md-dialog" onClick={e => e.stopPropagation()}>
        <div className="md-dialog-header">
          <div className="md-dialog-title-group">
            <div className="md-dialog-icon">
              <Terminal size={16} />
            </div>
            <div>
              <h3 className="md-dialog-headline">SPICE Netlist Inspector</h3>
              <p className="md-dialog-supporting-text">
                Circuit netlist deck generated for batch operating point analysis
                {engineSource && (
                  <span className="md-engine-chip">Engine: {engineSource}</span>
                )}
              </p>
            </div>
          </div>
          <button className="md-btn-icon-subtle" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="md-dialog-content">
          <div className="md-code-header">
            <span className="md-code-tab">circuit.cir</span>
            <button className="md-btn-text" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check size={13} className="text-emerald" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy Netlist</span>
                </>
              )}
            </button>
          </div>
          <pre className="md-code-view">
            <code>{netlist || '* Netlist deck empty. Place and connect components on canvas.'}</code>
          </pre>
        </div>

        <div className="md-dialog-actions">
          <div className="md-legend">
            <span>V_id: DC Independent Source</span>
            <span className="md-legend-sep">|</span>
            <span>B_id: Behavioral Equation Source</span>
            <span className="md-legend-sep">|</span>
            <span>.op: DC Analysis</span>
          </div>
          <button className="md-btn md-btn-tonal" onClick={onClose}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
