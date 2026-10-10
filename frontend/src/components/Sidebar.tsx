import React, { useState } from 'react';
import {
  Binary,
  Plus,
  Minus,
  Asterisk,
  Slash,
  Gauge,
  FunctionSquare,
  Component,
  FlaskConical,
  AlertCircle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { NodeType, ExecutionResult } from '../types';
import { PRESET_GRAPHS } from '../presetGraphs';

interface SidebarProps {
  onAddNode: (type: NodeType) => void;
  onLoadPreset: (presetId: string) => void;
  activePresetId: string | null;
  results: ExecutionResult | null;
  nodeCount: number;
  edgeCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onAddNode,
  onLoadPreset,
  activePresetId,
  results,
  nodeCount,
  edgeCount,
}) => {
  const [activeTab, setActiveTab] = useState<'components' | 'presets'>('components');

  const paletteItems: { type: NodeType; label: string; icon: React.ReactNode; spiceModel: string }[] = [
    { type: 'Number', label: 'Constant DC', icon: <Binary size={16} />, spiceModel: 'V_source' },
    { type: 'Add', label: 'Addition', icon: <Plus size={16} />, spiceModel: 'B_add' },
    { type: 'Subtract', label: 'Subtraction', icon: <Minus size={16} />, spiceModel: 'B_sub' },
    { type: 'Multiply', label: 'Multiplication', icon: <Asterisk size={16} />, spiceModel: 'B_mult' },
    { type: 'Divide', label: 'Division', icon: <Slash size={16} />, spiceModel: 'B_div' },
    { type: 'Formula', label: 'Expression', icon: <FunctionSquare size={16} />, spiceModel: 'B_func' },
    { type: 'Display', label: 'Voltmeter Probe', icon: <Gauge size={16} />, spiceModel: 'Probe' },
  ];

  return (
    <aside className="md-sidebar">
      {/* Segmented Tab Navigation */}
      <div className="md-segmented-control">
        <button
          className={`md-segment-btn ${activeTab === 'components' ? 'active' : ''}`}
          onClick={() => setActiveTab('components')}
        >
          <Component size={14} />
          <span>Components</span>
        </button>
        <button
          className={`md-segment-btn ${activeTab === 'presets' ? 'active' : ''}`}
          onClick={() => setActiveTab('presets')}
        >
          <FlaskConical size={14} />
          <span>Acceptance Tests</span>
        </button>
      </div>

      <div className="md-sidebar-scrollable">
        {activeTab === 'components' ? (
          <div className="md-section">
            <div className="md-section-meta">
              <span className="md-section-title">Component Palette</span>
              <span className="md-section-sub">Select to place on canvas</span>
            </div>

            <div className="md-palette-list">
              {paletteItems.map(item => (
                <button
                  key={item.type}
                  className="md-palette-card"
                  onClick={() => onAddNode(item.type)}
                >
                  <div className="md-palette-leading">
                    {item.icon}
                  </div>
                  <div className="md-palette-content">
                    <span className="md-palette-name">{item.label}</span>
                    <span className="md-palette-model">{item.spiceModel}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="md-section">
            <div className="md-section-meta">
              <span className="md-section-title">Acceptance Test Cases</span>
              <span className="md-section-sub">8 Reference graphs per specification</span>
            </div>

            <div className="md-test-list">
              {PRESET_GRAPHS.map(preset => {
                const isActive = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    className={`md-test-card ${isActive ? 'selected' : ''}`}
                    onClick={() => onLoadPreset(preset.id)}
                  >
                    <div className="md-test-header">
                      <span className="md-test-title">{preset.title}</span>
                      <span className="md-test-cat">{preset.category}</span>
                    </div>
                    <span className="md-test-desc">{preset.description}</span>
                    <div className="md-test-target">
                      <span className="md-target-label">Target:</span>
                      <span className="md-target-val">{preset.expectedResult}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Diagnostics Panel at Footer */}
      <div className="md-sidebar-footer">
        <div className="md-stat-strip">
          <div className="md-stat-item">
            <span className="md-stat-value">{nodeCount}</span>
            <span className="md-stat-key">Nodes</span>
          </div>
          <div className="md-stat-divider"></div>
          <div className="md-stat-item">
            <span className="md-stat-value">{edgeCount}</span>
            <span className="md-stat-key">Wires</span>
          </div>
        </div>

        {results?.errors && Object.keys(results.errors).length > 0 && (
          <div className="md-diag-alert">
            <div className="md-alert-header">
              <AlertCircle size={13} />
              <span>Diagnostic Exceptions</span>
            </div>
            <ul className="md-alert-list">
              {Object.entries(results.errors).map(([nodeId, errMsg]) => (
                <li key={nodeId}>
                  <code>{nodeId}</code>: {errMsg}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="md-help-note">
          <Info size={12} />
          <span>Output to Input routing. 1 wire maximum per target port.</span>
        </div>
      </div>
    </aside>
  );
};
