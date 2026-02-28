#  Toxic Content Filter & Analytics Dashboard

> A Chrome Extension that automatically detects, blurs, and analyzes toxic content in real-time across any website — powered by a local AI backend (Detoxify / RoBERTa). No cloud. No data leaks. 100% private.

---

##  Screenshots

| Popup | Dashboard |
|-------|-----------|
| Extension popup with ON/OFF toggle and live stats | 6-tab analytics dashboard with word cloud, charts, timeline |

---

##  Features

- **Real-time Detection** — Scans all web page text instantly using a compiled regex over 300+ toxic terms
- **AI Scoring** — Sends text to a local Detoxify (RoBERTa) backend for deep 6-category toxicity analysis
- **Auto Blur** — Wraps detected content in severity-colored blur overlays (click to reveal)
- **Composer Guard** — Warns you *as you type* in any textarea or comment box before you post
- **Analytics Dashboard** — Full 6-tab dashboard with charts, word cloud, timeline, and export
- **Multilingual** — Word list covers 24 languages
- **100% Local** — The AI backend runs on your own machine; zero data sent to any cloud
- **Export** — Download your detection log as CSV or JSON

---

## Architecture

```
Web Page (any site)
     │
     ▼
content.js  ──► Word-List Scan (2500+ words, regex, <5ms)
     │                 │
     │                 ▼
     │           Blur + Log (chrome.storage)
     │
     ▼
Flask Backend (localhost:5050)
     │
     ▼
Detoxify RoBERTa ──► 6 toxicity scores
     │
     ▼
Severity: HIGH / MEDIUM / LOW ──► Upgrade blur + Log
                                          │
                                          ▼
                                  background.js (Service Worker)
                                          │
                                          ▼
                                  chrome.storage.local
                                          │
                                          ▼
                                  dashboard.html (Analytics)
```

### Two-Layer Detection

| Layer | Method | Speed | Notes |
|-------|--------|-------|-------|
| Word-List | Regex + word boundaries | < 5ms | 382 terms, 24 languages |
| AI (Detoxify) | RoBERTa inference (local) | ~50ms | 6 toxicity categories |


## Installation & Setup


### Step 1 — Clone the Repository

```bash
git clone https://github.com/yourusername/toxic-content-filter.git
cd toxic-content-filter
```

---

### Step 2 — Install & Start the AI Backend

```bash
pip install flask flask-cors detoxify torch
python server.py
```

You should see:

```
================================================
  Toxic Filter Backend
  GPU : CPU only

  Model : unitaryai/detoxify (RoBERTa)

  6 score categories:
    toxicity         HIGH if > 65%
    severe_toxicity  informational
    obscene          informational
    threat           HIGH if > 50%
    insult           informational
    identity_attack  HIGH if > 50%

  http://127.0.0.1:5050
================================================
[AI] Loading Detoxify (unitaryai/detoxify) ...
[AI] Detoxify ready
```

> **Note:** First run downloads the Detoxify model (~500 MB). Subsequent starts are instant.
> 
> If you have an NVIDIA GPU with CUDA, inference will be significantly faster.

---

### Step 3 — Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the project folder (`toxic-content-filter/`)
5. The 🛡️ shield icon will appear in your Chrome toolbar

---

### Step 4 — Verify It's Working

- Visit any website
- Open DevTools → Console
- You should see: `[ToxicFilter] Backend OK — GPU:false models:["detoxify"]`
- If the backend is offline, you'll see: `[ToxicFilter] Backend offline — word-list only`

---

## 🤖 AI Backend — API Reference

The Flask backend runs on `http://127.0.0.1:5050` and exposes three endpoints:

### `GET /health`

Returns model status and GPU availability.

```json
{
  "status": "ok",
  "gpu": false,
  "models": ["detoxify"]
}
```

---

### `POST /analyze/text`

Analyze a single text string.

**Request:**
```json
{ "text": "your text here" }
```

