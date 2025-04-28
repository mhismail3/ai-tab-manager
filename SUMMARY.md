# AI Tab Manager - Project Summary

This project is a production-ready Chrome extension that helps users manage tabs intelligently using AI to organize, search, and clean up tabs.

## Key Features

1. **Intelligent Tab Organization**: Automatically groups related tabs based on content similarity and domain patterns. The extension analyzes tab titles, URLs, and page content to create logical groups.

2. **Smart Tab Cleanup**: Identifies tabs that haven't been used for extended periods and suggests archiving or closing them to reduce clutter.

3. **Natural Language Search**: Enables finding tabs using natural language queries instead of just exact keyword matching.

4. **Tab Analytics**: Provides insights into tab usage patterns, showing statistics about tab behavior.

5. **Tab Session Management**: Allows saving and restoring groups of tabs for later use.

## Project Structure

- **UI Components**:
  - Popup interface for quick actions
  - Full dashboard for comprehensive tab management
  - Tab Group view for managing Chrome tab groups

- **Core Functionality**:
  - Tab classification using AI/ML techniques
  - Tab activity tracking
  - Tab storage system
  - Background processing

## Technical Stack

- **Frontend**: React for UI components
- **State Management**: React hooks and Chrome storage API
- **Build System**: Webpack with Babel
- **AI/ML**: TensorFlow.js (prepared but not fully implemented in this demo)
- **APIs**: Chrome Extensions API (tabs, storage, tabGroups)

## Implementation Details

1. **Background Service Worker (src/background/index.js)**:
   - Tracks tab activity
   - Manages tab groups
   - Processes organization requests
   - Handles data persistence

2. **Content Script (src/content/index.js)**:
   - Extracts metadata from web pages
   - Monitors page content changes
   - Communicates with background script

3. **UI Components**:
   - Popup (src/popup/): Quick access interface
   - Dashboard (src/dashboard/): Full management interface
   - TabGroup View (src/tabGroupView/): Group management

4. **Models**:
   - tabClassifier.js: Handles tab categorization
   - tabStorage.js: Manages saved tab groups
   - tabActivity.js: Tracks tab usage patterns

## Features for Future Expansion

1. **Cloud Sync**: Synchronize saved tab groups across devices
2. **Advanced AI**: Implement more sophisticated machine learning models for better tab categorization
3. **Workspace Management**: Add workspace concepts for different projects or contexts
4. **Custom Rules**: Allow users to define their own organization rules
5. **Integration**: Connect with productivity tools like calendars and task managers

## Development

The project is set up for easy development with:
- Hot reloading for development
- Production build script
- Comprehensive documentation

To build the extension:
```bash
./build.sh
```

To run in development mode:
```bash
npm run dev
``` 