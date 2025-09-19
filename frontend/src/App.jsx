// frontend/src/App.jsx
import React, { useCallback, useRef, useState, useEffect } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";

// Import components
import KnowledgeBase from "./components/KnowledgeBase";
import ChatModal from "./components/ChatModal";
import ConfigPanel from "./components/ConfigPanel";
import Sidebar from "./components/Sidebar";
import SimpleNode from "./components/nodes/SimpleNode";

// Import utilities
import { genId, defaultLabelForType, defaultConfigForType } from "./utils/workflowUtils";

/* -----------------------
   Custom node types
   ----------------------- */
const nodeTypes = {
  user_query: SimpleNode,
  knowledge_base: SimpleNode,
  llm_engine: SimpleNode,
  output: SimpleNode,
};

/* -----------------------
   Main App
   ----------------------- */
export default function App() {
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [_isBuilt, setIsBuilt] = useState(false);
  const [buildErrors, setBuildErrors] = useState([]);

  const [docIds, setDocIds] = useState([]);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");

  // Chat modal state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Initialize with example node
  useEffect(() => {
    if (nodes.length === 0) {
      const outputNode = {
        id: genId(),
        type: "output",
        position: { x: 600, y: 50 },
        data: { 
          label: defaultLabelForType("output"), 
          config: defaultConfigForType("output"),
          nodeType: "output"
        },
      };
      setNodes([outputNode]);
    }
  }, [nodes.length, setNodes]);

  /* -----------------------
     Document handling
     ----------------------- */
  const handleDocumentUploaded = (docId) => {
    setDocIds((prev) => [...prev, docId]);
  };

  const handleAsk = async () => {
    const workflowDefinition = {
      steps: [
        { type: "user_query" },
        { type: "knowledge_base" },
        { type: "llm_engine" },
        { type: "output" },
      ],
    };

    try {
      const response = await fetch("http://localhost:8000/workflow/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_definition: workflowDefinition,
          user_query: query,
          doc_ids: docIds,
        }),
      });

      const data = await response.json();
      setAnswer(data.response || "No response received");
    } catch (error) {
      console.error("Error running workflow:", error);
      setAnswer("Error running workflow");
    }
  };

  /* -----------------------
     Drag & Drop from Sidebar
     ----------------------- */
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();

    const type = event.dataTransfer.getData("application/reactflow");
    if (!type) return;

    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    const newNode = {
      id: genId(),
      type,
      position,
      data: {
        label: defaultLabelForType(type),
        config: defaultConfigForType(type),
        nodeType: type,
      },
    };

    setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance, setNodes]);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ ...params, animated: true }, eds));
  }, [setEdges]);

  /* -----------------------
     Selection & Config Panel
     ----------------------- */
  const onNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const updateSelectedNodeConfig = useCallback((patch = {}) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== selectedNodeId) return n;
        const newConfig = { ...(n.data?.config || {}), ...patch };
        return { ...n, data: { ...n.data, config: newConfig } };
      })
    );
  }, [selectedNodeId, setNodes]);

  /* -----------------------
     Workflow validation
     ----------------------- */
  const validateWorkflow = useCallback((nodesList = nodes, edgesList = edges) => {
    const errs = [];
    
    if (!nodesList || nodesList.length === 0) {
      errs.push("No nodes on the canvas.");
      return errs;
    }

    const nodeTypeById = {};
    nodesList.forEach((n) => (nodeTypeById[n.id] = n.data?.nodeType || n.type));

    // Check required node types
    const hasUser = nodesList.some((n) => (n.data?.nodeType || n.type) === "user_query");
    const hasLLM = nodesList.some((n) => (n.data?.nodeType || n.type) === "llm_engine");
    const hasOutput = nodesList.some((n) => (n.data?.nodeType || n.type) === "output");

    if (!hasUser) errs.push("Missing User Query node (at least one required).");
    if (!hasLLM) errs.push("Missing LLM Engine node (at least one required).");
    if (!hasOutput) errs.push("Missing Output node (at least one required).");

    // Build adjacency for cycle detection
    const adj = {};
    edgesList.forEach((e) => {
      if (!nodeTypeById[e.source]) errs.push(`Edge source ${e.source} does not exist.`);
      if (!nodeTypeById[e.target]) errs.push(`Edge target ${e.target} does not exist.`);
      adj[e.source] = adj[e.source] || [];
      adj[e.source].push(e.target);
    });

    // Detect cycles using DFS
    const visited = {};
    const recStack = {};
    
    function hasCycleDFS(nodeId) {
      visited[nodeId] = true;
      recStack[nodeId] = true;
      
      const neighbors = adj[nodeId] || [];
      for (const neighbor of neighbors) {
        if (!visited[neighbor]) {
          if (hasCycleDFS(neighbor)) return true;
        } else if (recStack[neighbor]) {
          return true;
        }
      }
      
      recStack[nodeId] = false;
      return false;
    }

    for (const node of nodesList) {
      if (!visited[node.id] && hasCycleDFS(node.id)) {
        errs.push("Cycle detected in the workflow (no cycles allowed).");
        break;
      }
    }

    // Check for valid path from user_query to output through llm_engine
    const userNodes = nodesList.filter((n) => (n.data?.nodeType || n.type) === "user_query");
    let hasValidPath = false;
    
    for (const userNode of userNodes) {
      const visited = new Set();
      const queue = [userNode.id];
      let foundLLM = false;
      let foundOutput = false;
      
      while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current)) continue;
        visited.add(current);
        
        const nodeType = nodeTypeById[current];
        if (nodeType === "llm_engine") foundLLM = true;
        if (nodeType === "output") foundOutput = true;
        
        const neighbors = adj[current] || [];
        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor)) queue.push(neighbor);
        });
      }
      
      if (foundLLM && foundOutput) {
        hasValidPath = true;
        break;
      }
    }
    
    if (!hasValidPath) {
      errs.push("No valid path from User Query → LLM Engine → Output detected. Ensure nodes are connected properly.");
    }

    return errs;
  }, [nodes, edges]);

  /* -----------------------
     Build Stack
     ----------------------- */
  const handleBuild = useCallback(() => {
    const errs = validateWorkflow();
    setBuildErrors(errs);
    
    if (errs.length === 0) {
      setIsBuilt(true);
      alert("Build successful! You can now 'Chat with Stack'.");
    } else {
      setIsBuilt(false);
    }
  }, [validateWorkflow]);

  /* -----------------------
     Chat functionality
     ----------------------- */
  const buildWorkflowPayload = useCallback(() => {
    const wfNodes = nodes.map((n) => ({
      id: n.id,
      type: n.data?.nodeType || n.type,
      config: n.data?.config || {},
    }));
    
    const wfEdges = edges.map((e) => ({
      from: e.source,
      to: e.target,
    }));
    
    return { nodes: wfNodes, edges: wfEdges };
  }, [nodes, edges]);

  const onSendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text }]);
    setChatLoading(true);

    try {
      const workflow = buildWorkflowPayload();
      const response = await fetch("http://localhost:8000/api/run_workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow, query: text }),
      });
      
      const data = await response.json();
      
      if (data.answer) {
        setChatMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
      } else if (data.error) {
        setChatMessages((prev) => [...prev, { role: "assistant", text: `Error: ${data.error}` }]);
      } else {
        setChatMessages((prev) => [...prev, { role: "assistant", text: JSON.stringify(data) }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((prev) => [...prev, { role: "assistant", text: `Error: ${error.message}` }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, buildWorkflowPayload]);

  const handleChatOpen = useCallback(() => {
    const errs = validateWorkflow();
    setBuildErrors(errs);
    
    if (errs.length === 0) {
      setChatOpen(true);
      setChatMessages([{ 
        role: "system", 
        text: "Chat started. Your workflow will be executed for each query." 
      }]);
    } else {
      alert("Fix build errors before chatting: " + errs.join("; "));
    }
  }, [validateWorkflow]);

  /* -----------------------
     Render
     ----------------------- */
  return (
    <div style={{ 
      display: "flex", 
      height: "100vh", 
      fontFamily: "system-ui, Arial, sans-serif" 
    }}>
      {/* Sidebar */}
      <Sidebar 
        handleBuild={handleBuild}
        handleChatOpen={handleChatOpen}
        buildErrors={buildErrors}
      />

      {/* Left panel: KnowledgeBase */}
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        width: "320px", 
        borderRight: "1px solid #ddd", 
        padding: "16px", 
        overflowY: "auto",
        background: "#fff"
      }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ margin: "0 0 16px", fontSize: "24px" }}>AI Workflow Builder</h1>
          
          <KnowledgeBase onDocumentUploaded={handleDocumentUploaded} />
          
          <div style={{ marginTop: "16px" }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question..."
              style={{ 
                width: "100%", 
                padding: "8px", 
                marginBottom: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            />
            <button 
              onClick={handleAsk}
              style={{
                padding: "8px 16px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Ask
            </button>
            {answer && (
              <div style={{ 
                marginTop: "12px", 
                padding: "8px", 
                background: "#f8f9fa", 
                borderRadius: "4px",
                fontSize: "14px"
              }}>
                <strong>Answer:</strong> {answer}
              </div>
            )}
          </div>
        </div>

        {/* Config Panel */}
        <ConfigPanel
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          setNodes={setNodes}
          setEdges={setEdges}
          setSelectedNodeId={setSelectedNodeId}
          updateSelectedNodeConfig={updateSelectedNodeConfig}
        />
      </div>

      {/* Main canvas */}
      <div ref={reactFlowWrapper} style={{ flex: 1, position: "relative" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>

      {/* Chat modal */}
      <ChatModal
        chatOpen={chatOpen}
        setChatOpen={setChatOpen}
        chatMessages={chatMessages}
        setChatMessages={setChatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        chatLoading={chatLoading}
        onSendChat={onSendChat}
      />
    </div>
  );
}