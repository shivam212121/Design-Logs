# Design Tasks Log

A personal design tasks log app to track your Figma design iterations and generate weekly changelogs.

![Design Tasks Log](https://via.placeholder.com/800x450/0a0a0b/6366f1?text=Design+Tasks+Log)

## Features

- 📅 **Week-based navigation** with day pills for quick date selection
- 🖼️ **Image uploads** for rough drafts and final designs
- ✨ **Smart classification** - single image = "Created", two images = "Iterated"
- 📝 **Notes support** for context and feedback
- 📊 **Week summaries** with auto-generated changelogs
- 🗂️ **Browse all weeks** with entry statistics
- 💾 **Local storage** persistence
- 🌙 **Dark theme** with refined editorial design

## Getting Started

### Prerequisites

- Node.js 16+ installed
- npm or yarn

### Installation

1. **Clone or download this repository**

2. **Install dependencies**
   ```bash
   cd design-tasks-log
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Creating a Design Entry

1. Select a day from the week pills at the top
2. Click **"New Entry"** button
3. Enter a name for your design task
4. Upload your rough draft V1 screenshot
5. Optionally upload the final design (for iterations)
6. Add notes if needed
7. Click **"Save Entry"**

### Viewing Week Summary

1. Click **"Week Summary"** button in the header
2. View statistics for the current week
3. Copy the auto-generated changelog to clipboard

### Navigating Weeks

- Use the arrow buttons to move between weeks
- Click **"Today"** to jump to the current week
- Click **"All Weeks"** to browse and jump to any week with entries

## Project Structure

```
design-tasks-log/
├── public/
│   └── index.html
├── src/
│   ├── App.js          # Main React component
│   ├── App.css         # Styles
│   └── index.js        # Entry point
├── package.json
└── README.md
```

## Tech Stack

- React 18
- CSS3 with CSS Variables
- Local Storage for persistence
- Google Fonts (Instrument Serif, DM Sans)

## Customization

### Changing Colors

Edit the color values in `src/App.css`. Key colors:
- Background: `#0a0a0b`
- Primary accent: `#6366f1` (indigo)
- Success: `#34d399` (green for "Created")
- Text: `#e8e8e6`

### Adding Features

The app is built with a modular component structure:
- `TaskCard` - Individual task display
- `CreateTaskModal` - Entry creation form
- `TaskDetailModal` - Full task view
- `WeekSummaryModal` - Changelog generation
- `AllWeeksView` - Week browser

## License

MIT License - feel free to use and modify for your needs.

---

Built with ❤️ for designers who want to track their work
