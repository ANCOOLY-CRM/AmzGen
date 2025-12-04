# AmzGen Project Business Logic Documentation

## 1. Project Overview
**AmzGen** is an AI-powered tool designed for e-commerce sellers (specifically Amazon sellers) to transform simple white-background product photos into high-quality, lifestyle marketing images. It eliminates the need for expensive physical photo shoots by using Generative AI (Google Gemini) to virtually place products into realistic scenes.

## 2. Core User Workflow
The application follows a linear, step-by-step workflow for the user:

1.  **Upload Product**:
    *   User selects a product image (typically a PNG/JPG with a white background).
    *   **Logic**: The app immediately creates a local preview. Optionally (and by default), it triggers a background removal process to ensure the product can be cleanly composited.

2.  **Configuration**:
    *   **Model Selection**: User chooses the AI model (e.g., Gemini 2.5).
    *   **Scenario Selection (Presets)**: User selects one or multiple "Scenarios" (Vibes). These are pre-defined prompt templates (e.g., "Minimalist Studio", "Rustic Outdoor").
        *   *Multi-select Support*: Users can select multiple presets to generate a batch of varied images at once.
    *   **Additional Context**: User can input free-text (e.g., "Add a coffee cup next to it") to customize the generation.

3.  **Generation Trigger**:
    *   User clicks "Generate".
    *   The system processes each selected preset sequentially or in parallel (currently implemented sequentially in the loop).

4.  **Results & Output**:
    *   Generated images appear in a grid.
    *   Each card shows the result, the "vibe" used, and allows downloading the high-res image.

## 3. Technical Logic Breakdown

### A. Image Pre-processing (`utils.ts`)
*   **Background Removal**: Before sending the image to the AI for scene generation, the system often needs to remove the existing white background to prevent "white box" artifacts.
*   **Base64 Conversion**: Images are converted to Base64 strings for transmission to the LLM API.

### B. The "Art Director" Agent (Prompt Engineering)
This is the core "secret sauce" of the business logic, located in `services/llm/gemini.ts`.

Instead of sending the raw preset description directly to the image generator, the system uses a **two-step LLM process**:

1.  **Step 1: Prompt Expansion (Text-to-Text)**
    *   **Role**: The LLM acts as an "Expert Product Photography Art Director".
    *   **Input**: The raw preset description (e.g., "Minimalist Studio") + User's custom context.
    *   **Goal**: To rewrite this into a highly detailed, technical prompt suitable for an image generation model.
    *   **Constraint**: It is instructed to focus *only* on background, lighting, composition, and mood, treating the input image as the "main subject".
    *   **Output**: A refined, professional prompt (e.g., "Soft diffused window lighting, marble countertop, depth of field...").

2.  **Step 2: Scene Generation (Image-to-Image / Multimodal)**
    *   **Input**: The pre-processed product image (Base64) + The *Expanded Prompt* from Step 1.
    *   **Logic**: The LLM (Gemini 2.5) generates a new image where the product is composited into the described scene.
    *   **Key Parameter**: The prompt emphasizes "commercial advertisement" quality and "photorealistic" style.

### C. Preset Management System
*   **Data Structure**: Presets have an `id`, `name`, and `description`.
*   **CRUD Operations**: Users can create new presets, edit existing ones, and delete them.
*   **Storage**: Currently managed in the application state (React `useState`). *Note: For a production version, this would need persistence (Local Storage or Backend).*

### D. API & Security
*   **Client-Side Key Management**: To keep the app lightweight and serverless (initially), the Google Gemini API Key is stored in the user's browser `localStorage`.
*   **Privacy**: The key is never sent to a backend server owned by AmzGen; it goes directly from the client browser to Google's API.

## 4. Data Models (`types.ts`)

*   **`ScenarioPreset`**: Defines a reusable scene template.
*   **`GeneratedImage`**: Represents a completed output, linking the result URL back to the prompt and vibe that created it.
*   **`ProcessingState`**: Tracks the UI state (Idle -> Expanding Prompt -> Generating -> Completed) to provide granular progress updates to the user.

## 5. Business Value Indicators
*   **Efficiency**: Batch generation allows testing multiple marketing angles in seconds.
*   **Cost**: "Credits" are simulated in the UI (mock data currently) but represent a business model where users pay per generation.
*   **Quality Control**: The "Prompt Expansion" step ensures that even simple user inputs result in high-quality, professional-looking outputs.

