// Gmail-specific filtering for subject lines and email content
console.log('📧 Gmail Filter Loading...');

class GmailFilter {
  constructor() {
    this.isGmail = this.checkIfGmail();
    if (this.isGmail) {
      console.log('✅ Gmail detected - Initializing filter');
      this.init();
    }
  }

  checkIfGmail() {
    return window.location.hostname.includes('mail.google.com');
  }

  init() {
    // Wait for Gmail to load
    this.waitForGmail();
  }

  waitForGmail() {
    const checkInterval = setInterval(() => {
      const emailList = document.querySelector('[role="main"]');
      
      if (emailList) {
        console.log('✅ Gmail loaded');
        clearInterval(checkInterval);
        this.monitorGmail();
      }
    }, 500);

    setTimeout(() => clearInterval(checkInterval), 10000);
  }

  monitorGmail() {
    // Monitor subject lines in inbox
    this.monitorSubjectLines();
    
    // Monitor email body when opened
    this.monitorEmailBody();
    
    // Monitor compose window
    this.monitorCompose();
  }

  monitorSubjectLines() {
    console.log('👀 Monitoring Gmail subject lines');

    // Observer for new emails
    const observer = new MutationObserver((mutations) => {
      // Gmail subject line selectors
      const subjectSelectors = [
        '.bog', // Subject in list view
        'span[data-thread-id]', // Thread subjects
        '.y6 span', // Subject span
        'tr.zA .y6', // Row subjects
        '.xT .y6' // Expanded subjects
      ];

      subjectSelectors.forEach(selector => {
        const subjects = document.querySelectorAll(selector);
        subjects.forEach(subject => {
          if (!subject.dataset.toxicChecked) {
            subject.dataset.toxicChecked = 'true';
            this.checkAndBlurElement(subject);
          }
        });
      });

      // Also check opened email subject
      const openedSubject = document.querySelector('.hP');
      if (openedSubject && !openedSubject.dataset.toxicChecked) {
        openedSubject.dataset.toxicChecked = 'true';
        this.checkAndBlurElement(openedSubject);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial scan
    this.scanExistingSubjects();
  }

  scanExistingSubjects() {
    // Scan all visible subject lines
    const subjectSelectors = [
      '.bog',
      'span[data-thread-id]',
      '.y6 span',
      'tr.zA .y6',
      '.xT .y6',
      '.hP' // Opened email subject
    ];

    subjectSelectors.forEach(selector => {
      const subjects = document.querySelectorAll(selector);
      subjects.forEach(subject => {
        this.checkAndBlurElement(subject);
      });
    });
  }

  monitorEmailBody() {
    console.log('👀 Monitoring email body');

    const observer = new MutationObserver(() => {
      // Email body selector
      const emailBodies = document.querySelectorAll('.a3s.aiL'); // Email body
      
      emailBodies.forEach(body => {
        if (!body.dataset.toxicScanned) {
          body.dataset.toxicScanned = 'true';
          this.scanElementForToxicWords(body);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  monitorCompose() {
    console.log('👀 Monitoring compose window');

    const observer = new MutationObserver(() => {
      // Compose subject line
      const composeSubjects = document.querySelectorAll('input[name="subjectbox"]');
      
      composeSubjects.forEach(input => {
        if (!input.dataset.toxicMonitored) {
          input.dataset.toxicMonitored = 'true';
          
          input.addEventListener('input', () => {
            this.checkInputForToxic(input);
          });

          input.addEventListener('blur', () => {
            this.checkInputForToxic(input);
          });
        }
      });

      // Compose body
      const composeBodies = document.querySelectorAll('[contenteditable="true"][role="textbox"]');
      
      composeBodies.forEach(body => {
        if (!body.dataset.toxicMonitored) {
          body.dataset.toxicMonitored = 'true';
          
          body.addEventListener('input', () => {
            this.scanElementForToxicWords(body);
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  checkInputForToxic(input) {
    const value = input.value;
    
    if (this.containsToxicWord(value)) {
      console.log('🚨 Toxic word in input:', value);
      input.style.filter = 'blur(3px)';
      input.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
      input.style.border = '2px solid red';
    } else {
      input.style.filter = 'none';
      input.style.backgroundColor = '';
      input.style.border = '';
    }
  }

  checkAndBlurElement(element) {
    const text = element.textContent || element.innerText;
    
    if (this.containsToxicWord(text)) {
      console.log('🚨 Toxic word in element:', text.substring(0, 50));
      
      // Blur the element
      element.style.filter = 'blur(4px)';
      element.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
      element.style.cursor = 'pointer';
      element.title = 'Click to reveal - Toxic content detected';
      
      // Click to reveal
      element.addEventListener('click', function reveal() {
        this.style.filter = 'none';
        this.style.backgroundColor = '';
        this.style.cursor = 'default';
        this.title = '';
        this.removeEventListener('click', reveal);
      }, { once: true });
    }
  }

  scanElementForToxicWords(element) {
    // Get all text nodes in the element
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let node;
    
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    textNodes.forEach(textNode => {
      this.wrapToxicWordsInNode(textNode);
    });
  }

  wrapToxicWordsInNode(node) {
    if (!node || !node.textContent) return;
    
    const parent = node.parentElement;
    if (!parent || parent.classList.contains('toxic-word-blur')) return;
    
    // Skip if parent is a script or style tag
    if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return;

    const text = node.textContent;
    const matches = this.findToxicWords(text);

    if (matches.length === 0) return;

    console.log('🚨 Found toxic words in Gmail:', matches.map(m => m.word));

    // Build new HTML with ONLY toxic words wrapped
    let newHTML = '';
    let lastIndex = 0;

    matches.forEach(match => {
      // Add normal text before the match
      newHTML += this.escapeHtml(text.substring(lastIndex, match.index));
      
      // Wrap ONLY the toxic word
      newHTML += `<span class="gmail-toxic-blur" style="filter: blur(5px); background: rgba(255,0,0,0.2); padding: 0 3px; border-radius: 3px; cursor: pointer; display: inline-block;" title="Click to reveal - Toxic content" onclick="this.style.filter='none'; this.style.background=''; this.title=''; this.onclick=null;">${this.escapeHtml(match.word)}</span>`;
      
      lastIndex = match.index + match.word.length;
    });

    // Add remaining normal text
    newHTML += this.escapeHtml(text.substring(lastIndex));

    // Only replace if we actually wrapped something
    if (newHTML !== text) {
      const wrapper = document.createElement('span');
      wrapper.innerHTML = newHTML;
      
      try {
        parent.replaceChild(wrapper, node);
        console.log('✅ Wrapped toxic words in Gmail text');
      } catch (error) {
        console.log('❌ Could not replace node:', error);
      }
    }
  }

  findToxicWords(text) {
    const matches = [];
    
    sortedToxicWords.forEach(word => {
      const pattern = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
      let match;
      
      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          word: match[0],
          index: match.index
        });
      }
    });

    // Sort by index
    return matches.sort((a, b) => a.index - b.index);
  }

  containsToxicWord(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return sortedToxicWords.some(word => {
      const pattern = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      return pattern.test(lowerText);
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize Gmail filter
if (window.location.hostname.includes('mail.google.com')) {
  setTimeout(() => {
    const gmailFilter = new GmailFilter();
  }, 1000);
}

console.log('📧 Gmail Filter Ready');