import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="card empty-state">
      <h1>Page not found</h1>
      <p>We couldn’t find that page in the event portal.</p>
      <Link className="button" href="/">
        Back to registration
      </Link>
    </div>
  );
}
