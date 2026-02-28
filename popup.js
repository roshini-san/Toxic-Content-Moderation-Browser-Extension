document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadToggleState();
  
  const viewDashboardBtn = document.getElementById('viewDashboard');
  if (viewDashboardBtn) {
    viewDashboardBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
  
  const toggleSwitch = document.getElementById('toggleSwitch');
  if (toggleSwitch) {
    toggleSwitch.addEventListener('click', toggleExtension);
  }
});

function loadToggleState() {
  chrome.storage.local.get(['extensionEnabled'], (result) => {
    const enabled = result.extensionEnabled !== false;
    const toggle = document.getElementById('toggleSwitch');
    const status = document.getElementById('toggleStatus');
    
    if (!toggle || !status) return;
    
    if (enabled) {
      toggle.classList.add('active');
      status.textContent = 'ON';
      status.style.color = '#7fad7f';
    } else {
      toggle.classList.remove('active');
      status.textContent = 'OFF';
      status.style.color = '#e94560';
    }
  });
}

function toggleExtension() {
  const toggle = document.getElementById('toggleSwitch');
  const status = document.getElementById('toggleStatus');
  
  if (!toggle || !status) return;
  
  const isCurrentlyActive = toggle.classList.contains('active');
  const newState = !isCurrentlyActive;
  
  if (newState) {
    toggle.classList.add('active');
    status.textContent = 'ON';
    status.style.color = '#7fad7f';
  } else {
    toggle.classList.remove('active');
    status.textContent = 'OFF';
    status.style.color = '#e94560';
  }
  
  chrome.storage.local.set({ extensionEnabled: newState }, () => {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          chrome.tabs.reload(tab.id);
        }
      });
    });
  });
}

function loadStats() {
  chrome.storage.local.get(['toxicLog'], (result) => {
    const log = result.toxicLog || [];
    
    const totalBlocked = log.length;
    const today = new Date().setHours(0, 0, 0, 0);
    const todayBlocked = log.filter(entry => {
      const entryDate = new Date(entry.timestamp).setHours(0, 0, 0, 0);
      return entryDate === today;
    }).length;
    
    const totalEl = document.getElementById('totalBlocked');
    const todayEl = document.getElementById('todayBlocked');
    
    if (totalEl) totalEl.textContent = totalBlocked;
    if (todayEl) todayEl.textContent = todayBlocked;
  });
}