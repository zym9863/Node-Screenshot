# Node Screenshot Extension

English | [简体中文](./README.md)

A simple and easy-to-use Chrome browser extension that allows users to select and capture screenshots of specific DOM elements on web pages.

## Features

- 🎯 Precise Selection: Hover highlighting of page elements for easy target node selection
- 📸 Accurate Screenshots: Automatically capture screenshots of selected elements
- 📋 Easy Copying: Copy screenshots to clipboard with one click
- 💾 Quick Saving: Download screenshots directly to local storage
- 🖥️ High DPI Support: Compatible with high-resolution displays
- 🎨 Tech-inspired UI: Space exploration themed user interface

## Installation

### Developer Mode Installation

1. Clone or download this repository to your local machine
2. Open Chrome browser and navigate to the extensions management page: `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked extension"
5. Select the project folder

## Usage

1. Click the extension icon in the browser toolbar to open the popup
2. After the popup opens, moving your mouse over elements on the webpage will display a highlight border
3. Click on the element you want to capture
4. Preview the screenshot in the popup
5. Click the "Copy" button to copy the screenshot to clipboard
6. Click the "Download" button to save the screenshot locally

## Technical Implementation

### File Structure

- `manifest.json`: Extension configuration file
- `popup.html`: Popup interface HTML
- `popup.js`: Popup interface interaction logic
- `popup_styles.css`: Popup styles
- `content.js`: Content script, handles page element selection
- `background.js`: Background script, handles screenshot logic
- `style.css`: Content script injected styles for highlighting elements

### How It Works

1. **Element Selection**:
   - When the user clicks the extension icon, `popup.js` sends a start selection message to `content.js` on the current page
   - `content.js` listens for mouse events and highlights elements as the mouse hovers over them
   - After the user clicks an element, `content.js` gets the element's position information

2. **Screenshot Processing**:
   - `content.js` sends the element position information to `background.js`
   - `background.js` uses Chrome API to capture a screenshot of the entire visible page
   - Screenshot data and element position information are stored in local storage

3. **Image Processing and Display**:
   - `popup.js` reads screenshot data and element position from local storage
   - Uses Canvas API to crop the selected element portion
   - Displays the cropped screenshot in the popup
   - Provides copy and download functionality

## Browser Compatibility

- Chrome 88+
- Chromium-based browsers (such as Edge, Opera, etc.)

## Permissions

This extension requires the following permissions:

- `activeTab`: Access to the current tab
- `scripting`: Inject and execute scripts
- `storage`: Store screenshot data
- `host_permissions`: Allow running on all websites

## License

MIT License

## Contribution Guidelines

Issues and improvement suggestions are welcome!

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
