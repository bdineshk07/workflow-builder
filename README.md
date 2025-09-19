# Workflow Builder (React + FastAPI)

A **No-Code/Low-Code web application** that enables users to visually create and interact with intelligent workflows.
Users can drag-and-drop components (Query, Knowledge Base, LLM Engine, Output) to build custom AI workflows and then interact with them through a chat interface.

---

## Features

* **Drag & Drop Workflow Builder** with [React Flow](https://reactflow.dev/)
* **Chat Interface** for querying workflows
* **Knowledge Base**: Upload PDFs → Extract text → Generate embeddings → Store in [ChromaDB](https://www.trychroma.com/)
* **LLM Integration**: [OpenAI GPT](https://platform.openai.com/) / Gemini + optional web search (SerpAPI/Brave)
* **PostgreSQL Database** for persistence (workflows, metadata, chat logs)
* **FastAPI Backend** for orchestrating workflows
* **Dockerized Deployment** (frontend + backend)

---

## Tech Stack

**Frontend**: React.js, React Flow
**Backend**: FastAPI (Python)
**Database**: PostgreSQL
**Vector Store**: ChromaDB
**LLM**: OpenAI GPT, Gemini
**Text Extraction**: PyMuPDF
**Deployment**: Docker

---

## Project Structure

```
workflow-builder/
│
├── frontend/              # React app (workflow UI + chat)
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/               # FastAPI app (API + orchestration)
│   ├── app/
│   │   ├── main.py        # FastAPI entry point
│   │   ├── routes/        # API routes
│   │   ├── services/      # PDF, embeddings, LLM logic
│   │   └── db/            # Postgres models/config
│   └── requirements.txt
│
├── docker-compose.yml     # (Optional) Multi-service deployment
├── .gitignore
└── README.md
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/workflow-builder.git
cd workflow-builder
```

---

### 2. Setup the Backend (FastAPI)

#### Create & activate a virtual environment

```bash
cd backend
python -m venv .venv
# On Windows
.venv\Scripts\activate
# On Mac/Linux
source .venv/bin/activate
```

#### Install dependencies

```bash
pip install -r requirements.txt
```

#### Run FastAPI server

```bash
uvicorn app.main:app --reload
```

Backend runs at: [http://localhost:8000](http://localhost:8000)

---

### 3. Setup the Frontend (React)

```bash
cd frontend
npm install
npm start
```

Frontend runs at: [http://localhost:3000](http://localhost:3000)

---

### 4. Setup Database (PostgreSQL)

* Install PostgreSQL (if not already installed).
* Create a database:

  ```sql
  CREATE DATABASE workflow_db;
  ```
* Update DB connection string in backend config (e.g., `.env` file).

---

### 5. Environment Variables

Create a `.env` file in `backend/` with:

```
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=postgresql://username:password@localhost:5432/workflow_db
```

*(Optional)*: Add keys for SerpAPI or Brave search.

---

### 6. Run with Docker (optional)

If you prefer containers:

```bash
docker-compose up --build
```

This will spin up:

* `frontend` (React)
* `backend` (FastAPI)
* `postgres` (database)

---

## Usage

1. Drag & drop components on the canvas (React Flow).
2. Connect them:
   **User Query → KnowledgeBase (optional) → LLM Engine → Output**
3. Click **Build Stack** to validate workflow.
4. Use **Chat with Stack** to ask questions.
5. Responses will flow through your defined workflow.

---

## Screenshots

*(Add screenshots of your UI once you run the app — e.g., workflow builder and chat interface.)*

---

## Roadmap

* [ ] User authentication
* [ ] Workflow saving/loading
* [ ] Chat history persistence
* [ ] Execution logs
* [ ] Kubernetes deployment

---

## License

This project is licensed under the MIT License.

---

## Author

* Developed as part of **AI Planet assignment**
* Built with ❤️ using React + FastAPI

