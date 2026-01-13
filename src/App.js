import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Utility functions
const generateId = () => Math.random().toString(36).substr(2, 9);

const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  }).format(date);
};

const getWeekDates = (referenceDate) => {
  const date = new Date(referenceDate);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  
  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    week.push(d);
  }
  return week;
};

const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const isSameDay = (d1, d2) => {
  return d1.toDateString() === d2.toDateString();
};

// Claude AI Service
const ClaudeAI = {
  apiKey: null,
  
  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('claude-api-key', key);
  },
  
  getApiKey() {
    if (!this.apiKey) {
      this.apiKey = localStorage.getItem('claude-api-key');
    }
    return this.apiKey;
  },
  
  clearApiKey() {
    this.apiKey = null;
    localStorage.removeItem('claude-api-key');
  },
  
  isConfigured() {
    return !!this.getApiKey();
  },

  getMediaType(base64String) {
    if (base64String.includes('data:image/png')) return 'image/png';
    if (base64String.includes('data:image/jpeg')) return 'image/jpeg';
    if (base64String.includes('data:image/jpg')) return 'image/jpeg';
    if (base64String.includes('data:image/gif')) return 'image/gif';
    if (base64String.includes('data:image/webp')) return 'image/webp';
    return 'image/png';
  },
  
  async analyzeImage(imageBase64, prompt) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('API key not set');
    
    const mediaType = this.getMediaType(imageBase64);
    const base64Data = imageBase64.split(',')[1];
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }]
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    return data.content[0].text;
  },
  
  async generateText(prompt) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('API key not set');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    return data.content[0].text;
  },
  
  async describeDesign(imageBase64) {
    return this.analyzeImage(
      imageBase64,
      `You are a design expert. Analyze this UI/UX design screenshot and provide a brief, professional description (2-3 sentences) covering:
- What type of design/screen this is
- Key UI elements and layout
- Overall style and color scheme

Keep it concise and suitable for a design log entry. Do not use markdown formatting.`
    );
  },
  
  async compareDesigns(roughImage, finalImage) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('API key not set');
    
    const roughMediaType = this.getMediaType(roughImage);
    const finalMediaType = this.getMediaType(finalImage);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Compare these two design iterations. The first is the rough draft (V1) and the second is the final version. Briefly describe what changed and improved (2-3 sentences). Do not use markdown formatting.'
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: roughMediaType,
                data: roughImage.split(',')[1]
              }
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: finalMediaType,
                data: finalImage.split(',')[1]
              }
            }
          ]
        }]
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    return data.content[0].text;
  },
  
  async generateWeeklyChangelog(tasks, weekStart, weekEnd) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('API key not set');
    
    // Build content array with text and images
    const content = [];
    
    // Add intro text
    content.push({
      type: 'text',
      text: `You are a design team lead writing a professional weekly changelog. Analyze these design tasks and their screenshots from the week of ${formatDate(weekStart)} - ${formatDate(weekEnd)}.

I will show you each design entry with its screenshot(s). Please write a comprehensive, professional changelog in markdown format that:
1. Summarizes the week's design work with specific visual details you observe
2. Groups work into "New Designs" and "Iterations" sections
3. Describes each design based on what you actually see in the screenshots
4. Ends with a brief progress summary

Here are the design entries for this week:`
    });
    
    // Add each task with its images
    for (const task of tasks) {
      const isIteration = !!task.finalImage;
      
      content.push({
        type: 'text',
        text: `\n--- Entry: "${task.name}" (${isIteration ? 'Iteration' : 'New Design'}) - ${new Date(task.date).toLocaleDateString()} ---${task.notes ? `\nDesigner notes: ${task.notes}` : ''}`
      });
      
      if (task.roughImage) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: this.getMediaType(task.roughImage),
            data: task.roughImage.split(',')[1]
          }
        });
        
        if (isIteration) {
          content.push({
            type: 'text',
            text: '(Above: V1 Draft, Below: Final Version)'
          });
        }
      }
      
      if (task.finalImage) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: this.getMediaType(task.finalImage),
            data: task.finalImage.split(',')[1]
          }
        });
      }
    }
    
    content.push({
      type: 'text',
      text: '\n\nNow write the weekly design changelog based on what you observed in these designs:'
    });
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: content
        }]
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    return data.content[0].text;
  }
};

