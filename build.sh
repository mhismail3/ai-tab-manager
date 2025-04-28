#!/bin/bash
# Build script for AI Tab Manager Chrome Extension

echo "Building AI Tab Manager extension..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not installed. Please install Node.js and try again."
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "Error: npm is required but not installed. Please install npm and try again."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Create dist directory if it doesn't exist
mkdir -p dist

# Convert SVG icons to PNG
echo "Converting icons..."
if command -v convert &> /dev/null; then
    mkdir -p dist/icons
    for size in 16 32 48 128; do
        echo "Converting icon$size.svg to icon$size.png..."
        convert icons/icon$size.svg dist/icons/icon$size.png
    done
else
    echo "Warning: ImageMagick's 'convert' tool not found. Copying SVG icons instead."
    mkdir -p dist/icons
    cp icons/*.svg dist/icons/
fi

# Build the extension with webpack
echo "Building extension with webpack..."
npm run build

# Verify build
if [ -f "dist/popup.js" ] && [ -f "dist/background.js" ]; then
    echo "Build completed successfully!"
    echo ""
    echo "To install the extension in Chrome:"
    echo "1. Open Chrome and navigate to chrome://extensions/"
    echo "2. Enable Developer mode (toggle in the top right)"
    echo "3. Click 'Load unpacked' and select the 'dist' folder"
    echo ""
    echo "Enjoy using AI Tab Manager!"
else
    echo "Error: Build failed. Check for errors above."
    exit 1
fi 