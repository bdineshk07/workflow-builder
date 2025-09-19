// components/KnowledgeBase.jsx
import React, { useState } from "react";

export default function KnowledgeBase({ onDocumentUploaded }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setMessage(""); // Clear previous messages when a new file is selected
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      setMessage("Please select a PDF file.");
      return;
    }

    // Validate file size (e.g., max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setMessage("File size must be less than 10MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:8000/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Upload successful! Document ID: ${data.doc_id}`);
        if (onDocumentUploaded) {
          onDocumentUploaded(data.doc_id);
        }
        // Reset file input
        setFile(null);
        // Clear the file input value
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';
      } else {
        setMessage(`❌ Error: ${data.detail || "Upload failed"}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setMessage("❌ Error: Network error or server unavailable.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        setMessage("");
      } else {
        setMessage("Please drop a PDF file.");
      }
    }
  };

  return (
    <div style={{
      border: "2px dashed #ddd",
      borderRadius: 8,
      padding: 20,
      marginBottom: 20,
      background: "#fafafa",
      transition: "all 0.2s ease"
    }}>
      <h3 style={{ 
        margin: "0 0 16px", 
        fontSize: 16,
        color: "#333",
        fontWeight: "600"
      }}>
        📚 Knowledge Base Upload
      </h3>
      
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          border: file ? "2px solid #28a745" : "2px dashed #ccc",
          borderRadius: 6,
          padding: 16,
          textAlign: "center",
          background: "#fff",
          marginBottom: 12,
          minHeight: 60,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        {!file ? (
          <>
            <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
              Drag & drop a PDF file here, or click to browse
            </div>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              style={{
                padding: "6px 12px",
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 14,
                cursor: "pointer"
              }}
            />
          </>
        ) : (
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 8,
            color: "#28a745",
            fontWeight: "500"
          }}>
            <span>📄</span>
            <span>{file.name}</span>
            <span style={{ fontSize: 12, color: "#666" }}>
              ({Math.round(file.size / 1024)} KB)
            </span>
            <button
              onClick={() => {
                setFile(null);
                setMessage("");
                const fileInput = document.querySelector('input[type="file"]');
                if (fileInput) fileInput.value = '';
              }}
              style={{
                marginLeft: 8,
                padding: "2px 6px",
                background: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: 3,
                cursor: "pointer",
                fontSize: 12
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        style={{
          padding: "10px 16px",
          backgroundColor: !file || isUploading ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: !file || isUploading ? "not-allowed" : "pointer",
          fontSize: 14,
          fontWeight: "500",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8
        }}
      >
        {isUploading ? (
          <>
            <div style={{
              width: 16,
              height: 16,
              border: "2px solid #fff",
              borderTop: "2px solid transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }}></div>
            Uploading...
          </>
        ) : (
          "📤 Upload Document"
        )}
      </button>

      {message && (
        <div style={{
          marginTop: 12,
          padding: 10,
          borderRadius: 6,
          fontSize: 13,
          lineHeight: 1.4,
          background: message.includes("✅") ? "#d4edda" : "#f8d7da",
          color: message.includes("✅") ? "#155724" : "#721c24",
          border: `1px solid ${message.includes("✅") ? "#c3e6cb" : "#f5c6cb"}`
        }}>
          {message}
        </div>
      )}

      <div style={{
        marginTop: 12,
        fontSize: 12,
        color: "#666",
        lineHeight: 1.4
      }}>
        <strong>Supported:</strong> PDF files up to 10MB
        <br />
        <strong>Note:</strong> Documents will be processed and indexed for AI queries
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