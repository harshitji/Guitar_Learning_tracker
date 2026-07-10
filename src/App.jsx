import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart3, LayoutGrid, CheckCircle, Save, PowerOff, Tag } from 'lucide-react';
import ModuleTimeline from './components/ModuleTimeline';
import Analytics from './components/Analytics';
import TagsExplorer from './components/TagsExplorer';

export default function App() {
  const [sections, setSections] = useState([]);
  const [stateData, setStateData] = useState({});
  const [selectedSectionIdx, setSelectedSectionIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' or 'analytics'
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'saved', 'error'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch Roadmap data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('http://localhost:3001/api/roadmap');
        if (!response.ok) {
          throw new Error('Could not fetch roadmap data. Make sure backend server.js is running!');
        }
        const data = await response.json();
        setSections(data.sections || []);
        setStateData(data.stateData || {});
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Helper to deep clone stateData
  const cloneStateData = () => JSON.parse(JSON.stringify(stateData));

  // Initialize Day/Activity in stateData if missing
  const ensureActivityExists = (draft, day, actIdx) => {
    if (!draft[day]) {
      draft[day] = {};
    }
    const idxKey = actIdx.toString();
    if (!draft[day][idxKey]) {
      draft[day][idxKey] = {
        state: 'backlog',
        notes: '',
        checklist: [],
        images: [],
        startDate: '',
        endDate: '',
        workedDates: [],
        stateHistory: [],
        tags: []
      };
    } else {
      // Ensure properties exist on old structures
      if (draft[day][idxKey].startDate === undefined) draft[day][idxKey].startDate = '';
      if (draft[day][idxKey].endDate === undefined) draft[day][idxKey].endDate = '';
      if (draft[day][idxKey].workedDates === undefined) draft[day][idxKey].workedDates = [];
      if (draft[day][idxKey].stateHistory === undefined) draft[day][idxKey].stateHistory = [];
      if (draft[day][idxKey].tags === undefined) draft[day][idxKey].tags = [];
    }
    return draft[day][idxKey];
  };

  // State modifying functions
  const handleActivityChange = (day, actIdx, state) => {
    const draft = cloneStateData();
    const act = ensureActivityExists(draft, day, actIdx);
    const oldState = act.state || 'backlog';
    
    if (oldState !== state) {
      const nowISO = new Date().toISOString();
      if (!act.stateHistory) act.stateHistory = [];
      
      // If history is empty, record initial state starting 1 min ago so we have a duration
      if (act.stateHistory.length === 0) {
        const oneMinAgo = new Date(Date.now() - 60000).toISOString();
        act.stateHistory.push({
          state: oldState,
          timestamp: oneMinAgo
        });
      }
      
      act.state = state;
      act.stateHistory.push({
        state,
        timestamp: nowISO
      });
    }

    // Smart helper: if moving to in_progress/revising and no startDate is set, auto-set to today
    const todayStr = new Date().toISOString().split('T')[0];
    if ((state === 'in_progress' || state === 'revising') && !act.startDate) {
      act.startDate = todayStr;
    }
    // Smart helper: if moving to completed and no endDate is set, auto-set to today
    if (state === 'completed' && !act.endDate) {
      act.endDate = todayStr;
    }
    // Auto-log today's date if not already in workedDates
    if (state !== 'backlog' && !act.workedDates.includes(todayStr)) {
      act.workedDates.push(todayStr);
    }

    setStateData(draft);
  };

  const handleNotesChange = (day, actIdx, notes) => {
    const draft = cloneStateData();
    const act = ensureActivityExists(draft, day, actIdx);
    act.notes = notes;
    setStateData(draft);
  };

  const handleChecklistChange = (day, actIdx, itemIdx, checked) => {
    const draft = cloneStateData();
    const act = ensureActivityExists(draft, day, actIdx);
    if (act.checklist[itemIdx]) {
      act.checklist[itemIdx].done = checked;
    }
    setStateData(draft);
  };

  const handleAddChecklistItem = (day, actIdx, text) => {
    const draft = cloneStateData();
    const act = ensureActivityExists(draft, day, actIdx);
    if (!act.checklist) act.checklist = [];
    act.checklist.push({
      id: Date.now().toString(),
      text,
      done: false
    });
    setStateData(draft);
  };

  const handleDeleteChecklistItem = (day, actIdx, itemIdx) => {
    const draft = cloneStateData();
    const act = ensureActivityExists(draft, day, actIdx);
    if (act.checklist) {
      act.checklist.splice(itemIdx, 1);
    }
    setStateData(draft);
  };

  const handleImageUpload = (day, actIdx, imagePath) => {
    const draft = cloneStateData();
    const act = ensureActivityExists(draft, day, actIdx);
    if (!act.images) act.images = [];
    act.images.push(imagePath);
    setStateData(draft);
  };

  const handleImageRemove = (day, actIdx, imgIdx) => {
    const draft = cloneStateData();
    const act = ensureActivityExists(draft, day, actIdx);
    if (act.images) {
      act.images.splice(imgIdx, 1);
    }
    setStateData(draft);
  };

  const handleStartDateChange = (day, actIdx, dateStr) => {
    const draft = cloneStateData();
    const act = ensureActivityExists(draft, day, actIdx);
    act.startDate = dateStr;
    setStateData(draft);
  };

  const handleEndDateChange = (day, actIdx, dateStr) => {
    const draft = cloneStateData();
    const act = ensureActivityExists(draft, day, actIdx);
    act.endDate = dateStr;
    setStateData(draft);
  };

  const handleLogWorkedDate = (day, actIdx, dateStr) => {
    if (!dateStr) return;
    const draft = cloneStateData();
    const act = ensureActivityExists(draft, day, actIdx);
    if (!act.workedDates) act.workedDates = [];
    if (!act.workedDates.includes(dateStr)) {
      act.workedDates.push(dateStr);
      // Sort workedDates chronologically
      act.workedDates.sort();
    }
    setStateData(draft);
  };

  const handleRemoveWorkedDate = (day, actIdx, dateIdx) => {
    const draft = cloneStateData();
    const act = ensureActivityExists(draft, day, actIdx);
    if (act.workedDates) {
      act.workedDates.splice(dateIdx, 1);
    }
    setStateData(draft);
  };

  const handleToggleTag = (day, actIdx, tag) => {
    if (!tag) return;
    const cleanTag = tag.trim().toLowerCase();
    if (!cleanTag) return;
    const draft = cloneStateData();
    const act = ensureActivityExists(draft, day, actIdx);
    if (!act.tags) act.tags = [];
    const idx = act.tags.indexOf(cleanTag);
    if (idx !== -1) {
      act.tags.splice(idx, 1); // remove
    } else {
      act.tags.push(cleanTag); // add
    }
    setStateData(draft);
  };

  const handleAddCustomTag = (day, actIdx, tag) => {
    if (!tag) return;
    const cleanTag = tag.trim().toLowerCase();
    if (!cleanTag) return;
    const draft = cloneStateData();
    const act = ensureActivityExists(draft, day, actIdx);
    if (!act.tags) act.tags = [];
    if (!act.tags.includes(cleanTag)) {
      act.tags.push(cleanTag);
    }
    setStateData(draft);
  };

  const handleResetStateHistory = (day, actIdx) => {
    const draft = cloneStateData();
    const act = ensureActivityExists(draft, day, actIdx);
    act.stateHistory = [];
    setStateData(draft);
  };

  // Trigger POST Save to Backend API
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const response = await fetch('http://localhost:3001/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stateData })
      });
      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Shutdown: save then stop the server and close the tab
  const handleShutdown = async () => {
    if (!window.confirm('Save all progress and stop the server?')) return;
    try {
      await fetch('http://localhost:3001/api/shutdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stateData })
      });
    } catch (_) { /* server exiting is expected */ }
    window.close();
  };

  // Auto-save: periodic interval (30s) + on tab hide + on beforeunload
  useEffect(() => {
    const sendSave = () => {
      if (!stateData || Object.keys(stateData).length === 0) return;
      const blob = new Blob(
        [JSON.stringify({ stateData })],
        { type: 'application/json' }
      );
      navigator.sendBeacon('http://localhost:3001/api/autosave', blob);
    };

    const periodicSave = async () => {
      if (!stateData || Object.keys(stateData).length === 0) return;
      try {
        await fetch('http://localhost:3001/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stateData })
        });
        setSaveStatus('auto-saved');
        setTimeout(() => setSaveStatus(''), 2000);
      } catch (_) { /* silent */ }
    };

    const interval = setInterval(periodicSave, 30000); // every 30 seconds

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') sendSave();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', sendSave);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', sendSave);
    };
  }, [stateData]);

  // Calculate Overall Progress Metrics
  let totalTasks = 0;
  let completedTasks = 0;

  sections.forEach(section => {
    section.days.forEach(d => {
      d.tasks.forEach((t, idx) => {
        totalTasks++;
        const stateVal = stateData[d.day]?.[idx.toString()]?.state || t.state || 'backlog';
        if (stateVal === 'completed') {
          completedTasks++;
        }
      });
    });
  });

  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const strokeDashoffset = 125.6 - (125.6 * progressPercent) / 100;

  // Sidebar: compute progress % and dominant state for each section
  const getSectionStatus = (section) => {
    let total = 0, completedCount = 0, inProgressCount = 0, revisingCount = 0;
    section.days.forEach(d => {
      d.tasks.forEach((t, idx) => {
        total++;
        const s = stateData[d.day]?.[idx.toString()]?.state || t.state || 'backlog';
        if (s === 'completed') completedCount++;
        else if (s === 'in_progress') inProgressCount++;
        else if (s === 'revising') revisingCount++;
      });
    });
    const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    let dominantState = 'backlog';
    if (completedCount === total && total > 0) dominantState = 'completed';
    else if (revisingCount > 0) dominantState = 'revising';
    else if (inProgressCount > 0) dominantState = 'in_progress';
    return { pct, dominantState };
  };

  const STATE_COLORS = {
    backlog:     { dot: '#52525b', text: 'var(--text-muted)' },
    in_progress: { dot: '#f59e0b', text: '#f59e0b' },
    revising:    { dot: '#a78bfa', text: '#a78bfa' },
    completed:   { dot: '#34d399', text: '#34d399' },
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)', gap: '1.5rem' }}>
        <div style={{ fontSize: '4rem', animation: 'spin 2s linear infinite', display: 'inline-block' }}>🎸</div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Loading Your Guitar Roadmap</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Parsing 540 days of practice sessions...</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)', padding: '2rem', textAlign: 'center', gap: '1rem' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h2 style={{ color: '#ef4444' }}>Backend Connection Failed</h2>
        <p style={{ maxWidth: '500px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {error}.<br />
          Please ensure that you run the server using <strong>npm run dev</strong> inside the project folder so that the API layer is active.
        </p>
      </div>
    );
  }

  const selectedSection = sections[selectedSectionIdx];

  return (
    <div className="app-container">
      
      {/* 1. Sidebar Panel */}
      <aside className="sidebar">
        <div className="logo-container">
          <span className="logo-icon">🎸</span>
          <span className="logo-text">JustinGuitar Track</span>
        </div>

        <nav>
          <div className="sidebar-heading">Navigation</div>
          <ul className="sidebar-menu">
            <li 
              className={`sidebar-item ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LayoutGrid size={16} />
                <span>Roadmap Practice</span>
              </div>
            </li>
            <li 
              className={`sidebar-item ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={16} />
                <span>Progress Analytics</span>
              </div>
            </li>
            <li 
              className={`sidebar-item ${activeTab === 'tags' ? 'active' : ''}`}
              onClick={() => setActiveTab('tags')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tag size={16} />
                <span>Tags Explorer</span>
              </div>
            </li>
          </ul>

          <div className="sidebar-heading">Grade Modules</div>
          <ul className="sidebar-menu" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
            {sections.map((section, idx) => {
              let isTrouble = section.type === 'troubleshooting';
              let isRev = section.type === 'revision';
              let sectionIcon = '📖';
              if (isTrouble) sectionIcon = '🛠️';
              if (isRev) sectionIcon = '🏆';
              const { pct, dominantState } = getSectionStatus(section);
              const stateColor = STATE_COLORS[dominantState];
              const isActive = activeTab === 'timeline' && selectedSectionIdx === idx;

              return (
                <li
                  key={idx}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedSectionIdx(idx);
                    setActiveTab('timeline');
                  }}
                  title={section.title}
                  style={isActive ? { borderLeftColor: stateColor.dot } : {}}
                >
                  {/* Colored state dot */}
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    backgroundColor: stateColor.dot,
                    boxShadow: dominantState !== 'backlog' ? `0 0 6px ${stateColor.dot}` : 'none',
                    display: 'inline-block',
                  }} />
                  <span style={{
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: '75%', fontSize: '0.8rem',
                    fontWeight: isTrouble || isRev ? 700 : 500,
                    color: isTrouble ? '#fbbf24' : isRev ? '#c084fc' : 'inherit',
                    flex: 1,
                  }}>
                    {sectionIcon} {section.title.replace(/Grade \d+\s*-\s*/i, '')}
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: stateColor.text, flexShrink: 0 }}>
                    {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* 2. Main Panel */}
      <main className="main-panel">
        
        {/* Top Header Card */}
        <header className="top-bar">
          <div>
            <h1 className="current-module-title">
              {activeTab === 'timeline' ? selectedSection?.title : 'Analytics Overview'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              🎸 540-Day Custom JustinGuitar Consolidation Roadmap
            </p>
          </div>

          <div className="global-stats-container">
            {/* Save Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {/* Stop Server button */}
                <button
                  onClick={handleShutdown}
                  title="Save progress and stop the server"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.3)', padding: '0.65rem 1rem',
                    borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem',
                    cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                >
                  <PowerOff size={13} /> Stop
                </button>
                {/* Save & Sync button */}
                <button className="btn-save" onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Save size={14} />{isSaving ? 'Saving...' : 'Save & Sync'}
                </button>
              </div>
              {saveStatus === 'saved' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--state-completed)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle size={12} /> Synced to Markdown!
                </span>
              )}
              {saveStatus === 'auto-saved' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle size={12} /> Auto-saved
                </span>
              )}
              {saveStatus === 'error' && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>❌ Sync failed — check server</span>}
              {!saveStatus && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Auto-saves every 30s • Syncs .md file</span>}
            </div>

            {/* Circular Progress Ring */}
            <div className="stat-item">
              <div className="stat-circle">
                <svg width="50" height="50">
                  <circle cx="25" cy="25" r="20" fill="transparent" stroke="var(--border-color)" strokeWidth="3" />
                  <circle 
                    cx="25" 
                    cy="25" 
                    r="20" 
                    fill="transparent" 
                    stroke="var(--accent-cyan)" 
                    strokeWidth="3" 
                    strokeDasharray="125.6" 
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                  />
                </svg>
                <div className="stat-number" style={{ color: 'var(--accent-cyan)' }}>{progressPercent}%</div>
              </div>
              <div className="stat-details">
                <span className="stat-label">Total Completed</span>
                <span className="stat-value">{completedTasks} / {totalTasks}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Tabs */}
        {activeTab === 'timeline' ? (
          <ModuleTimeline
            section={selectedSection}
            stateData={stateData}
            onActivityChange={handleActivityChange}
            onNotesChange={handleNotesChange}
            onChecklistChange={handleChecklistChange}
            onAddChecklistItem={handleAddChecklistItem}
            onDeleteChecklistItem={handleDeleteChecklistItem}
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
            openLightbox={setLightboxUrl}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onLogWorkedDate={handleLogWorkedDate}
            onRemoveWorkedDate={handleRemoveWorkedDate}
            onToggleTag={handleToggleTag}
            onAddCustomTag={handleAddCustomTag}
            onResetStateHistory={handleResetStateHistory}
          />
        ) : activeTab === 'analytics' ? (
          <Analytics sections={sections} stateData={stateData} />
        ) : (
          <TagsExplorer
            sections={sections}
            stateData={stateData}
            onNavigateToTask={(secIdx) => {
              setSelectedSectionIdx(secIdx);
              setActiveTab('timeline');
            }}
          />
        )}
      </main>

      {/* Lightbox Overlay Modal */}
      {lightboxUrl && (
        <div className="lightbox-modal" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="High resolution note upload" className="lightbox-img" />
        </div>
      )}

    </div>
  );
}
