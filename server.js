import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Configuration Paths
const MARKDOWN_PATH = '/Users/harshitdubey/WorkSpace/guitar-dashboard/justinguitar_daily_roadmap.md';
const STATE_JSON_PATH = '/Users/harshitdubey/WorkSpace/guitar-dashboard/justinguitar_daily_roadmap_state.json';
const ASSETS_DIR = '/Users/harshitdubey/WorkSpace/guitar-dashboard/guitar_dashboard_assets';

// Ensure Assets Directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Serve Uploaded Assets Static folder
app.use('/assets', express.static(ASSETS_DIR));

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ASSETS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `guitar-note-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage });

// Parsing function for the markdown roadmap
function parseRoadmap(markdownPath, stateJSONPath) {
  if (!fs.existsSync(markdownPath)) {
    throw new Error(`Roadmap markdown file not found at: ${markdownPath}`);
  }

  // Load JSON state database
  let stateData = {};
  if (fs.existsSync(stateJSONPath)) {
    try {
      stateData = JSON.parse(fs.readFileSync(stateJSONPath, 'utf8'));
    } catch (e) {
      console.error('Error parsing state JSON, resetting.', e);
    }
  }

  const markdownText = fs.readFileSync(markdownPath, 'utf8');
  const lines = markdownText.split('\n');

  const sections = [];
  let currentSection = null;
  let inTable = false;
  let headers = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Stop parsing if we hit the Notes section
    if (line.startsWith('# 📝 Notes & Activity Logs') || line.startsWith('# Notes & Activity Logs')) {
      break;
    }

    // Match Headings (e.g. ## Grade 1 - Module 1...)
    if (line.startsWith('## ')) {
      const title = line.substring(3).trim();
      let type = 'module';
      if (title.includes('🛠️') || title.toLowerCase().includes('troubleshooting')) {
        type = 'troubleshooting';
      } else if (title.includes('🏆') || title.toLowerCase().includes('revision')) {
        type = 'revision';
      }

      currentSection = {
        title,
        type,
        links: [],
        days: []
      };
      sections.push(currentSection);
      inTable = false;
      headers = [];
      continue;
    }

    // Match links
    if (line.startsWith('**Links:**') && currentSection) {
      const linkPart = line.substring(10).trim();
      const linkItems = linkPart.split('|');
      for (const item of linkItems) {
        const m = item.match(/\[(.*?)\]\((.*?)\)/);
        if (m) {
          currentSection.links.push({
            text: m[1].trim(),
            url: m[2].trim()
          });
        }
      }
      continue;
    }

    // Match Table Headers
    if (line.startsWith('|') && !inTable) {
      const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (cells[0] && cells[0].toLowerCase().includes('day')) {
        headers = cells;
        inTable = true;
      }
      continue;
    }

    // Skip Table Separator Row
    if (inTable && line.includes('---')) {
      continue;
    }

    // Match Table Rows
    if (inTable && line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (cells.length >= 2) {
        const dayText = cells[0].replace(/\*\*/g, '').trim(); // Remove **Day 1** bold markup
        const tasks = [];

        for (let j = 1; j < cells.length; j++) {
          let cellContent = cells[j];
          let defaultState = 'backlog';

          // Extract checkbox state from Markdown if it exists
          const cbMatch = cellContent.match(/^\[([ x/r])\]\s*(.*)$/i);
          if (cbMatch) {
            const char = cbMatch[1].toLowerCase();
            if (char === 'x') defaultState = 'completed';
            else if (char === '/') defaultState = 'in_progress';
            else if (char === 'r') defaultState = 'revising';
            cellContent = cbMatch[2];
          }

          // Check if we have dynamic state from our JSON state database
          const activityKey = (j - 1).toString(); // "0" or "1"
          const jsonState = stateData[dayText]?.[activityKey];

          tasks.push({
            category: headers[j] || `Activity ${j}`,
            content: cellContent,
            state: jsonState?.state || defaultState,
            notes: jsonState?.notes || '',
            checklist: jsonState?.checklist || [],
            images: jsonState?.images || []
          });
        }

        if (currentSection) {
          currentSection.days.push({
            day: dayText,
            tasks
          });
        }
      }
    } else {
      inTable = false;
    }
  }

  return { sections, stateData };
}

// Synchronize state back to the Markdown and JSON database
function saveRoadmap(markdownPath, stateJSONPath, stateData) {
  // Write JSON State file
  fs.writeFileSync(stateJSONPath, JSON.stringify(stateData, null, 2), 'utf8');

  // Read existing markdown to perform replacements
  let markdownText = '';
  if (fs.existsSync(markdownPath)) {
    markdownText = fs.readFileSync(markdownPath, 'utf8');
  }

  const lines = markdownText.split('\n');
  let truncateIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('# 📝 Notes & Activity Logs') || line.startsWith('# Notes & Activity Logs')) {
      truncateIndex = i;
      break;
    }
  }

  const linesToKeep = truncateIndex !== -1 ? lines.slice(0, truncateIndex) : lines;
  const updatedLines = [];
  let inTable = false;

  for (let i = 0; i < linesToKeep.length; i++) {
    const line = linesToKeep[i];

    if (line.startsWith('## ')) {
      inTable = false;
      updatedLines.push(line);
      continue;
    }

    if (line.startsWith('|') && !inTable) {
      if (line.toLowerCase().includes('day')) {
        inTable = true;
      }
      updatedLines.push(line);
      continue;
    }

    if (inTable && line.includes('---')) {
      updatedLines.push(line);
      continue;
    }

    if (inTable && line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim());
      // Cells will be: ['', '**Day 1**', 'Watch...', 'Theory...', '']
      if (cells.length >= 4) {
        const dayText = cells[1].replace(/\*\*/g, '').trim();
        const newCells = [cells[0], cells[1]];

        for (let j = 2; j < cells.length - 1; j++) {
          let cellContent = cells[j];
          // Strip existing checkbox prefix
          cellContent = cellContent.replace(/^\[([ x/r])\]\s*/i, '');

          const activityIdx = (j - 2).toString();
          const activityState = stateData[dayText]?.[activityIdx]?.state || 'backlog';

          let checkboxPrefix = '[ ] ';
          if (activityState === 'completed') checkboxPrefix = '[x] ';
          else if (activityState === 'in_progress') checkboxPrefix = '[/] ';
          else if (activityState === 'revising') checkboxPrefix = '[r] ';

          newCells.push(checkboxPrefix + cellContent);
        }
        newCells.push(cells[cells.length - 1]);
        updatedLines.push(newCells.join(' | '));
      } else {
        updatedLines.push(line);
      }
    } else {
      inTable = false;
      updatedLines.push(line);
    }
  }

  // Generate Notes & Activity Logs section
  const notesLines = [];
  notesLines.push('\n# 📝 Notes & Activity Logs\n');

  let hasNotes = false;
  // Sort days to write in order
  const sortedDays = Object.keys(stateData).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  for (const day of sortedDays) {
    const dayData = stateData[day];
    for (const actIdx of Object.keys(dayData)) {
      const act = dayData[actIdx];
      const hasNotesText = act.notes && act.notes.trim();
      const hasChecklist = act.checklist && act.checklist.length > 0;
      const hasImages = act.images && act.images.length > 0;
      const hasDates = act.startDate || act.endDate || (act.workedDates && act.workedDates.length > 0);

      if (hasNotesText || hasChecklist || hasImages || hasDates) {
        hasNotes = true;
        const actTitle = actIdx === '0' ? '50 Min Practical' : '40 Min Theory/Exercises';
        notesLines.push(`### 📅 ${day} - ${actTitle}`);
        notesLines.push(`- **Status**: ${act.state.toUpperCase()}`);
        
        if (act.startDate) {
          notesLines.push(`- **Start Date**: ${act.startDate}`);
        }
        if (act.endDate) {
          notesLines.push(`- **End Date**: ${act.endDate}`);
        }
        if (act.workedDates && act.workedDates.length > 0) {
          notesLines.push(`- **Worked Dates**: ${act.workedDates.join(', ')}`);
        }

        if (hasNotesText) {
          notesLines.push(`- **Notes**:`);
          notesLines.push(act.notes.split('\n').map(line => `  ${line}`).join('\n'));
        }
        
        if (hasChecklist) {
          notesLines.push(`- **Checklist**:`);
          for (const item of act.checklist) {
            const cb = item.done ? '[x]' : '[ ]';
            notesLines.push(`  - ${cb} ${item.text}`);
          }
        }

        if (hasImages) {
          notesLines.push(`- **Images**:`);
          for (const img of act.images) {
            notesLines.push(`  - ![Attached Practice Log](file://${img})`);
          }
        }
        notesLines.push(''); // Spacing
      }
    }
  }

  if (!hasNotes) {
    notesLines.push('No notes or logs added yet. Add logs in your dashboard.');
  }

  const finalMarkdown = updatedLines.join('\n').trim() + '\n' + notesLines.join('\n');
  fs.writeFileSync(markdownPath, finalMarkdown, 'utf8');
}

