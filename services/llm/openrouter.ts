import { LLMProvider } from "../../types";
import { ILLMService, LLMServiceConfig, ImageGenerationOptions } from "./types";

const PROVIDER_MODEL_MAP: Record<LLMProvider, string> = {
  [LLMProvider.GEMINI_3_PRO_IMAGE_PREVIEW]: "google/gemini-3-pro-image-preview",
  [LLMProvider.GEMINI_3_PRO_PREVIEW]: "google/gemini-3-pro-preview",
};

const DEFAULT_SYSTEM_INSTRUCTION = `# Role: E-Commerce Product Photography Expert

## Profile
- Description: Specialist in creating high-converting product images for online marketplaces (e.g., Amazon, Shopify).

## Mandate
1. **Platform Compliance**: Images must be high-resolution and professional, suitable for various e-commerce formats (Main Image, Lifestyle, Infographic background).
2. **Product Hero**: The product MUST be the central focus, clearly visible and occupying the majority of the frame.
3. **Context Integration**: If additional context is provided, integrate it as a supporting element that enhances the product's appeal without distraction.

## Rules
1.  **Output ONLY the final prompt text.**
2.  **Do NOT describe the product visual details** (color, shape) as it comes from the input image.
3.  **Keywords**: Commercial, High Resolution, Sharp Focus, Depth of Field, Studio Lighting, E-commerce Quality.
4.  **Composition**: Ensure natural interaction if people are involved, but keep the product as the undisputed subject.`;

const DEFAULT_USER_TEMPLATE = `# Task: Write a Commercial Image Gen Prompt

## Input Data
- **Target Scene**: "{{basePrompt}}"
- **Additional Context**: "{{customContext}}"

## Instructions
Based on the input, write a detailed, commercial-grade prompt.
- Ensure the scene highlights the product's value proposition.
- Emphasize lighting and texture for a premium, trustworthy look.
- Adapt the style to fit general e-commerce standards (clean, professional).`;

const DEFAULT_GENERATION_TEMPLATE = `Create a high-end commercial product image for e-commerce.
Reference Image: Use the provided product image as the main subject.
Scene Description: {{prompt}}.
Requirements:
- **Focus**: Sharp on the product.
- **Composition**: Product is the hero, centered and commanding attention.
- **Lighting**: Professional studio or natural commercial lighting.
Style: E-commerce Lifestyle, High Resolution, Photorealistic, Advertisement.`;

export class OpenRouterService implements ILLMService {
  private config: LLMServiceConfig;
  private provider: LLMProvider;

  constructor(config: LLMServiceConfig = {}, provider: LLMProvider = LLMProvider.GEMINI_3_PRO_IMAGE_PREVIEW) {
    this.config = config;
    this.provider = provider;
  }

  getProvider(): LLMProvider {
    return this.provider;
  }

  isAvailable(): boolean {
    const apiKey = this.config.apiKey || import.meta.env.VITE_OPENROUTER_API_KEY || (typeof process !== 'undefined' ? process.env.OPENROUTER_API_KEY : undefined);
    return !!apiKey;
  }

  private getApiKey(): string {
    const apiKey = this.config.apiKey || import.meta.env.VITE_OPENROUTER_API_KEY || (typeof process !== 'undefined' ? process.env.OPENROUTER_API_KEY : undefined);
    if (!apiKey) {
      throw new Error("OpenRouter API key not found. Please set VITE_OPENROUTER_API_KEY.");
    }
    return apiKey;
  }

