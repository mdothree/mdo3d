import { Link } from '../lib/router.jsx';

export default function NotFoundPage() {
  return (
    <div className="wrap page narrow">
      <h1>Page not found</h1>
      <p>That page does not exist.</p>
      <Link to="/" className="btn btn-primary">Go to search</Link>
    </div>
  );
}
