// Real-time input filtering - blurs as you type
console.log('⚡ Real-time Input Filter: Active');

class RealtimeInputFilter {
  constructor() {
    this.init();
  }

  init() {
    // Monitor all input fields, textareas, and contenteditable elements
    this.monitorExistingInputs();
    this.observeNewInputs();
  }

  monitorExistingInputs() {
    // Get all input types
    const inputs = document.querySelectorAll('input[type="text"], input[type="search"], textarea, [contenteditable="true"]');
    
    inputs.forEach(input => {
      this.attachInputListener(input);
    });

    console.log(`📝 Monitoring ${inputs.length} input fields`);
  }

  observeNewInputs() {
    // Watch for dynamically added input fields
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the node itself is an input
            if (this.isInputElement(node)) {
              this.attachInputListener(node);
            }
            
            // Check for inputs within the node
            const inputs = node.querySelectorAll('input[type="text"], input[type="search"], textarea, [contenteditable="true"]');
            inputs.forEach(input => {
              this.attachInputListener(input);
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  isInputElement(element) {
    const inputTypes = ['INPUT', 'TEXTAREA'];
    return inputTypes.includes(element.tagName) || 
           element.getAttribute('contenteditable') === 'true';
  }

  attachInputListener(input) {
    // Skip if already monitored
    if (input.dataset.toxicMonitored) return;
    input.dataset.toxicMonitored = 'true';

    // Handle different input types
    if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
      // For standard inputs and textareas
      input.addEventListener('input', (e) => {
        this.handleInputChange(e.target);
      });

      // Also check on keyup for immediate response
      input.addEventListener('keyup', (e) => {
        this.handleInputChange(e.target);
      });

      // Check on paste
      input.addEventListener('paste', (e) => {
        setTimeout(() => {
          this.handleInputChange(e.target);
        }, 10);
      });

    } else if (input.getAttribute('contenteditable') === 'true') {
      // For contenteditable elements (like comments, rich text editors)
      input.addEventListener('input', (e) => {
        this.handleContentEditableChange(e.target);
      });

      input.addEventListener('keyup', (e) => {
        this.handleContentEditableChange(e.target);
      });

      input.addEventListener('paste', (e) => {
        setTimeout(() => {
          this.handleContentEditableChange(e.target);
        }, 10);
      });
    }

    console.log('👂 Attached listener to:', input.tagName);
  }

  handleInputChange(input) {
    const value = input.value;
    
    if (!value || value.trim().length === 0) return;

    const toxicWords = this.findToxicWords(value);
    
    if (toxicWords.length > 0) {
      console.log('🚨 Toxic word typed in input:', toxicWords);
      
      // Blur the input field
      this.blurInput(input, toxicWords);
      
      // Log the detection
      this.logDetection(value, toxicWords);
    } else {
      // Remove blur if no toxic words
      this.unblurInput(input);
    }
  }

  handleContentEditableChange(element) {
    const text = element.textContent || element.innerText;
    
    if (!text || text.trim().length === 0) return;

    const toxicWords = this.findToxicWords(text);
    
    if (toxicWords.length > 0) {
      console.log('🚨 Toxic word typed in contenteditable:', toxicWords);
      
      // Blur the contenteditable element
      this.blurContentEditable(element, toxicWords);
      
      // Log the detection
      this.logDetection(text, toxicWords);
    } else {
      // Remove blur if no toxic words
      this.unblurContentEditable(element);
    }
  }

  findToxicWords(text) {
    const found = [];
    const lowerText = text.toLowerCase();
    
    sortedToxicWords.forEach(word => {
      const pattern = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (pattern.test(lowerText)) {
        found.push(word);
      }
    });
    
    return found;
  }

  blurInput(input, toxicWords) {
    // Apply blur effect to the input field
    if (!input.classList.contains('toxic-input-blurred')) {
      input.classList.add('toxic-input-blurred');
      input.dataset.toxicWords = toxicWords.join(', ');
      
      // Add visual warning
      this.addInputWarning(input);
    }
  }

  unblurInput(input) {
    input.classList.remove('toxic-input-blurred');
    delete input.dataset.toxicWords;
    this.removeInputWarning(input);
  }

  blurContentEditable(element, toxicWords) {
    if (!element.classList.contains('toxic-contenteditable-blurred')) {
      element.classList.add('toxic-contenteditable-blurred');
      element.dataset.toxicWords = toxicWords.join(', ');
      
      // Add visual warning
      this.addContentEditableWarning(element);
    }
  }

  unblurContentEditable(element) {
    element.classList.remove('toxic-contenteditable-blurred');
    delete element.dataset.toxicWords;
    this.removeContentEditableWarning(element);
  }

  addInputWarning(input) {
    // Check if warning already exists
    if (input.parentElement.querySelector('.toxic-input-warning')) return;

    const warning = document.createElement('div');
    warning.className = 'toxic-input-warning';
    warning.innerHTML = '⚠️ Toxic content detected';
    warning.style.cssText = `
      position: absolute;
      top: -25px;
      left: 0;
      background: #ff4444;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      z-index: 10000;
      pointer-events: none;
      white-space: nowrap;
    `;

    // Make parent relative if not already
    const parent = input.parentElement;
    if (parent && getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    input.parentElement.insertBefore(warning, input);
  }

  removeInputWarning(input) {
    const warning = input.parentElement.querySelector('.toxic-input-warning');
    if (warning) {
      warning.remove();
    }
  }

  addContentEditableWarning(element) {
    if (element.querySelector('.toxic-contenteditable-warning')) return;

    const warning = document.createElement('div');
    warning.className = 'toxic-contenteditable-warning';
    warning.innerHTML = '⚠️ Toxic content';
    warning.style.cssText = `
      position: absolute;
      top: -25px;
      right: 0;
      background: #ff4444;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      z-index: 10000;
      pointer-events: none;
    `;

    if (getComputedStyle(element).position === 'static') {
      element.style.position = 'relative';
    }

    element.appendChild(warning);
  }

  removeContentEditableWarning(element) {
    const warning = element.querySelector('.toxic-contenteditable-warning');
    if (warning) {
      warning.remove();
    }
  }

  logDetection(text, words) {
    const domain = window.location.hostname;
    const severity = this.getSeverity(words[0]);
    
    chrome.storage.local.get(['toxicLog'], (result) => {
      const log = result.toxicLog || [];
      const entry = {
        timestamp: Date.now(),
        date: new Date().toISOString(),
        domain: domain,
        words: words,
        severity: severity,
        fullText: text.substring(0, 200),
        source: 'user-input'
      };
      
      log.push(entry);
      
      if (log.length > 1000) {
        log.shift();
      }
      
      chrome.storage.local.set({ toxicLog: log });
    });
  }

  getSeverity(word) {
    const severityLevels = {
      high: ['nigger', 'nigga', 'kike', 'rape', 'rapist', 'raping', 'pedophile', 'paedophile', 'kill', 'murder', 'nazi', 'neonazi', 'white power'],
      medium: ['fuck', 'fucking', 'shit', 'bitch', 'ass', 'asshole', 'cunt', 'cock', 'pussy', 'dick', 'bastard', 'motherfucker'],
      low: []
    };

    const lower = word.toLowerCase();
    if (severityLevels.high.some(w => lower.includes(w))) return 'high';
    if (severityLevels.medium.some(w => lower.includes(w))) return 'medium';
    return 'low';
  }
}

// Initialize real-time filter
const realtimeFilter = new RealtimeInputFilter();

console.log('✅ Real-time Input Filter initialized');