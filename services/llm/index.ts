/**
 * LLM 服务模块统一导出
 */

export * from './types';
export { GeminiService, DEFAULT_SYSTEM_INSTRUCTION, DEFAULT_USER_TEMPLATE, DEFAULT_GENERATION_TEMPLATE } from './gemini';
export { LLMServiceFactory, expandPrompt, generateProductScene, recommendScenarios } from './factory';
