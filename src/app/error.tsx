'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card empty-state">
      <h1>Unable to load this page</h1>
      <p>
        Please try again. If the problem continues, ask the event administrator to check the app’s
        data connection.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
