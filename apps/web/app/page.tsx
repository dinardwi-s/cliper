'use client';

import { useEffect, useState } from 'react';

const projects = [
  { name: 'React 19 Deep Dive', date: 'Today, 14:23', clips: 5, status: 'Completed', processing: false },
  { name: 'Docker Crash Course', date: 'Today, 09:00', clips: 0, status: 'Processing', processing: true },
  { name: 'TypeScript Tips #12', date: 'Yesterday, 17:42', clips: 3, status: 'Completed', processing: false },
];

export default function DashboardPage() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = window.localStorage.getItem('theme') === 'dark';
    setDark(saved);
    document.documentElement.dataset.theme = saved ? 'dark' : 'light';
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    window.localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">C</span><span className="brand-name">ClipForge AI</span></div>
        <nav className="nav" aria-label="Main navigation">
          <a className="nav-link active" href="/"><span>⌂</span><span className="nav-label">Overview</span></a>
          <a className="nav-link" href="/history"><span>▤</span><span className="nav-label">History</span></a>
          <a className="nav-link" href="/settings"><span>⚙</span><span className="nav-label">Settings</span></a>
        </nav>
        <div className="sidebar-footer"><a className="nav-link" href="/settings"><span>?</span><span className="nav-label">Help center</span></a></div>
      </aside>
      <div className="main">
        <header className="header">
          <span className="breadcrumb">Workspace / Overview</span>
          <div className="header-actions"><button className="icon-button" onClick={toggleTheme} aria-label="Toggle dark mode">{dark ? '☀' : '☾'}</button><span className="avatar">AC</span></div>
        </header>
        <main className="content">
          <section className="hero"><div><p className="eyebrow">Creator workspace</p><h1>Good morning, Alex.</h1><p className="muted">Turn your long-form content into moments people remember.</p></div><button className="primary-button">+ New project</button></section>
          <section className="stats" aria-label="Workspace statistics">
            <div className="card"><div className="stat-label">Projects this month</div><div className="stat-value">12</div><div className="stat-note">↑ 24% from last month</div></div>
            <div className="card"><div className="stat-label">Clips generated</div><div className="stat-value">57</div><div className="stat-note">↑ 18% from last month</div></div>
            <div className="card"><div className="stat-label">Credits remaining</div><div className="stat-value">18 <span className="muted" style={{ fontSize: 14 }}>/ 30</span></div><div className="stat-note">Starter plan</div></div>
            <div className="card"><div className="stat-label">Average score</div><div className="stat-value">86<span className="muted" style={{ fontSize: 14 }}>/100</span></div><div className="stat-note">Top 15% of clips</div></div>
          </section>
          <section className="section"><div className="section-heading"><h2>Recent projects</h2><a className="text-button" href="/history">View all →</a></div><div className="project-list">{projects.map((project) => <div className="card project-row" key={project.name}><div><div className="project-name">{project.name}</div><div className="project-meta">{project.date}</div></div><span className={`status ${project.processing ? 'processing' : ''}`}>{project.status}</span><span className="muted">{project.clips ? `${project.clips} clips` : '—'}</span><button className="text-button">Open</button></div>)}</div></section>
          <section className="section"><div className="card empty-state"><div className="empty-icon">✦</div><h2>Your next great clip starts here</h2><p className="muted">Paste a YouTube URL and let AI find the moments worth sharing.</p><button className="primary-button">Create your first project</button></div></section>
        </main>
      </div>
    </div>
  );
}