  private processTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      // Replace {{key}} with value, handle multiple occurrences
      result = result.split(`{{${key}}}`).join(value);
    }
    return result;
  }

  async expandPrompt(basePrompt: string, customContext: string = ""): Promise<string> {
    const apiKey = this.getApiKey();
    const modelId = PROVIDER_MODEL_MAP[this.provider];

    const systemInstruction = this.config.expandPromptSystem || DEFAULT_SYSTEM_INSTRUCTION;
    const userTemplate = this.config.expandPromptUserTemplate || DEFAULT_USER_TEMPLATE;
    
    const userPrompt = this.processTemplate(userTemplate, {
      basePrompt,
      customContext
    });

    console.log("🔵 [Expand Prompt] Input to LLM (User Template Filled):", userPrompt);

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.href,
          "X-Title": "AmzGen",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const expandedText = data.choices[0]?.message?.content || `A professional product shot in a ${basePrompt} setting.`;
      console.log("🟢 [Expand Prompt] Output from LLM:", expandedText);
      return expandedText;
    } catch (error) {
      console.error("OpenRouter expandPrompt error:", error);
      throw new Error(`Failed to expand prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateImage(imageBase64: string, prompt: string, options?: ImageGenerationOptions): Promise<string> {
    const apiKey = this.getApiKey();
    const modelId = PROVIDER_MODEL_MAP[this.provider];
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const generationTemplate = this.config.generationPromptTemplate || DEFAULT_GENERATION_TEMPLATE;
    
    let fullPrompt = this.processTemplate(generationTemplate, { prompt });

    // Append Quality/Style Tags if provided
    if (options?.quality) {
      fullPrompt += `\nStyle/Quality: ${options.quality}`;
    }

    console.log("🎨 [Generate Image] Final Prompt to Model:", fullPrompt);

    try {
      const body: any = {
        model: modelId,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: fullPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${cleanBase64}`
                }
              }
            ]
          }
        ]
      };

      // Special handling for Gemini 3 Pro Image Preview as requested by user
      if (this.provider === LLMProvider.GEMINI_3_PRO_IMAGE_PREVIEW) {
        body.modalities = ["image", "text"];
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.href,
          "X-Title": "AmzGen",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log("OpenRouter Full Response:", data); // Debug log

      let finalContent: string | null = null;

      // Iterate through all choices to find the image content
      if (data.choices && Array.isArray(data.choices)) {
        for (const choice of data.choices) {
          // 1. Check 'message.images' (Specific structure for some Google models on OpenRouter/AI Studio)
          // Based on user log: message.images -> array of { type: "image_url", image_url: { url: "..." } }
          if (choice.message?.images && Array.isArray(choice.message.images) && choice.message.images.length > 0) {
             const firstImg = choice.message.images[0];
             if (firstImg.image_url?.url) {
                finalContent = firstImg.image_url.url;
                break;
             }
          }

          const content = choice.message?.content;
          if (content) {
             // Check for URL or Base64
             // Relaxed regex to catch URLs without extension if needed, but prioritizing standard formats
             const urlMatch = content.match(/\!\[.*?\]\((.*?)\)/) || content.match(/(https?:\/\/[^\s)]+)/i);
             if (urlMatch) {
                // Simple validation to check if it looks like a url
                if (urlMatch[1].includes("http")) {
                    finalContent = urlMatch[1];
                    break;
                }
             }
             if (content.startsWith("data:image")) {
                finalContent = content;
                break;
             }
          }
        }
      }

      if (finalContent) {
        return finalContent;
      }

      // If we reached here, we didn't find an image in any choice.
      // Check if the first choice has text content that might be an error or refusal
      const firstContent = data.choices?.[0]?.message?.content;
      if (firstContent) {
         console.warn("Model returned text instead of image:", firstContent);
         throw new Error("The selected model returned text instead of an image.");
      }

      throw new Error("No valid image content returned from OpenRouter API (checked all choices).");

    } catch (error) {
      console.error("OpenRouter generateImage error:", error);
      throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async recommendScenarios(imageBase64: string): Promise<string[]> {
    const apiKey = this.getApiKey();
    const modelId = "google/gemini-3-pro-preview"; // As requested
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const prompt = `Analyze the product image. Suggest 3 distinct, commercial e-commerce photography scenarios suitable for online marketplaces like Amazon.
    Focus on environments, lighting, and props that increase conversion rates.
    Scenarios should be diverse (e.g., studio, lifestyle, creative) but strictly professional.
    Do NOT use restricted terms like 'Amazon Choice' or 'Best Seller'.
    Output format: JSON array of strings.
    ONLY output the JSON array.`;

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.href,
          "X-Title": "AmzGen",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${cleanBase64}`
                  }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || "[]";
      
      console.log("🔍 [Recommend Scenarios] Raw Output:", content);

      // Clean markdown code blocks if present
      const jsonString = content.replace(/```json\n?|\n?```/g, '').trim();
      
      // Find array brackets
      const start = jsonString.indexOf('[');
      const end = jsonString.lastIndexOf(']');
      
      if (start !== -1 && end !== -1) {
        const jsonArray = jsonString.substring(start, end + 1);
        return JSON.parse(jsonArray);
      }
      
      return [];
    } catch (error) {
        console.error("OpenRouter recommendScenarios error:", error);
        return ["A clean studio setting with soft lighting.", "A lifestyle setting with natural sunlight.", "A professional commercial background."]; // Fallback
    }
  }

  async editImage(imageBase64: string, maskBase64: string, prompt: string): Promise<string> {
    const apiKey = this.getApiKey();
    // Using the image generation/editing capable model
    const modelId = "google/gemini-3-pro-image-preview";
    
    const cleanImageBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    const cleanMaskBase64 = maskBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    console.log("🎨 [Edit Image] Sending request to", modelId);

    try {
      const body: any = {
        model: modelId,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `Perform an inpainting/edit task on the image using the provided mask.
              The white area in the mask indicates the region to modify.
              Instruction: ${prompt}
              Return ONLY the resulting image.` },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${cleanImageBase64}`
                }
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${cleanMaskBase64}`
                }
              }
            ]
          }
        ]
      };

      // Explicitly request image modality if using Gemini Image Preview model
      if (modelId.includes("gemini-3-pro-image-preview")) {
        body.modalities = ["image", "text"];
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.href,
          "X-Title": "AmzGen",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log("OpenRouter Edit Response:", data);

      // Reuse extraction logic
      let finalContent: string | null = null;
      if (data.choices && Array.isArray(data.choices)) {
        for (const choice of data.choices) {
          if (choice.message?.images && Array.isArray(choice.message.images) && choice.message.images.length > 0) {
             const firstImg = choice.message.images[0];
             if (firstImg.image_url?.url) {
                finalContent = firstImg.image_url.url;
                break;
             }
          }
          const content = choice.message?.content;
          if (content) {
             const urlMatch = content.match(/\!\[.*?\]\((.*?)\)/) || content.match(/(https?:\/\/[^\s)]+)/i);
             if (urlMatch) {
                if (urlMatch[1].includes("http")) {
                    finalContent = urlMatch[1];
                    break;
                }
             }
             if (content.startsWith("data:image")) {
                finalContent = content;
                break;
             }
          }
        }
      }

      if (finalContent) return finalContent;
      
      // Debug info for failure
      const firstContent = data.choices?.[0]?.message?.content;
      console.warn("Failed to find image in response. Model output:", firstContent);
      
      throw new Error("No image returned for edit request. The model might have output text instead: " + (firstContent?.substring(0, 100) || "Empty response"));

    } catch (error) {
        console.error("OpenRouter editImage error:", error);
        throw new Error(`Failed to edit image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
