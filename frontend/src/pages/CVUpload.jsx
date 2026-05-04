import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { uploadCV } from '../api'
import ScoreRing from '../components/ScoreRing'
import Spinner from '../components/Spinner'
import { Upload, FileText, ArrowRight, RefreshCw, ArrowLeft } from 'lucide-react'

export default function CVUpload() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const navigate = useNavigate()

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setError('')
    setResult(null)
  }

  function handleDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (!f) return
    setFile(f)
    setError('')
    setResult(null)
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  async function handleAnalyze() {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)

    const steps = ['Parsing CV…', 'Scanning job market…', 'Evaluating gaps…']
    let stepIndex = 0
    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        setStatus(steps[stepIndex])
        stepIndex++
      }
    }, 1200)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await uploadCV(formData)
      setResult(res.data)
      setStatus('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.')
      setStatus('')
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.navBrand}>
            <img src="/assets/logo.jpg" alt="Interview Coach" style={styles.navLogo} />
            <span style={styles.navBrandText}>Interview Coach</span>
          </div>
          <Link to="/" style={styles.backBtn}><ArrowLeft size={14} /> Dashboard</Link>
        </div>
      </nav>

      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>CV Analysis</h1>
          <p style={styles.subtitle}>Upload your resume to get a tailored skill improvement plan</p>
        </div>

        {!result && (
          <div style={styles.card}>
            <div
              style={{ ...styles.dropzone, borderColor: file ? 'var(--accent)' : 'var(--border)' }}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              {file ? (
                <div style={styles.fileInfo}>
                  <FileText size={20} color="var(--accent)" />
                  <div>
                    <div style={styles.fileName}>{file.name}</div>
                    <div style={styles.fileSize}>{formatSize(file.size)}</div>
                  </div>
                </div>
              ) : (
                <div style={styles.dropzoneContent}>
                  <Upload size={28} color="var(--text-muted)" />
                  <p style={styles.dropzoneText}>Drop your CV here or click to browse</p>
                  <p style={styles.dropzoneHint}>PDF or DOCX, max 10MB</p>
                </div>
              )}
            </div>

            {loading && (
              <div style={styles.loading}>
                <Spinner />
                <span style={styles.statusText}>{status}</span>
              </div>
            )}

            {error && (
              <div style={styles.errorCard}>
                <p style={styles.errorText}>{error}</p>
                <button onClick={handleAnalyze} style={styles.retryBtn} disabled={loading}>
                  <RefreshCw size={14} /> Try Again
                </button>
              </div>
            )}

            <button onClick={handleAnalyze} disabled={!file || loading} style={{ ...styles.btn, opacity: !file || loading ? 0.5 : 1 }}>
              {loading ? 'Analyzing...' : 'Analyze CV'}
            </button>
          </div>
        )}

        {result && (
          <div style={styles.results}>
            <div style={styles.card}>
              <div style={styles.resultGrid}>
                <div style={styles.scoreCol}>
                  <ScoreRing score={result.cv_evaluation?.cv_score || 0} size={120} strokeWidth={8} label="CV Score" />
                </div>
                <div style={styles.scoreCol}>
                  <ScoreRing score={result.cv_evaluation?.ats_score || 0} size={120} strokeWidth={8} label="ATS Score" />
                </div>
              </div>

              {result.market_data?.market_insight && (
                <div style={styles.insightBox}>
                  <p style={styles.insightTitle}>Market Insight</p>
                  <p style={styles.insightText}>{result.market_data.market_insight}</p>
                </div>
              )}

              {result.cv_evaluation?.salary_range || result.market_data?.salary_range ? (
                <div style={styles.salaryBadge}>
                  Salary Range: {result.cv_evaluation?.salary_range || result.market_data?.salary_range}
                </div>
              ) : null}

              <div style={styles.skillSummary}>
                {[
                  { label: 'Matched', count: (result.cv_evaluation?.matched_skills || []).length, color: '#7C5CFC' },
                  { label: 'Critical Gaps', count: (result.cv_evaluation?.missing_critical || []).length, color: '#F0997B' },
                  { label: 'Nice to Have', count: (result.cv_evaluation?.missing_nice || []).length, color: '#EF9F27' },
                  { label: 'Trending', count: (result.cv_evaluation?.trending_skills || []).length, color: '#5DCAA5' },
                ].map(s => (
                  <div key={s.label} style={styles.skillSummaryItem}>
                    <div style={{ ...styles.skillDot, background: s.color }} />
                    <span style={styles.skillLabel}>{s.label}</span>
                    <span style={styles.skillCount}>{s.count}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => navigate('/skills')} style={styles.btn}>
                Review & select skills <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg)' },
  nav: { padding: '12px 24px', background: 'rgba(14,14,22,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' },
  navInner: { maxWidth: '700px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  navBrand: { display: 'flex', alignItems: 'center', gap: '10px' },
  navLogo: { width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' },
  navBrandText: { fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, textDecoration: 'none' },
  container: { maxWidth: '700px', margin: '0 auto', padding: '3rem 2rem' },
  header: { textAlign: 'center', marginBottom: '2rem' },
  title: { margin: '0 0 8px', fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' },
  subtitle: { margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' },
  dropzone: { border: '2px dashed var(--border)', borderRadius: '14px', padding: '2.5rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s ease', marginBottom: '1rem' },
  dropzoneContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' },
  dropzoneText: { margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 },
  dropzoneHint: { margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' },
  fileInfo: { display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' },
  fileName: { fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 },
  fileSize: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '1rem 0' },
  statusText: { fontSize: '0.85rem', color: 'var(--text-secondary)' },
  errorCard: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', padding: '12px 14px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  errorText: { margin: 0, fontSize: '0.85rem', color: 'var(--red)' },
  retryBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' },
  btn: { width: '100%', padding: '12px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  results: {},
  resultGrid: { display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1.5rem' },
  scoreCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  insightBox: { background: 'var(--surface-raised)', borderRadius: '10px', padding: '12px 16px', marginBottom: '1rem', border: '1px solid var(--border)' },
  insightTitle: { margin: '0 0 6px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  insightText: { margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 },
  salaryBadge: { display: 'inline-block', padding: '6px 14px', background: 'rgba(0,214,143,0.1)', color: 'var(--green)', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' },
  skillSummary: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '1.25rem' },
  skillSummaryItem: { display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-raised)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)' },
  skillDot: { width: '8px', height: '8px', borderRadius: '2px' },
  skillLabel: { fontSize: '0.75rem', color: 'var(--text-secondary)' },
  skillCount: { fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginLeft: '4px' },
}
