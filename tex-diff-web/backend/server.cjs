const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { exec, execSync } = require('child_process');

// Remove \DIFdel{} / \DIFadd{} markers from LaTeX structural contexts that
// cannot host arbitrary content (\begin{}/\end{} env names and optional args).
// Text content inside environments is never touched.
function sanitizeLatexDiff(content) {
    // Extract the content of the {braced} block starting at pos (must be '{').
    // Returns [innerString, indexAfterClosingBrace].
    function extractBraced(s, pos) {
        if (pos >= s.length || s[pos] !== '{') return [null, pos];
        let depth = 1, i = pos + 1, out = '';
        while (i < s.length) {
            if (s[i] === '{') { depth++; out += s[i]; }
            else if (s[i] === '}') {
                if (--depth === 0) return [out, i + 1];
                out += s[i];
            } else out += s[i];
            i++;
        }
        return [out, s.length];
    }

    // Strip \DIFdel{...} (discard) and unwrap \DIFadd{...} (keep content).
    function stripDIF(s) {
        let out = '', i = 0;
        while (i < s.length) {
            if (s[i] === '\\' && s.slice(i, i + 7) === '\\DIFdel') {
                const [, end] = extractBraced(s, i + 7);
                i = end;
            } else if (s[i] === '\\' && s.slice(i, i + 7) === '\\DIFadd') {
                const [inner, end] = extractBraced(s, i + 7);
                out += inner !== null ? inner : '';
                i = end;
            } else {
                out += s[i++];
            }
        }
        return out;
    }

    // Pass 1: fix \begin{...} and \end{...} env-name arguments.
    let out = '', i = 0;
    while (i < content.length) {
        const isBegin = content.slice(i, i + 7) === '\\begin{';
        const isEnd   = !isBegin && content.slice(i, i + 5) === '\\end{';
        if (isBegin || isEnd) {
            const cmd      = isBegin ? 'begin' : 'end';
            const bracePos = i + (isBegin ? 6 : 4); // offset of '{'
            const [inner, end] = extractBraced(content, bracePos);
            if (inner !== null && (inner.includes('\\DIFdel') || inner.includes('\\DIFadd'))) {
                out += `\\${cmd}{${stripDIF(inner)}}`;
                i = end;
                continue;
            }
        }
        out += content[i++];
    }

    // Pass 2: fix optional args [...] following a command or } that contain DIFdel/DIFadd.
    // \DIFdel / \DIFadd inside [key=value] optional args break LaTeX when a number or
    // dimension is expected (e.g. [width=1.2\textwidth] -> [width=1.4\textwidth]).
    out = out.replace(
        /(\\[a-zA-Z@]+\*?|\})\[([^\[\]]*(?:\\DIFdel|\\DIFadd)[^\[\]]*)\]/g,
        (_, prefix, inner) => `${prefix}[${stripDIF(inner)}]`
    );

    return out;
}

// Helper to find Perl executable
function getPerlPath() {
    try {
        execSync('perl --version', { stdio: 'ignore' });
        return 'perl'; 
    } catch (e) {
        const commonPaths = [
            'C:\\Program Files\\Git\\usr\\bin\\perl.exe',
            'C:\\Strawberry\\perl\\bin\\perl.exe',
            'C:\\Perl64\\bin\\perl.exe'
        ];
        for (const p of commonPaths) {
            if (fs.existsSync(p)) return p;
        }
        return null;
    }
}

const perlPath = getPerlPath();
if (perlPath && perlPath !== 'perl') {
    const perlDir = path.dirname(perlPath);
    process.env.PATH = `${perlDir};${process.env.PATH}`;
    console.log(`Added ${perlDir} to PATH`);
}

const app = express();
const port = 5001;

app.use(cors());
app.use(express.json());

// Setup storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { sessionId, version } = req.body;
        const dir = path.join(__dirname, 'uploads', sessionId, version);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// Check environment status
app.get('/api/status', (req, res) => {
    const perl = getPerlPath();
    const hasLatexDiff = fs.existsSync(path.join(__dirname, 'latexdiff'));
    console.log(`Status check: perl=${!!perl}, latexdiff=${hasLatexDiff}`);
    res.json({ hasPerl: !!perl, hasLatexDiff });
});

app.post('/api/upload', upload.array('files'), (req, res) => {
    res.json({ message: 'Files uploaded successfully', sessionId: req.body.sessionId });
});

app.post('/api/generate', (req, res) => {
    const { sessionId, mainFile } = req.body;
    const oldPath = path.join(__dirname, 'uploads', sessionId, 'old', mainFile);
    const newPath = path.join(__dirname, 'uploads', sessionId, 'new', mainFile);
    const outputPath = path.join(__dirname, 'uploads', sessionId, 'diff.tex');

    if (!fs.existsSync(oldPath) || !fs.existsSync(newPath)) {
        return res.status(400).json({ error: 'Main file not found in both folders' });
    }

    const perl = getPerlPath();
    if (!perl) {
        return res.status(500).json({ error: 'Perl Not Found', details: 'Please install Perl and restart the server.' });
    }

    // Use powershell to execute, matching the user's manual working environment
    // Use single quotes for paths to handle spaces correctly
    // Use -I. to include the local Algorithm directory
    const cmd = `powershell -Command "& perl -I. latexdiff --flatten --encoding=utf8 --no-label '${oldPath}' '${newPath}' | Set-Content -Encoding UTF8 '${outputPath}'"`;

    exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Diff error: ${error.message}`);
            console.error(`Stderr: ${stderr}`);
            
            // If it's a Perl error, return a specific message
            if (error.message.includes('not recognized')) {
                return res.status(500).json({ 
                    error: 'Perl Not Found', 
                    details: 'Perl must be installed and added to the PATH to generate actual diffs.' 
                });
            }
            
            return res.status(500).json({ error: 'latexdiff failed', details: stderr || error.message });
        }

        // Strip DIFdel/DIFadd from LaTeX structural contexts (env names, optional args)
        // so the output compiles cleanly when only commands changed, not text content.
        try {
            const raw = fs.readFileSync(outputPath, 'utf8');
            fs.writeFileSync(outputPath, sanitizeLatexDiff(raw), 'utf8');
        } catch (e) {
            console.error('Post-processing warning:', e.message);
            // Non-fatal: the unprocessed diff is still better than no output.
        }

        res.json({ success: true, downloadUrl: `/api/download/${sessionId}` });
    });
});

app.get('/api/download/:sessionId', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.sessionId, 'diff.tex');
    if (fs.existsSync(filePath)) {
        res.download(filePath, 'diff.tex');
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
