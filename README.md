# Social Qoute Generator

A Next.js application for generating beautiful social media quote images with customizable text and backgrounds.

## Features

- **Batch Quote Generation**: Add multiple quotes at once and generate them all together
- **Image Upload**: Upload custom background images for each quote
- **HEIC Support**: Automatically converts iPhone HEIC/HEIF images to JPEG
- **Smart Image Cropping**: Uses smartcrop.js AI to intelligently crop images, focusing on faces and areas of interest
- **Quote Text Input**: Add your inspirational quotes
- **Word Highlighting**: Highlight specific words with customizable colors
- **Custom Highlight Color**: Choose any color for highlighted words with a color picker
- **Global Artist Name**: Set an artist name that appears on all generated quotes
- **Persistent Settings**: Artist name and highlight color are saved in your browser
- **Add/Remove Quotes**: Dynamically add or remove quote inputs before generation
- **Batch Download**: Download all generated quotes at once or individually
- **Individual Downloads**: Download each generated quote as a PNG image

## Design Template

The generated quotes follow this design:

- Large quotation marks positioned at the start of text
- Centered, bold quote text in white (positioned at bottom)
- Optional word highlighting in your chosen color (default: orange #FF8C00)
- Artist name at the bottom
- Gradient overlay (transparent top 30%, dark bottom 70%) on the background image

## Getting Started

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Usage

### Quick Start

1. **Configure Settings**:
   - Enter your artist name (saved automatically for future use)
   - (Optional) Choose a custom highlight color (defaults to orange #FF8C00)
2. **Add Quotes**: Use the "+ Add New Quote" button to add multiple quotes
3. **For Each Quote**:
   - Upload a background image (supports HEIC, JPEG, PNG, etc.)
   - Enter your quote text
   - (Optional) Enter a word to highlight with your chosen color
4. **Generate All**: Click "Generate All Quotes" to create all images at once
5. **Download**:
   - Click "Download All" to download all quotes at once
   - Or click individual "Download Quote #X" buttons for specific quotes

### Adding Multiple Quotes

- Click **"+ Add New Quote"** to add additional quote inputs
- Each quote can have its own image, text, and highlighted word
- Remove unwanted quotes by clicking the **"✕ Remove"** button
- The app will only generate quotes that have both text and an image

### Batch Operations

- **Generate All Quotes**: Processes all valid quote inputs at once using smart cropping
- **Download All**: Downloads all generated quotes with a 500ms delay between each (to prevent browser blocking)
- Generated quotes are numbered sequentially (quote-1.png, quote-2.png, etc.)

## Technology Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- HTML5 Canvas API
- smartcrop.js - AI-powered image cropping
- heic2any - HEIC/HEIF to JPEG conversion

## Smart Cropping

This app uses **smartcrop.js** to intelligently analyze and crop images. The algorithm:

- Detects faces and important subjects
- Analyzes edge detection and color saturation
- Finds the most visually interesting area
- Ensures the crop focuses on people rather than background

This means your photos will always be cropped optimally, keeping the subject in frame!

## iPhone HEIC Support

The app automatically handles HEIC/HEIF images from iPhones:

### What is HEIC?

HEIC (High Efficiency Image Container) is the default photo format on iPhones since iOS 11. It provides better compression than JPEG while maintaining image quality.

### How It Works

1. **Automatic Detection**: The app detects HEIC/HEIF files by file extension and MIME type
2. **Real-time Conversion**: Uses `heic2any` to convert HEIC to JPEG in the browser
3. **High Quality**: Converts at 90% quality to maintain image fidelity
4. **Seamless Experience**: Conversion happens automatically - no extra steps needed

### Supported Formats

- `.heic` / `.heif` (iPhone photos)
- `.jpg` / `.jpeg` (Standard)
- `.png` (Standard)
- `.webp` (Modern format)
- All standard image formats

Just upload your iPhone photos directly - the app handles the rest!

## Persistent Settings

Your preferences are automatically saved in your browser's localStorage:

### What Gets Saved

- **Artist Name**: Your configured artist name
- **Highlight Color**: Your chosen color for highlighted words

### How It Works

1. **Auto-Save**: Settings save immediately when you change them
2. **Auto-Load**: Settings restore automatically when you return to the app
3. **No Account Needed**: All data stays in your browser
4. **Per-Browser**: Settings are specific to each browser/device

### Clear Settings

To reset to defaults:

1. Open browser console (F12)
2. Run: `localStorage.clear()`
3. Refresh the page

## License

MIT
