chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureElement') {
    if (!sender.tab || !sender.tab.id) {
      sendResponse({ error: 'Invalid tab context' });
      return;
    }
    
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      
      if (!dataUrl) {
        sendResponse({ error: 'Failed to capture screenshot data' });
        return;
      }
      
      sendResponse({ dataUrl: dataUrl });
    });
    
    return true;
  }
  
  if (request.action === 'downloadImage') {
    if (!request.dataUrl || !request.filename) {
      sendResponse({ error: 'Missing required download parameters' });
      return;
    }
    
    chrome.downloads.download({
      url: request.dataUrl,
      filename: request.filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      
      sendResponse({ success: true, downloadId: downloadId });
    });
    
    return true;
  }
  
  sendResponse({ error: 'Unknown action: ' + request.action });
});