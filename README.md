# Paper Diff Pro

A dual-mode toolkit for generating LaTeX diffs in academic papers. This repository supports both a manual command-line workflow and a modern web-based interface.

## 🛠️ Choose Your Workflow

### Option 1: Manual Command Line (The "Old Way")
Perfect for quick comparisons if you have Perl and `latexdiff` already configured.
- **Guide**: See [LATEX_DIFF_GUIDE.md](LATEX_DIFF_GUIDE.md) for step-by-step instructions.
- **Quick Command**:
  ```powershell
  & perl -I. latexdiff --encoding=utf8 --no-label old/main.tex new/main.tex | Set-Content -Encoding UTF8 diff.tex
  ```

### Option 2: Web Application (The "Modern Way")
A premium, multi-file compatible interface that handles project isolation and dependencies automatically.
- **Directory**: `tex-diff-web/`
- **Features**: Drag-and-drop, project-wide diffing (via `--flatten`), and automated environment detection.
- **Quick Start**:
  ```bash
  cd tex-diff-web
  npm install
  npm start
  ```
- **Documentation**: See [tex-diff-web/README.md](tex-diff-web/README.md).

## 📂 Repository Structure

- `old/` & `new/`: Directories for your manual workflow versions.
- `tex-diff-web/`: The React/Express web application source.
- `latexdiff`: The core Perl diffing engine.
- `Algorithm/`: Required Perl dependencies for `latexdiff`.
- `LATEX_DIFF_GUIDE.md`: Detailed manual diffing instructions.

## ⚙️ Prerequisites
- **Node.js** (for the Web App)
- **Perl** (required for the diff engine)
  - *Note: The Web App includes "Smart Detection" for Git-for-Windows Perl.*

---
*Developed to streamline the journal revision process.*
