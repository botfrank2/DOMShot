# DOMShot

**Screenshot DOM elements with precision and ease**

DOMShot is a Chrome extension that allows you to capture pixel-perfect screenshots of specific DOM elements on any webpage. Simply enable the selector, click on any element, and get a clean, cropped screenshot instantly.

## Features

- **🎯 Precise Element Selection**: Click on any DOM element to select it with visual feedback
- **📸 Instant Screenshots**: Capture clean, cropped screenshots of selected elements
- **🎨 Non-Intrusive Interface**: Minimal UI that stays out of your way
- **⚡ Lightning Fast**: No complex setup - just enable, select, and capture
- **🧹 Clean Output**: Screenshots exclude selection highlights and extension UI
- **💾 Auto-Download**: Screenshots automatically download with timestamped filenames
- **🔧 Smart Cropping**: Automatically crops to element boundaries with device pixel ratio support

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" and select the DOMShot extension folder
4. The DOMShot extension will appear in your extensions list and toolbar

## How to Use

1. **Navigate** to any webpage
2. **Enable** the selector using the toggle switch in the DOMShot panel
3. **Click** on any element you want to screenshot - it will be highlighted in blue
4. **Capture** by clicking the "📸 Take Screenshot" button
5. **Download** happens automatically with filename format: `element-screenshot-[timestamp].png`

The extension automatically:
- Hides the selection highlight during capture
- Hides the DOMShot panel during capture  
- Clears the selection after taking a screenshot
- Scrolls the element into view if needed

## Interface

The DOMShot panel features:
- **DOMShot Logo & Branding**: Clean, professional interface
- **Enable/Disable Toggle**: Modern switch to activate the selector
- **Screenshot Button**: Only appears when an element is selected
- **Auto-Hide Logic**: Button disappears when no element is selected

## Technical Details

- **Manifest V3** compatible Chrome extension
- **Permissions**: `activeTab`, `downloads`, `tabs`
- **Works on**: All websites (`<all_urls>`)
- **File Format**: PNG screenshots with lossless quality
- **Smart Cropping**: Handles device pixel ratios and boundary detection
- **Memory Efficient**: Minimal footprint with no external dependencies

## File Structure

- `manifest.json` - Extension configuration and metadata
- `content.js` - Main functionality and DOM interaction logic
- `background.js` - Screenshot capture and download handling  
- `styles.css` - UI styling and visual feedback
- `popup.html` - Extension popup interface
- `DOMShot.svg` - Logo for in-page branding
- `DOMShot_Logo.png` - Extension icon and favicon

---

**DOMShot** - Making DOM element screenshots simple and precise.