const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { exec, execSync } = require('child_process');

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
