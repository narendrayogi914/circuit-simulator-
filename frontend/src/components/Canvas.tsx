import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  addEdge,
  Connection,
  Edge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ConnectionLineType,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, Folder, AlertTriangle } from 'lucide-react';

import { nodeTypes } from './nodes';
import { CircuitNode, CircuitEdge, NodeType, ExecutionResult } from '../types';
import { executeGraph, saveGraph, loadGraph, listGraphs } from '../api';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { NetlistViewer } from './NetlistViewer';
import { PRESET_GRAPHS } from '../presetGraphs';

export const Canvas: React.FC = () => {
  const initialPreset = PRESET_GRAPHS[0];
  const [nodes, setNodes, onNodesChange] = useNodesState<CircuitNode>(initialPreset.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CircuitEdge>(initialPreset.edges);

  const [results, setResults] = useState<ExecutionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [liveSync, setLiveSync] = useState<boolean>(true);
  const [activePresetId, setActivePresetId] = useState<string | null>(initialPreset.id);
  const [isNetlistOpen, setIsNetlistOpen] = useState<boolean>(false);
  const [savedGraphsList, setSavedGraphsList] = useState<any[]>([]);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const versionRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotification = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const executeCircuit = useCallback(
    async (currentNodes: CircuitNode[], currentEdges: CircuitEdge[]) => {
      setIsLoading(true);
      versionRef.current += 1;
      const thisVersion = versionRef.current;

      try {
        const res = await executeGraph(currentNodes, currentEdges, thisVersion);
        if (res.version >= versionRef.current) {
          setResults(res);
        }
      } catch (err: any) {
        if (thisVersion >= versionRef.current) {
          setResults({
            status: 'error',
            values: {},
            errors: { global: err.message || 'Network exception' },
            version: thisVersion,
          });
        }
      } finally {
        if (thisVersion >= versionRef.current) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  const triggerDebouncedExecution = useCallback(
    (newNodes?: CircuitNode[], newEdges?: CircuitEdge[]) => {
      if (!liveSync) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        executeCircuit(newNodes || nodes, newEdges || edges);
      }, 300);
    },
    [liveSync, nodes, edges, executeCircuit]
  );

  useEffect(() => {
    executeCircuit(nodes, edges);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []); // eslint-disable-line

  const handleValueChange = useCallback(
    (nodeId: string, value: number) => {
      setNodes(nds => {
        const updated = nds.map(n =>
          n.id === nodeId ? { ...n, data: { ...n.data, value } } : n
        );
        triggerDebouncedExecution(updated, edges);
        return updated;
      });
    },
    [setNodes, edges, triggerDebouncedExecution]
  );

  const handleFormulaChange = useCallback(
    (nodeId: string, formula: string) => {
      setNodes(nds => {
        const updated = nds.map(n =>
          n.id === nodeId ? { ...n, data: { ...n.data, formula } } : n
        );
        triggerDebouncedExecution(updated, edges);
        return updated;
      });
    },
    [setNodes, edges, triggerDebouncedExecution]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find(n => n.id === connection.source);
      const targetNode = nodes.find(n => n.id === connection.target);

      if (!sourceNode || !targetNode) return;

      if (sourceNode.type === 'Display') {
        showNotification('Display probes cannot output signals to other components.');
        return;
      }

      if (connection.source === connection.target) {
        showNotification('Recursive self-loop connections are prohibited.');
        return;
      }

      const alreadyConnected = edges.some(
        e => e.target === connection.target && e.targetHandle === connection.targetHandle
      );
      if (alreadyConnected) {
        showNotification(`Port "${connection.targetHandle || 'input'}" already has a wire connected.`);
        return;
      }

      const newEdge: CircuitEdge = {
        id: `e_${connection.source}_${connection.sourceHandle || 'out'}_${connection.target}_${connection.targetHandle || 'in'}_${Date.now()}`,
        source: connection.source,
        sourceHandle: connection.sourceHandle,
        target: connection.target,
        targetHandle: connection.targetHandle,
        animated: true,
      };

      setEdges(eds => {
        const updated = addEdge(newEdge, eds) as CircuitEdge[];
        triggerDebouncedExecution(nodes, updated);
        return updated;
      });
    },
    [nodes, edges, setEdges, triggerDebouncedExecution, showNotification]
  );

  const handleAddNode = useCallback(
    (type: NodeType) => {
      const id = `${type.toLowerCase()}_${Date.now().toString().slice(-4)}`;
      const x = 240 + Math.random() * 200;
      const y = 140 + Math.random() * 200;

      const newNode: CircuitNode = {
        id,
        type,
        position: { x, y },
        data: {
          value: type === 'Number' ? 5 : undefined,
          formula: type === 'Formula' ? 'a * 2 + b' : undefined,
        },
      };

      setNodes(nds => {
        const updated = [...nds, newNode];
        triggerDebouncedExecution(updated, edges);
        return updated;
      });
    },
    [setNodes, edges, triggerDebouncedExecution]
  );

  const handleLoadPreset = useCallback(
    (presetId: string) => {
      const preset = PRESET_GRAPHS.find(p => p.id === presetId);
      if (!preset) return;

      setActivePresetId(preset.id);
      setNodes(preset.nodes);
      setEdges(preset.edges);
      executeCircuit(preset.nodes, preset.edges);
    },
    [setNodes, setEdges, executeCircuit]
  );

  const handleClearCanvas = useCallback(() => {
    setActivePresetId(null);
    setNodes([]);
    setEdges([]);
    setResults(null);
    showNotification('Canvas cleared.');
  }, [setNodes, setEdges, showNotification]);

  const handleSave = useCallback(async () => {
    const name = prompt('Circuit label:', 'Circuit Experiment') || 'Untitled Circuit';
    try {
      const id = await saveGraph(name, nodes, edges);
      showNotification(`Saved circuit configuration (${id}).`);
    } catch (err: any) {
      showNotification(`Save error: ${err.message}`);
    }
  }, [nodes, edges, showNotification]);

  const handleOpenLoadModal = useCallback(async () => {
    try {
      const list = await listGraphs();
      setSavedGraphsList(list);
      setIsLoadModalOpen(true);
    } catch (err: any) {
      showNotification(`List fetch error: ${err.message}`);
    }
  }, [showNotification]);

  const handleSelectLoadGraph = useCallback(
    async (id: string) => {
      try {
        const loaded = await loadGraph(id);
        if (loaded && loaded.nodes) {
          setNodes(loaded.nodes);
          setEdges(loaded.edges || []);
          setIsLoadModalOpen(false);
          setActivePresetId(null);
          executeCircuit(loaded.nodes, loaded.edges || []);
          showNotification(`Loaded circuit: ${loaded.name}`);
        }
      } catch (err: any) {
        showNotification(`Load error: ${err.message}`);
      }
    },
    [setNodes, setEdges, executeCircuit, showNotification]
  );

  const decoratedNodes = nodes.map(n => ({
    ...n,
    data: {
      ...n.data,
      results,
      onValueChange: handleValueChange,
      onFormulaChange: handleFormulaChange,
    },
  }));

  const decoratedEdges = edges.map(e => ({
    ...e,
    type: ConnectionLineType.SmoothStep,
    style: { stroke: '#0284c7', strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#0284c7',
      width: 12,
      height: 12,
    },
  }));

  return (
    <div className="md-app-viewport">
      <Topbar
        isLoading={isLoading}
        liveSync={liveSync}
        onToggleLiveSync={() => setLiveSync(!liveSync)}
        onRunManual={() => executeCircuit(nodes, edges)}
        onClearCanvas={handleClearCanvas}
        onOpenNetlist={() => setIsNetlistOpen(true)}
        onSave={handleSave}
        onLoad={handleOpenLoadModal}
        results={results}
        version={versionRef.current}
      />

      <div className="md-app-body">
        <div className="md-canvas-container">
          <ReactFlow
            nodes={decoratedNodes}
            edges={decoratedEdges as Edge[]}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            minZoom={0.25}
            maxZoom={2.0}
            defaultEdgeOptions={{ animated: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#334155"
            />
            <Controls className="md-flow-controls" />
            <MiniMap
              className="md-flow-minimap"
              nodeColor={n => {
                if (n.type === 'Number') return '#3b82f6';
                if (n.type === 'Display') return '#f59e0b';
                if (n.type === 'Formula') return '#8b5cf6';
                return '#10b981';
              }}
              maskColor="rgba(15, 23, 42, 0.75)"
            />
          </ReactFlow>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="md-toast-banner">
              <AlertTriangle size={14} />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        <Sidebar
          onAddNode={handleAddNode}
          onLoadPreset={handleLoadPreset}
          activePresetId={activePresetId}
          results={results}
          nodeCount={nodes.length}
          edgeCount={edges.length}
        />
      </div>

      <NetlistViewer
        isOpen={isNetlistOpen}
        onClose={() => setIsNetlistOpen(false)}
        netlist={results?.netlist}
        engineSource={results?.source}
      />

      {isLoadModalOpen && (
        <div className="md-dialog-scrim" onClick={() => setIsLoadModalOpen(false)}>
          <div className="md-dialog" onClick={e => e.stopPropagation()}>
            <div className="md-dialog-header">
              <div className="md-dialog-title-group">
                <div className="md-dialog-icon">
                  <Folder size={16} />
                </div>
                <div>
                  <h3 className="md-dialog-headline">Open Circuit</h3>
                  <p className="md-dialog-supporting-text">Load previously stored circuit topology</p>
                </div>
              </div>
              <button className="md-btn-icon-subtle" onClick={() => setIsLoadModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="md-dialog-content">
              {savedGraphsList.length === 0 ? (
                <div className="md-empty-view">
                  <span>No saved configurations found in storage database.</span>
                </div>
              ) : (
                <div className="md-record-list">
                  {savedGraphsList.map(g => (
                    <div key={g._id || g.id} className="md-record-item">
                      <div className="md-record-info">
                        <span className="md-record-name">{g.name || 'Untitled Circuit'}</span>
                        <span className="md-record-meta">
                          {g.nodes?.length || 0} nodes • {new Date(g.createdAt || Date.now()).toLocaleTimeString()}
                        </span>
                      </div>
                      <button
                        className="md-btn md-btn-primary"
                        onClick={() => handleSelectLoadGraph(g._id || g.id)}
                      >
                        Load
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md-dialog-actions">
              <button className="md-btn md-btn-tonal" onClick={() => setIsLoadModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
