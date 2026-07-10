import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Camera, ExternalLink, FileText, Circle, CheckCircle2, Clock, RotateCcw, Archive, Calendar } from 'lucide-react';

// State configuration - colors, labels, icons, gradients
const STATE_CONFIG = {
  backlog: {
    label: 'Backlog',
    color: '#52525b',
    glow: 'rgba(82, 82, 91, 0.3)',
    bg: 'rgba(82, 82, 91, 0.06)',
    border: 'rgba(82, 82, 91, 0.35)',
    headerBg: 'rgba(82, 82, 91, 0.08)',
    gradient: 'linear-gradient(90deg, rgba(82,82,91,0.25) 0%, transparent 100%)',
    icon: Archive,
    dot: '#71717a',
  },
  in_progress: {
    label: 'In Progress',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.35)',
    bg: 'rgba(245, 158, 11, 0.06)',
    border: 'rgba(245, 158, 11, 0.5)',
    headerBg: 'rgba(245, 158, 11, 0.08)',
    gradient: 'linear-gradient(90deg, rgba(245,158,11,0.2) 0%, transparent 100%)',
    icon: Clock,
    dot: '#f59e0b',
  },
  revising: {
    label: 'Revising',
    color: '#a78bfa',
    glow: 'rgba(167, 139, 250, 0.35)',
    bg: 'rgba(167, 139, 250, 0.06)',
    border: 'rgba(167, 139, 250, 0.5)',
    headerBg: 'rgba(167, 139, 250, 0.08)',
    gradient: 'linear-gradient(90deg, rgba(167,139,250,0.2) 0%, transparent 100%)',
    icon: RotateCcw,
    dot: '#a78bfa',
  },
  completed: {
    label: 'Done',
    color: '#34d399',
    glow: 'rgba(52, 211, 153, 0.35)',
    bg: 'rgba(52, 211, 153, 0.06)',
    border: 'rgba(52, 211, 153, 0.5)',
    headerBg: 'rgba(52, 211, 153, 0.08)',
    gradient: 'linear-gradient(90deg, rgba(52,211,153,0.2) 0%, transparent 100%)',
    icon: CheckCircle2,
    dot: '#34d399',
  },
};

// Mini state dot indicator
function StateDot({ state, size = 8 }) {
  const cfg = STATE_CONFIG[state] || STATE_CONFIG.backlog;
  return (
    <span style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: cfg.dot,
      boxShadow: `0 0 ${size}px ${cfg.glow}`,
      flexShrink: 0,
    }} />
  );
}

// Progress mini-bar showing task completion across a day
function DayProgressBar({ tasks }) {
  const total = tasks.length;
  if (total === 0) return null;
  const counts = {
    completed: tasks.filter(t => t.state === 'completed').length,
    revising: tasks.filter(t => t.state === 'revising').length,
    in_progress: tasks.filter(t => t.state === 'in_progress').length,
    backlog: tasks.filter(t => !t.state || t.state === 'backlog').length,
  };

  return (
    <div style={{ display: 'flex', height: 4, borderRadius: 4, overflow: 'hidden', width: '120px', gap: '1px' }}>
      {['completed', 'revising', 'in_progress', 'backlog'].map(s => {
        const pct = (counts[s] / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={s}
            title={`${STATE_CONFIG[s].label}: ${counts[s]}`}
            style={{
              flex: `0 0 ${pct}%`,
              backgroundColor: STATE_CONFIG[s].dot,
              opacity: s === 'backlog' ? 0.3 : 0.85,
            }}
          />
        );
      })}
    </div>
  );
}

