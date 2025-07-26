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
      <div class="icon-only-state">
        <img src="${chrome.runtime.getURL('DOMShot.svg')}" style="width: 40px; height: 40px;">
      </div>
      <div class="expanded-state" style="display: none;">
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
      </div>
    `;
    document.body.appendChild(this.controls);
    this.controls.classList.add('minimized'); // Start in minimized state
    this.setupHoverEvents();
  }

  setupHoverEvents() {
    const iconOnly = this.controls.querySelector('.icon-only-state');
    const expanded = this.controls.querySelector('.expanded-state');

    this.controls.addEventListener('mouseenter', () => {
      if (!this.isActive) {
        iconOnly.style.display = 'none';
        expanded.style.display = 'block';
        this.controls.classList.remove('minimized');
      }
    });

    this.controls.addEventListener('mouseleave', () => {
      if (!this.isActive) {
        iconOnly.style.display = 'block';
        expanded.style.display = 'none';
        this.controls.classList.add('minimized');
      }
    });
  }

  bindEvents() {
    const toggleBtn = document.getElementById('toggle-selector');
    const downloadBtn = document.getElementById('download-element');

    toggleBtn.addEventListener('change', () => this.toggleSelector());
    downloadBtn.addEventListener('click', () => this.downloadSelectedElement());

    document.addEventListener('mouseover', (e) => this.handleMouseOver(e));
    document.addEventListener('mouseout', (e) => this.handleMouseOut(e));
    document.addEventListener('click', (e) => this.handleClick(e), true); // Use capture phase
  }

  toggleSelector() {
    const toggleBtn = document.getElementById('toggle-selector');
    const iconOnly = this.controls.querySelector('.icon-only-state');
    const expanded = this.controls.querySelector('.expanded-state');
    
    this.isActive = toggleBtn.checked;
    
    if (this.isActive) {
      // Always show expanded state when enabled
      iconOnly.style.display = 'none';
      expanded.style.display = 'block';
      this.controls.classList.remove('minimized');
      document.body.classList.add('dom-selector-active');
      this.updateButtonVisibility();
    } else {
      // Back to icon-only state when disabled
      iconOnly.style.display = 'block';
      expanded.style.display = 'none';
      this.controls.classList.add('minimized');
      document.body.classList.remove('dom-selector-active');
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
    
    // Prevent default actions for interactive elements
    const interactiveElements = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'FORM'];
    if (interactiveElements.includes(e.target.tagName) || 
        e.target.closest('a, button, input, select, textarea, form')) {
      e.preventDefault();
    }
    
    e.stopPropagation();
    e.stopImmediatePropagation();
    
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
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Hide plugin controls and remove green background before screenshot
    this.controls.style.display = 'none';
    this.selectedElement.classList.remove('dom-selector-selected');
    
    // Disable hover interactions during screenshot
    this.disableHoverEffects();

    // Check if element is larger than viewport
    if (rect.height > viewportHeight || rect.width > viewportWidth) {
      this.captureElementInSections(rect);
    } else {
      // Use original single screenshot method
      this.selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      setTimeout(() => {
        if (!chrome || !chrome.runtime) return;

        chrome.runtime.sendMessage({ action: 'captureElement' }, (response) => {
          this.controls.style.display = 'block';
          this.selectedElement.classList.add('dom-selector-selected');
          this.enableHoverEffects();
          
          if (chrome.runtime.lastError || !response || response.error || !response.dataUrl) {
            return;
          }

          this.cropAndDownloadImage(response.dataUrl, rect);
        });
      }, 500);
    }
  }

  async captureElementInSections(elementRect) {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;

    // Get element's position relative to document
    const elementTop = elementRect.top + window.scrollY;
    const elementLeft = elementRect.left + window.scrollX;

    // Calculate how many sections we need with some overlap to avoid edge issues
    const overlapPixels = 50; // Overlap sections by 50px to ensure no edges are missed
    const effectiveViewportWidth = viewportWidth - overlapPixels;
    const effectiveViewportHeight = viewportHeight - overlapPixels;
    
    const sectionsX = Math.ceil(elementRect.width / effectiveViewportWidth);
    const sectionsY = Math.ceil(elementRect.height / effectiveViewportHeight);
    
    const screenshots = [];

    try {
      // Capture each section
      for (let row = 0; row < sectionsY; row++) {
        for (let col = 0; col < sectionsX; col++) {
          // Calculate scroll position for this section
          let scrollX = elementLeft + (col * effectiveViewportWidth) - (col > 0 ? overlapPixels / 2 : 0);
          let scrollY = elementTop + (row * effectiveViewportHeight) - (row > 0 ? overlapPixels / 2 : 0);
          
          // For the last row, ensure we capture the bottom by scrolling to show the element's bottom edge
          if (row === sectionsY - 1) {
            const elementBottom = elementTop + elementRect.height;
            scrollY = elementBottom - effectiveViewportHeight;
            // Ensure we don't scroll to negative values, but allow the element bottom to be visible
            scrollY = Math.max(0, scrollY);
          }
          
          // For the last column, ensure we capture the right edge
          if (col === sectionsX - 1) {
            const elementRight = elementLeft + elementRect.width;
            scrollX = Math.max(0, elementRight - effectiveViewportWidth);
          }
          
          // Ensure we don't scroll beyond document bounds
          scrollX = Math.max(0, scrollX);
          scrollY = Math.max(0, scrollY);
          
          // Scroll to this section
          window.scrollTo(scrollX, scrollY);
          
          // Wait for scroll to complete
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Capture screenshot
          const response = await new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'captureElement' }, resolve);
          });
          
          if (response && response.dataUrl) {
            screenshots.push({
              dataUrl: response.dataUrl,
              row,
              col,
              scrollX: window.scrollX,
              scrollY: window.scrollY,
              elementLeft,
              elementTop,
              effectiveViewportWidth,
              effectiveViewportHeight,
              isLastRow: row === sectionsY - 1,
              isLastCol: col === sectionsX - 1,
              totalSectionsX: sectionsX,
              totalSectionsY: sectionsY
            });
          }
        }
      }

      // Restore original scroll position
      window.scrollTo(originalScrollX, originalScrollY);
      
      // Show controls again
      this.controls.style.display = 'block';
      this.selectedElement.classList.add('dom-selector-selected');
      this.enableHoverEffects();

      // Stitch screenshots together
      this.stitchScreenshots(screenshots, elementRect);
      
    } catch (error) {
      // Restore state on error
      window.scrollTo(originalScrollX, originalScrollY);
      this.controls.style.display = 'block';
      this.selectedElement.classList.add('dom-selector-selected');
      this.enableHoverEffects();
    }
  }

  stitchScreenshots(screenshots, elementRect) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size to element size
    canvas.width = elementRect.width * dpr;
    canvas.height = elementRect.height * dpr;

    let loadedImages = 0;
    const totalImages = screenshots.length;

    screenshots.forEach(screenshot => {
      const img = new Image();
      
      img.onload = () => {
        // Get effective viewport dimensions from this screenshot
        const effectiveViewportWidth = screenshot.effectiveViewportWidth;
        const effectiveViewportHeight = screenshot.effectiveViewportHeight;
        
        // Calculate where the element appears in this screenshot
        const elementInScreenX = screenshot.elementLeft - screenshot.scrollX;
        const elementInScreenY = screenshot.elementTop - screenshot.scrollY;
        
        // Calculate which part of the element this section should capture
        let elementSectionStartX, elementSectionStartY, elementSectionEndX, elementSectionEndY;
        
        if (screenshot.isLastCol) {
          // For last column, capture from the right edge backwards
          elementSectionEndX = elementRect.width;
          elementSectionStartX = Math.max(0, elementRect.width - effectiveViewportWidth);
        } else {
          elementSectionStartX = screenshot.col * effectiveViewportWidth;
          elementSectionEndX = Math.min(elementSectionStartX + effectiveViewportWidth, elementRect.width);
        }
        
        if (screenshot.isLastRow) {
          // For last row, we want to capture the bottom part of the element
          // The section should end at the element's bottom and start from where we can fit in the viewport
          elementSectionEndY = elementRect.height;
          elementSectionStartY = Math.max(0, elementRect.height - effectiveViewportHeight);
        } else {
          elementSectionStartY = screenshot.row * effectiveViewportHeight;
          elementSectionEndY = Math.min(elementSectionStartY + effectiveViewportHeight, elementRect.height);
        }
        
        const sectionElementWidth = elementSectionEndX - elementSectionStartX;
        const sectionElementHeight = elementSectionEndY - elementSectionStartY;
        
        // Calculate crop from screenshot (where to cut from the viewport image)
        let cropX = Math.max(0, elementInScreenX) * dpr;
        let cropY = Math.max(0, elementInScreenY) * dpr;
        
        // For last row, we need to crop from the bottom of the element in the screenshot
        if (screenshot.isLastRow) {
          const elementBottomInScreen = elementInScreenY + elementRect.height;
          cropY = Math.max(0, elementBottomInScreen - sectionElementHeight) * dpr;
        }
        
        // For last column, we need to crop from the right of the element in the screenshot  
        if (screenshot.isLastCol) {
          const elementRightInScreen = elementInScreenX + elementRect.width;
          cropX = Math.max(0, elementRightInScreen - sectionElementWidth) * dpr;
        }
        
        const cropWidth = sectionElementWidth * dpr;
        const cropHeight = sectionElementHeight * dpr;
        
        // Position on final canvas (where to place in the stitched image)
        const canvasX = elementSectionStartX * dpr;
        const canvasY = elementSectionStartY * dpr;

        // Only draw if we have valid dimensions
        if (cropWidth > 0 && cropHeight > 0 && 
            cropX >= 0 && cropY >= 0 && 
            cropX + cropWidth <= img.width && cropY + cropHeight <= img.height) {
          ctx.drawImage(
            img,
            cropX, cropY, cropWidth, cropHeight,
            canvasX, canvasY, cropWidth, cropHeight
          );
        }

        loadedImages++;
        
        // When all images are loaded, download the final result
        if (loadedImages === totalImages) {
          const finalDataUrl = canvas.toDataURL('image/png');
          this.downloadViaChrome(finalDataUrl, `element-screenshot-${Date.now()}.png`);
          this.clearSelection();
        }
      };

      img.onerror = () => {
        loadedImages++;
        if (loadedImages === totalImages) {
          // Even if some images failed, try to download what we have
          const finalDataUrl = canvas.toDataURL('image/png');
          this.downloadViaChrome(finalDataUrl, `element-screenshot-${Date.now()}.png`);
          this.clearSelection();
        }
      };

      img.src = screenshot.dataUrl;
    });
  }

  disableHoverEffects() {
    // Add a CSS rule to disable all hover effects
    if (!this.hoverDisableStyle) {
      this.hoverDisableStyle = document.createElement('style');
      this.hoverDisableStyle.textContent = `
        *:hover, 
        *:focus, 
        *:active {
          outline: none !important;
          border-color: inherit !important;
          background-color: inherit !important;
          color: inherit !important;
          box-shadow: none !important;
          transform: none !important;
          opacity: inherit !important;
        }
      `;
      document.head.appendChild(this.hoverDisableStyle);
    }
  }

  enableHoverEffects() {
    // Remove the CSS rule to re-enable hover effects
    if (this.hoverDisableStyle && this.hoverDisableStyle.parentNode) {
      this.hoverDisableStyle.parentNode.removeChild(this.hoverDisableStyle);
      this.hoverDisableStyle = null;
    }
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