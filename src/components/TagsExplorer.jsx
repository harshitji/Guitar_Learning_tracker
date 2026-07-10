import React, { useState } from 'react';
import { Tag, ArrowRight, AlertCircle } from 'lucide-react';

export default function TagsExplorer({ sections, stateData = {}, onNavigateToTask }) {
  const [selectedTag, setSelectedTag] = useState(null);

  // 1. Gather all tags and their occurrences
  const tagMapping = {};

  sections.forEach((section, secIdx) => {
    section.days.forEach(dayObj => {
      dayObj.tasks.forEach((task, tIdx) => {
        const storedVal = stateData[dayObj.day]?.[tIdx.toString()];
        const tags = storedVal?.tags || [];

        tags.forEach(tag => {
          const lowerTag = tag.trim().toLowerCase();
          if (!lowerTag) return;

          if (!tagMapping[lowerTag]) {
            tagMapping[lowerTag] = [];
          }

          // Resolve task fields merging with stored state
          const resolvedTask = {
            ...task,
            state: storedVal?.state || task.state || 'backlog',
            notes: storedVal?.notes || '',
            checklist: storedVal?.checklist || [],
            images: storedVal?.images || []
          };

          tagMapping[lowerTag].push({
            sectionTitle: section.title,
            sectionIdx: secIdx,
            day: dayObj.day,
            taskIndex: tIdx,
            task: resolvedTask
          });
        });
      });
    });
  });

  // Sort tags by frequency, then alphabetically
  const uniqueTags = Object.keys(tagMapping).sort((a, b) => {
    const diff = tagMapping[b].length - tagMapping[a].length;
    return diff !== 0 ? diff : a.localeCompare(b);
  });

  // If no tag is selected, default to the first one in the list (if any exist)
  const activeTag = selectedTag || uniqueTags[0];
  const matchingTasks = activeTag ? (tagMapping[activeTag] || []) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Tag size={20} style={{ color: 'var(--accent-cyan)' }} />
        <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Tags Explorer</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Left Column: Tag List */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
          borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            All Active Tags ({uniqueTags.length})
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '450px', overflowY: 'auto' }}>
            {uniqueTags.map(tag => {
              const count = tagMapping[tag].length;
              const isActive = tag === activeTag;
              
              // Colors based on quick tags
              let tagColor = 'var(--accent-cyan)';
              let tagBg = 'rgba(6, 182, 212, 0.08)';
              if (tag === 'revisit') {
                tagColor = '#a78bfa';
                tagBg = 'rgba(167, 139, 250, 0.08)';
              } else if (tag === 'needs more work') {
                tagColor = '#f59e0b';
                tagBg = 'rgba(245, 158, 11, 0.08)';
              } else if (tag === 'good lesson') {
                tagColor = '#34d399';
                tagBg = 'rgba(52, 211, 153, 0.08)';
              }

              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    border: isActive ? `1px solid ${tagColor}` : '1px solid transparent',
                    borderRadius: '8px', padding: '0.6rem 0.8rem', cursor: 'pointer',
                    background: isActive ? tagBg : 'rgba(255,255,255,0.01)',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      backgroundColor: tagColor, display: 'inline-block', flexShrink: 0
                    }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {tag}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 800,
                    backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                    padding: '0.15rem 0.4rem', borderRadius: '12px', color: isActive ? tagColor : 'var(--text-muted)'
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}

            {uniqueTags.length === 0 && (
              <div style={{
                color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic',
                textAlign: 'center', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'
              }}>
                <AlertCircle size={24} style={{ margin: '0 auto', opacity: 0.5 }} />
                <span>No tags added yet. Go to your timeline practice cards to add tags!</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Filtered List of Sessions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeTag ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Practice sessions tagged as <span style={{ color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>"{activeTag}"</span>
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {matchingTasks.length} items found
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
                {matchingTasks.map((item, idx) => {
                  const stateLabels = {
                    backlog: 'Todo',
                    in_progress: 'WIP',
                    revising: 'Rev',
                    completed: 'Done'
                  };
                  const stateColors = {
                    backlog: 'var(--text-muted)',
                    in_progress: '#f59e0b',
                    revising: '#a78bfa',
                    completed: '#34d399'
                  };

                  return (
                    <div
                      key={idx}
                      onClick={() => onNavigateToTask(item.sectionIdx)}
                      style={{
                        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                        borderRadius: '8px', padding: '1rem', cursor: 'pointer',
                        transition: 'all 0.2s ease', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', gap: '1rem'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-purple)', textTransform: 'uppercase', background: 'rgba(167,139,250,0.08)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                            {item.day}
                          </span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: stateColors[item.task.state], textTransform: 'uppercase', background: 'rgba(255,255,255,0.03)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                            {stateLabels[item.task.state]}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                            {item.sectionTitle}
                          </span>
                        </div>

                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                          {item.task.category}
                        </span>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                          {item.task.content}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.75rem', marginRight: '0.25rem' }}>Practice</span>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{
              color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic',
              textAlign: 'center', padding: '4rem 1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', border: '1px dashed var(--border-color)'
            }}>
              Select a tag on the left to see all practice logs.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
