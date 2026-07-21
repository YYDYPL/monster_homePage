export default function NoteLoading() {
  return (
    <section className="article-shell knowledge-loading-shell" aria-live="polite" aria-busy="true">
      <div className="container knowledge-loading">
        <div className="knowledge-loading-sidebar" />
        <div className="knowledge-loading-content">
          <span />
          <h1 />
          <p />
          <p />
          <div />
          <div />
          <div />
        </div>
      </div>
      <p className="sr-only">{"\u6b63\u5728\u52a0\u8f7d\u77e5\u8bc6\u7b14\u8bb0"}</p>
    </section>
  );
}