// Icon Components
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ImageIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ListIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="4" cy="6" r="1" fill="currentColor" />
    <circle cx="4" cy="12" r="1" fill="currentColor" />
    <circle cx="4" cy="18" r="1" fill="currentColor" />
  </svg>
);

const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
  </svg>
);

const AIIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

// API Key Modal
const ApiKeyModal = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      const saved = ClaudeAI.getApiKey();
      if (saved) setApiKey(saved);
    }
  }, [isOpen]);

  const handleSave = () => {
    ClaudeAI.setApiKey(apiKey);
    onSave(apiKey);
    onClose();
  };

  const handleClear = () => {
    ClaudeAI.clearApiKey();
    setApiKey('');
    onSave('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content api-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Claude AI Settings</h2>
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="ai-info">
            <AIIcon />
            <p>Connect your Anthropic API key to enable AI-powered features:</p>
          </div>
          
          <ul className="ai-features-list">
            <li>✨ Auto-generate design descriptions from screenshots</li>
            <li>📝 Smart weekly changelog generation with image analysis</li>
            <li>🔄 Compare and summarize design iterations</li>
          </ul>
          
          <div className="form-group">
            <label>Anthropic API Key</label>
            <div className="api-key-input">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-ant-api..."
              />
              <button 
                className="toggle-visibility"
                onClick={() => setShowKey(!showKey)}
                type="button"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <span className="form-hint">
              Get your API key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>
            </span>
          </div>
        </div>
        
        <div className="modal-footer">
          {apiKey && (
            <button className="btn-danger" onClick={handleClear}>
              Clear Key
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={!apiKey.trim()}
          >
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
};

// Image Upload Component
const ImageUpload = ({ label, image, onUpload, onRemove, onAnalyze, isAnalyzing }) => {
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0] || e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => onUpload(e.target.result);
      reader.readAsDataURL(file);
    }
  }, [onUpload]);

  return (
    <div className="image-upload-container">
      <span className="upload-label">{label}</span>
      {image ? (
        <div className="image-preview">
          <img src={image} alt={label} />
          <div className="image-actions">
            {onAnalyze && ClaudeAI.isConfigured() && (
              <button 
                className="analyze-btn" 
                onClick={onAnalyze}
                disabled={isAnalyzing}
                title="AI Describe"
              >
                {isAnalyzing ? <span className="spinner-small" /> : <AIIcon />}
              </button>
            )}
            <button className="remove-image" onClick={onRemove}>
              <CloseIcon />
            </button>
          </div>
        </div>
      ) : (
        <label 
          className="upload-zone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleDrop}
            style={{ display: 'none' }}
          />
          <ImageIcon />
          <span>Drop or click to upload</span>
        </label>
      )}
    </div>
  );
};

// Task Entry Card
const TaskCard = ({ task, onView }) => {
  const isNewDesign = !task.finalImage;
  
  return (
    <div className="task-card" onClick={() => onView(task)}>
      <div className="task-card-header">
        <span className={`task-badge ${isNewDesign ? 'created' : 'iterated'}`}>
          {isNewDesign ? 'Created' : 'Iterated'}
        </span>
        <span className="task-time">
          {new Date(task.createdAt).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })}
        </span>
      </div>
      <h3 className="task-title">{task.name}</h3>
      <div className="task-images">
        {task.roughImage && (
          <div className="task-thumb">
            <img src={task.roughImage} alt="Draft" />
            {task.finalImage && <span className="thumb-label">V1</span>}
          </div>
        )}
        {task.finalImage && (
          <>
            <div className="task-arrow">→</div>
            <div className="task-thumb final">
              <img src={task.finalImage} alt="Final" />
              <span className="thumb-label">Final</span>
            </div>
          </>
        )}
      </div>
      {task.notes && <p className="task-notes">{task.notes}</p>}
      {task.aiDescription && (
        <div className="task-ai-note">
          <AIIcon /> AI analyzed
        </div>
      )}
    </div>
  );
};

