'use client';

import { FormEvent, useEffect, useState } from 'react';

type User = { id: string; email: string; displayName?: string };
type Project = {
  id: string;
  title: string | null;
  status: string;
  durationSeconds: number | null;
  createdAt: string;
  thumbnailUrl: string | null;
  _count?: { clips: number };
};
type Clip = {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  engagementScore: number;
  transcriptSnippet: string;
  aiRationale: string;
  status: string;
  videoKey: string | null;
  subtitleKey: string | null;
};

export default function DashboardPage() {
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Auth modal states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');

  // New Project modal states
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [createError, setCreateError] = useState('');

  // Projects & detail state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loadingClips, setLoadingClips] = useState(false);

  // Video Preview Modal state
  const [previewClip, setPreviewClip] = useState<Clip | null>(null);
  const [videoStreamUrl, setVideoStreamUrl] = useState<string | null>(null);
  const [loadingStream, setLoadingStream] = useState(false);
  const [downloadingClipId, setDownloadingClipId] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '/api';

  useEffect(() => {
    const saved = window.localStorage.getItem('theme') === 'dark';
    setDark(saved);
    document.documentElement.dataset.theme = saved ? 'dark' : 'light';
    checkAuth();
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    window.localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  async function checkAuth() {
    setLoadingAuth(true);
    try {
      const res = await fetch(`${apiUrl}/health/protected`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        loadProjects();
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoadingAuth(false);
    }
  }

  async function loadProjects() {
    try {
      const res = await fetch(`${apiUrl}/projects`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setProjects(data);
        }
      }
    } catch {
      // ignore
    }
  }

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    setAuthError('');
    const endpoint = isRegister ? `${apiUrl}/auth/register` : `${apiUrl}/auth/login`;
    const payload = isRegister
      ? { email: authEmail, password: authPass, displayName: authName || 'Creator' }
      : { email: authEmail, password: authPass };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Authentication failed');
        return;
      }
      setShowAuthModal(false);
      setAuthPass('');
      checkAuth();
    } catch {
      setAuthError('Connection failed');
    }
  }

  async function handleLogout() {
    try {
      await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
      setUser(null);
      setProjects([]);
      setSelectedProject(null);
    } catch {
      // ignore
    }
  }

  async function handleCreateProject(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setCreateError('');
    setCreatingProject(true);
    try {
      const res = await fetch(`${apiUrl}/projects`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ youtubeUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed to create project');
        return;
      }
      setYoutubeUrl('');
      setShowNewProjectModal(false);
      loadProjects();
    } catch {
      setCreateError('Failed to connect to server');
    } finally {
      setCreatingProject(false);
    }
  }

  async function openProject(project: Project) {
    setSelectedProject(project);
    setLoadingClips(true);
    try {
      const res = await fetch(`${apiUrl}/projects/${project.id}/clips`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setClips(Array.isArray(data) ? data : []);
      }
    } catch {
      setClips([]);
    } finally {
      setLoadingClips(false);
    }
  }

  async function handleOpenPreview(clip: Clip) {
    setPreviewClip(clip);
    setLoadingStream(true);
    setVideoStreamUrl(null);
    try {
      const res = await fetch(`${apiUrl}/clips/${clip.id}/preview`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        // Fetch actual blob with credentials to display inside video element securely
        const videoRes = await fetch(data.url, { credentials: 'include' });
        if (videoRes.ok) {
          const blob = await videoRes.blob();
          setVideoStreamUrl(URL.createObjectURL(blob));
        } else {
          alert('Failed to load video stream');
        }
      } else {
        alert('Clip not ready or permission denied');
      }
    } catch {
      alert('Error fetching video preview');
    } finally {
      setLoadingStream(false);
    }
  }

  async function handleDownloadClip(clip: Clip) {
    setDownloadingClipId(clip.id);
    try {
      const res = await fetch(`${apiUrl}/clips/${clip.id}/download`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const videoRes = await fetch(data.url, { credentials: 'include' });
        if (videoRes.ok) {
          const blob = await videoRes.blob();
          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = data.filename || `${clip.title}.mp4`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
        } else {
          alert('Failed to download video file');
        }
      } else {
        alert('Could not generate download link');
      }
    } catch {
      alert('Error downloading video');
    } finally {
      setDownloadingClipId(null);
    }
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">C</span>
          <span className="brand-name">ClipForge AI</span>
        </div>
        <nav className="nav" aria-label="Main navigation">
          <a className={`nav-link ${!selectedProject ? 'active' : ''}`} href="/" onClick={(e) => { e.preventDefault(); setSelectedProject(null); }}>
            <span>⌂</span>
            <span className="nav-label">Overview</span>
          </a>
          <a className="nav-link" href="/history">
            <span>▤</span>
            <span className="nav-label">History</span>
          </a>
          <a className="nav-link" href="/settings">
            <span>⚙</span>
            <span className="nav-label">Settings</span>
          </a>
        </nav>
        <div className="sidebar-footer">
          {user ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
              <button className="text-button" style={{ textAlign: 'left', color: '#e11d48' }} onClick={handleLogout}>
                Sign out
              </button>
            </div>
          ) : (
            <button className="primary-button" style={{ width: '100%', fontSize: 13 }} onClick={() => { setIsRegister(false); setShowAuthModal(true); }}>
              Sign In
            </button>
          )}
        </div>
      </aside>

      <div className="main">
        <header className="header">
          <span className="breadcrumb">
            Workspace {selectedProject ? ` / ${selectedProject.title ?? 'Project'}` : ' / Overview'}
          </span>
          <div className="header-actions">
            <button className="icon-button" onClick={toggleTheme} aria-label="Toggle dark mode">
              {dark ? '☀' : '☾'}
            </button>
            {user ? (
              <span className="avatar" title={user.email}>
                {(user.email || 'U').slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <button className="text-button" onClick={() => { setIsRegister(false); setShowAuthModal(true); }}>
                Sign In
              </button>
            )}
          </div>
        </header>

        <main className="content">
          {/* DETAIL VIEW */}
          {selectedProject ? (
            <section className="section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <button className="text-button" onClick={() => setSelectedProject(null)} style={{ marginBottom: 8, display: 'inline-block' }}>
                    ← Back to Projects
                  </button>
                  <h1>{selectedProject.title ?? 'Untitled project'}</h1>
                  <p className="muted">Status: <span className={`status ${selectedProject.status !== 'completed' ? 'processing' : ''}`}>{selectedProject.status}</span></p>
                </div>
                <button className="primary-button" onClick={() => openProject(selectedProject)}>
                  ↻ Refresh
                </button>
              </div>

              {loadingClips ? (
                <p className="muted">Loading clips...</p>
              ) : clips.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                  {clips.map((clip) => (
                    <div className="card" key={clip.id} style={{ display: 'grid', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <h3 style={{ fontSize: 16 }}>{clip.title}</h3>
                        <span className="status">{clip.engagementScore}/100</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>{clip.transcriptSnippet}</p>
                      <div style={{ fontSize: 12, background: 'var(--surface-muted)', padding: '8px 12px', borderRadius: 8 }}>
                        <strong>Why viral:</strong> {clip.aiRationale}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--muted)' }}>
                        <span>⏱ {clip.durationSeconds.toFixed(1)}s</span>
                        <span>{clip.status}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                          className="primary-button"
                          style={{ flex: 1, textAlign: 'center', fontSize: 13, padding: '8px 12px' }}
                          onClick={() => handleOpenPreview(clip)}
                        >
                          ▶ Preview
                        </button>
                        <button
                          className="text-button"
                          style={{ padding: '8px 12px' }}
                          disabled={downloadingClipId === clip.id}
                          onClick={() => handleDownloadClip(clip)}
                        >
                          {downloadingClipId === clip.id ? 'Saving...' : '⬇ Download'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card empty-state">
                  <div className="empty-icon">⏳</div>
                  <h2>
                    {selectedProject.status === 'downloading' && 'Downloading YouTube Video...'}
                    {selectedProject.status === 'transcribing' && 'Transcribing Audio with Whisper...'}
                    {selectedProject.status === 'analyzing' && 'Gemini AI Detecting Viral Moments...'}
                    {selectedProject.status === 'failed' && 'Processing Failed'}
                    {selectedProject.status === 'pending' && 'Queued for Processing...'}
                  </h2>
                  <p className="muted">
                    {selectedProject.status === 'failed'
                      ? 'Error processing video. Check logs or verify YouTube restrictions.'
                      : 'The automated pipeline is working in the background. Refresh in a moment!'}
                  </p>
                  <button className="primary-button" onClick={() => openProject(selectedProject)}>
                    Check status
                  </button>
                </div>
              )}
            </section>
          ) : (
            /* OVERVIEW */
            <>
              <section className="hero">
                <div>
                  <p className="eyebrow">Creator workspace</p>
                  <h1>{user ? `Welcome back, ${user.displayName || user.email.split('@')[0]}.` : 'AI Video Clipper.'}</h1>
                  <p className="muted">Turn your long-form YouTube content into viral clips with AI.</p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => {
                    if (!user) setShowAuthModal(true);
                    else setShowNewProjectModal(true);
                  }}
                >
                  + New project
                </button>
              </section>

              <section className="stats" aria-label="Workspace statistics">
                <div className="card">
                  <div className="stat-label">Total Projects</div>
                  <div className="stat-value">{projects.length}</div>
                  <div className="stat-note">Active workspace</div>
                </div>
                <div className="card">
                  <div className="stat-label">Clips generated</div>
                  <div className="stat-value">
                    {projects.reduce((acc, p) => acc + (p._count?.clips ?? 0), 0)}
                  </div>
                  <div className="stat-note">Ready to share</div>
                </div>
                <div className="card">
                  <div className="stat-label">AI Engine</div>
                  <div className="stat-value" style={{ fontSize: 22 }}>Gemini 3.6</div>
                  <div className="stat-note">Active & connected</div>
                </div>
                <div className="card">
                  <div className="stat-label">STT Engine</div>
                  <div className="stat-value" style={{ fontSize: 22 }}>Whisper Small</div>
                  <div className="stat-note">Word-level sync</div>
                </div>
              </section>

              <section className="section">
                <div className="section-heading">
                  <h2>Recent projects</h2>
                  <a className="text-button" href="/history">View all →</a>
                </div>

                {projects.length > 0 ? (
                  <div className="project-list">
                    {projects.map((project) => (
                      <div className="card project-row" key={project.id}>
                        <div>
                          <div className="project-name">{project.title ?? 'Untitled project'}</div>
                          <div className="project-meta">{new Date(project.createdAt).toLocaleString()}</div>
                        </div>
                        <span className={`status ${project.status !== 'completed' ? 'processing' : ''}`}>
                          {project.status}
                        </span>
                        <span className="muted">{project._count?.clips ? `${project._count.clips} clips` : '—'}</span>
                        <button className="text-button" onClick={() => openProject(project)}>
                          Open
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card empty-state">
                    <div className="empty-icon">✦</div>
                    <h2>Your next great clip starts here</h2>
                    <p className="muted">Paste a YouTube URL and let AI find the moments worth sharing.</p>
                    <button
                      className="primary-button"
                      onClick={() => {
                        if (!user) setShowAuthModal(true);
                        else setShowNewProjectModal(true);
                      }}
                    >
                      Create your first project
                    </button>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {/* MODAL: AUTH */}
      {showAuthModal && (
        <div className="modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>{isRegister ? 'Create an account' : 'Sign in to ClipForge'}</h2>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              {isRegister ? 'Sign up to start clipping videos' : 'Log in with your email and password'}
            </p>
            <form onSubmit={handleAuth} style={{ display: 'grid', gap: 12 }}>
              {isRegister && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Display Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Your Name"
                    className="modal-input"
                  />
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="modal-input"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Password (min 8 chars, mixed case + number)</label>
                <input
                  type="password"
                  required
                  value={authPass}
                  onChange={(e) => setAuthPass(e.target.value)}
                  placeholder="••••••••"
                  className="modal-input"
                />
              </div>
              {authError && <p style={{ color: '#e11d48', fontSize: 13, margin: 0 }}>{authError}</p>}
              <button className="primary-button" style={{ marginTop: 8 }}>
                {isRegister ? 'Create Account' : 'Sign In'}
              </button>
            </form>
            <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
              <span className="muted">{isRegister ? 'Already have an account?' : "Don't have an account?"}</span>{' '}
              <button
                className="text-button"
                style={{ textDecoration: 'underline' }}
                onClick={() => { setIsRegister(!isRegister); setAuthError(''); }}
              >
                {isRegister ? 'Sign in' : 'Sign up'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NEW PROJECT */}
      {showNewProjectModal && (
        <div className="modal-backdrop" onClick={() => !creatingProject && setShowNewProjectModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Start a New Project</h2>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              Paste a public YouTube video link. AI will download, transcribe, and extract viral clips automatically.
            </p>
            <form onSubmit={handleCreateProject} style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>YouTube URL</label>
                <input
                  type="url"
                  required
                  disabled={creatingProject}
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="modal-input"
                />
              </div>
              {createError && <p style={{ color: '#e11d48', fontSize: 13, margin: 0 }}>{createError}</p>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  className="text-button"
                  disabled={creatingProject}
                  onClick={() => setShowNewProjectModal(false)}
                >
                  Cancel
                </button>
                <button className="primary-button" disabled={creatingProject}>
                  {creatingProject ? 'Validating & Starting...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIDEO PLAYER PREVIEW */}
      {previewClip && (
        <div className="modal-backdrop" onClick={() => { setPreviewClip(null); setVideoStreamUrl(null); }}>
          <div className="modal-card" style={{ maxWidth: 480, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, margin: 0, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {previewClip.title}
              </h3>
              <button className="text-button" onClick={() => { setPreviewClip(null); setVideoStreamUrl(null); }}>✕</button>
            </div>
            
            {loadingStream ? (
              <div style={{ padding: '60px 0' }}>
                <div className="empty-icon" style={{ margin: '0 auto 12px' }}>⏳</div>
                <p className="muted">Loading video clip...</p>
              </div>
            ) : videoStreamUrl ? (
              <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000', maxHeight: '65vh', display: 'flex', justifyContent: 'center' }}>
                <video
                  src={videoStreamUrl}
                  controls
                  autoPlay
                  playsInline
                  style={{ maxHeight: '65vh', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <p style={{ color: '#e11d48', padding: '20px 0' }}>Video could not be loaded.</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <span className="status">Score: {previewClip.engagementScore}/100</span>
              <button
                className="primary-button"
                disabled={downloadingClipId === previewClip.id}
                onClick={() => handleDownloadClip(previewClip)}
              >
                {downloadingClipId === previewClip.id ? 'Downloading...' : 'Download MP4'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
