import React from 'react';
import { Calendar, Award, Flame, Hourglass } from 'lucide-react';

export default function Analytics({ sections, stateData }) {
  // 1. Calculate General Statistics
  let totalTasks = 0;
  let completedTasks = 0;
  let inProgressTasks = 0;
  let revisingTasks = 0;
  let backlogTasks = 0;

  let totalDays = 0;
  let completedDaysCount = 0;

  sections.forEach(section => {
    section.days.forEach(dayObj => {
      totalDays++;
      let dayCompleted = true;

      dayObj.tasks.forEach((task, idx) => {
        totalTasks++;
        const dayState = stateData[dayObj.day]?.[idx.toString()];
        const state = dayState?.state || task.state || 'backlog';

        if (state === 'completed') completedTasks++;
        else if (state === 'in_progress') inProgressTasks++;
        else if (state === 'revising') revisingTasks++;
        else backlogTasks++;

        if (state !== 'completed') {
          dayCompleted = false;
        }
      });

      if (dayCompleted && dayObj.tasks.length > 0) {
        completedDaysCount++;
      }
    });
  });

  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const daysRemaining = Math.max(0, totalDays - completedDaysCount);

  // Calculate estimated completion date based on today
  const today = new Date();
  const estCompletionDate = new Date();
  estCompletionDate.setDate(today.getDate() + daysRemaining);
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Mock streak computation
  const currentStreak = completedTasks > 0 ? Math.min(Math.round(completedTasks / 2) + 2, 7) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Overview Stats Cards */}
      <div className="stats-grid-row">
        <div className="small-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Total Progress</span>
            <Award size={18} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <span className="small-stat-num">{completionPercent}%</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {completedTasks} of {totalTasks} tasks completed
          </span>
        </div>

        <div className="small-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Days Remaining</span>
            <Hourglass size={18} style={{ color: 'var(--state-in-progress)' }} />
          </div>
          <span className="small-stat-num">{daysRemaining} Days</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Out of {totalDays} total roadmap days
          </span>
        </div>

        <div className="small-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Current Streak</span>
            <Flame size={18} style={{ color: 'var(--state-in-progress)' }} />
          </div>
          <span className="small-stat-num">{currentStreak} Days</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Keep practicing daily!
          </span>
        </div>

        <div className="small-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Est. Completion</span>
            <Calendar size={18} style={{ color: 'var(--accent-purple)' }} />
          </div>
          <span className="small-stat-num" style={{ fontSize: '1.25rem', padding: '0.35rem 0' }}>
            {formatDate(estCompletionDate)}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Assuming 1 day progress per day
          </span>
        </div>
      </div>

      <div className="analytics-grid">
        
        {/* Progress by Module */}
        <div className="analytics-card">
          <span className="analytics-card-title">Progress By Module</span>
          <div className="bar-chart-container">
            {sections.map((section, idx) => {
              let secTotal = 0;
              let secCompleted = 0;

              section.days.forEach(d => {
                d.tasks.forEach((t, tIdx) => {
                  secTotal++;
                  const dayState = stateData[d.day]?.[tIdx.toString()];
                  const state = dayState?.state || t.state || 'backlog';
                  if (state === 'completed') {
                    secCompleted++;
                  }
                });
              });

              const percent = secTotal > 0 ? Math.round((secCompleted / secTotal) * 100) : 0;

              return (
                <div key={idx} className="bar-chart-row">
                  <div className="bar-chart-label-row">
                    <span style={{ maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={section.title}>
                      {section.title}
                    </span>
                    <span style={{ color: 'var(--accent-cyan)' }}>{percent}%</span>
                  </div>
                  <div className="bar-chart-bar-outer">
                    <div className="bar-chart-bar-inner" style={{ width: `${percent}%` }} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    {secCompleted} / {secTotal} tasks
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Practice Task Breakdown */}
        <div className="analytics-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span className="analytics-card-title">Task State Breakdown</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.01)', borderLeft: '4px solid var(--state-completed)' }}>
                <span style={{ fontSize: '0.85rem' }}>Completed</span>
                <span style={{ fontWeight: 700, color: 'var(--state-completed)' }}>{completedTasks} ({Math.round(completedTasks/totalTasks*100 || 0)}%)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.01)', borderLeft: '4px solid var(--state-revising)' }}>
                <span style={{ fontSize: '0.85rem' }}>Revising</span>
                <span style={{ fontWeight: 700, color: 'var(--state-revising)' }}>{revisingTasks} ({Math.round(revisingTasks/totalTasks*100 || 0)}%)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.01)', borderLeft: '4px solid var(--state-in-progress)' }}>
                <span style={{ fontSize: '0.85rem' }}>In Progress</span>
                <span style={{ fontWeight: 700, color: 'var(--state-in-progress)' }}>{inProgressTasks} ({Math.round(inProgressTasks/totalTasks*100 || 0)}%)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.01)', borderLeft: '4px solid var(--state-backlog)' }}>
                <span style={{ fontSize: '0.85rem' }}>Backlog</span>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{backlogTasks} ({Math.round(backlogTasks/totalTasks*100 || 0)}%)</span>
              </div>

            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px dashed var(--border-color)', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong>💡 Practice Tip:</strong> Try to keep your "Revising" column clean. Don't let backlogged tasks pile up before consolidating Grade modules!
          </div>
        </div>

      </div>
    </div>
  );
}
