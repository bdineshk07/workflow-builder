import React, { useState } from "react";
import { runWorkflow } from "../api/workflowApi";

export default function WorkflowPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // TODO: Replace with your actual workflow state from canvas
  const workflow = {
    nodes: [
      { id: "n1", type: "user_query" },
      { id: "n2", type: "llm_engine", config: { model: "gpt-4" } },
      { id: "n3", type: "output" }
    ],
    edges: [
      { from: "n1", to: "n2" },
      { from: "n2", to: "n3" }
    ]
  };

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await runWorkflow(workflow, query);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Workflow Runner</h1>
      <input
        type="text"
        placeholder="Enter your query..."
        className="border p-2 w-full mb-2"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button
        onClick={handleRun}
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? "Running..." : "Run Workflow"}
      </button>

      {error && <div className="text-red-600 mt-2">Error: {error}</div>}

      {result && (
        <div className="mt-4">
          <h2 className="font-bold">Final Result</h2>
          <pre className="bg-gray-100 p-2 rounded">
            {JSON.stringify(result.result, null, 2)}
          </pre>

          <h2 className="font-bold mt-4">Execution Trace</h2>
          <ul className="list-disc pl-4">
            {result.trace.map((step, i) => (
              <li key={i}>
                Node <b>{step.node_id}</b> ({step.node_type}) → {step.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