// API Endpoints
app.get('/api/roadmap', (req, res) => {
  try {
    const data = parseRoadmap(MARKDOWN_PATH, STATE_JSON_PATH);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/save', (req, res) => {
  try {
    const { stateData } = req.body;
    if (!stateData) {
      return res.status(400).json({ error: 'Missing stateData body parameter' });
    }
    saveRoadmap(MARKDOWN_PATH, STATE_JSON_PATH, stateData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    const absolutePath = path.join(ASSETS_DIR, req.file.filename);
    const servePath = `http://localhost:${PORT}/assets/${req.file.filename}`;
    res.json({ absolutePath, servePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-save endpoint (called by sendBeacon on tab close — no JSON response needed)
app.post('/api/autosave', (req, res) => {
  try {
    const { stateData } = req.body;
    if (stateData) {
      saveRoadmap(MARKDOWN_PATH, STATE_JSON_PATH, stateData);
      console.log('✅ Auto-saved on tab close');
    }
    res.status(200).send('ok');
  } catch (error) {
    console.error('Auto-save error:', error.message);
    res.status(500).send('error');
  }
});

// Shutdown endpoint — saves and gracefully exits
app.post('/api/shutdown', (req, res) => {
  try {
    const { stateData } = req.body;
    if (stateData) {
      saveRoadmap(MARKDOWN_PATH, STATE_JSON_PATH, stateData);
      console.log('✅ Final save completed before shutdown');
    }
    res.json({ success: true, message: 'Saved and shutting down...' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    console.log('🛑 Guitar Dashboard Server shutting down...');
    setTimeout(() => process.exit(0), 300);
  }
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Guitar Dashboard Server running at http://localhost:${PORT}`);
});

// Graceful shutdown on SIGTERM / SIGINT
const gracefulShutdown = () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

