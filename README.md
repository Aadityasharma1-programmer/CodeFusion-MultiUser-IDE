# 💻 Codefusion

> **Codefusion** is a state-of-the-art, real-time collaborative workspace designed for modern developers. It combines multiplayer code editing, an integrated sandboxed runtime, Git timeline visualization, and an autonomous AI companion into a single cohesive interface.

---

## ✨ Key Features

*   **👥 Real-Time Multiplayer Collaboration**: Powered by **Yjs** and **WebSockets**, allowing multiple developers to edit the same file simultaneously with live cursor tracking, concurrent selection highlights, and presence indicators.
*   **🤖 Fusion AI Assistant**: An integrated side panel offering context-aware assistance (Chat, Code Explanation, Bug Detection, and Autocomplete). Includes **Artifact Cards** for structured reviewable deliverables (task lists, implementation plans, and diff highlights).
*   **⚡ Sandboxed Code Execution**: Run code instantly in various languages (JavaScript, Python, Go, C/C++) directly from the editor using a secure sandboxed compilation runner.
*   **📈 Git Graph & Interactive Shell**: View repository commit graphs visually. Stage, diff, commit, and inspect logs either via the sidebar panel or using the built-in terminal shell (`ls`, `cat`, `git status`, `git commit`, etc.).
*   **🎨 Custom Extensions & Themes**: Toggle popular themes like Dracula, One Dark Pro, and Cyber Dark Pro (featuring pure black `#000000` styling) or utility extensions like ESLint, Prettier, and GitLens inline blame annotations.
*   **🔒 Cloud Persistence**: Powered by **Supabase** for user authentication, file version snapshots, profiles, and team collaboration access controls.

---

## 🛠️ Tech Stack

### Frontend (Client)
*   **Framework**: React (Vite)
*   **Styling**: Tailwind CSS & Modern Glassmorphism
*   **Editor**: Monaco Editor (`@monaco-editor/react`)
*   **State Management**: Zustand
*   **Multiplayer Engine**: Yjs, `y-protocols`, and `y-monaco`
*   **Realtime Communication**: Socket.io-client & Supabase Realtime

### Backend (Server)
*   **Runtime**: Node.js & Express
*   **Realtime Server**: Socket.io (Yjs synchronization rooms)
*   **Database**: MongoDB & Supabase PostgreSQL (Hybrids)
*   **Execution Runtime**: Sandboxed code compiler API

---

## 📁 Repository Structure

```text
codefusion/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── api/            # API client and Supabase services
│   │   ├── components/     # EditorView, FileExplorer, GitGraph, Panels
│   │   ├── store/          # Zustand stores (authStore, projectStore, chatStore)
│   │   ├── pages/          # LoginPage, RegisterPage, DashboardPage, WorkspacePage
│   │   └── main.jsx        # App entry point
│   ├── index.html          # Shell template
│   └── package.json        # Frontend dependencies
│
└── server/                 # Node.js Backend Server
    ├── src/
    │   ├── routes/         # REST API endpoints (AI chat, compiler sandbox, auth)
    │   ├── sockets/        # Socket.io handlers for collaborative sync rooms
    │   └── index.js        # Main Express server entry point
    └── package.json        # Backend dependencies
```

---

## 🚀 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) (v16+)
*   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation & Local Setup

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/codefusion.git
    cd codefusion
    ```

2.  **Install Dependencies**:
    *   **Frontend**:
        ```bash
        cd client
        npm install
        ```
    *   **Backend**:
        ```bash
        cd ../server
        npm install
        ```

3.  **Environment Variables**:
    *   Create a `.env` file in the `client/` directory with your Supabase credentials:
        ```env
        VITE_SUPABASE_URL=your_supabase_url
        VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
        ```
    *   Create a `.env` file in the `server/` directory:
        ```env
        PORT=5001
        JWT_SECRET=your_jwt_secret
        MONGODB_URI=your_mongodb_uri
        ```

4.  **Run Locally (Development Mode)**:
    *   **Start the Backend**:
        ```bash
        cd server
        npm run dev
        ```
    *   **Start the Frontend**:
        ```bash
        cd client
        npm run dev
        ```
    *   Open `http://localhost:5173` in your browser.

---

## 🔒 Security & Best Practices
*   **Row-Level Security (RLS)** is enabled on all PostgreSQL database tables.
*   Authentic Supabase user verification checks are handled server-side before execution logs, AI assistant invocations, or collaborative session registrations occur.
*   **Asynchronous Monaco loading** using `beforeMount` prevents default theme flashes and renders custom visual styles seamlessly.
