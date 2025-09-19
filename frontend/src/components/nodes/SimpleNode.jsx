// components/nodes/SimpleNode.jsx
import React from "react";
import { Handle, Position } from "reactflow";

const nodeTypeIcons = {
  user_query: "👤",
  knowledge_base: "📚",
  llm_engine: "🤖",
  output: "📤"
};

const nodeTypeColors = {
  user_query: "#e3f2fd",
  knowledge_base: "#f3e5f5",
  llm_engine: "#e8f5e8",
  output: "#fff3e0"
};

const nodeTypeBorders = {
  user_query: "#2196f3",
  knowledge_base: "#9c27b0",
  llm_engine: "#4caf50",
  output: "#ff9800"
};

export default function SimpleNode({ data, selected }) {
  const nodeType = data.nodeType || "simple";
  const icon = nodeTypeIcons[nodeType] || "⚙️";
  const bgColor = nodeTypeColors[nodeType] || "#f5f5f5";
  const borderColor = nodeTypeBorders[nodeType] || "#ddd";

  const nodeStyle = {
    padding: 12,
    borderRadius: 8,
    border: `2px solid ${selected ? borderColor : "#ddd"}`,
    minWidth: 140,
    background: bgColor,
    transition: "all 0.2s ease",
    cursor: "pointer",
    boxShadow: selected ? `0 0 0 2px ${borderColor}40` : "0 2px 4px rgba(0,0,0,0.1)",
    position: "relative"
  };

  const handleStyle = {
    width: 12,
    height: 12,
    borderRadius: "50%",
    border: `2px solid ${borderColor}`,
    background: "#fff"
  };

  return (
    <div style={nodeStyle}>
      {/* Node Header */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 8,
        marginBottom: data.config && Object.keys(data.config).length > 0 ? 8 : 0
      }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div style={{ 
          fontWeight: "600", 
          fontSize: 14,
          color: "#333"
        }}>
          {data.label}
        </div>
      </div>

      {/* Node Configuration Display */}
      {data.config && Object.keys(data.config).length > 0 && (
        <div style={{ 
          fontSize: 11, 
          color: "#666",
          background: "rgba(255,255,255,0.7)",
          padding: 6,
          borderRadius: 4,
          border: "1px solid rgba(0,0,0,0.1)"
        }}>
          {Object.entries(data.config)
            .filter(([value]) => value !== "" && value !== null && value !== undefined)
            .slice(0, 3) // Show max 3 config items
            .map(([key, value]) => (
              <div key={key} style={{ marginBottom: 2 }}>
                <span style={{ fontWeight: "500" }}>{key}:</span>{" "}
                <span>{typeof value === "boolean" ? (value ? "✓" : "✗") : String(value)}</span>
              </div>
            ))}
          {Object.keys(data.config).length > 3 && (
            <div style={{ color: "#999", fontStyle: "italic" }}>
              +{Object.keys(data.config).length - 3} more...
            </div>
          )}
        </div>
      )}

      {/* Connection Handles */}
      {nodeType === "user_query" && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            ...handleStyle,
            right: -8
          }}
        />
      )}

      {(nodeType === "knowledge_base" || nodeType === "llm_engine") && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            style={{
              ...handleStyle,
              left: -8
            }}
          />
          <Handle
            type="source"
            position={Position.Right}
            style={{
              ...handleStyle,
              right: -8
            }}
          />
        </>
      )}

      {nodeType === "output" && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            ...handleStyle,
            left: -8
          }}
        />
      )}

      {/* Selection Indicator */}
      {selected && (
        <div style={{
          position: "absolute",
          top: -2,
          right: -2,
          width: 16,
          height: 16,
          background: borderColor,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 10,
          fontWeight: "bold"
        }}>
          ✓
        </div>
      )}
    </div>
  );
}