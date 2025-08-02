// Popup script to handle extension interface
class PopupController {
  constructor() {
    this.isActive = false;
    this.selectedElement = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkCurrentState();
  }

  bindEvents() {
    const toggleBtn = document.getElementById('toggle-selector');
    toggleBtn.addEventListener('change', () => this.toggleSelector());
  }

  async checkCurrentState() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if content script is active
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getState' });
      
      if (response) {
        this.updateUI(response.isActive, response.hasSelectedElement);
      }
    } catch (error) {
      // Content script might not be injected yet
    }
  }

  async toggleSelector() {
    const toggleBtn = document.getElementById('toggle-selector');
    this.isActive = toggleBtn.checked;

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleSelector',
        isActive: this.isActive
      });

      if (response && response.success) {
        this.updateUI(this.isActive, false);
      } else {
        // Reset toggle if failed
        toggleBtn.checked = false;
        this.isActive = false;
      }
    } catch (error) {
      // Reset toggle if failed
      toggleBtn.checked = false;
      this.isActive = false;
    }
  }


  updateUI(isActive, hasSelectedElement) {
    const toggleBtn = document.getElementById('toggle-selector');
    
    toggleBtn.checked = isActive;
    this.isActive = isActive;
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'elementSelected') {
    const popup = window.popupController;
    if (popup) {
      popup.updateUI(true, true);
    }
  } else if (message.action === 'elementDeselected') {
    const popup = window.popupController;
    if (popup) {
      popup.updateUI(true, false);
    }
  }
});

// Store reference globally for message handling
window.popupController = null;
document.addEventListener('DOMContentLoaded', () => {
  window.popupController = new PopupController();
});