// Create Task Modal
const CreateTaskModal = ({ isOpen, onClose, onSave, selectedDate }) => {
  const [name, setName] = useState('');
  const [roughImage, setRoughImage] = useState(null);
  const [finalImage, setFinalImage] = useState(null);
  const [notes, setNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiDescription, setAiDescription] = useState('');

  const handleSave = () => {
    if (!name.trim() || !roughImage) return;
    
    onSave({
      id: generateId(),
      name: name.trim(),
      roughImage,
      finalImage,
      notes: notes.trim(),
      aiDescription: aiDescription.trim(),
      date: selectedDate.toISOString(),
      createdAt: new Date().toISOString(),
    });
    
    // Reset form
    setName('');
    setRoughImage(null);
    setFinalImage(null);
    setNotes('');
    setAiDescription('');
    onClose();
  };

  const handleAnalyzeDesign = async () => {
    if (!roughImage || !ClaudeAI.isConfigured()) return;
    
    setIsAnalyzing(true);
    try {
      let description;
      if (finalImage) {
        description = await ClaudeAI.compareDesigns(roughImage, finalImage);
      } else {
        description = await ClaudeAI.describeDesign(roughImage);
      }
      setAiDescription(description);
      if (!notes) {
        setNotes(description);
      }
    } catch (error) {
      alert('AI Error: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>New Design Entry</h2>
            <span className="modal-date">{formatDate(selectedDate)}</span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="form-group">
            <label>Entry Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Homepage Hero Redesign"
              autoFocus
            />
          </div>
          
          <div className="images-row">
            <ImageUpload
              label="Rough Draft V1"
              image={roughImage}
              onUpload={setRoughImage}
              onRemove={() => setRoughImage(null)}
            />
            <ImageUpload
              label="Final Design (Optional)"
              image={finalImage}
              onUpload={setFinalImage}
              onRemove={() => setFinalImage(null)}
            />
          </div>
          
          <p className="upload-hint">
            <SparkleIcon /> Upload one image for a new design, or both for an iteration
          </p>
          
          {ClaudeAI.isConfigured() && roughImage && (
            <button 
              className="ai-analyze-btn"
              onClick={handleAnalyzeDesign}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <span className="spinner-small" />
                  Analyzing...
                </>
              ) : (
                <>
                  <AIIcon />
                  {finalImage ? 'AI Compare Designs' : 'AI Describe Design'}
                </>
              )}
            </button>
          )}
          
          <div className="form-group">
            <label>Notes {aiDescription && '(AI Generated)'}</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add context, decisions made, or feedback notes..."
              rows={4}
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={!name.trim() || !roughImage}
          >
            Save Entry
          </button>
        </div>
      </div>
    </div>
  );
};

