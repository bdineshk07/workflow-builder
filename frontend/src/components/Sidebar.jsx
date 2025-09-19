// components/Sidebar.jsx
import React from "react";

export default function Sidebar({ handleBuild, handleChatOpen, buildErrors }) {
  const items = [
    { type: "user_query", label: "User Query" },
    { type: "knowledge_base", label: "KnowledgeBase" },
    { type: "llm_engine", label: "LLM Engine" },
    { type: "output", label: "Output" },
  ];

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const buttonStyle = {
    padding: "10px 14px",
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    marginBottom: 8,
    width: "100%",
    fontSize: "14px",
    fontWeight: "500"
  };

  const itemStyle = {
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#fafafa",
    cursor: "grab",
    fontSize: 14,
    fontWeight: "500",
    transition: "all 0.2s ease",
    userSelect: "none"
  };

  return (
    <aside style={{ 
      width: 200, 
      padding: 16, 
      borderRight: "1px solid #e6e6e6", 
      background: "#fff",
      display: "flex",
      flexDirection: "column"
    }}>
      <h3 style={{ 
        marginTop: 0, 
        marginBottom: 20,
        fontSize: 18,
        color: "#333"
      }}>
        Components
      </h3>
      
      {items.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => onDragStart(e, item.type)}
          style={itemStyle}
          onMouseEnter={(e) => {
            e.target.style.background = "#f0f0f0";
            e.target.style.transform = "translateY(-1px)";
            e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#fafafa";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "none";
          }}
        >
          {item.label}
        </div>
      ))}
      
      <div style={{ marginTop: 24 }}>
        <button 
          onClick={handleBuild} 
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.target.style.background = "#0056b3";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#007bff";
          }}
        >
          Build Stack
        </button>
        
        <button 
          onClick={handleChatOpen}
          style={{
            ...buttonStyle,
            background: "#28a745"
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#218838";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#28a745";
          }}
        >
          Chat with Stack
        </button>
      </div>

      {buildErrors.length > 0 && (
        <div style={{ 
          marginTop: 16, 
          padding: 12,
          background: "#ffeaea",
          border: "1px solid #ffcdd2",
          borderRadius: 6,
          fontSize: 13
        }}>
          <div style={{ 
            fontWeight: "600", 
            color: "#d32f2f",
            marginBottom: 8
          }}>
            Build Errors
          </div>
          <ul style={{ 
            margin: 0, 
            paddingLeft: 16,
            color: "#d32f2f"
          }}>
            {buildErrors.map((error, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}