**Response:**
```json
{
  "detoxify": {
    "score": 0.82,
    "scores": {
      "toxicity": 0.82,
      "severe_toxicity": 0.12,
      "obscene": 0.05,
      "threat": 0.03,
      "insult": 0.67,
      "identity_attack": 0.08
    }
  },
  "combined_severity": "high",
  "should_blur": true
}
```

---

### `POST /analyze/batch`

Analyze up to 100 texts in one request.

**Request:**
```json
{ "texts": ["text one", "text two", "..."] }
```

**Response:**
```json
{
  "results": [
    { "detoxify": {...}, "combined_severity": "high", "should_blur": true },
    { "detoxify": {...}, "combined_severity": "none", "should_blur": false }
  ]
}
```

---

## Severity Classification

| Severity | Condition |
|----------|-----------|
| **HIGH** | `toxicity > 65%` OR `threat > 50%` OR `identity_attack > 50%` |
| **MEDIUM** | `toxicity > 45%` |
| **LOW** | `toxicity > 30%` |
| **NONE** | Below all thresholds — no action taken |

---

## 🗄️ Data Schema

Every detection is stored in `chrome.storage.local` under the key `toxicLog` as an array of objects:

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | Number | Unix timestamp (`Date.now()`) |
| `date` | String | ISO 8601 datetime string |
| `source` | String | `word-list` / `ai-only` / `ai-upgrade` / `composer-guard` |
| `text` | String | Detected text snippet (max 200 chars) |
| `word` | String | Matched toxic word (word-list hits only) |
| `severity` | String | `high` / `medium` / `low` |
| `hateScore` | Number | Detoxify toxicity score (0.0–1.0) |
| `detoxifyScores` | Object | All 6 category scores |
| `domain` | String | Hostname where detection occurred |

Maximum 2,000 entries are kept (oldest entries are auto-removed).

---

## 📈 Analytics Dashboard

Open the dashboard via:
- Clicking **📊 View Full Dashboard** in the popup, or
- Chrome Extensions → `chrome://extensions/` → Details → Extension options

### Dashboard Tabs

| Tab | Contents |
|-----|----------|
| 📊 Dashboard | Total detections, AI detections, high severity count, avg toxicity, word cloud, source bars, AI insights |
| 📈 Charts | Detection histogram, severity breakdown pie chart, top domains bar chart |
| 🤖 Models | Detoxify model info, 6-category score legend |
| 🧪 Playground | Manual text analysis — type any text and see live Detoxify scores |
| ⏱ Timeline | Chronological log with 6-category score tags per entry |
| 📖 Word List | Full multilingual toxic word reference with search and severity filter |

### Export

- **CSV** — spreadsheet-compatible log of all detections
- **JSON** — full raw log data

---

## 🔧 Configuration

Key constants in `content.js` you can adjust:

```javascript
const BACKEND           = 'http://127.0.0.1:5050'; // AI backend URL
const AI_BATCH_SIZE     = 12;      // Max texts per AI batch request
const AI_DEBOUNCE_MS    = 900;     // Wait before sending AI batch (ms)
const MIN_AI_LEN        = 20;      // Minimum text length for AI analysis
const COMPOSER_DELAY_MS = 1000;    // Keystroke delay before composer AI check
const COMPOSER_MIN_LEN  = 20;      // Minimum input length to trigger composer guard
```

---

## 🛠️ Tech Stack

### Extension (Frontend)
| Technology | Purpose |
|-----------|---------|
| JavaScript (ES2022) | Content script, popup, dashboard logic |
| HTML5 / CSS3 | Popup and dashboard UI |
| Chrome Extensions API (MV3) | `chrome.storage`, `chrome.runtime`, content scripts |
| MutationObserver | Dynamic content detection |
| Chart.js | Dashboard charts |

### AI Backend (Python)
| Technology | Purpose |
|-----------|---------|
| Python 3.9+ | Backend runtime |
| Flask | Lightweight HTTP server |
| Flask-CORS | Cross-origin request support |
| Detoxify (`unitaryai/detoxify`) | RoBERTa-based 6-category toxicity model |
| PyTorch | Model inference engine |

---

  <br><br>
  <img src="icon128.png" width="64" alt="Toxic Filter Shield">
</div>
