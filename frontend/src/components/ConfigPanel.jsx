// components/ConfigPanel.jsx
import React from "react";

export default function ConfigPanel({ 
  nodes, 
  selectedNodeId, 
  setNodes, 
  setEdges, 
  setSelectedNodeId, 
  updateSelectedNodeConfig 
}) {
  const node = nodes.find((n) => n.id === selectedNodeId);
  
  const inputStyle = { 
    width: "100%", 
    padding: 8, 
    marginTop: 8, 
    borderRadius: 4, 
    border: "1px solid #ddd",
    fontSize: "14px",
    boxSizing: "border-box"
  };
  
  const labelStyle = { 
    fontSize: 14, 
    display: "block", 
    marginTop: 12,
    marginBottom: 4,
    fontWeight: "500",
    color: "#333"
  };
  
  const buttonStyle = { 
    padding: "10px 16px", 
    background: "#dc3545", 
    color: "#fff", 
    border: "none", 
    borderRadius: 6, 
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    marginTop: "16px"
  };

  if (!node) {
    return (
      <div style={{ 
        padding: 16, 
        borderTop: "1px solid #e6e6e6", 
        background: "#f8f9fa",
        minHeight: "200px"
      }}>
        <h3 style={{ 
          margin: "0 0 16px", 
          fontSize: 18,
          color: "#333"
        }}>
          Configuration
        </h3>
        <div style={{ 
          color: "#666", 
          fontSize: 14,
          fontStyle: "italic"
        }}>
          Select a node to edit its configuration
        </div>
      </div>
    );
  }

  const cfg = node.data?.config || {};
  const nodeType = node.data?.nodeType || node.type;

  return (
    <div style={{ 
      padding: 16, 
      borderTop: "1px solid #e6e6e6", 
      background: "#f8f9fa"
    }}>
      <h3 style={{ 
        margin: "0 0 8px", 
        fontSize: 18,
        color: "#333"
      }}>
        {node.data?.label}
      </h3>
      
      <div style={{ 
        fontSize: 14, 
        color: "#666",
        marginBottom: 16,
        padding: "4px 8px",
        background: "#e9ecef",
        borderRadius: 4,
        display: "inline-block"
      }}>
        Type: {nodeType}
      </div>

      <div>
        {nodeType === "knowledge_base" && (
          <>
            <label style={labelStyle}>Collection Name</label>
            <input
              type="text"
              value={cfg.collection || ""}
              onChange={(e) => updateSelectedNodeConfig({ collection: e.target.value })}
              style={inputStyle}
              placeholder="Enter collection name"
            />
            
            <label style={labelStyle}>Top K Results</label>
            <input
              type="number"
              min="1"
              max="50"
              value={cfg.top_k || 5}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value >= 1 && value <= 50) {
                  updateSelectedNodeConfig({ top_k: value });
                }
              }}
              style={inputStyle}
            />
          </>
        )}

        {nodeType === "llm_engine" && (
          <>
            <label style={labelStyle}>Model</label>
            <input
              type="text"
              value={cfg.model || ""}
              onChange={(e) => updateSelectedNodeConfig({ model: e.target.value })}
              style={inputStyle}
              placeholder="e.g., gpt-3.5-turbo"
            />
            
            <label style={labelStyle}>Temperature</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={cfg.temperature ?? 0.0}
              onChange={(e) => updateSelectedNodeConfig({ temperature: Number(e.target.value) })}
              style={inputStyle}
            />
            
            <label style={{
              ...labelStyle,
              display: "flex",
              alignItems: "center",
              cursor: "pointer"
            }}>
              <input
                type="checkbox"
                checked={cfg.use_kb_context ?? true}
                onChange={(e) => updateSelectedNodeConfig({ use_kb_context: e.target.checked })}
                style={{ marginRight: 8 }}
              />
              Use Knowledge Base Context
            </label>
            
            <label style={labelStyle}>Custom Prompt (Optional)</label>
            <textarea
              value={cfg.custom_prompt || ""}
              onChange={(e) => updateSelectedNodeConfig({ custom_prompt: e.target.value })}
              style={{
                ...inputStyle,
                minHeight: "80px",
                resize: "vertical"
              }}
              placeholder="Enter custom prompt template..."
            />
          </>
        )}

        {(nodeType === "user_query" || nodeType === "output") && (
          <div style={{ 
            color: "#666", 
            fontSize: 14, 
            fontStyle: "italic",
            padding: 12,
            background: "#fff",
            borderRadius: 6,
            border: "1px solid #e9ecef"
          }}>
            No configuration required for the {node.data?.label} node.
          </div>
        )}
      </div>

      <button
        onClick={() => {
          if (window.confirm(`Are you sure you want to delete the "${node.data?.label}" node?`)) {
            setNodes((nds) => nds.filter((n) => n.id !== node.id));
            setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
            setSelectedNodeId(null);
          }
        }}
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.target.style.background = "#c82333";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "#dc3545";
        }}
      >
        Delete Node
      </button>
    </div>
  );
}