export default function ModuleTimeline({
  section,
  stateData = {},
  onActivityChange,
  onNotesChange,
  onChecklistChange,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onImageUpload,
  onImageRemove,
  openLightbox,
  onStartDateChange,
  onEndDateChange,
  onLogWorkedDate,
  onRemoveWorkedDate,
  onToggleTag,
  onAddCustomTag
}) {
  const [expandedNotes, setExpandedNotes] = useState({});
  const [checklistInputs, setChecklistInputs] = useState({});
  const [manualDates, setManualDates] = useState({});
  const [tagInputs, setTagInputs] = useState({});

  if (!section) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        Select a module from the sidebar to view your roadmap timeline.
      </div>
    );
  }

  const toggleNotes = (day, actIdx) => {
    const key = `${day}_${actIdx}`;
    setExpandedNotes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleChecklistInputChange = (day, actIdx, value) => {
    const key = `${day}_${actIdx}`;
    setChecklistInputs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const submitChecklistItem = (day, actIdx) => {
    const key = `${day}_${actIdx}`;
    const text = checklistInputs[key]?.trim();
    if (!text) return;
    onAddChecklistItem(day, actIdx, text);
    setChecklistInputs(prev => ({
      ...prev,
      [key]: ''
    }));
  };

  const handleFileChange = async (e, day, actIdx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        onImageUpload(day, actIdx, data.absolutePath);
      }
    } catch (err) {
      console.error('Error uploading image', err);
    }
  };

  // Determine aggregate day status — reads from live stateData first
  const getDayStatus = (dayObj) => {
    const tasks = dayObj.tasks || [];
    if (tasks.length === 0) return 'backlog';
    const resolvedStates = tasks.map((t, idx) =>
      stateData[dayObj.day]?.[idx.toString()]?.state || t.state || 'backlog'
    );
    if (resolvedStates.every(s => s === 'completed')) return 'completed';
    if (resolvedStates.some(s => s === 'revising')) return 'revising';
    if (resolvedStates.some(s => s === 'in_progress')) return 'in_progress';
    return 'backlog';
  };

  // Resolve live task data from stateData (merging parsed task with stored state)
  const resolveTask = (dayObj, task, actIdx) => {
    const stored = stateData[dayObj.day]?.[actIdx.toString()];
    return {
      ...task,
      state:     stored?.state     ?? task.state     ?? 'backlog',
      notes:     stored?.notes     ?? task.notes     ?? '',
      checklist: stored?.checklist ?? task.checklist ?? [],
      images:    stored?.images    ?? task.images    ?? [],
      startDate: stored?.startDate ?? '',
      endDate:   stored?.endDate   ?? '',
      workedDates: stored?.workedDates ?? [],
      stateHistory: stored?.stateHistory ?? [],
      tags:         stored?.tags         ?? []
    };
  };
  const getStateDurationBreakdown = (history = []) => {
    if (!history || history.length === 0) return null;
    const durations = { backlog: 0, in_progress: 0, revising: 0, completed: 0 };
    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      const start = new Date(entry.timestamp);
      const end = (i + 1 < history.length) ? new Date(history[i + 1].timestamp) : new Date();
      const diffMs = end - start;
      const stateKey = entry.state;
      if (durations[stateKey] !== undefined) {
        durations[stateKey] += diffMs;
      }
    }
    const formatDuration = (ms) => {
      if (ms <= 0) return null;
      const mins = Math.round(ms / 60000);
      if (mins < 1) return '< 1m';
      if (mins < 60) return `${mins}m`;
      const hours = Math.round(mins / 60);
      if (hours < 24) return `${hours}h`;
      const days = Math.round(hours / 24);
      return `${days}d`;
    };
    const parts = Object.entries(durations)
      .map(([s, ms]) => {
        const readable = formatDuration(ms);
        if (!readable) return null;
        const labels = { backlog: 'Todo', in_progress: 'WIP', revising: 'Rev', completed: 'Done' };
        return `${labels[s]}: ${readable}`;
      })
      .filter(Boolean);
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  return (
    <div className="timeline-container">
      {/* Links row */}
      {section.links && section.links.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', alignSelf: 'center' }}>Official Links:</span>
          {section.links.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                fontSize: '0.75rem', color: 'var(--accent-cyan)', textDecoration: 'none',
                padding: '0.25rem 0.5rem', borderRadius: '4px',
                backgroundColor: 'rgba(6, 182, 212, 0.08)', fontWeight: 600,
                border: '1px solid rgba(6, 182, 212, 0.2)', transition: 'var(--transition-fast)'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(6, 182, 212, 0.15)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(6, 182, 212, 0.08)'}
            >
              {link.text} <ExternalLink size={10} />
            </a>
          ))}
        </div>
      )}

      {section.days.map((dayObj, dayIdx) => {
        const dayStatus = getDayStatus(dayObj);
        const dayCfg = STATE_CONFIG[dayStatus];

        return (
          <div
            key={dayIdx}
            className="day-card"
            style={{
              animationDelay: `${dayIdx * 0.04}s`,
              borderColor: dayCfg.border,
              boxShadow: dayStatus !== 'backlog' ? `0 0 20px ${dayCfg.glow}, 0 4px 15px rgba(0,0,0,0.3)` : '0 4px 15px rgba(0,0,0,0.2)',
              transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
            }}
          >
            {/* Day Header with gradient stripe */}
            <div
              className="day-header"
              style={{
                background: `${dayCfg.gradient}, rgba(255,255,255,0.01)`,
                borderBottom: `1px solid ${dayCfg.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <StateDot state={dayStatus} size={10} />
                <span className="day-title">{dayObj.day}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Mini progress bar */}
                <DayProgressBar tasks={dayObj.tasks} />
                {/* State label badge */}
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: dayCfg.color,
                  backgroundColor: dayCfg.bg,
                  border: `1px solid ${dayCfg.border}`,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '20px',
                }}>
                  {dayCfg.label}
                </span>
              </div>
            </div>

            {/* Activities Grid */}
            <div className="day-activities-grid">
              {dayObj.tasks.map((rawTask, actIdx) => {
                // Always use live stateData if available
                const task = resolveTask(dayObj, rawTask, actIdx);
                const actKey = `${dayObj.day}_${actIdx}`;
                const actState = task.state;
                const cfg = STATE_CONFIG[actState];
                const IconComp = cfg.icon;
                const hasContent = task.notes || (task.checklist?.length > 0) || (task.images?.length > 0);
                const isExpanded = expandedNotes[actKey] !== undefined ? expandedNotes[actKey] : hasContent;

                const checklistDone = task.checklist?.filter(c => c.done).length || 0;
                const checklistTotal = task.checklist?.length || 0;

                return (
                  <div
                    key={actIdx}
                    className="activity-card"
                    style={{
                      borderColor: cfg.border,
                      borderLeftWidth: 3,
                      borderLeftColor: cfg.color,
                      background: cfg.bg,
                      boxShadow: actState !== 'backlog' ? `inset 0 0 20px ${cfg.glow}` : 'none',
                      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {/* Activity header row */}
                    <div className="activity-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        <IconComp size={14} style={{ color: cfg.color, flexShrink: 0 }} />
                        <span className="activity-category" style={{ color: cfg.color }}>{task.category}</span>
                      </div>

                      {/* State Selector pills */}
                      <div className="state-selector">
                        {Object.entries(STATE_CONFIG).map(([stateType, sCfg]) => (
                          <button
                            key={stateType}
                            title={sCfg.label}
                            onClick={() => onActivityChange(dayObj.day, actIdx, stateType)}
                            style={{
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              padding: '0.3rem 0.55rem',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.3px',
                              transition: 'all 0.2s ease',
                              background: actState === stateType
                                ? sCfg.color
                                : 'transparent',
                              color: actState === stateType ? '#000' : 'var(--text-muted)',
                              boxShadow: actState === stateType ? `0 0 10px ${sCfg.glow}` : 'none',
                            }}
                          >
                            {stateType === 'in_progress' ? '⚡ WIP' :
                             stateType === 'revising'    ? '🔄 Rev' :
                             stateType === 'completed'   ? '✅ Done' :
                                                           '📦 Todo'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Activity content text */}
                    <div
                      className="activity-content"
                      style={{
                        color: actState === 'completed' ? 'var(--text-secondary)' : 'var(--text-primary)',
                        textDecoration: actState === 'completed' ? 'line-through' : 'none',
                        opacity: actState === 'completed' ? 0.65 : 1,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {task.content}
                    </div>

                    {/* Checklist quick summary strip */}
                    {checklistTotal > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.35rem 0.6rem',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${cfg.border}`,
                        fontSize: '0.75rem',
                      }}>
                        {/* Segmented checklist progress bar */}
                        <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
                          {task.checklist.map((item, i) => (
                            <div
                              key={i}
                              title={item.text}
                              style={{
                                flex: 1,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: item.done ? cfg.color : 'rgba(255,255,255,0.1)',
                                boxShadow: item.done ? `0 0 6px ${cfg.glow}` : 'none',
                                transition: 'all 0.3s ease',
                              }}
                            />
                          ))}
                        </div>
                        <span style={{ color: cfg.color, fontWeight: 700, flexShrink: 0 }}>
                          {checklistDone}/{checklistTotal}
                        </span>
                      </div>
                    )}

                    {/* Notes Expander Panel */}
                    <div className="notes-expander" style={{ borderTopColor: cfg.border }}>
                      <div className="notes-header-row" onClick={() => toggleNotes(dayObj.day, actIdx)}
                        style={{ color: isExpanded ? cfg.color : 'var(--text-secondary)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <FileText size={13} />
                          <span>Notes & Trackers</span>
                          {hasContent && (
                            <span style={{
                              fontSize: '0.68rem',
                              backgroundColor: cfg.bg,
                              border: `1px solid ${cfg.border}`,
                              color: cfg.color,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '10px',
                            }}>
                              {[
                                checklistTotal > 0 ? `${checklistDone}/${checklistTotal} tasks` : null,
                                task.notes ? '📝' : null,
                                task.images?.length > 0 ? `🖼️ ${task.images.length}` : null
                              ].filter(Boolean).join(' ')}
                            </span>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>

                      {isExpanded && (
                        <div className="notes-content-box" style={{ marginTop: '0.5rem' }}>

                          {/* Checklist items */}
                          <div className="checklist-section">
                            <span className="checklist-title" style={{ color: cfg.color }}>
                              Practice Log Trackers
                            </span>
                            {task.checklist && task.checklist.map((item, itemIdx) => (
                              <div key={item.id || itemIdx} className="checklist-item" style={{
                                padding: '0.3rem 0.4rem',
                                borderRadius: '5px',
                                backgroundColor: item.done ? `${cfg.bg}` : 'transparent',
                                borderLeft: item.done ? `3px solid ${cfg.color}` : '3px solid transparent',
                                transition: 'all 0.25s ease',
                              }}>
                                <label className="checklist-checkbox-wrapper">
                                  <input
                                    type="checkbox"
                                    className="checklist-checkbox"
                                    checked={item.done || false}
                                    onChange={(e) => onChecklistChange(dayObj.day, actIdx, itemIdx, e.target.checked)}
                                    style={{ accentColor: cfg.color }}
                                  />
                                  <span
                                    className={`checklist-text ${item.done ? 'done' : ''}`}
                                    style={{ color: item.done ? cfg.color : 'var(--text-secondary)' }}
                                  >
                                    {item.text}
                                  </span>
                                </label>
                                <button className="btn-delete-item" onClick={() => onDeleteChecklistItem(dayObj.day, actIdx, itemIdx)}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                            <div className="add-checklist-item-row" style={{ marginTop: '0.35rem' }}>
                              <input
                                type="text"
                                className="input-checklist"
                                placeholder="Add tracker (e.g. 60 BPM - 45 changes)..."
                                value={checklistInputs[actKey] || ''}
                                onChange={(e) => handleChecklistInputChange(dayObj.day, actIdx, e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && submitChecklistItem(dayObj.day, actIdx)}
                                style={{ borderColor: cfg.border }}
                              />
                              <button
                                className="btn-add-item"
                                onClick={() => submitChecklistItem(dayObj.day, actIdx)}
                                style={{ borderColor: cfg.border, background: cfg.bg, color: cfg.color }}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Notes textarea */}
                          <div className="notes-editor-box">
                            <span className="checklist-title" style={{ color: cfg.color }}>Notes / Reflections</span>
                            <textarea
                              className="notes-textarea"
                              placeholder="Write notes, difficulties encountered, tips for next time..."
                              value={task.notes || ''}
                              onChange={(e) => onNotesChange(dayObj.day, actIdx, e.target.value)}
                              style={{ borderColor: task.notes ? cfg.border : 'var(--border-color)' }}
                            />
                          </div>

                          {/* Date Logs Section */}
                          <div style={{
                            display: 'flex', flexDirection: 'column', gap: '0.75rem',
                            padding: '0.75rem', borderRadius: '8px',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            border: `1px solid ${cfg.border}`,
                            marginTop: '0.75rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: cfg.color, fontWeight: 700, fontSize: '0.8rem' }}>
                              <Calendar size={14} />
                              <span>Practice Schedule & Logs</span>
                            </div>

                            {/* Start / End Dates inputs */}
                            <div style={{ display: 'grid', gridTemplateColumns: task.state === 'completed' ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
                              <div>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Start Date</label>
                                <input
                                  type="date"
                                  value={task.startDate || ''}
                                  onChange={(e) => onStartDateChange(dayObj.day, actIdx, e.target.value)}
                                  style={{
                                    width: '100%', backgroundColor: 'rgba(0,0,0,0.3)',
                                    border: `1px solid ${cfg.border}`, color: 'var(--text-primary)',
                                    padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem'
                                  }}
                                />
                              </div>
                              {task.state === 'completed' && (
                                <div>
                                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>End Date</label>
                                  <input
                                    type="date"
                                    value={task.endDate || ''}
                                    onChange={(e) => onEndDateChange(dayObj.day, actIdx, e.target.value)}
                                    style={{
                                      width: '100%', backgroundColor: 'rgba(0,0,0,0.3)',
                                      border: `1px solid ${cfg.border}`, color: 'var(--text-primary)',
                                      padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem'
                                    }}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Status durations display */}
                            {getStateDurationBreakdown(task.stateHistory) && (
                              <div style={{
                                fontSize: '0.72rem', color: 'var(--text-secondary)',
                                background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)',
                                padding: '0.4rem 0.6rem', borderRadius: '6px', marginTop: '0.25rem'
                              }}>
                                <span style={{ fontWeight: 700, color: cfg.color }}>Time in states:</span> {getStateDurationBreakdown(task.stateHistory)}
                              </div>
                            )}

                            {/* Worked Days Log list */}
                            <div style={{ marginTop: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Worked Days Logs</span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', margin: '0.4rem 0' }}>
                                {task.workedDates && task.workedDates.map((wDate, wIdx) => (
                                  <span key={wIdx} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                    fontSize: '0.7rem', backgroundColor: cfg.bg, color: cfg.color,
                                    border: `1px solid ${cfg.border}`, padding: '0.15rem 0.4rem',
                                    borderRadius: '4px', fontWeight: 600
                                  }}>
                                    {wDate}
                                    <button
                                      type="button"
                                      onClick={() => onRemoveWorkedDate(dayObj.day, actIdx, wIdx)}
                                      style={{
                                        border: 'none', background: 'none', color: cfg.color,
                                        fontSize: '0.8rem', cursor: 'pointer', padding: '0 0.1rem',
                                        fontWeight: 'bold', display: 'inline-flex', alignItems: 'center'
                                      }}
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                                {(!task.workedDates || task.workedDates.length === 0) && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No practice days logged yet.</span>
                                )}
                              </div>

                              {/* Log Day Selector row */}
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const todayStr = new Date().toISOString().split('T')[0];
                                    onLogWorkedDate(dayObj.day, actIdx, todayStr);
                                  }}
                                  style={{
                                    backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`,
                                    color: cfg.color, padding: '0.35rem 0.6rem', borderRadius: '6px',
                                    fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  + Log Today
                                </button>

                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>or</span>

                                <input
                                  type="date"
                                  value={manualDates[actKey] || ''}
                                  onChange={(e) => setManualDates(prev => ({ ...prev, [actKey]: e.target.value }))}
                                  style={{
                                    backgroundColor: 'rgba(0,0,0,0.3)', border: `1px solid ${cfg.border}`,
                                    color: 'var(--text-primary)', padding: '0.3rem 0.4rem', borderRadius: '6px',
                                    fontSize: '0.7rem'
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (manualDates[actKey]) {
                                      onLogWorkedDate(dayObj.day, actIdx, manualDates[actKey]);
                                      setManualDates(prev => ({ ...prev, [actKey]: '' }));
                                    }
                                  }}
                                  style={{
                                    backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
                                    color: 'var(--text-secondary)', padding: '0.3rem 0.5rem', borderRadius: '6px',
                                    fontSize: '0.7rem', cursor: 'pointer'
                                  }}
                                >
                                  Add Date
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Session Tags Section */}
                          <div style={{
                            display: 'flex', flexDirection: 'column', gap: '0.5rem',
                            padding: '0.75rem', borderRadius: '8px',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            border: `1px solid ${cfg.border}`,
                            marginTop: '0.75rem'
                          }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: cfg.color }}>Session Tags</span>
                            
                            {/* Quick toggle tags list */}
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                              {['revisit', 'good lesson', 'needs more work'].map(t => {
                                const active = task.tags && task.tags.includes(t);
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => onToggleTag(dayObj.day, actIdx, t)}
                                    style={{
                                      border: 'none', borderRadius: '6px', cursor: 'pointer',
                                      padding: '0.25rem 0.5rem', fontSize: '0.7rem', fontWeight: 600,
                                      transition: 'all 0.2s ease',
                                      background: active ? cfg.color : 'rgba(255,255,255,0.04)',
                                      color: active ? '#000' : 'var(--text-secondary)'
                                    }}
                                  >
                                    {t === 'revisit' ? '🔄 Revisit' : t === 'good lesson' ? '🏆 Good Lesson' : '🛠️ Needs Work'}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Active Custom Tags list */}
                            {task.tags && task.tags.filter(t => !['revisit', 'good lesson', 'needs more work'].includes(t)).length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', margin: '0.2rem 0' }}>
                                {task.tags.filter(t => !['revisit', 'good lesson', 'needs more work'].includes(t)).map((t, tIdx) => (
                                  <span key={tIdx} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                    fontSize: '0.7rem', backgroundColor: 'rgba(255,255,255,0.04)',
                                    color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                                    padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600
                                  }}>
                                    🏷️ {t}
                                    <button
                                      type="button"
                                      onClick={() => onToggleTag(dayObj.day, actIdx, t)}
                                      style={{
                                        border: 'none', background: 'none', color: 'var(--text-muted)',
                                        fontSize: '0.8rem', cursor: 'pointer', padding: '0 0.1rem',
                                        fontWeight: 'bold', display: 'inline-flex', alignItems: 'center'
                                      }}
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Add Custom Tag row */}
                            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem' }}>
                              <input
                                type="text"
                                placeholder="Add custom tag (e.g. legato, rhythm)..."
                                value={tagInputs[actKey] || ''}
                                onChange={(e) => setTagInputs(prev => ({ ...prev, [actKey]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && tagInputs[actKey]?.trim()) {
                                    onAddCustomTag(dayObj.day, actIdx, tagInputs[actKey]);
                                    setTagInputs(prev => ({ ...prev, [actKey]: '' }));
                                  }
                                }}
                                style={{
                                  flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
                                  border: `1px solid ${cfg.border}`, color: 'var(--text-primary)',
                                  padding: '0.3rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (tagInputs[actKey]?.trim()) {
                                    onAddCustomTag(dayObj.day, actIdx, tagInputs[actKey]);
                                    setTagInputs(prev => ({ ...prev, [actKey]: '' }));
                                  }
                                }}
                                style={{
                                  backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`,
                                  color: cfg.color, padding: '0.3rem 0.6rem', borderRadius: '6px',
                                  fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer'
                                }}
                              >
                                + Tag
                              </button>
                            </div>
                          </div>

                          {/* Image attachments */}
                          <div className="image-attachments-section">
                            <span className="checklist-title" style={{ color: cfg.color }}>Attached Media</span>
                            <div className="image-thumbnails-grid">
                              {task.images && task.images.map((img, imgIdx) => {
                                const fileName = img.split('/').pop();
                                const serveUrl = `http://localhost:3001/assets/${fileName}`;
                                return (
                                  <div
                                    key={imgIdx}
                                    className="image-thumb-wrapper"
                                    onClick={() => openLightbox(serveUrl)}
                                    style={{ borderColor: cfg.border }}
                                  >
                                    <img src={serveUrl} alt="Note Upload" className="image-thumb" />
                                    <button
                                      className="btn-remove-img"
                                      onClick={(e) => { e.stopPropagation(); onImageRemove(dayObj.day, actIdx, imgIdx); }}
                                    >×</button>
                                  </div>
                                );
                              })}
                              <label className="btn-upload-image" style={{ borderColor: cfg.border }}>
                                <Camera size={18} />
                                <span style={{ fontSize: '0.6rem', marginTop: '0.2rem' }}>Add</span>
                                <input type="file" accept="image/*" style={{ display: 'none' }}
                                  onChange={(e) => handleFileChange(e, dayObj.day, actIdx)} />
                              </label>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
