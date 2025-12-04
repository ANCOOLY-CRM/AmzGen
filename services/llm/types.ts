import { LLMProvider } from '../../types';

/**
 * LLM 服务配置接口
 */
export interface LLMServiceConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  
  // Prompt Templates
  expandPromptSystem?: string;
  expandPromptUserTemplate?: string;
  generationPromptTemplate?: string;
  
  [key: string]: any; // 允许额外的配置项，便于未来扩展
}

/**
 * Prompt 扩展结果
 */
export interface PromptExpansionResult {
  expandedPrompt: string;
  provider: LLMProvider;
  model?: string;
}

/**
 * 图像生成结果
 */
export interface ImageGenerationResult {
  imageUrl: string;
  provider: LLMProvider;
  model?: string;
}

export interface ImageGenerationOptions {
  quality?: string;
}

/**
 * LLM 服务接口 - 所有 LLM 提供商必须实现此接口
 */
export interface ILLMService {
  /**
   * 获取服务提供商类型
   */
  getProvider(): LLMProvider;

  /**
   * 检查服务是否可用（API 密钥是否配置等）
   */
  isAvailable(): boolean;

  /**
   * 扩展基础提示词为详细的图像生成提示词
   * @param basePrompt 基础场景描述
   * @param customContext 用户自定义上下文
   * @returns 扩展后的详细提示词
   */
  expandPrompt(basePrompt: string, customContext?: string): Promise<string>;

  /**
   * 生成产品场景图像
   * @param imageBase64 产品图像的 base64 编码
   * @param prompt 场景描述提示词
   * @param options 图像生成选项 (如尺寸)
   * @returns 生成图像的 base64 数据 URL
   */
  generateImage(imageBase64: string, prompt: string, options?: ImageGenerationOptions): Promise<string>;

  /**
   * 根据产品图片推荐场景
   * @param imageBase64 产品图片
   * @returns 推荐的场景描述列表
   */
  recommendScenarios(imageBase64: string): Promise<string[]>;

  /**
   * 编辑图像 (Inpainting)
   * @param imageBase64 原图
   * @param maskBase64 蒙版图 (黑底白字)
   * @param prompt 编辑提示词
   * @returns 编辑后的图片 URL
   */
  editImage(imageBase64: string, maskBase64: string, prompt: string): Promise<string>;
}