// Task Detail Modal
const TaskDetailModal = ({ task, onClose }) => {
  if (!task) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content detail-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className={`task-badge ${!task.finalImage ? 'created' : 'iterated'}`}>
              {!task.finalImage ? 'Created' : 'Iterated'}
            </span>
            <h2>{task.name}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="detail-images">
            <div className="detail-image-wrap">
              <span className="detail-label">{task.finalImage ? 'V1 Draft' : 'Design'}</span>
              <img src={task.roughImage} alt="Draft" />
            </div>
            {task.finalImage && (
              <div className="detail-image-wrap">
                <span className="detail-label">Final</span>
                <img src={task.finalImage} alt="Final" />
              </div>
            )}
          </div>
          
          {task.notes && (
            <div className="detail-notes">
              <h4>Notes {task.aiDescription && <span className="ai-tag"><AIIcon /> AI</span>}</h4>
              <p>{task.notes}</p>
            </div>
          )}
          
          <div className="detail-meta">
            <span>Created {new Date(task.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Week Summary Modal with AI
const WeekSummaryModal = ({ isOpen, onClose, tasks, weekStart }) => {
  const [changelog, setChangelog] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [useAI, setUseAI] = useState(false);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const created = tasks.filter(t => !t.finalImage);
  const iterated = tasks.filter(t => t.finalImage);

  const generateBasicChangelog = useCallback(() => {
    let log = `## Week ${getWeekNumber(weekStart)} Design Changelog\n`;
    log += `**${formatDate(weekStart)} – ${formatDate(weekEnd)}**\n\n`;
    
    if (created.length > 0) {
      log += `### ✨ New Designs (${created.length})\n`;
      created.forEach(t => {
        log += `- **${t.name}**`;
        if (t.notes) log += ` — ${t.notes}`;
        log += '\n';
      });
      log += '\n';
    }
    
    if (iterated.length > 0) {
      log += `### 🔄 Iterations (${iterated.length})\n`;
      iterated.forEach(t => {
        log += `- **${t.name}** — V1 → Final`;
        if (t.notes) log += ` (${t.notes})`;
        log += '\n';
      });
      log += '\n';
    }
    
    log += `---\n*Total: ${tasks.length} entries*`;
    return log;
  }, [weekStart, weekEnd, created, iterated, tasks.length]);

  useEffect(() => {
    if (isOpen && !useAI) {
      setChangelog(generateBasicChangelog());
    }
  }, [isOpen, useAI, generateBasicChangelog]);

  if (!isOpen) return null;

  const handleGenerateAI = async () => {
    if (!ClaudeAI.isConfigured()) {
      alert('Please add your Anthropic API key in settings first.');
      return;
    }
    
    setIsGenerating(true);
    setUseAI(true);
    try {
      const aiChangelog = await ClaudeAI.generateWeeklyChangelog(tasks, weekStart, weekEnd);
      setChangelog(aiChangelog);
    } catch (error) {
      alert('AI Error: ' + error.message);
      setChangelog(generateBasicChangelog());
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBasicChangelog = () => {
    setUseAI(false);
    setChangelog(generateBasicChangelog());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content summary-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Week {getWeekNumber(weekStart)} Summary</h2>
            <span className="modal-date">{formatDate(weekStart)} – {formatDate(weekEnd)}</span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-value">{tasks.length}</span>
              <span className="stat-label">Total Entries</span>
            </div>
            <div className="stat">
              <span className="stat-value">{created.length}</span>
              <span className="stat-label">New Designs</span>
            </div>
            <div className="stat">
              <span className="stat-value">{iterated.length}</span>
              <span className="stat-label">Iterations</span>
            </div>
          </div>
          
          <div className="changelog-actions">
            <button 
              className={`changelog-tab ${!useAI ? 'active' : ''}`}
              onClick={handleBasicChangelog}
            >
              Basic
            </button>
            <button 
              className={`changelog-tab ai ${useAI ? 'active' : ''}`}
              onClick={handleGenerateAI}
              disabled={isGenerating || tasks.length === 0}
            >
              {isGenerating ? (
                <>
                  <span className="spinner-small" />
                  Generating...
                </>
              ) : (
                <>
                  <AIIcon />
                  AI Changelog
                </>
              )}
            </button>
          </div>
          
          <div className="changelog-section">
            <h4>
              Generated Changelog 
              {useAI && <span className="ai-tag"><AIIcon /> AI</span>}
            </h4>
            <pre className="changelog-preview">{changelog}</pre>
            <button 
              className="btn-secondary copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(changelog);
              }}
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// All Weeks View
const AllWeeksView = ({ tasks, onSelectWeek, onClose, isOpen }) => {
  if (!isOpen) return null;

  const weekGroups = tasks.reduce((acc, task) => {
    const taskDate = new Date(task.date);
    const weekDates = getWeekDates(taskDate);
    const weekKey = weekDates[0].toISOString().split('T')[0];
    
    if (!acc[weekKey]) {
      acc[weekKey] = {
        start: weekDates[0],
        end: weekDates[6],
        tasks: []
      };
    }
    acc[weekKey].tasks.push(task);
    return acc;
  }, {});

  const sortedWeeks = Object.entries(weekGroups).sort((a, b) => 
    new Date(b[0]) - new Date(a[0])
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content weeks-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>All Weeks</h2>
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        
        <div className="modal-body">
          {sortedWeeks.length === 0 ? (
            <p className="empty-state-text">No entries yet. Start logging your designs!</p>
          ) : (
            <div className="weeks-list">
              {sortedWeeks.map(([key, week]) => (
                <div 
                  key={key} 
                  className="week-item"
                  onClick={() => {
                    onSelectWeek(week.start);
                    onClose();
                  }}
                >
                  <div className="week-item-header">
                    <span className="week-number">Week {getWeekNumber(week.start)}</span>
                    <span className="week-dates">
                      {formatDate(week.start)} – {formatDate(week.end)}
                    </span>
                  </div>
                  <div className="week-item-stats">
                    <span>{week.tasks.length} entries</span>
                    <span className="dot">•</span>
                    <span>{week.tasks.filter(t => !t.finalImage).length} new</span>
                    <span className="dot">•</span>
                    <span>{week.tasks.filter(t => t.finalImage).length} iterations</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main App
function App() {
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('design-tasks-log');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekDates(new Date())[0]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingTask, setViewingTask] = useState(null);
  const [showWeekSummary, setShowWeekSummary] = useState(false);
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(ClaudeAI.isConfigured());

  useEffect(() => {
    localStorage.setItem('design-tasks-log', JSON.stringify(tasks));
  }, [tasks]);

  const weekDates = getWeekDates(currentWeekStart);
  const today = new Date();

  const navigateWeek = (direction) => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + (direction * 7));
    setCurrentWeekStart(newStart);
    setSelectedDate(newStart);
  };

  const goToToday = () => {
    const todayWeek = getWeekDates(new Date())[0];
    setCurrentWeekStart(todayWeek);
    setSelectedDate(new Date());
  };

  const handleSaveTask = (task) => {
    setTasks(prev => [...prev, task]);
  };

  const getTasksForDate = (date) => {
    return tasks.filter(t => isSameDay(new Date(t.date), date));
  };

  const getTasksForWeek = () => {
    return tasks.filter(t => {
      const taskDate = new Date(t.date);
      return taskDate >= weekDates[0] && taskDate <= weekDates[6];
    });
  };

  const selectedDateTasks = getTasksForDate(selectedDate);
  const weekTasks = getTasksForWeek();

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-top">
          <div>
            <h1 className="app-title">Design Tasks Log</h1>
            <p className="app-subtitle">Track your design iterations & changelog</p>
          </div>
          <div className="header-actions">
            <button 
              className={`btn-secondary ai-settings ${hasApiKey ? 'connected' : ''}`}
              onClick={() => setShowApiKeyModal(true)}
              title="AI Settings"
            >
              <AIIcon />
              {hasApiKey ? 'AI Connected' : 'Connect AI'}
            </button>
            <button className="btn-secondary" onClick={() => setShowAllWeeks(true)}>
              <ListIcon /> All Weeks
            </button>
            <button 
              className="btn-secondary"
              onClick={() => setShowWeekSummary(true)}
              disabled={weekTasks.length === 0}
            >
              <SparkleIcon /> Week Summary
            </button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="week-nav">
          <div className="week-controls">
            <button className="nav-btn" onClick={() => navigateWeek(-1)}>
              <ChevronLeft />
            </button>
            <span className="week-label">
              Week {getWeekNumber(currentWeekStart)} · {formatDate(weekDates[0])} – {formatDate(weekDates[6])}
            </span>
            <button className="nav-btn" onClick={() => navigateWeek(1)}>
              <ChevronRight />
            </button>
          </div>
          <button className="btn-secondary today-btn" onClick={goToToday}>
            Today
          </button>
        </div>

        {/* Day Pills */}
        <div className="day-pills">
          {weekDates.map((date, i) => {
            const dayTasks = getTasksForDate(date);
            const isToday = isSameDay(date, today);
            const isSelected = isSameDay(date, selectedDate);
            
            return (
              <div
                key={i}
                className={`day-pill ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => setSelectedDate(date)}
              >
                <div className="day-name">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="day-date">{date.getDate()}</div>
                <div className="day-count">
                  {dayTasks.length > 0 ? `${dayTasks.length} ${dayTasks.length === 1 ? 'entry' : 'entries'}` : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-header">
          <h2 className="content-title">{formatDate(selectedDate)}</h2>
          <button className="add-entry-btn" onClick={() => setShowCreateModal(true)}>
            <PlusIcon /> New Entry
          </button>
        </div>

        {selectedDateTasks.length === 0 ? (
          <div className="empty-state">
            <ImageIcon />
            <h3>No entries yet</h3>
            <p>Add your first design log for this day</p>
          </div>
        ) : (
          <div className="tasks-grid">
            {selectedDateTasks.map(task => (
              <TaskCard key={task.id} task={task} onView={setViewingTask} />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={(key) => setHasApiKey(!!key)}
      />

      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleSaveTask}
        selectedDate={selectedDate}
      />

      <TaskDetailModal
        task={viewingTask}
        onClose={() => setViewingTask(null)}
      />

      <WeekSummaryModal
        isOpen={showWeekSummary}
        onClose={() => setShowWeekSummary(false)}
        tasks={weekTasks}
        weekStart={currentWeekStart}
      />

      <AllWeeksView
        tasks={tasks}
        onSelectWeek={setCurrentWeekStart}
        onClose={() => setShowAllWeeks(false)}
        isOpen={showAllWeeks}
      />
    </div>
  );
}

export default App;
