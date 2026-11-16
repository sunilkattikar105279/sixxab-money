export default function Loading() {
  return (
    <main className="wrap" id="main" aria-busy="true" style={{ paddingTop: 40 }}>
      <p className="muted" role="status">Loading the latest numbers…</p>
    </main>
  );
}
