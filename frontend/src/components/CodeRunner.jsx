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
  container: { background: 'var(--surface)', borderRadius: '10px', overflow: 'hidden', marginTop: '8px', border: '1px solid var(--border)' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: 'var(--surface-raised)', borderBottom: '1px solid var(--border)' },
  label: { fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  initBtn: { padding: '4px 12px', background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500 },
  runBtn: { padding: '4px 14px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 },
  spinner: { width: '14px', height: '14px', border: '2px solid var(--border)', borderTop: '2px solid var(--green)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' },
  output: { padding: '10px 14px' },
  pre: { margin: 0, fontSize: '0.8rem', color: 'var(--text-primary)', fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', lineHeight: 1.5 },
}
