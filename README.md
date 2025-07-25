# DOM Element Selector Chrome Extension

A Chrome extension that allows you to highlight and download DOM elements from any webpage.

## Features

- **Real-time highlighting**: Hover over any element to see it highlighted with a red border
- **Element selection**: Click on any element to select it (highlighted in teal)
- **Element information**: Shows element tag name, ID, and classes in a tooltip
- **Download functionality**: Download selected elements as both JSON (with metadata) and HTML files
- **Non-intrusive UI**: Control panel appears in the top-right corner of webpages

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" and select the folder containing these extension files
4. The extension will appear in your extensions list and toolbar

## How to Use

1. Navigate to any webpage
2. Look for the "DOM Element Selector" control panel in the top-right corner
3. Click "Enable Selector" to activate the tool
4. Hover over any element on the page to see it highlighted
5. Click on an element to select it (it will turn teal)
6. Click "Download Selected" to save the element
7. Use "Clear Selection" to deselect the current element
8. Click "Disable Selector" when you're done

## Downloaded Files

When you download a selected element, you'll get two files:

1. **JSON file** (`dom-element-[timestamp].json`): Contains complete element metadata including:
   - HTML content
   - Tag name, ID, and classes
   - All attributes
   - Computed CSS styles
   - Text content
   - Timestamp and source URL

2. **HTML file** (`dom-element-[timestamp].html`): Contains just the raw HTML of the element

## Files Structure

- `manifest.json` - Extension configuration
- `content.js` - Main functionality script
- `styles.css` - Styling for highlights and UI
- `popup.html` - Extension popup interface
- `README.md` - This documentation

## Technical Details

- Uses Manifest V3 for Chrome extensions
- Requires permissions: `activeTab`, `downloads`
- Works on all websites (`<all_urls>`)
- Lightweight with no external dependencies