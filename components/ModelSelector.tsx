import React from 'react';
import { LLMProvider } from '../types';
import { Sparkles, ChevronDown, Check, Zap, Banana, Brain, Terminal } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: LLMProvider;
  onSelect: (model: LLMProvider) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onSelect }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getModelIcon = (provider: LLMProvider) => {
    switch (provider) {
      case LLMProvider.GEMINI_3_PRO_IMAGE_PREVIEW:
        return <Banana className="w-4 h-4 text-yellow-500" />;
      case LLMProvider.GEMINI_3_PRO_PREVIEW:
        return <Sparkles className="w-4 h-4 text-blue-500" />;
      default:
        return <Zap className="w-4 h-4 text-gray-500" />;
    }
  };

  const getModelDescription = (provider: LLMProvider) => {
    switch (provider) {
      case LLMProvider.GEMINI_3_PRO_IMAGE_PREVIEW:
        return "Nano Banana Pro (图像生成)";
      case LLMProvider.GEMINI_3_PRO_PREVIEW:
        return "Gemini 3 Pro 预览版 (文本)";
      default:
        return "标准模型";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">AI 模型</label>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3 bg-white border rounded-xl text-left transition-all shadow-sm
          ${isOpen ? 'border-primary ring-1 ring-primary' : 'border-gray-200 hover:border-gray-300'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
            {getModelIcon(selectedModel)}
          </div>
          <div>
            <div className="font-medium text-gray-900 text-sm">{selectedModel}</div>
            <div className="text-xs text-gray-500">{getModelDescription(selectedModel)}</div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden animate-fadeIn">
          <div className="p-1">
            {Object.values(LLMProvider).map((provider) => {
              const isSelected = selectedModel === provider;
              return (
                <button
                  key={provider}
                  onClick={() => {
                    onSelect(provider);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors
                    ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
                      {getModelIcon(provider)}
                    </div>
                    <div className="text-left">
                      <div className={`text-sm ${isSelected ? 'font-semibold text-blue-700' : 'font-medium text-gray-700'}`}>
                        {provider}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              );
            })}
          </div>
          <div className="bg-gray-50 p-2 text-[10px] text-gray-400 text-center border-t border-gray-100">
            由 OpenRouter 提供支持
          </div>
        </div>
      )}
    </div>
  );
};
