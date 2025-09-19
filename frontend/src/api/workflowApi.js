// frontend/src/api/workflowApi.js
export async function runWorkflow(workflow, query) {
  try {
    const res = await fetch("http://127.0.0.1:8000/workflow/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow, query }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to run workflow");
    }

    return await res.json();
  } catch (err) {
    console.error("runWorkflow error:", err);
    throw err;
  }
}
