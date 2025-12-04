export enum LLMProvider {
  GEMINI_3_PRO_IMAGE_PREVIEW = 'Nano Banana Pro',
  GEMINI_3_PRO_PREVIEW = 'Gemini 3 Pro Preview',
}

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string; // The "premade words" or template (Base Prompt for Expansion)
  quality: string; // Quality/Style tags (e.g. "4k, photorealistic")
  icon?: string;
  isRecommended?: boolean;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  vibe: string; // Changed from enum to string to support custom names
  timestamp: number;
}

export interface ProcessingState {
  step: 'IDLE' | 'EXPANDING_PROMPT' | 'GENERATING_IMAGE' | 'COMPLETED' | 'ERROR' | 'ANALYZING_IMAGE';
  message: string;
}

export interface GlobalPromptSettings {
  expandPromptSystem: string;
  expandPromptUserTemplate: string;
  generationPromptTemplate: string;
}
