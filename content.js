class DOMElementSelector {
  constructor() {
    this.isActive = false;
    this.selectedElement = null;
    this.controls = null;
    this.init();
  }

  init() {
    this.createControls();
    this.bindEvents();
  }

  createControls() {
    this.controls = document.createElement('div');
    this.controls.className = 'dom-selector-controls';
    this.controls.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
        <img src="${chrome.runtime.getURL('DOMShot.svg')}" style="width: 20px; height: 20px; margin-right: 6px;">
        <span style="font-weight: bold; font-size: 14px; color: #333;">DOMShot</span>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between">
        <span style="font-size: 14px;">Enable Selector</span>
        <label class="switch">
          <input type="checkbox" id="toggle-selector">
          <span class="slider"></span>
        </label>
      </div>
      <button class="dom-selector-button screenshot-btn" id="download-element" style="display: none">📸 Take Screenshot</button>
    `;
    document.body.appendChild(this.controls);
  }

  bindEvents() {
    const toggleBtn = document.getElementById('toggle-selector');
    const downloadBtn = document.getElementById('download-element');

    toggleBtn.addEventListener('change', () => this.toggleSelector());
    downloadBtn.addEventListener('click', () => this.downloadSelectedElement());

    document.addEventListener('mouseover', (e) => this.handleMouseOver(e));
    document.addEventListener('mouseout', (e) => this.handleMouseOut(e));
    document.addEventListener('click', (e) => this.handleClick(e));
  }

  toggleSelector() {
    const toggleBtn = document.getElementById('toggle-selector');
    this.isActive = toggleBtn.checked;
    
    if (this.isActive) {
      this.updateButtonVisibility();
    } else {
      this.clearHighlight();
      this.clearSelection();
      this.updateButtonVisibility();
    }
  }

  handleMouseOver(e) {
    if (!this.isActive || this.isControlElement(e.target)) return;
    
    this.clearHighlight();
    e.target.classList.add('dom-selector-highlight');
  }

  handleMouseOut(e) {
    if (!this.isActive || this.isControlElement(e.target)) return;
    
    if (!e.target.classList.contains('dom-selector-selected')) {
      e.target.classList.remove('dom-selector-highlight');
    }
  }

  handleClick(e) {
    if (!this.isActive || this.isControlElement(e.target)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    this.clearSelection();
    this.selectedElement = e.target;
    e.target.classList.add('dom-selector-selected');
    
    this.updateButtonVisibility();
  }

  isControlElement(element) {
    return element.closest('.dom-selector-controls');
  }


  clearHighlight() {
    document.querySelectorAll('.dom-selector-highlight').forEach(el => {
      el.classList.remove('dom-selector-highlight');
    });
  }

  clearSelection() {
    if (this.selectedElement) {
      this.selectedElement.classList.remove('dom-selector-selected');
      this.selectedElement = null;
      this.updateButtonVisibility();
    }
  }

  updateButtonVisibility() {
    const downloadBtn = document.getElementById('download-element');
    
    if (!this.isActive) {
      // Selector disabled - hide button
      downloadBtn.style.display = 'none';
    } else if (this.selectedElement) {
      // Element selected - show button
      downloadBtn.style.display = 'block';
    } else {
      // Selector active but no selection - hide button
      downloadBtn.style.display = 'none';
    }
  }

  downloadSelectedElement() {
    if (!this.selectedElement) return;

    const rect = this.selectedElement.getBoundingClientRect();

    // Hide plugin controls and remove green background before screenshot
    this.controls.style.display = 'none';
    this.selectedElement.classList.remove('dom-selector-selected');

    // Scroll element into view if needed
    this.selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Wait for scroll to complete, then capture
    setTimeout(() => {
      if (!chrome || !chrome.runtime) return;

      chrome.runtime.sendMessage({ action: 'captureElement' }, (response) => {
        // Show plugin controls and restore green background after screenshot
        this.controls.style.display = 'block';
        this.selectedElement.classList.add('dom-selector-selected');
        
        if (chrome.runtime.lastError || !response || response.error || !response.dataUrl) {
          return;
        }

        this.cropAndDownloadImage(response.dataUrl, rect);
      });
    }, 500);
  }

  cropAndDownloadImage(dataUrl, elementRect) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Account for device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        
        // Calculate crop dimensions with bounds checking
        const cropX = Math.max(0, elementRect.left * dpr);
        const cropY = Math.max(0, elementRect.top * dpr);
        const cropWidth = Math.max(1, elementRect.width * dpr);
        const cropHeight = Math.max(1, elementRect.height * dpr);

        // Ensure we don't exceed image bounds
        const maxCropX = Math.min(cropX, img.width - 1);
        const maxCropY = Math.min(cropY, img.height - 1);
        const maxCropWidth = Math.min(cropWidth, img.width - maxCropX);
        const maxCropHeight = Math.min(cropHeight, img.height - maxCropY);

        // Validate dimensions
        if (maxCropWidth <= 0 || maxCropHeight <= 0) {
          return;
        }

        // Set canvas size
        canvas.width = maxCropWidth;
        canvas.height = maxCropHeight;

        // Draw cropped image
        ctx.drawImage(
          img,
          maxCropX, maxCropY, maxCropWidth, maxCropHeight,
          0, 0, maxCropWidth, maxCropHeight
        );

        // Convert canvas to data URL and download
        const croppedDataUrl = canvas.toDataURL('image/png');
        this.downloadViaChrome(croppedDataUrl, `element-screenshot-${Date.now()}.png`);
        
        // Clear selection after screenshot
        this.clearSelection();
        
      } catch (error) {
        // Silent error handling
      }
    };

    img.onerror = () => {
      // Silent error handling
    };

    img.src = dataUrl;
  }

  downloadViaChrome(dataUrl, filename) {
    chrome.runtime.sendMessage({
      action: 'downloadImage',
      dataUrl: dataUrl,
      filename: filename
    }, (response) => {
      if (chrome.runtime.lastError || !response || response.error) {
        this.downloadDataUrl(dataUrl, filename);
        return;
      }
    });
  }

  downloadDataUrl(dataUrl, filename) {
    try {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      // Silent error handling
    }
  }

  getElementAttributes(element) {
    const attributes = {};
    for (let attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  getComputedStyles(element) {
    const styles = window.getComputedStyle(element);
    const importantStyles = [
      'display', 'position', 'width', 'height', 'margin', 'padding',
      'border', 'background', 'color', 'font-family', 'font-size',
      'text-align', 'z-index', 'opacity', 'visibility'
    ];
    
    const computedStyles = {};
    importantStyles.forEach(prop => {
      computedStyles[prop] = styles.getPropertyValue(prop);
    });
    
    return computedStyles;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new DOMElementSelector();
  });
} else {
  new DOMElementSelector();
}