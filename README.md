# AI Tab Manager

AI Tab Manager is an intelligent Chrome extension that helps you organize, search, and clean up your tabs using AI. Never get lost in tab chaos again!

## Features

- **Intelligent Tab Organization**: Automatically group related tabs by content and topic
- **Smart Tab Cleanup**: Get suggestions for tabs you haven't visited in a while or duplicate tabs
- **Natural Language Search**: Find tabs using natural language (e.g., "find the budget spreadsheet")
- **Tab Analytics**: Insights into your tab usage patterns
- **Save Tab Sessions**: Store and restore groups of tabs for later use

## Installation

### From Chrome Web Store (Coming Soon)

1. Visit the Chrome Web Store
2. Search for "AI Tab Manager"
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked" and select the `dist` folder after building the extension
5. The extension should now be installed and visible in your toolbar

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ai-tab-manager.git
   cd ai-tab-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Build the extension:
   ```bash
   npm run build
   # or
   yarn build
   ```

4. For development with live reloading:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

### Project Structure

- `/src`: Source code
  - `/background`: Background script
  - `/content`: Content script
  - `/popup`: Extension popup UI
  - `/dashboard`: Dashboard page
  - `/components`: Reusable React components
  - `/models`: Data models and AI functionality
  - `/utils`: Utility functions
- `/dist`: Built extension (generated after build)
- `/icons`: Extension icons

## How It Works

AI Tab Manager analyzes your tabs using natural language processing to understand their content and how they relate to each other. It keeps track of your tab usage patterns to provide smart suggestions for organization and cleanup.

The extension can be used passively (where it just makes suggestions) or actively (where you use the dashboard and commands to manage tabs).

## Privacy

AI Tab Manager processes all data locally in your browser. No tab content or browsing history is sent to external servers. Some anonymous usage statistics may be collected to improve the extension, but this can be disabled in settings.

## License

MIT License

## Contributions

Contributions are welcome! Feel free to submit issues and pull requests.

## Contact

For support or inquiries, please open an issue on GitHub. 