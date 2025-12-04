<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AmzGen - Product Scene Generator

Transform white-background products into lifestyle sales boosters with AI-powered scene generation.

## ✨ Features

- 🎨 **AI Scene Generation**: Convert product images to lifestyle scenes using Gemini 2.5
- 🔄 **Batch Processing**: Generate multiple scene variations at once
- 🎯 **Custom Presets**: Create and manage reusable scene templates
- ⚡ **Auto Background Removal**: Intelligent white background removal
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Gemini API Key ([Get one here](https://ai.google.dev/))

### Installation

1. Clone the repository
```bash
git clone [your-repo-url]
cd amzgen---product-scene-generator
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables

Create a `.env` file in the root directory:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

4. Run the app
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 🎯 How to Use

1. **Upload Product Image**: Click or drag & drop your white-background product image
2. **Select Scenes**: Choose one or more scene presets (or create custom ones)
3. **Add Context** (Optional): Provide additional context like "Add a cup of coffee"
4. **Generate**: Click "Generate Scenes" and wait for AI magic
5. **Download**: Save your generated lifestyle images

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **AI Model**: Google Gemini 2.5 (Flash & Flash-Image)
- **UI Components**: Lucide React Icons
- **Styling**: Tailwind CSS (utility classes)

### Project Structure

```
amzgen---product-scene-generator/
├── App.tsx                 # Main application component
├── components/             # Reusable UI components
│   ├── Sidebar.tsx
│   └── ResultCard.tsx
├── services/              # AI service layer
│   └── llm/              # LLM adapter architecture
│       ├── types.ts      # Service interfaces
│       ├── factory.ts    # Service factory
│       ├── gemini.ts     # Gemini implementation
│       └── index.ts      # Public exports
├── types.ts              # Global type definitions
├── utils.ts              # Utility functions
└── vite.config.ts        # Vite configuration
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GEMINI_API_KEY` | Your Gemini API key | Yes |

### Customization

- **Scene Presets**: Manage in Settings → Scenario Library
- **Background Removal**: Toggle in upload section or Settings → Generation Preferences

## 📖 API Usage

### Extend Prompt

```typescript
import { expandPrompt } from './services/llm';

const detailedPrompt = await expandPrompt(
  'A minimalist studio setting',
  'Add warm lighting'
);
```

### Generate Scene

```typescript
import { generateProductScene } from './services/llm';

const sceneImage = await generateProductScene(
  productImageBase64,
  detailedPrompt
);
```

## 🔌 Extensibility

The project uses an **adapter pattern** for LLM services, making it easy to add new AI models:

1. Implement the `ILLMService` interface
2. Add your service to the factory
3. No changes needed in business logic

See `services/llm/README.md` for detailed extension guide.

## 🧪 Development

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 📝 Documentation

- [Product Business Documentation](./PRODUCT_BUSINESS.md) - Detailed business logic and workflows
- [LLM Adapter Architecture](./services/llm/README.md) - Technical architecture and extension guide

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Powered by [Google Gemini](https://ai.google.dev/)
- Built for Amazon Sellers

---

**AmzGen Version 1.0.2** • Secured by Google Gemini
