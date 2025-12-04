import { GoogleGenAI } from "@google/genai";
import { LLMProvider } from "../../types";
import { ILLMService, LLMServiceConfig, ImageGenerationOptions } from "./types";

export const DEFAULT_SYSTEM_INSTRUCTION = `# Role: Amazon Commercial Product Photography Expert

## Profile
- Description: Specialist in creating high-converting Amazon listing images (A+ Content, Lifestyle).

## Mandate
1. **Amazon Compliance**: Images must be high-resolution, strictly professional, and suitable for e-commerce zooming.
2. **Product Hero**: The product MUST be the central focus, occupying ~75-85% of the frame.
3. **Context Integration**: If additional context (e.g., "person looking") is provided, integrate it as a supporting element that directs attention TO the product, not distracting from it.

## Rules
1.  **Output ONLY the final prompt text.**
2.  **Do NOT describe the product visual details** (color, shape) as it comes from the input image.
3.  **Keywords**: Commercial, 8k, Sharp Focus, Depth of Field (to isolate product), Studio Lighting, Amazon A+ Quality.
4.  **Composition**: If a model/person is requested, ensure they are interacting naturally (e.g., looking at, holding, using) but the focus remains locked on the product.`;

export const DEFAULT_USER_TEMPLATE = `# Task: Write a Commercial Image Gen Prompt

## Input Data
- **Target Scene**: "{{basePrompt}}"
- **Additional Context**: "{{customContext}}"

## Instructions
Based on the input, write a detailed, commercial-grade prompt.
- Ensure the scene highlights the product's value.
- If context implies a person, describe their interaction clearly (e.g., "a blurred figure in the background looking admiringly at the product").
- Emphasize lighting and texture for a premium look.`;

export const DEFAULT_GENERATION_TEMPLATE = `Create a high-end commercial product image for an Amazon listing.
Reference Image: Use the provided product image as the main subject.
Scene Description: {{prompt}}.
Requirements:
- **Focus**: Razor sharp on the product for zoom capability.
- **Composition**: Product is the hero, centered and commanding attention.
- **Lighting**: Professional studio or natural commercial lighting.
Style: Amazon A+ Lifestyle, 8k, Photorealistic, Advertisement.`;

/**
 * Gemini LLM 服务实现
 */
export class GeminiService implements ILLMService {
  private client: GoogleGenAI;
  private config: LLMServiceConfig;
  private readonly provider = LLMProvider.GEMINI_3_PRO_PREVIEW; // Defaulting to new provider for now

  constructor(config: LLMServiceConfig = {}) {
    this.config = config;
    // 优先使用配置中的 API key，然后是环境变量
    const apiKey = config.apiKey || import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : undefined);
    
    if (!apiKey) {
      console.warn("Gemini API key not found. Please set VITE_GEMINI_API_KEY in .env file or pass it via config.");
    }
    
    this.client = new GoogleGenAI({ apiKey: apiKey || "" });
  }

  getProvider(): LLMProvider {
    return this.provider;
  }

  isAvailable(): boolean {
    const apiKey = this.config.apiKey || import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : undefined);
    return !!apiKey;
  }

  private processTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.split(`{{${key}}}`).join(value);
    }
    return result;
  }

  async expandPrompt(basePrompt: string, customContext: string = ""): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error("Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in .env file.");
    }

    try {
      // 文本/多模态任务使用 pro-preview (遵循 OpenRouter 命名习惯，去除 google/ 前缀适配 SDK)
      const modelId = this.config.model || 'gemini-3-pro-preview';
      
      const systemInstruction = this.config.expandPromptSystem || DEFAULT_SYSTEM_INSTRUCTION;
      const userTemplate = this.config.expandPromptUserTemplate || DEFAULT_USER_TEMPLATE;
      
      const userPrompt = this.processTemplate(userTemplate, {
        basePrompt,
        customContext
      });

      const response = await this.client.models.generateContent({
        model: modelId,
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      return response.text || `A professional product shot in a ${basePrompt} setting.`;
    } catch (error) {
      console.error("Gemini expandPrompt error:", error);
      throw new Error(`Failed to expand prompt with Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateImage(imageBase64: string, prompt: string, options?: ImageGenerationOptions): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error("Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in .env file.");
    }

    try {
      // Clean base64 string if it has the data prefix
      const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
      
      const generationTemplate = this.config.generationPromptTemplate || DEFAULT_GENERATION_TEMPLATE;
      
      let fullPrompt = this.processTemplate(generationTemplate, { prompt });

      // Append Quality/Style Tags if provided
      if (options?.quality) {
        fullPrompt += `\nStyle/Quality: ${options.quality}`;
      }

      // 生图任务使用 pro-image-preview (遵循 OpenRouter 命名习惯，去除 google/ 前缀适配 SDK)
      const modelId = this.config.model || 'gemini-3-pro-image-preview';
      const response = await this.client.models.generateContent({
        model: modelId,
        contents: {
          parts: [
            {
              text: fullPrompt,
            },
            {
              inlineData: {
                mimeType: 'image/png',
                data: cleanBase64,
              },
            },
          ],
        },
      });

      // Extract image from response
      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        const parts = candidates[0].content.parts;
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }

      throw new Error("No image data returned from Gemini API");
    } catch (error) {
      console.error("Gemini generateImage error:", error);
      throw new Error(`Failed to generate image with Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async recommendScenarios(imageBase64: string): Promise<string[]> {
    // Placeholder implementation for GeminiService if needed, 
    // but user is primarily using OpenRouterService.
    // Implementing basic version using generateContent with image.
    if (!this.isAvailable()) {
        throw new Error("Gemini API key is not configured.");
    }

    try {
        const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
        // 多模态分析任务使用 pro-preview
        const modelId = 'gemini-3-pro-preview'; 
        
        const prompt = `Analyze the provided product image. Generate 3 distinct, high-quality commercial photography scene descriptions suitable for Amazon product listings. 
        Focus on lighting, background, and atmosphere that complements this specific product. 
        Return the result as a JSON array of strings. 
        Example: ["A minimalist wooden table...", "A sunny kitchen counter...", "A dark moody studio..."]`;

        const response = await this.client.models.generateContent({
            model: modelId,
            contents: {
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/png', data: cleanBase64 } }
                ]
            }
        });

        const text = response.text || "[]";
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    } catch (error) {
        console.error("Gemini recommendScenarios error:", error);
        return [];
    }
  }

  async editImage(imageBase64: string, maskBase64: string, prompt: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error("Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in .env file.");
    }

    try {
      const cleanImageBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
      const cleanMaskBase64 = maskBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
      
      // 编辑/Inpainting 任务使用 pro-image-preview
      const modelId = 'gemini-3-pro-image-preview';

      const fullPrompt = `Perform an inpainting/edit task on the image using the provided mask.
      The white area in the mask indicates the region to modify.
      Instruction: ${prompt}
      Return only the resulting image.`;

      const response = await this.client.models.generateContent({
        model: modelId,
        contents: {
          parts: [
            { text: fullPrompt },
            {
              inlineData: {
                mimeType: 'image/png',
                data: cleanImageBase64,
              },
            },
            {
              inlineData: {
                mimeType: 'image/png',
                data: cleanMaskBase64, // Mask as the second image
              },
            }
          ],
        },
      });

      // Extract image from response
      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        const parts = candidates[0].content.parts;
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }

      throw new Error("No image data returned from Gemini API for edit request");
    } catch (error) {
      console.error("Gemini editImage error:", error);
      throw new Error(`Failed to edit image with Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
