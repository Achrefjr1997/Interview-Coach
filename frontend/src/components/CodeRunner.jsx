import { useState, useRef, useCallback } from 'react'

let pyodidePromise = null

function loadPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodideImpl()
  }
  return pyodidePromise
}

async function loadPyodideImpl() {
  if (window.loadPyodide) {
    return window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' })
  }
  throw new Error('Pyodide not loaded')
}

export default function CodeRunner({ code, onOutput }) {
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [ready, setReady] = useState(false)
  const pyodideRef = useRef(null)

  const init = useCallback(async () => {
    if (pyodideRef.current) return
    setRunning(true)
    try {
      const py = await loadPyodide()
      pyodideRef.current = py
      setReady(true)
    } catch (e) {
      setOutput(`Error loading Python: ${e.message}`)
    } finally {
      setRunning(false)
    }
  }, [])

  const run = useCallback(async () => {
    if (!pyodideRef.current) {
      await init()
      if (!pyodideRef.current) return
    }
    setRunning(true)
    setOutput('')
    try {
      const py = pyodideRef.current
      let stdout = ''
      let stderr = ''
      py.setStdout({ batched: (msg) => { stdout += msg + '\n' } })
      py.setStderr({ batched: (msg) => { stderr += msg + '\n' } })

      await py.runPythonAsync(code)

      const result = stdout.trim() || stderr.trim() || '(No output)'
      setOutput(result)
      if (onOutput) onOutput(result)
    } catch (e) {
      const errMsg = e.message || String(e)
      setOutput(`Error: ${errMsg}`)
    } finally {
      setRunning(false)
    }
  }, [code, init, onOutput])

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <span style={styles.label}>Python Console</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!ready && !running && (
            <button onClick={init} style={styles.initBtn}>Load Python</button>
          )}
          {ready && (
            <button onClick={run} disabled={running || !code.trim()} style={{
              ...styles.runBtn,
              opacity: running || !code.trim() ? 0.5 : 1,
            }}>
              {running ? 'Running...' : '▶ Run'}
            </button>
          )}
          {running && <span style={styles.spinner} />}
        </div>
      </div>
      {output && (
        <div style={styles.output}>
          <pre style={styles.pre}>{output}</pre>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { background: '#0f172a', borderRadius: '10px', overflow: 'hidden', marginTop: '8px', border: '1px solid #1e293b' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: '#1e293b' },
  label: { fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  initBtn: { padding: '4px 12px', background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500 },
  runBtn: { padding: '4px 14px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 },
  spinner: { width: '14px', height: '14px', border: '2px solid #334155', borderTop: '2px solid #10b981', borderRadius: '50%', animation: 'spin 0.6s linear infinite' },
  output: { padding: '10px 14px', borderTop: '1px solid #1e293b' },
  pre: { margin: 0, fontSize: '0.8rem', color: '#a5f3fc', fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', lineHeight: 1.5 },
}
