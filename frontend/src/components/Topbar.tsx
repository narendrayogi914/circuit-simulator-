import React from 'react';
import {
  Play,
  RotateCcw,
  Save,
  FolderOpen,
  FileCode,
  Cpu,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { ExecutionResult } from '../types';

interface TopbarProps {
  isLoading: boolean;
  liveSync: boolean;
  onToggleLiveSync: () => void;
  onRunManual: () => void;
  onClearCanvas: () => void;
  onOpenNetlist: () => void;
  onSave: () => void;
  onLoad: () => void;
  results: ExecutionResult | null;
  version: number;
}

export const Topbar: React.FC<TopbarProps> = ({
  isLoading,
  liveSync,
  onToggleLiveSync,
  onRunManual,
  onClearCanvas,
  onOpenNetlist,
  onSave,
  onLoad,
  results,
  version,
}) => {
  const getStatusBadge = () => {
    if (isLoading) {
      return (
        <div className="md-app-chip md-chip-blue">
          <Loader2 size={12} className="md-spin" />
          <span>Simulating (v{version})</span>
        </div>
      );
    }
    if (results?.status === 'timeout') {
      return (
        <div className="md-app-chip md-chip-amber">
          <Clock size={12} />
          <span>Backend Timeout</span>
        </div>
      );
    }
    if (results?.status === 'error') {
      const count = Object.keys(results.errors || {}).length;
      return (
        <div className="md-app-chip md-chip-red">
          <AlertCircle size={12} />
          <span>{count} Issue{count > 1 ? 's' : ''} Detected</span>
        </div>
      );
    }
    if (results?.status === 'success') {
      return (
        <div className="md-app-chip md-chip-green">
          <CheckCircle2 size={12} />
          <span>Synchronized (v{version})</span>
        </div>
      );
    }
    return (
      <div className="md-app-chip md-chip-neutral">
        <span className="md-dot-idle"></span>
        <span>Idle</span>
      </div>
    );
  };

  return (
    <header className="md-app-bar">
      <div className="md-bar-left">
        <div className="md-brand-group">
          <div className="md-brand-avatar">
            <Cpu size={18} />
          </div>
          <div>
            <div className="md-brand-title-row">
              <span className="md-brand-title">Circuit Simulator</span>
              <span className="md-version-tag">Ngspice Studio</span>
            </div>
            <span className="md-brand-meta">Operating Point DC Simulation</span>
          </div>
        </div>

        <div className="md-bar-divider"></div>

        {getStatusBadge()}
      </div>

      <div className="md-bar-right">
        {/* Live Synchronization Switch */}
        <div className="md-switch-container">
          <label className="md-switch">
            <input
              type="checkbox"
              checked={liveSync}
              onChange={onToggleLiveSync}
            />
            <span className="md-switch-track"></span>
          </label>
          <span className="md-switch-label">Live Sync</span>
        </div>

        {/* Manual Run button if live sync is off */}
        {!liveSync && (
          <button
            className="md-btn md-btn-primary"
            onClick={onRunManual}
            disabled={isLoading}
          >
            <Play size={14} />
            <span>Simulate</span>
          </button>
        )}

        {/* View Netlist */}
        <button
          className="md-btn md-btn-tonal"
          onClick={onOpenNetlist}
          title="Inspect generated SPICE netlist deck"
        >
          <FileCode size={14} />
          <span>SPICE Deck</span>
        </button>

        {/* Save / Open */}
        <button
          className="md-btn md-btn-outlined"
          onClick={onSave}
          title="Save graph configuration"
        >
          <Save size={14} />
          <span>Save</span>
        </button>

        <button
          className="md-btn md-btn-outlined"
          onClick={onLoad}
          title="Open saved circuit"
        >
          <FolderOpen size={14} />
          <span>Open</span>
        </button>

        {/* Clear */}
        <button
          className="md-btn md-btn-icon"
          onClick={onClearCanvas}
          title="Reset canvas"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </header>
  );
};
