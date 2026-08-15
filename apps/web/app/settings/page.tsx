import Link from 'next/link';

export default function SettingsPage() {
  return (
    <main className="content">
      <p className="eyebrow">Account</p>
      <h1>Settings</h1>
      <div className="card section">
        <h2>Profile</h2>
        <p className="muted">Alex Creator · alex@example.com</p>
        <Link className="primary-button" href="/">Back to overview</Link>
      </div>
    </main>
  );
}
