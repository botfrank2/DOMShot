class DOMElementSelector {
  constructor() {
    this.isActive = false;
    this.selectedElement = null;
    this.controls = null;
    this.screenshotButton = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.setupMessageListener();
    this.createScreenshotButton();
  }

  setupMessageListener() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'getState':
          sendResponse({
            isActive: this.isActive,
            hasSelectedElement: !!this.selectedElement
          });
          break;
          
        case 'toggleSelector':
          this.isActive = message.isActive;
          this.toggleSelector();
          sendResponse({ success: true });
          break;
          
        case 'downloadElement':
          if (this.selectedElement) {
            this.downloadSelectedElement();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'No element selected' });
          }
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    });
  }

  bindEvents() {
    document.addEventListener('mouseover', (e) => this.handleMouseOver(e));
    document.addEventListener('mouseout', (e) => this.handleMouseOut(e));
    document.addEventListener('click', (e) => this.handleClick(e), true); // Use capture phase
  }

  toggleSelector() {
    if (this.isActive) {
      document.body.classList.add('dom-selector-active');
    } else {
      document.body.classList.remove('dom-selector-active');
      this.clearHighlight();
      this.clearSelection();
      // Hide screenshot button when selector is disabled
      if (this.screenshotButton) {
        this.screenshotButton.style.display = 'none';
      }
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
    
    // Position and show screenshot button
    this.positionScreenshotButton();
    
    // Notify popup that element is selected
    chrome.runtime.sendMessage({ action: 'elementSelected' });
  }

  createScreenshotButton() {
    this.screenshotButton = document.createElement('button');
    this.screenshotButton.textContent = '📸 Take Screenshot';
    this.screenshotButton.style.cssText = `
      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      background: #5dade2;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-family: Arial, sans-serif;
      font-weight: bold;
      z-index: 2147483647;
      display: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      white-space: nowrap;
      transition: background-color 0.2s ease;
    `;
    
    // Add hover effect
    this.screenshotButton.addEventListener('mouseenter', () => {
      this.screenshotButton.style.background = '#4a90c2';
      this.screenshotButton.style.cursor = 'pointer';
    });
    
    this.screenshotButton.addEventListener('mouseleave', () => {
      this.screenshotButton.style.background = '#5dade2';
    });
    
    this.screenshotButton.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.downloadSelectedElement();
    });
    
    document.body.appendChild(this.screenshotButton);
  }

  positionScreenshotButton() {
    if (!this.selectedElement || !this.screenshotButton) return;
    
    const rect = this.selectedElement.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // Position button inside selected element with 8px margin from top
    this.screenshotButton.style.left = (rect.left + scrollX + rect.width / 2) + 'px';
    this.screenshotButton.style.top = (rect.top + scrollY + 8) + 'px';
    this.screenshotButton.style.display = 'block';
  }

  isControlElement(element) {
    return element === this.screenshotButton;
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
      
      // Hide screenshot button
      if (this.screenshotButton) {
        this.screenshotButton.style.display = 'none';
      }
      
      // Notify popup that element is deselected
      chrome.runtime.sendMessage({ action: 'elementDeselected' });
    }
  }

  downloadSelectedElement() {
    if (!this.selectedElement) return;

    const rect = this.selectedElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Remove green background before screenshot
    this.selectedElement.classList.remove('dom-selector-selected');
    
    // Hide screenshot button during capture
    if (this.screenshotButton) {
      this.screenshotButton.style.display = 'none';
    }
    
    // Disable hover interactions during screenshot
    this.disableHoverEffects();
    
    // Hide all content outside the selected element
    this.isolateSelectedElement();

    // Check if element is larger than viewport
    if (rect.height > viewportHeight || rect.width > viewportWidth) {
      this.captureElementInSections();
    } else {
      // Use original single screenshot method
      this.selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      setTimeout(() => {
        if (!chrome || !chrome.runtime) return;

        // Get fresh coordinates after scroll
        const updatedRect = this.selectedElement.getBoundingClientRect();

        chrome.runtime.sendMessage({ action: 'captureElement' }, (response) => {
          this.selectedElement.classList.add('dom-selector-selected');
          this.enableHoverEffects();
          this.restoreHiddenElements();
          
          // Show screenshot button again
          if (this.screenshotButton) {
            this.screenshotButton.style.display = 'block';
          }
          
          if (chrome.runtime.lastError || !response || response.error || !response.dataUrl) {
            return;
          }

          this.cropAndDownloadImage(response.dataUrl, updatedRect);
        });
      }, 500);
    }
  }

  async captureElementInSections() {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;

    // First, scroll the element into view to get accurate positioning
    this.selectedElement.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' });
    
    // Wait for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get fresh element coordinates after scroll
    const freshRect = this.selectedElement.getBoundingClientRect();
    
    // Get element's position relative to document
    const elementTop = freshRect.top + window.scrollY;
    const elementLeft = freshRect.left + window.scrollX;

    // Calculate how many sections we need with some overlap to avoid edge issues
    const overlapPixels = 50; // Overlap sections by 50px to ensure no edges are missed
    const effectiveViewportWidth = viewportWidth - overlapPixels;
    const effectiveViewportHeight = viewportHeight - overlapPixels;
    
    const sectionsX = Math.ceil(freshRect.width / effectiveViewportWidth);
    const sectionsY = Math.ceil(freshRect.height / effectiveViewportHeight);
    
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
            const elementBottom = elementTop + freshRect.height;
            scrollY = elementBottom - effectiveViewportHeight;
            // Ensure we don't scroll to negative values, but allow the element bottom to be visible
            scrollY = Math.max(0, scrollY);
          }
          
          // For the last column, ensure we capture the right edge
          if (col === sectionsX - 1) {
            const elementRight = elementLeft + freshRect.width;
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
      
      // Restore element state
      this.selectedElement.classList.add('dom-selector-selected');
      this.enableHoverEffects();
      this.restoreHiddenElements();
      
      // Show screenshot button again
      if (this.screenshotButton) {
        this.screenshotButton.style.display = 'block';
      }

      // Stitch screenshots together
      this.stitchScreenshots(screenshots, freshRect);
      
    } catch (error) {
      // Restore state on error
      window.scrollTo(originalScrollX, originalScrollY);
      this.selectedElement.classList.add('dom-selector-selected');
      this.enableHoverEffects();
      this.restoreHiddenElements();
      
      // Show screenshot button again
      if (this.screenshotButton) {
        this.screenshotButton.style.display = 'block';
      }
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

  isolateSelectedElement() {
    if (!this.selectedElement) return;

    this.hiddenElements = [];
    
    // Find all elements that are not related to the selected element
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(element => {
      // Skip the selected element itself
      if (element === this.selectedElement) {
        return;
      }
      
      // Skip descendants of the selected element (children, grandchildren, etc.)
      if (this.selectedElement.contains(element)) {
        return;
      }
      
      // Skip ancestors of the selected element (parents, grandparents, etc.)
      if (element.contains(this.selectedElement)) {
        return;
      }
      
      // Skip our screenshot button
      if (element === this.screenshotButton) {
        return;
      }
      
      // Hide everything else (siblings and unrelated elements)
      const computedStyle = window.getComputedStyle(element);
      if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden') {
        this.hiddenElements.push({
          element: element,
          originalVisibility: element.style.visibility,
          originalOpacity: element.style.opacity,
          originalBackground: element.style.background
        });
        element.style.visibility = 'hidden';
      }
    });
    
    // Don't change body background - keep it as is
    this.originalBodyBackground = document.body.style.background;
  }

  restoreHiddenElements() {
    // Restore visibility of all hidden elements
    if (this.hiddenElements) {
      this.hiddenElements.forEach(item => {
        // Restore visibility
        if (item.originalVisibility) {
          item.element.style.visibility = item.originalVisibility;
        } else {
          item.element.style.visibility = '';
        }
        
        // Restore opacity
        if (item.originalOpacity) {
          item.element.style.opacity = item.originalOpacity;
        }
        
        // Restore background
        if (item.originalBackground) {
          item.element.style.background = item.originalBackground;
        }
      });
      this.hiddenElements = [];
    }
    
    // Restore original body background (though we don't change it)
    if (this.originalBodyBackground !== undefined) {
      document.body.style.background = this.originalBodyBackground;
      this.originalBodyBackground = undefined;
    }
  }

  disableHoverEffects() {
    // Add a CSS rule to disable all hover effects and hide fixed elements
    if (!this.hoverDisableStyle) {
      this.hoverDisableStyle = document.createElement('style');
      
      // Build CSS to exclude selected element and its hierarchy
      let selectedElementExclusion = '';
      if (this.selectedElement) {
        // Generate a unique class name for the selected element
        const uniqueClass = 'dom-selected-preserve-' + Date.now();
        this.selectedElement.classList.add(uniqueClass);
        this.preserveClass = uniqueClass;
        
        selectedElementExclusion = `
        /* Preserve selected element and its ancestors/descendants */
        .${uniqueClass},
        .${uniqueClass} *,
        .${uniqueClass} * {
          visibility: visible !important;
        }
        `;
      }
      
      this.hoverDisableStyle.textContent = `
        *:hover, 
        *:focus, 
        *:active {
          outline: none !important;
          border-color: inherit !important;
          box-shadow: none !important;
          transform: none !important;
          opacity: inherit !important;
        }
        
        /* Hide fixed position elements that might interfere with screenshots */
        *[style*="position: fixed"],
        *[style*="position:fixed"] {
          visibility: hidden !important;
        }
        
        /* Also hide elements with fixed position via CSS classes */
        .fixed,
        .position-fixed,
        .navbar-fixed,
        .header-fixed,
        .sticky-top,
        .sticky,
        .fixed-top,
        .fixed-bottom {
          visibility: hidden !important;
        }
        
        
        ${selectedElementExclusion}
      `;
      document.head.appendChild(this.hoverDisableStyle);
    }
    
    // Store and hide elements with computed fixed position
    this.hiddenFixedElements = [];
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(element => {
      
      // Don't hide if this element is the selected element or contains it
      if (this.selectedElement) {
        if (element === this.selectedElement || 
            element.contains(this.selectedElement) || 
            this.selectedElement.contains(element)) {
          return; // Skip selected element and its ancestors/descendants
        }
      }
      
      const computedStyle = window.getComputedStyle(element);
      if (computedStyle.position === 'fixed' || computedStyle.position === 'sticky') {
        this.hiddenFixedElements.push({
          element: element,
          originalVisibility: element.style.visibility
        });
        element.style.visibility = 'hidden';
      }
    });
  }

  enableHoverEffects() {
    // Remove the CSS rule to re-enable hover effects
    if (this.hoverDisableStyle && this.hoverDisableStyle.parentNode) {
      this.hoverDisableStyle.parentNode.removeChild(this.hoverDisableStyle);
      this.hoverDisableStyle = null;
    }
    
    // Remove the preserve class from selected element
    if (this.preserveClass && this.selectedElement) {
      this.selectedElement.classList.remove(this.preserveClass);
      this.preserveClass = null;
    }
    
    // Restore visibility of previously hidden fixed elements
    if (this.hiddenFixedElements) {
      this.hiddenFixedElements.forEach(item => {
        if (item.originalVisibility) {
          item.element.style.visibility = item.originalVisibility;
        } else {
          item.element.style.visibility = '';
        }
      });
      this.hiddenFixedElements = [];
    }
  }

  captureElementDirectly(elementRect) {
    // Restore element state first
    this.selectedElement.classList.add('dom-selector-selected');
    this.enableHoverEffects();
    
    try {
      // Use dom-to-image approach with html2canvas-like functionality
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      
      // Set canvas size
      canvas.width = elementRect.width * dpr;
      canvas.height = elementRect.height * dpr;
      
      // Create SVG with foreign object containing the element
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', elementRect.width);
      svg.setAttribute('height', elementRect.height);
      svg.setAttribute('viewBox', `0 0 ${elementRect.width} ${elementRect.height}`);
      
      const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      foreignObject.setAttribute('x', '0');
      foreignObject.setAttribute('y', '0');
      foreignObject.setAttribute('width', elementRect.width);
      foreignObject.setAttribute('height', elementRect.height);
      
      // Clone the element and its styles
      const clonedElement = this.selectedElement.cloneNode(true);
      
      // Get computed styles and apply them
      const computedStyle = window.getComputedStyle(this.selectedElement);
      const styleStr = Array.from(computedStyle).reduce((str, property) => {
        return `${str}${property}:${computedStyle.getPropertyValue(property)};`;
      }, '');
      
      clonedElement.style.cssText = styleStr;
      clonedElement.style.position = 'static';
      clonedElement.style.transform = 'none';
      
      foreignObject.appendChild(clonedElement);
      svg.appendChild(foreignObject);
      
      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
      
      // Draw SVG to canvas
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        this.downloadViaChrome(dataUrl, `element-screenshot-${Date.now()}.png`);
        this.clearSelection();
      };
      
      img.onerror = () => {
        // Fallback: create a simple colored rectangle
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#333';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Element Screenshot', canvas.width / 2, canvas.height / 2);
        
        const dataUrl = canvas.toDataURL('image/png');
        this.downloadViaChrome(dataUrl, `element-screenshot-${Date.now()}.png`);
        this.clearSelection();
      };
      
      img.src = svgDataUrl;
      
    } catch (error) {
      // Final fallback: download a placeholder
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 400;
      canvas.height = 300;
      
      ctx.fillStyle = '#5dade2';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Screenshot Captured', canvas.width / 2, canvas.height / 2);
      
      const dataUrl = canvas.toDataURL('image/png');
      this.downloadViaChrome(dataUrl, `element-screenshot-${Date.now()}.png`);
      this.clearSelection();
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