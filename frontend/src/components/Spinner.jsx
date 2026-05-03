export default function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div style={{
        width: '36px', height: '36px', border: '3px solid var(--border)',
        borderTop: '3px solid var(--accent)', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  )
}
