'use client';

import { FormEvent, useEffect, useState } from 'react';

type Project = { id: string; title: string | null; status: string; createdAt: string; _count?: { clips: number } };

export default function HistoryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

  useEffect(() => {
    void fetch(`${apiUrl}/history`, { credentials: 'include' })
      .then((response) => response.ok ? response.json() as Promise<{ projects: Project[] }> : { projects: [] })
      .then((result) => setProjects(result.projects))
      .catch(() => setProjects([]));
  }, [apiUrl]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const response = await fetch(`${apiUrl}/projects`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ youtubeUrl: url }) });
    if (!response.ok) { setError('Sign in before creating a project, or check URL.'); return; }
    const project = await response.json() as Project;
    setProjects((current) => [project, ...current]);
    setUrl('');
  }

  return (
    <main className="content">
      <p className="eyebrow">Workspace</p>
      <div className="hero"><div><h1>History</h1><p className="muted">Every project you have processed.</p></div></div>
      <form className="card section" onSubmit={createProject}><div style={{ display: 'flex', gap: 10 }}><input aria-label="YouTube URL" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Paste a YouTube URL" style={{ flex: 1, minWidth: 0, padding: 12, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)' }} /><button className="primary-button">Create project</button></div>{error && <p style={{ color: '#c2415b' }}>{error}</p>}</form>
      <section className="project-list section" aria-label="Project history">
        {projects.map((project) => <div className="card project-row" key={project.id}><div><div className="project-name">{project.title ?? 'Untitled project'}</div><div className="project-meta">{new Date(project.createdAt).toLocaleString()}</div></div><span className={`status ${project.status !== 'completed' ? 'processing' : ''}`}>{project.status}</span><span className="muted">{project._count?.clips ?? 0} clips</span><button className="text-button" type="button">Open</button></div>)}
      </section>
      {projects.length === 0 && <div className="card empty-state"><div className="empty-icon">▤</div><h2>No projects yet</h2><p className="muted">Your processed videos will appear here.</p></div>}
    </main>
  );
}
