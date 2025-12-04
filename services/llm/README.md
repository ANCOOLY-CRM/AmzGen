# LLM 服务适配器架构文档

## 📋 概述

本目录实现了**灵活可扩展的 LLM 适配器架构**，当前使用 Gemini 作为主要 AI 模型，同时保留了接口抽象，便于未来快速接入其他模型。

## 🎯 设计理念

### 核心原则
1. **简单优先**: 当前只需要 Gemini，不过度设计
2. **保留弹性**: 通过适配器模式保留扩展能力
3. **易于维护**: 清晰的接口定义和工厂模式

### 架构优势
- ✅ 统一的服务接口，代码调用方式一致
- ✅ 工厂模式管理实例，便于配置和测试
- ✅ 低耦合设计，未来添加新模型无需修改业务代码
- ✅ 便捷函数封装，简化调用

---

## 🏗️ 架构设计

### 核心组件

```
services/llm/
├── types.ts          # 接口定义（适配器接口）
├── factory.ts        # 工厂类（服务实例管理）
├── gemini.ts         # Gemini 服务实现
└── index.ts          # 统一导出
```

### 接口定义

```typescript
// ILLMService - 所有 LLM 服务的统一接口
interface ILLMService {
  getProvider(): LLMProvider;
  isAvailable(): boolean;
  expandPrompt(basePrompt: string, customContext?: string): Promise<string>;
  generateImage(imageBase64: string, prompt: string): Promise<string>;
}
```

---

## 💡 当前实现

### 支持的模型

| 模型 | 状态 | 功能 |
|------|------|------|
| Gemini 2.5 | ✅ 完全实现 | 提示词扩展 + 图像生成 |

### 技术栈
- **Gemini API**: `@google/genai` SDK
- **模型**:
  - `gemini-2.5-flash`: 文本生成（提示词扩展）
  - `gemini-2.5-flash-image`: 图像生成

---

## 🚀 使用指南

### 1. 基本使用

```typescript
import { expandPrompt, generateProductScene } from './services/llm';

// 提示词扩展
const prompt = await expandPrompt(
  'A minimalist studio setting',
  'Add a cup of coffee'
);

// 图像生成
const image = await generateProductScene(
  imageBase64,
  prompt
);
```

### 2. 使用工厂类

```typescript
import { LLMServiceFactory } from './services/llm';

// 获取服务实例
const service = LLMServiceFactory.getService();

// 检查服务是否可用
if (service.isAvailable()) {
  const prompt = await service.expandPrompt('Scene description');
}

// 配置服务
LLMServiceFactory.registerConfig({
  apiKey: 'your-api-key',
  model: 'gemini-2.5-flash',
});
```

### 3. 环境变量配置

在 `.env` 文件中配置：

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🔧 扩展新模型

当需要添加新的 LLM 模型时，按以下步骤操作：

### 步骤 1: 添加模型枚举

编辑 `../../types.ts`:

```typescript
export enum LLMProvider {
  GEMINI = 'Gemini 2.5',
  CUSTOM = 'Custom Model', // 新增
}
```

### 步骤 2: 实现服务适配器

创建 `custom.ts`:

```typescript
import { LLMProvider } from "../../types";
import { ILLMService, LLMServiceConfig } from "./types";

export class CustomService implements ILLMService {
  private config: LLMServiceConfig;
  private readonly provider = LLMProvider.CUSTOM;

  constructor(config: LLMServiceConfig = {}) {
    this.config = config;
  }

  getProvider(): LLMProvider {
    return this.provider;
  }

  isAvailable(): boolean {
    // 检查 API 密钥等
    return !!this.config.apiKey;
  }

  async expandPrompt(basePrompt: string, customContext?: string): Promise<string> {
    // 实现提示词扩展逻辑
    // ...
  }

  async generateImage(imageBase64: string, prompt: string): Promise<string> {
    // 实现图像生成逻辑
    // ...
  }
}
```

### 步骤 3: 更新工厂类

编辑 `factory.ts`:

```typescript
import { CustomService } from "./custom";

// 在 getService 方法中添加：
switch (provider) {
  case LLMProvider.GEMINI:
    service = new GeminiService(this.config);
    break;
  
  case LLMProvider.CUSTOM:
    service = new CustomService(this.config);
    break;
  
  default:
    service = new GeminiService(this.config);
}
```

### 步骤 4: 导出新服务

编辑 `index.ts`:

```typescript
export { CustomService } from './custom';
```

完成！新模型已集成，无需修改业务代码。

---

## 📖 API 参考

### LLMServiceFactory

**静态方法**:

