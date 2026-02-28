// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['toxicLog'], (result) => {
    if (!result.toxicLog) {
      chrome.storage.local.set({ toxicLog: [] });
    }
  });
  
  console.log('Toxic Content Filter installed and ready!');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'logToxicContent') {
    chrome.storage.local.get(['toxicLog'], (result) => {
      const log = result.toxicLog || [];
      log.push(request.data);
      chrome.storage.local.set({ toxicLog: log });
    });
  }
  
  return true;
});