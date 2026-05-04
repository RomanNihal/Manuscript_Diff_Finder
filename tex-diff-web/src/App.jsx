import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const API_BASE = 'http://localhost:5001/api';

function App() {
  const [sessionId] = useState(uuidv4());
  const [oldFiles, setOldFiles] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [mainFile, setMainFile] = useState('');
  const [status, setStatus] = useState('idle');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [details, setDetails] = useState('');
  const [envStatus, setEnvStatus] = useState({ hasPerl: true, hasLatexDiff: true });

  useEffect(() => {
    fetch(`${API_BASE}/status`)
      .then(res => res.json())
      .then(data => setEnvStatus(data))
      .catch(err => console.error('Failed to fetch status', err));
  }, []);

  const onFileUpload = async (files, version) => {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('version', version);
    
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      setStatus('uploading');
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const fileList = Array.from(files).map(f => f.name);
      if (version === 'old') {
        setOldFiles(prev => [...prev, ...fileList]);
        if (!mainFile) {
          const main = fileList.find(n => n.toLowerCase().includes('main') || n.endsWith('.tex'));
          if (main) setMainFile(main);
        }
      } else {
        setNewFiles(prev => [...prev, ...fileList]);
      }
      setStatus('idle');
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  const generateDiff = async () => {
    if (!mainFile) {
      alert('Please select or specify the main .tex file');
      return;
    }

    try {
      setStatus('generating');
      setErrorMessage('');
      setDetails('');
      const response = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, mainFile }),
      });

      const data = await response.json();
      if (response.ok) {
        setDownloadUrl(`${API_BASE.replace('/api', '')}${data.downloadUrl}`);
        setStatus('success');
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (err) {
      setErrorMessage(err.message);
      setDetails(err.details || '');
      setStatus('error');
    }
  };

  return (
    <div className="container">
      <header>
        <h1>TeX Diff Pro</h1>
        <p>Intelligent LaTeX version comparison for multi-file journal projects</p>
        
        <div style={{
          display: 'flex', 
          justifyContent: 'center', 
          gap: '1rem', 
          marginTop: '1rem',
          fontSize: '0.8rem'
        }}>
          <span style={{ color: envStatus.hasPerl ? '#10b981' : '#f43f5e' }}>
            ● Perl: {envStatus.hasPerl ? 'Found' : 'Not Found'}
          </span>
          <span style={{ color: envStatus.hasLatexDiff ? '#10b981' : '#f43f5e' }}>
            ● latexdiff: {envStatus.hasLatexDiff ? 'Ready' : 'Missing'}
          </span>
        </div>
      </header>

      <div className="diff-grid">
        <div className="upload-card">
          <div className="card-title old">
            <span>🔴</span> Old Version
          </div>
          <div 
            className="drop-zone"
            onClick={() => document.getElementById('old-input').click()}
          >
            <p>Drag & Drop or Click to upload old files</p>
            <input 
              id="old-input" 
              type="file" 
              multiple 
              hidden 
              onChange={(e) => onFileUpload(e.target.files, 'old')}
            />
          </div>
          <div className="file-list">
            {oldFiles.map(f => (
              <div key={f} className="file-item">
                {f} {f === mainFile && <span style={{fontSize: '0.7rem', color: '#818cf8'}}>[Main]</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="upload-card">
          <div className="card-title new">
            <span>🟢</span> New Version
          </div>
          <div 
            className="drop-zone"
            onClick={() => document.getElementById('new-input').click()}
          >
            <p>Drag & Drop or Click to upload new files</p>
            <input 
              id="new-input" 
              type="file" 
              multiple 
              hidden 
              onChange={(e) => onFileUpload(e.target.files, 'new')}
            />
          </div>
          <div className="file-list">
            {newFiles.map(f => (
              <div key={f} className="file-item">{f}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="action-bar">
        <div style={{width: '100%', maxWidth: '400px'}}>
          <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)'}}>
            Main Entry File:
          </label>
          <input 
            type="text" 
            value={mainFile} 
            onChange={(e) => setMainFile(e.target.value)}
            placeholder="e.g. main.tex"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--glass)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              color: 'white',
              outline: 'none'
            }}
          />
        </div>

        <button 
          className="btn-generate" 
          disabled={status === 'uploading' || status === 'generating' || oldFiles.length === 0}
          onClick={generateDiff}
        >
          {status === 'generating' ? <div className="loader"></div> : 'Generate Diff.tex'}
        </button>

        {status === 'success' && (
          <div className="status-card">
            <h3 style={{color: 'var(--accent)'}}>✅ Diff Generated Successfully!</h3>
            <a href={downloadUrl} className="download-link">
              Download diff.tex
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="status-card" style={{borderColor: '#f43f5e'}}>
            <h3 style={{color: '#f43f5e'}}>❌ {errorMessage}</h3>
            {details && <p style={{marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8}}>{details}</p>}
            {!envStatus.hasPerl && (
              <p style={{marginTop: '1rem', fontSize: '0.85rem', color: '#94a3b8'}}>
                Note: Perl is required. Please install it (e.g., Strawberry Perl) and restart the server.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
