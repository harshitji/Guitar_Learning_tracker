import React from 'react';
import { Calendar, Award, Flame, Hourglass, BarChart3, TrendingUp, CheckCircle, Clock } from 'lucide-react';

export default function Analytics({ sections, stateData = {} }) {
  // 1. Calculate General Task Statistics
  let totalTasks = 0;
  let completedTasks = 0;
  let inProgressTasks = 0;
  let revisingTasks = 0;
  let backlogTasks = 0;

  let totalDays = 0;
  let completedDaysCount = 0;

  // Track all unique worked dates globally
  const allWorkedDates = new Set();
  // Store start/end dates and worked dates aggregated per module
  const moduleTimeMetrics = [];

  sections.forEach((section, sIdx) => {
    let secTotal = 0;
    let secCompleted = 0;
    let secStarted = false;
    let secStartDate = null;
    let secEndDate = null;
    const secWorkedDates = new Set();

    section.days.forEach(dayObj => {
      totalDays++;
      let dayCompleted = true;

      dayObj.tasks.forEach((task, tIdx) => {
        totalTasks++;
        secTotal++;
        const stateVal = stateData[dayObj.day]?.[tIdx.toString()];
        const state = stateVal?.state || task.state || 'backlog';

        if (state === 'completed') {
          completedTasks++;
          secCompleted++;
        }
        else if (state === 'in_progress') inProgressTasks++;
        else if (state === 'revising') revisingTasks++;
        else backlogTasks++;

        if (state !== 'completed') {
          dayCompleted = false;
        }

        // Aggregate Dates from stateData
        if (stateVal) {
          if (stateVal.startDate) {
            secStarted = true;
            if (!secStartDate || stateVal.startDate < secStartDate) {
              secStartDate = stateVal.startDate;
            }
          }
          if (stateVal.endDate) {
            if (!secEndDate || stateVal.endDate > secEndDate) {
              secEndDate = stateVal.endDate;
            }
          }
          if (stateVal.workedDates && stateVal.workedDates.length > 0) {
            stateVal.workedDates.forEach(d => {
              allWorkedDates.add(d);
              secWorkedDates.add(d);
            });
          }
        }
      });

      if (dayCompleted && dayObj.tasks.length > 0) {
        completedDaysCount++;
      }
    });

    const percent = secTotal > 0 ? Math.round((secCompleted / secTotal) * 100) : 0;
    
    // Add time metrics if module has any logs
    if (secStarted || secWorkedDates.size > 0) {
      moduleTimeMetrics.push({
        title: section.title,
        startDate: secStartDate,
        endDate: secEndDate,
        activeDays: secWorkedDates.size,
        dayList: Array.from(secWorkedDates).sort()
      });
    }
  });

  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const daysRemaining = Math.max(0, totalDays - completedDaysCount);

  // Compute Practice Day of the Week Frequency
  const weekdayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  allWorkedDates.forEach(dStr => {
    const dObj = new Date(dStr + 'T00:00:00'); // enforce local time parsing
    if (!isNaN(dObj.getTime())) {
      weekdayCounts[dObj.getDay()]++;
    }
  });
  const maxDayCount = Math.max(...Object.values(weekdayCounts), 1);

  // Calculate estimated completion date based on today
  const estCompletionDate = new Date();
  estCompletionDate.setDate(estCompletionDate.getDate() + daysRemaining);
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Sort logged worked dates
  const sortedDates = Array.from(allWorkedDates).sort();
  const totalPracticeDays = allWorkedDates.size;

  // Compute actual streak from sorted dates
  let longestStreak = 0;
  let currentStreak = 0;
  if (sortedDates.length > 0) {
    let tempStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1] + 'T00:00:00');
      const curr = new Date(sortedDates[i] + 'T00:00:00');
      const diffTime = Math.abs(curr - prev);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;

    // Calculate current streak relative to today
    const lastPracticeDate = new Date(sortedDates[sortedDates.length - 1] + 'T00:00:00');
    const todayMidnight = new Date();
    todayMidnight.setHours(0,0,0,0);
    const diffTime = Math.abs(todayMidnight - lastPracticeDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) {
      currentStreak = tempStreak; // still active
    } else {
      currentStreak = 0; // streak broken
    }
  }

  // Calculate duration/velocity of module completion
  const getDurationDays = (start, end) => {
    if (!start) return '-';
    const s = new Date(start + 'T00:00:00');
    const e = end ? new Date(end + 'T00:00:00') : new Date();
    const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
    return `${diff} cal days`;
  };

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
            <span className="stat-label">Total Practice Days</span>
            <Calendar size={18} style={{ color: 'var(--state-in-progress)' }} />
          </div>
          <span className="small-stat-num">{totalPracticeDays} Days</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Unique logged sessions
          </span>
        </div>

        <div className="small-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Practice Streak</span>
            <Flame size={18} style={{ color: '#ef4444' }} />
          </div>
          <span className="small-stat-num">{currentStreak} Days</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Longest streak: {longestStreak} days
          </span>
        </div>

        <div className="small-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Est. Completion</span>
            <Clock size={18} style={{ color: 'var(--accent-purple)' }} />
          </div>
          <span className="small-stat-num" style={{ fontSize: '1.25rem', padding: '0.35rem 0' }}>
            {formatDate(estCompletionDate)}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {daysRemaining} roadmap days left
          </span>
        </div>
      </div>

      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Practice Velocity by Module */}
        <div className="analytics-card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <TrendingUp size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span className="analytics-card-title">Module Practice Velocity</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {moduleTimeMetrics.map((met, idx) => (
              <div key={idx} style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', maxWidth: '70%', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {met.title.replace(/Grade \d+\s*-\s*/i, '')}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 700, backgroundColor: 'rgba(6,182,212,0.08)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                    {met.activeDays} active days
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>Timeline: {met.startDate || 'Not set'} ➔ {met.endDate || 'Present'}</span>
                  <span style={{ fontWeight: 600 }}>({getDurationDays(met.startDate, met.endDate)})</span>
                </div>
              </div>
            ))}
            {moduleTimeMetrics.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                Start tracking dates inside your module timeline cards to see velocity calculations!
              </div>
            )}
          </div>
        </div>

        {/* Practice Frequency Chart */}
        <div className="analytics-card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BarChart3 size={16} style={{ color: 'var(--state-in-progress)' }} />
            <span className="analytics-card-title">Practice Days by Weekday</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '220px', padding: '1rem 0.5rem 0.5rem 0.5rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {weekdayNames.map((name, idx) => {
              const count = weekdayCounts[idx] || 0;
              const barHeight = Math.max((count / maxDayCount) * 100, 4); // min 4% height to show empty bars
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: count > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                    {count}
                  </span>
                  <div style={{
                    width: '24px', height: '150px', backgroundColor: 'rgba(255,255,255,0.02)',
                    borderRadius: '4px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '100%', height: `${barHeight}%`,
                      background: count > 0 ? 'linear-gradient(to top, rgba(6,182,212,0.8), rgba(167,139,250,0.8))' : 'rgba(255,255,255,0.05)',
                      boxShadow: count > 0 ? '0 0 10px rgba(6,182,212,0.3)' : 'none',
                      borderRadius: '2px', transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{name}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <div className="analytics-grid">
        
        {/* Progress by Module */}
        <div className="analytics-card">
          <span className="analytics-card-title">Progress By Module</span>
          <div className="bar-chart-container" style={{ marginTop: '1rem' }}>
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
            <strong>💡 Practice Tip:</strong> Start logging daily practice sessions on cards to see your frequency metrics, streaks, and exact calendar durations for each module automatically update here!
          </div>
        </div>

      </div>
    </div>
  );
}
