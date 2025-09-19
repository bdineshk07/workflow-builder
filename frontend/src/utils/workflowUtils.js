// src/utils/workflow.js

/**
 * Generate a unique ID for nodes and edges
 */
export const genId = () => 
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Get default label for a node type
 */
export const defaultLabelForType = (type) => {
  const labels = {
    user_query: "User Query",
    knowledge_base: "Knowledge Base",
    llm_engine: "LLM Engine",
    output: "Output"
  };
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
};

/**
 * Get default configuration for a node type
 */
export const defaultConfigForType = (type) => {
  const configs = {
    knowledge_base: { 
      collection: "kb_default", 
      top_k: 5 
    },
    llm_engine: { 
      model: "gpt-3.5-turbo", 
      temperature: 0.0, 
      use_kb_context: true, 
      custom_prompt: "" 
    },
    user_query: {},
    output: {}
  };
  return configs[type] || {};
};

/**
 * Validate workflow structure and connections
 */
export const validateWorkflow = (nodes, edges) => {
  const errors = [];
  
  if (!nodes || nodes.length === 0) {
    errors.push("No nodes found in the workflow.");
    return errors;
  }

  // Create node type mapping
  const nodeTypeById = {};
  nodes.forEach(node => {
    nodeTypeById[node.id] = node.data?.nodeType || node.type;
  });

  // Check for required node types
  const requiredTypes = ["user_query", "llm_engine", "output"];
  const availableTypes = Object.values(nodeTypeById);
  
  requiredTypes.forEach(type => {
    if (!availableTypes.includes(type)) {
      errors.push(`Missing required node type: ${defaultLabelForType(type)}`);
    }
  });

  // Build adjacency list for graph analysis
  const adjacencyList = {};
  edges.forEach(edge => {
    if (!nodeTypeById[edge.source]) {
      errors.push(`Invalid edge: source node ${edge.source} not found`);
      return;
    }
    if (!nodeTypeById[edge.target]) {
      errors.push(`Invalid edge: target node ${edge.target} not found`);
      return;
    }
    
    if (!adjacencyList[edge.source]) {
      adjacencyList[edge.source] = [];
    }
    adjacencyList[edge.source].push(edge.target);
  });

  // Cycle detection using DFS
  const visited = new Set();
  const recursionStack = new Set();
  
  const hasCycle = (nodeId) => {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const neighbors = adjacencyList[nodeId] || [];
    for (const neighbor of neighbors) {
      if (hasCycle(neighbor)) return true;
    }
    
    recursionStack.delete(nodeId);
    return false;
  };

  // Check for cycles
  for (const node of nodes) {
    if (hasCycle(node.id)) {
      errors.push("Workflow contains cycles. Workflows must be acyclic.");
      break;
    }
  }

  // Validate workflow path: user_query -> ... -> llm_engine -> ... -> output
  const userQueryNodes = nodes.filter(n => (n.data?.nodeType || n.type) === "user_query");
  
  if (userQueryNodes.length === 0) {
    errors.push("No User Query node found.");
  } else {
    // For each user query, check if there's a path to LLM and Output
    let hasValidPath = false;
    
    for (const userNode of userQueryNodes) {
      const reachableNodes = new Set();
      const queue = [userNode.id];
      
      while (queue.length > 0) {
        const current = queue.shift();
        if (reachableNodes.has(current)) continue;
        
        reachableNodes.add(current);
        const neighbors = adjacencyList[current] || [];
        queue.push(...neighbors);
      }
      
      // Check if we can reach both LLM and Output from this user query
      const canReachLLM = Array.from(reachableNodes).some(id => 
        nodeTypeById[id] === "llm_engine"
      );
      const canReachOutput = Array.from(reachableNodes).some(id => 
        nodeTypeById[id] === "output"
      );
      
      if (canReachLLM && canReachOutput) {
        hasValidPath = true;
        break;
      }
    }
    
    if (!hasValidPath) {
      errors.push("No valid path found from User Query through LLM Engine to Output.");
    }
  }

  // Validate node configurations
  nodes.forEach(node => {
    const nodeType = node.data?.nodeType || node.type;
    const config = node.data?.config || {};
    
    if (nodeType === "knowledge_base") {
      if (!config.collection || config.collection.trim() === "") {
        errors.push(`Knowledge Base node "${node.data?.label}" is missing collection name.`);
      }
      if (!config.top_k || config.top_k < 1) {
        errors.push(`Knowledge Base node "${node.data?.label}" has invalid top_k value.`);
      }
    }
    
    if (nodeType === "llm_engine") {
      if (!config.model || config.model.trim() === "") {
        errors.push(`LLM Engine node "${node.data?.label}" is missing model configuration.`);
      }
      if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 1)) {
        errors.push(`LLM Engine node "${node.data?.label}" has invalid temperature value (must be 0-1).`);
      }
    }
  });

  return errors;
};

/**
 * Build workflow payload for backend API
 */
export const buildWorkflowPayload = (nodes, edges) => {
  const workflowNodes = nodes.map(node => ({
    id: node.id,
    type: node.data?.nodeType || node.type,
    config: node.data?.config || {},
    position: node.position
  }));
  
  const workflowEdges = edges.map(edge => ({
    from: edge.source,
    to: edge.target,
    id: edge.id
  }));
  
  return {
    nodes: workflowNodes,
    edges: workflowEdges,
    metadata: {
      created: new Date().toISOString(),
      nodeCount: workflowNodes.length,
      edgeCount: workflowEdges.length
    }
  };
};

/**
 * Get workflow statistics
 */
export const getWorkflowStats = (nodes, edges) => {
  const nodeTypeCounts = {};
  nodes.forEach(node => {
    const type = node.data?.nodeType || node.type;
    nodeTypeCounts[type] = (nodeTypeCounts[type] || 0) + 1;
  });
  
  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    nodeTypes: nodeTypeCounts,
    isValid: validateWorkflow(nodes, edges).length === 0
  };
};