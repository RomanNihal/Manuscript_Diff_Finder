# LaTeX Diff Generation Guide

This guide provides step-by-step instructions for generating a `diff.tex` file using `latexdiff` that is compatible with Overleaf.

> [!TIP]
> **New Web App**: You can also use the **Paper Diff Pro** web application in the `tex-diff-web/` folder for a more user-friendly, drag-and-drop experience.

## 1. Prerequisites
To generate the diff locally, you need:
- **Perl**: Installed and available in your command line (e.g., via Git Bash or a standalone Perl installation).
- **latexdiff**: The `latexdiff` Perl script should be in your working directory or in your system PATH.

## 2. Basic Generation Command
Run the following command in your terminal (PowerShell or Command Prompt) to compare your `old` and `new` versions:

```powershell
# In PowerShell (ensuring UTF-8 encoding)
& perl -I. latexdiff --encoding=utf8 --no-label old/conference_101719.tex new/conference_101719.tex | Set-Content -Encoding UTF8 diff.tex
```

*Note: Use `--no-label` to suppress the filenames as comments if they cause issues.*

## 3. Essential Pre-Generation Checks
Before running the command, check your `new` source file for these common LaTeX traps:

### A. Unescaped Percent Signs
Ensure all literal percent signs are escaped as `\%`. 
- **Incorrect**: `...accuracy of 50%...`
- **Correct**: `...accuracy of 50\%...`
- **Why?** `latexdiff` wrapping a `%` in a `\DIFadd{}` command will comment out the closing brace, crashing the compiler.

### B. Duplicate Bibliography Styles
Ensure only **one** `\bibliographystyle` command exists in your document.
- Search for `\bibliographystyle` and remove any duplicates (e.g., if you have both `unsrt` and `IEEEtran`).

## 4. Troubleshooting Common Errors

### Error: `Misplaced \noalign`
This happens if you changed the structure of a table (like column alignment).
- **The Fix**: Open `diff.tex` and find `\DIFaddendFL` or `\DIFdelendFL` markers appearing right before `\toprule`, `\midrule`, or `\hline`. Move the rule command *before* the marker.
- **Example Fix**: Change `\DIFaddendFL \toprule` to `\toprule \DIFaddendFL`.

### Error: `Unrecoverable LaTeX Error` or corrupted symbols
On Windows, special characters (like en-dashes `–`) can get corrupted into symbols like `ΓÇô`.
- **The Fix**: Use a text editor (like VS Code) to find and replace these symbols in `diff.tex` with their standard equivalents:
  - `ΓÇô` -> `--` (en-dash)
  - `ΓÇÖ` -> `'` (apostrophe)

## 5. Automation for Agents
If providing this to an AI agent, you can simply say:
> "Follow the instructions in `LATEX_DIFF_GUIDE.md` to generate a diff between the files in `old/` and `new/`."
