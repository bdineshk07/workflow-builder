// components/ChatModal.jsx
import React from "react";

export default function ChatModal({
  chatOpen,
  setChatOpen,
  chatMessages,
  setChatMessages,
  chatInput,
  setChatInput,
  chatLoading,
  onSendChat,
}) {
  if (!chatOpen) return null;

  const handleInputChange = (e) => {
    setChatInput(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!chatLoading && chatInput.trim()) {
        onSendChat();
      }
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Clear all chat messages?")) {
      setChatMessages([]);
      setChatInput("");
    }
  };

  return (
    <div style={{
      position: "fixed",
      bottom: 20,
      right: 20,
      width: 420,
      height: 500,
      background: "#fff",
      border: "1px solid #ddd",
      borderRadius: 12,
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
      zIndex: 1000,
      overflow: "hidden"
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#f8f9fa",
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: 18,
          fontWeight: "600",
          color: "#333"
        }}>
          Chat with Stack
        </h3>
        <button
          onClick={() => setChatOpen(false)}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: 20,
            color: "#666",
            padding: "4px 8px",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#e9ecef";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "none";
          }}
          aria-label="Close chat"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        padding: 16,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        background: "#fafafa"
      }}>
        {chatMessages.length === 0 && (
          <div style={{
            color: "#666",
            fontSize: 14,
            fontStyle: "italic",
            textAlign: "center",
            padding: 20
          }}>
            Start a conversation with your AI workflow
          </div>
        )}

        {chatMessages.map((msg, i) => (
          <div
            key={i}
            style={{
              padding: 12,
              borderRadius: 12,
              background: msg.role === "user" ? "#007bff" : msg.role === "system" ? "#6c757d" : "#e9ecef",
              color: msg.role === "user" ? "#fff" : msg.role === "system" ? "#fff" : "#333",
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              fontSize: 14,
              lineHeight: 1.4,
              wordBreak: "break-word"
            }}
          >
            {msg.role === "system" && (
              <div style={{ 
                fontSize: 12, 
                opacity: 0.8, 
                marginBottom: 4,
                fontWeight: "500"
              }}>
                System
              </div>
            )}
            <pre style={{ 
              margin: 0, 
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              fontSize: "inherit"
            }}>
              {msg.text}
            </pre>
          </div>
        ))}

        {chatLoading && (
          <div style={{
            color: "#666",
            alignSelf: "center",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: 8
          }}>
            <div style={{
              width: 16,
              height: 16,
              border: "2px solid #ddd",
              borderTop: "2px solid #007bff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }}></div>
            Processing...
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{
        padding: 16,
        borderTop: "1px solid #eee",
        background: "#fff"
      }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            rows={2}
            value={chatInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
            disabled={chatLoading}
            style={{
              flex: 1,
              padding: 10,
              resize: "none",
              border: "1px solid #ddd",
              borderRadius: 8,
              fontFamily: "inherit",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              lineHeight: 1.4,
              minHeight: 44,
              maxHeight: 120
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#007bff";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#ddd";
            }}
          />

          <button
            onClick={onSendChat}
            disabled={chatLoading || !chatInput.trim()}
            style={{
              padding: "12px 16px",
              backgroundColor: chatLoading || !chatInput.trim() ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: "500",
              minWidth: 60,
              height: 44
            }}
          >
            {chatLoading ? "..." : "Send"}
          </button>
        </div>

        <div style={{ 
          marginTop: 8, 
          display: "flex", 
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <button
            onClick={handleClearChat}
            style={{
              padding: "6px 12px",
              backgroundColor: "transparent",
              color: "#6c757d",
              border: "1px solid #ddd",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: "500"
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f8f9fa";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
            }}
          >
            Clear Chat
          </button>
          
          <div style={{
            fontSize: 12,
            color: "#999"
          }}>
            {chatMessages.length} messages
          </div>
        </div>
      </div>

      {/* Add CSS animation for loading spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}