import { LLMProvider } from "../../types";
import { ILLMService, LLMServiceConfig, ImageGenerationOptions } from "./types";
import { OpenRouterService } from "./openrouter";

/**
 * LLM 服务工厂类
 * 负责创建和管理 LLM 服务实例
 */
export class LLMServiceFactory {
  private static instances: Map<LLMProvider, ILLMService> = new Map();
  private static config: LLMServiceConfig = {};

  static registerConfig(config: LLMServiceConfig): void {
    this.config = config;
    this.instances.clear();
  }

  static getService(provider: LLMProvider = LLMProvider.GEMINI_3_PRO_IMAGE_PREVIEW): ILLMService {
    if (this.instances.has(provider)) {
      return this.instances.get(provider)!;
    }

    // Create OpenRouter Service with the specific provider
    const service = new OpenRouterService(this.config, provider);
    
    this.instances.set(provider, service);
    return service;
  }

  static isServiceAvailable(provider: LLMProvider = LLMProvider.GEMINI_3_PRO_IMAGE_PREVIEW): boolean {
    try {
      const service = this.getService(provider);
      return service.isAvailable();
    } catch (error) {
      return false;
    }
  }
}

/**
 * 便捷函数：扩展提示词
 */
export async function expandPrompt(
  basePrompt: string,
  provider: LLMProvider, 
  customContext: string = ""
): Promise<string> {
  const service = LLMServiceFactory.getService(provider);
  return await service.expandPrompt(basePrompt, customContext);
}

/**
 * 便捷函数：生成产品场景图像
 */
export async function generateProductScene(
  imageBase64: string,
  prompt: string,
  provider: LLMProvider,
  options?: ImageGenerationOptions
): Promise<string> {
  const service = LLMServiceFactory.getService(provider);
  return await service.generateImage(imageBase64, prompt, options);
}

/**
 * 便捷函数：推荐场景
 */
export async function recommendScenarios(
  imageBase64: string,
  provider: LLMProvider
): Promise<string[]> {
  const service = LLMServiceFactory.getService(provider);
  return await service.recommendScenarios(imageBase64);
}
