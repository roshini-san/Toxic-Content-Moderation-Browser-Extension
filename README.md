#  Toxic Content Filter & Analytics Dashboard

> A Chrome Extension that automatically detects, blurs, and analyzes toxic content in real-time across any website — powered by a local AI backend (Detoxify / RoBERTa). No cloud. No data leaks. 100% private.

---

##  Screenshots

| Popup | Dashboard |
|-------|-----------|
| Extension popup with ON/OFF toggle and live stats | 6-tab analytics dashboard with word cloud, charts, timeline |
<img width="380" height="369" alt="Screenshot 2026-02-25 204845" src="https://github.com/user-attachments/assets/71464387-c6a6-4a88-b074-5733d21d395c" />
<img width="1846" height="1032" alt="Screenshot 2026-02-26 223846" src="https://github.com/user-attachments/assets/4722fe4b-15a8-4167-90d9-dda5cf9b8124" />
<img width="1843" height="911" alt="Screenshot 2026-02-26 215508" src="https://github.com/user-attachments/assets/41569457-511e-4e22-82d3-c5493f093681" />
<img width="1847" height="768" alt="Screenshot 2026-02-26 220452" src="https://github.com/user-attachments/assets/91bc6506-5c3e-4805-a6da-975152ab3c4c" />
<img width="1772" height="867" alt="Screenshot 2026-02-26 222747" src="https://github.com/user-attachments/assets/0aba8932-9d57-480f-bffd-896c1fb4bfed" />
<img width="1857" height="841" alt="Screenshot 2026-02-26 215427" src="https://github.com/user-attachments/assets/6b3b5629-545b-44f8-bd24-7e491498a741" />
<img width="1840" height="864" alt="Screenshot 2026-02-26 225109" src="https://github.com/user-attachments/assets/65c60765-009c-401f-878c-41b21fe2d0e3" />

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
> **Word list source:** [LDNOOBW — List of Dirty, Naughty, Obscene, and Otherwise Bad Words](https://github.com/ldnoobw/list-of-dirty-naughty-obscene-and-otherwise-bad-words)

---

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

## AI Backend — API Reference

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