#### `registerConfig(config: LLMServiceConfig): void`
注册服务配置，会清除已存在的实例。

```typescript
LLMServiceFactory.registerConfig({
  apiKey: 'your-api-key',
  model: 'gemini-2.5-flash',
});
```

#### `getService(provider?: LLMProvider): ILLMService`
获取服务实例（单例模式）。

```typescript
const service = LLMServiceFactory.getService();
```

#### `isServiceAvailable(provider?: LLMProvider): boolean`
检查服务是否可用。

```typescript
if (LLMServiceFactory.isServiceAvailable()) {
  // 服务可用
}
```

#### `clearInstance(): void`
清除缓存的实例。

```typescript
LLMServiceFactory.clearInstance();
```

#### `getAvailableProviders(): LLMProvider[]`
获取当前支持的提供商列表。

```typescript
const providers = LLMServiceFactory.getAvailableProviders();
// 返回: [LLMProvider.GEMINI]
```

### 便捷函数

#### `expandPrompt(basePrompt: string, customContext?: string): Promise<string>`
扩展基础提示词为详细的图像生成提示词。

**参数**:
- `basePrompt`: 基础场景描述
- `customContext`: 自定义上下文（可选）

**返回**: 扩展后的详细提示词

#### `generateProductScene(imageBase64: string, prompt: string): Promise<string>`
生成产品场景图像。

**参数**:
- `imageBase64`: 产品图像的 base64 编码
- `prompt`: 场景描述提示词

**返回**: 生成图像的 base64 数据 URL

---

## 🔐 配置选项

### LLMServiceConfig

```typescript
interface LLMServiceConfig {
  apiKey?: string;      // API 密钥
  baseUrl?: string;     // API 基础 URL（可选）
  model?: string;       // 模型 ID（可选）
  [key: string]: any;   // 其他自定义配置
}
```

---

## 💡 最佳实践

### 1. 环境变量优先
```typescript
// 优先使用环境变量
const apiKey = config.apiKey || import.meta.env.VITE_GEMINI_API_KEY;
```

### 2. 错误处理
```typescript
try {
  const prompt = await expandPrompt(basePrompt);
} catch (error) {
  console.error('Failed to expand prompt:', error);
  // 提供降级方案
}
```

### 3. 可用性检查
```typescript
if (!service.isAvailable()) {
  throw new Error('Gemini API key not configured');
}
```

---

## 🎯 设计模式

### 1. 适配器模式 (Adapter Pattern)
- 统一不同 LLM 提供商的接口
- 每个提供商实现 `ILLMService` 接口

### 2. 工厂模式 (Factory Pattern)
- 统一管理服务实例创建
- 支持配置注入和实例缓存

### 3. 单例模式 (Singleton Pattern)
- 每个提供商只创建一个实例
- 节省资源，提高性能

---

## 📊 性能优化

1. **实例缓存**: 工厂类缓存服务实例，避免重复创建
2. **懒加载**: 只在需要时创建服务实例
3. **配置复用**: 支持配置注册，避免重复配置

---

## 🧪 测试建议

### 单元测试

```typescript
describe('LLMServiceFactory', () => {
  it('should return Gemini service by default', () => {
    const service = LLMServiceFactory.getService();
    expect(service.getProvider()).toBe(LLMProvider.GEMINI);
  });

  it('should check service availability', () => {
    const isAvailable = LLMServiceFactory.isServiceAvailable();
    expect(typeof isAvailable).toBe('boolean');
  });
});
```

### 集成测试

```typescript
describe('expandPrompt', () => {
  it('should expand prompt successfully', async () => {
    const result = await expandPrompt('Minimalist studio', 'Add coffee');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});
```

---

## 🐛 故障排除

### API 密钥错误
```
Error: Gemini API key is not configured
```
**解决**: 在 `.env` 文件中设置 `VITE_GEMINI_API_KEY`

### 模型不可用
```
Error: No image data returned from Gemini API
```
**解决**: 
- 检查网络连接
- 验证 API 密钥是否有效
- 确认使用的模型 ID 正确

---

## 📚 相关资源

- [Gemini API 文档](https://ai.google.dev/docs)
- [适配器模式详解](https://refactoring.guru/design-patterns/adapter)
- [工厂模式详解](https://refactoring.guru/design-patterns/factory-method)

---

## 🔄 版本历史

- **v2.0** (当前): 简化架构，只保留 Gemini + 适配器接口
- **v1.0**: 多模型架构（Gemini + OpenRouter + GPT-4 + Claude + DeepSeek）

---

*最后更新: 2024*
