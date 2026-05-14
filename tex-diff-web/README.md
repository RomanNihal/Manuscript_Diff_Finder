# TeX Diff Web

A modular web application for generating LaTeX diffs with support for multi-file projects.

## 🏗️ Architecture

The project is split into two main modules:

- **`frontend/`**: A Vite + React application providing a modern glassmorphism UI for file uploads and diff generation.
- **`backend/`**: An Express server that handles file storage and executes the `latexdiff` Perl engine.

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v16+)
- **Perl** (with `latexdiff` requirements)

### 2. Installation
Run the following from this directory to install all dependencies for both the frontend and backend:
```bash
npm run install-all
```

### 3. Development
Start both the frontend and backend servers concurrently:
```bash
npm run dev
```
- Frontend will be available at: `http://localhost:5173`
- Backend will be available at: `http://localhost:5001`

## 🛠️ Scripts

- `npm run install-all`: Installs dependencies for root, frontend, and backend.
- `npm run dev`: Runs both modules in development mode.
- `npm run frontend`: Runs only the Vite frontend.
- `npm run backend`: Runs only the Express backend.

## 📂 Backend Structure
The backend includes the core diffing tools:
- `latexdiff`: The Perl script used for generation.
- `Algorithm/`: Perl dependencies for the diff engine.
- `uploads/`: Temporary storage for uploaded versions and generated diffs.
