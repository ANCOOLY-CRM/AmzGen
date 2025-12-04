import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ResultCard } from './components/ResultCard';
import { ImageEditorModal } from './components/ImageEditorModal';
import { ModelSelector } from './components/ModelSelector';
import { LLMProvider, ScenarioPreset, ProcessingState, GeneratedImage, GlobalPromptSettings } from './types';
import { LLMServiceFactory, expandPrompt, generateProductScene, recommendScenarios, DEFAULT_SYSTEM_INSTRUCTION, DEFAULT_USER_TEMPLATE, DEFAULT_GENERATION_TEMPLATE } from './services/llm';
import { removeWhiteBackground, fileToBase64 } from './utils';
import { Upload, Sparkles, Wand2, Loader2, Image as ImageIcon, AlertCircle, Layers, Shield, Plus, Trash2, Edit2, Save, X, Check, Key, Lock, Eye, EyeOff, BrainCircuit, Info } from 'lucide-react';

// Default Presets Data
const DEFAULT_PRESETS: ScenarioPreset[] = [
  { 
    id: 'minimalist', 
    name: 'Minimalist Studio', 
    description: 'A clean, high-end studio setting with soft, diffused lighting and a neutral beige or white background. Minimal props, focus entirely on the product elegance.',
    quality: 'High quality, 8k, commercial photography, soft lighting'
  },
];

const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'generator' | 'settings'>('generator');

  // Generator State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeBg, setRemoveBg] = useState<boolean>(true);
  
  // Dynamic Presets State
  const [presets, setPresets] = useState<ScenarioPreset[]>(DEFAULT_PRESETS);
  // Temporary AI recommendations that are shown in the UI but not persisted to the main library
  const [aiRecommendations, setAiRecommendations] = useState<ScenarioPreset[]>([]);
  
  // Combined list for display (system presets + AI recommendations)
  const displayPresets = [...presets, ...aiRecommendations];

  // Changed to array for multi-select
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([DEFAULT_PRESETS[0].id]);

  const [customContext, setCustomContext] = useState<string>('');
  
  const [processingState, setProcessingState] = useState<ProcessingState>({ step: 'IDLE', message: '' });
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  // Settings / Edit State
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [newPresetQuality, setNewPresetQuality] = useState('High quality, photorealistic, 8k');
  const [isAddingPreset, setIsAddingPreset] = useState(false);

  // API Key State
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);

  // Image Editor State
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);
  const [isEditorProcessing, setIsEditorProcessing] = useState(false);

  // Advanced Prompt Settings
  const [promptSettings, setPromptSettings] = useState<GlobalPromptSettings>({
    expandPromptSystem: DEFAULT_SYSTEM_INSTRUCTION,
    expandPromptUserTemplate: DEFAULT_USER_TEMPLATE,
    generationPromptTemplate: DEFAULT_GENERATION_TEMPLATE, // Keep as fallback default
  });

  // Sync settings with LLM Service
  useEffect(() => {
    const config: any = {
      apiKey: customApiKey || undefined, // Pass undefined if empty so it might fallback to env? No, existing logic handles it.
      ...promptSettings
    };
    
    LLMServiceFactory.registerConfig(config);
  }, [customApiKey, promptSettings]);

  useEffect(() => {
    const savedKey = localStorage.getItem('openrouter_api_key');
    if (savedKey) {
      setCustomApiKey(savedKey);
      setIsApiKeySaved(true);
      // The other effect will pick this up and register it
    }
  }, []);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      const base64 = await fileToBase64(file);
      setPreviewUrl(base64);
    }
  };

  const handleRecommend = async () => {
    if (!previewUrl) return;

    try {
      setProcessingState({ step: 'ANALYZING_IMAGE', message: 'AI analyzing image and brainstorming scenarios...' });
      
      // Use Gemini Pro for vision tasks
      const recommendations = await recommendScenarios(previewUrl, LLMProvider.GEMINI_3_PRO_PREVIEW);
      
      const newPresets: ScenarioPreset[] = recommendations.map((rec, index) => ({
        id: `rec-${Date.now()}-${index}`,
        name: `AI Suggestion ${index + 1}`,
        description: rec,
        quality: 'High quality, photorealistic, 8k',
        isRecommended: true
      }));

      // Add to temporary recommendations instead of main presets
      setAiRecommendations(newPresets);
      // setSelectedPresetIds(prev => [...prev, ...newPresets.map(p => p.id)]); // Don't auto-select
      
      setProcessingState({ step: 'IDLE', message: '' });
    } catch (error) {
      console.error("Recommendation error:", error);
      setProcessingState({ step: 'ERROR', message: 'Failed to generate recommendations.' });
    }
  };

  const togglePreset = (id: string) => {
    setSelectedPresetIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(pid => pid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleGenerate = async () => {
    if (!selectedFile || !previewUrl || selectedPresetIds.length === 0) return;

    try {
      // 1. Prepare Image (Remove BG if requested)
      let imageToProcess = previewUrl;
      if (removeBg) {
        setProcessingState({ step: 'EXPANDING_PROMPT', message: 'Removing background for better integration...' });
        imageToProcess = await removeWhiteBackground(selectedFile);
      }

      const total = selectedPresetIds.length;
      let completed = 0;

      // Loop through all selected presets (check both lists)
      for (const presetId of selectedPresetIds) {
        const selectedPreset = displayPresets.find(p => p.id === presetId);
        if (!selectedPreset) continue;
        
        completed++;
        const currentPresetName = selectedPreset.name;

        // 2. Expand Prompt
        setProcessingState({ 
            step: 'EXPANDING_PROMPT', 
            message: `[${completed}/${total}] Designing "${currentPresetName}" scene...` 
        });
        
        const basePrompt = selectedPreset.description;
        // Always use Gemini 3 Pro Preview for prompt expansion as requested
        const expandedPrompt = await expandPrompt(basePrompt, LLMProvider.GEMINI_3_PRO_PREVIEW, customContext);
        console.log(`Expanded Prompt for ${currentPresetName}:`, expandedPrompt);

        // 3. Generate Image
        setProcessingState({ 
            step: 'GENERATING_IMAGE', 
            message: `[${completed}/${total}] Rendering "${currentPresetName}"...` 
        });
        // Always use Nano Banana Pro for image generation as requested
        const generatedImageUrl = await generateProductScene(
          imageToProcess, 
          expandedPrompt, 
          LLMProvider.GEMINI_3_PRO_IMAGE_PREVIEW,
          {
            quality: selectedPreset.quality
          }
        );

        // 4. Save Result
        const newImage: GeneratedImage = {
          id: Date.now().toString() + Math.random().toString().slice(2, 8),
          url: generatedImageUrl,
          prompt: expandedPrompt,
          vibe: currentPresetName, // Use the preset name as the label
          timestamp: Date.now()
        };

        setGeneratedImages(prev => [newImage, ...prev]);
      }

      setProcessingState({ step: 'COMPLETED', message: 'All scenarios generated successfully!' });

      setTimeout(() => {
        setProcessingState({ step: 'IDLE', message: '' });
      }, 3000);

    } catch (error) {
      console.error(error);
      setProcessingState({ step: 'ERROR', message: 'Something went wrong. Please check your API key and try again.' });
    }
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `amz-gen-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Preset Management Handlers
  const handleSavePreset = (id: string) => {
    setPresets(prev => prev.map(p => 
      p.id === id ? { 
        ...p, 
        name: newPresetName, 
        description: newPresetDesc,
        quality: newPresetQuality
      } : p
    ));
    setEditingPresetId(null);
  };

  const startEditing = (preset: ScenarioPreset) => {
    setEditingPresetId(preset.id);
    setNewPresetName(preset.name);
    setNewPresetDesc(preset.description);
    setNewPresetQuality(preset.quality || 'High quality, photorealistic, 8k');
    setIsAddingPreset(false);
  };

  const deletePreset = (id: string) => {
    setPresets(prev => prev.filter(p => p.id !== id));
    setSelectedPresetIds(prev => prev.filter(pid => pid !== id));
  };

  const saveNewPreset = () => {
    if (!newPresetName.trim() || !newPresetDesc.trim()) return;
    const newId = Date.now().toString();
    const newPreset: ScenarioPreset = {
      id: newId,
      name: newPresetName,
      description: newPresetDesc,
      quality: newPresetQuality
    };
    setPresets(prev => [...prev, newPreset]);
    setIsAddingPreset(false);
    setNewPresetName('');
    setNewPresetDesc('');
    setNewPresetQuality('High quality, photorealistic, 8k');
  };

  const handleSaveApiKey = () => {
    if (customApiKey.trim()) {
      localStorage.setItem('openrouter_api_key', customApiKey.trim());
      LLMServiceFactory.registerConfig({ apiKey: customApiKey.trim() });
      setIsApiKeySaved(true);
    } else {
      handleClearApiKey();
    }
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('openrouter_api_key');
    setCustomApiKey('');
    setIsApiKeySaved(false);
    LLMServiceFactory.registerConfig({}); // Reset to use env var if available
  };

  // Editor Handlers
  const handleEditImage = (image: GeneratedImage) => {
    setEditingImage(image);
  };

  const handleEditorGenerate = async (maskBase64: string, prompt: string) => {
    if (!editingImage) return;
    
    setIsEditorProcessing(true);
    try {
        console.log('Generating edit with:', {
            originalImage: editingImage.url,
            mask: maskBase64.substring(0, 50) + '...',
            prompt
        });
        
        // Call actual API via Factory
        const editedImageUrl = await LLMServiceFactory.getService(LLMProvider.GEMINI_3_PRO_IMAGE_PREVIEW).editImage(
            editingImage.url,
            maskBase64,
            prompt
        );
        
        // Add the result to generatedImages
        const newImage: GeneratedImage = {
            id: Date.now().toString() + Math.random().toString().slice(2, 8),
            url: editedImageUrl,
            prompt: `[Edit] ${prompt}`,
            vibe: `${editingImage.vibe} (Edited)`,
            timestamp: Date.now()
        };
        
        setGeneratedImages(prev => [newImage, ...prev]);
        setEditingImage(null); // Close modal on success
        
    } catch (error) {
        console.error("Editor error:", error);
        alert(`Failed to process edit request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        setIsEditorProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 md:ml-64 p-4 md:p-6">
        {activeTab === 'generator' ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT COLUMN: Controls */}
              <div className="lg:col-span-4 space-y-4">
                
                {/* Upload Section */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" />
                    Step 1: Upload Product
                  </h3>
                  
                  <div 
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${previewUrl ? 'border-primary bg-orange-50' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {previewUrl ? (
                      <div className="relative">
                        <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto object-contain" />
                        <button className="absolute top-0 right-0 bg-white/80 p-1 rounded-full text-xs hover:bg-white text-gray-600">Change</button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-4">
                        <ImageIcon className="w-10 h-10 text-gray-300" />
                        <p className="text-sm text-gray-500">Click to upload or drag & drop</p>
                        <span className="text-xs text-gray-400">Supports PNG, JPG (White BG)</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>

                  {previewUrl && (
                    <div className="mt-4 flex flex-col gap-3">
                        <button
                           onClick={handleRecommend}
                           disabled={processingState.step !== 'IDLE' && processingState.step !== 'COMPLETED' && processingState.step !== 'ERROR'}
                           className="w-full py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg flex items-center justify-center gap-2 text-sm font-medium hover:bg-purple-100 transition-colors"
                        >
                           {processingState.step === 'ANALYZING_IMAGE' ? (
                             <Loader2 className="w-4 h-4 animate-spin" />
                           ) : (
                             <BrainCircuit className="w-4 h-4" />
                           )}
                           AI Scene Recommend
                        </button>

                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="removeBg" 
                            checked={removeBg} 
                            onChange={(e) => setRemoveBg(e.target.checked)}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <label htmlFor="removeBg" className="text-sm text-gray-600 select-none cursor-pointer">
                            Auto-remove white background
                          </label>
                        </div>
                    </div>
                  )}
                </div>

                {/* Configuration Section */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                   <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-primary" />
                    Step 2: Configuration
                  </h3>

                  <div className="space-y-4">
                    {/* Vibe Selection - Button Grid */}
                    <div>
                       <div className="flex justify-between items-center mb-2">
                           <label className="text-sm font-medium text-gray-700">Select Scenarios (Multi-select)</label>
                           <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{selectedPresetIds.length} selected</span>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-2 pr-1">
                          {displayPresets.map(preset => {
                            const isSelected = selectedPresetIds.includes(preset.id);
                            return (
                                <div key={preset.id} className="relative group">
                                    <button 
                                        onClick={() => togglePreset(preset.id)}
                                        className={`relative p-3 rounded-lg border text-sm text-left transition-all flex items-center justify-between w-full
                                            ${isSelected 
                                                ? 'border-primary bg-orange-50 text-primary font-medium shadow-sm' 
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="truncate pr-2">{preset.name}</span>
                                            {preset.isRecommended && (
                                                <span className="flex-shrink-0 bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded border border-purple-200 flex items-center gap-0.5">
                                                    <Sparkles className="w-2.5 h-2.5" /> AI
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                                    </button>
                                    
                                    {/* Hover Tooltip */}
                                    <div className="absolute bottom-full left-0 w-64 mb-2 hidden group-hover:block z-50 pointer-events-none">
                                        <div className="bg-gray-800 text-white text-xs p-2 rounded shadow-lg border border-gray-700">
                                            {preset.description}
                                        </div>
                                        {/* Arrow */}
                                        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-gray-800 rotate-45 border-r border-b border-gray-700"></div>
                                    </div>
                                </div>
                            );
                          })}
                       </div>
                       <p className="text-[10px] text-gray-400 mt-2 text-center">
                          Select multiple to generate batch variations.
                       </p>
                    </div>

                    {/* Custom Context */}
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Additional Context (Optional)</label>
                       <textarea 
                          value={customContext}
                          onChange={(e) => setCustomContext(e.target.value)}
                          placeholder="E.g., Place a cup of coffee next to it."
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none min-h-[60px]"
                       />
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={!previewUrl || selectedPresetIds.length === 0 || (processingState.step !== 'IDLE' && processingState.step !== 'COMPLETED' && processingState.step !== 'ERROR')}
                  className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all shadow-md
                    ${!previewUrl || selectedPresetIds.length === 0
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : processingState.step === 'IDLE' || processingState.step === 'COMPLETED' || processingState.step === 'ERROR'
                            ? 'bg-gradient-to-r from-primary to-orange-400 hover:shadow-lg hover:to-orange-500 transform hover:-translate-y-0.5' 
                            : 'bg-primary/80 cursor-wait'}`}
                >
                   {processingState.step !== 'IDLE' && processingState.step !== 'COMPLETED' && processingState.step !== 'ERROR' ? (
                     <>
                       <Loader2 className="w-5 h-5 animate-spin" />
                       Processing...
                     </>
                   ) : (
                     <>
                       <Sparkles className="w-5 h-5" />
                       Generate {selectedPresetIds.length > 0 ? `(${selectedPresetIds.length})` : ''} Scenes
                     </>
                   )}
                </button>
                
                {processingState.step === 'ERROR' && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {processingState.message}
                    </div>
                )}

                {processingState.step !== 'IDLE' && processingState.step !== 'COMPLETED' && processingState.step !== 'ERROR' && (
                   <div className="bg-blue-50 border border-blue-100 text-blue-700 text-sm p-3 rounded-lg animate-pulse flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      {processingState.message}
                   </div>
                )}

              </div>

              {/* RIGHT COLUMN: Results */}
              <div className="lg:col-span-8">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-full min-h-[500px] flex flex-col">
                   <div className="flex justify-between items-center mb-4 shrink-0">
                     <h3 className="font-semibold text-gray-800">Generated Results</h3>
                     <span className="text-sm text-gray-500">{generatedImages.length} images</span>
                   </div>

                   {generatedImages.length === 0 ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-gray-400 min-h-[400px]">
                       <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                         <Layers className="w-12 h-12 text-gray-200" />
                       </div>
                       <p className="text-lg font-medium text-gray-300">No images generated yet</p>
                       <p className="text-sm text-gray-300">Upload a product and select scenarios to start</p>
                     </div>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                       {generatedImages.map((img) => (
                         <ResultCard 
                            key={img.id} 
                            image={img} 
                            onDownload={handleDownload}
                            onZoom={handleEditImage}
                         />
                       ))}
                     </div>
                   )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* SETTINGS VIEW */
          <div className="max-w-4xl mx-auto animate-fadeIn">
             <header className="mb-8 border-b border-gray-200 pb-6">
                <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                <p className="text-gray-500">Manage your workspace preferences.</p>
             </header>

             <div className="space-y-6">
               
               {/* SCENARIO LIBRARY SECTION */}
               <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Key className="w-5 h-5 text-gray-500" /> API Configuration
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">OpenRouter API Key</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type={showApiKey ? "text" : "password"}
                            value={customApiKey}
                            onChange={(e) => setCustomApiKey(e.target.value)}
                            placeholder="Enter your OpenRouter API Key (starts with sk-or-...)"
                            className="w-full pl-10 pr-10 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <button
                          onClick={handleSaveApiKey}
                          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                        >
                          Save
                        </button>
                        {isApiKeySaved && (
                          <button
                            onClick={handleClearApiKey}
                            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        {isApiKeySaved ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Using custom API key from local storage
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            Using default environment key (if configured)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                      <p className="font-medium mb-1">Privacy Note</p>
                      <p className="text-blue-600">
                        Your API key is stored locally in your browser's storage and is never sent to our servers. 
                        It is sent directly to OpenRouter API when generating content.
                      </p>
                    </div>
                  </div>
               </section>

               {/* GLOBAL PROMPT SETTINGS */}
               <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Wand2 className="w-5 h-5 text-gray-500" /> Global Prompt Settings
                    </h3>
                  </div>
                  <div className="p-6 space-y-6">
                    
                    {/* System Instruction */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">System Instruction (Prompt Expansion)</label>
                      <p className="text-xs text-gray-500 mb-2">Defines the persona and rules for the prompt expansion AI.</p>
                      <textarea
                        value={promptSettings.expandPromptSystem}
                        onChange={(e) => setPromptSettings(prev => ({ ...prev, expandPromptSystem: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none min-h-[150px]"
                      />
                    </div>
                  </div>
               </section>


               {/* SCENARIO LIBRARY SECTION */}
               <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-gray-500" /> Scenario Library
                    </h3>
                    {!isAddingPreset && (
                       <button 
                         onClick={() => { 
                           setIsAddingPreset(true); 
                           setNewPresetName(''); 
                           setNewPresetDesc('');
                         }}
                         className="flex items-center gap-1 text-sm bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                       >
                         <Plus className="w-4 h-4" /> Add Preset
                       </button>
                    )}
                  </div>

                  <div className="p-6">
                    <p className="text-sm text-gray-500 mb-4">
                       Define your custom prompt templates here. Each preset can have its own target resolution compliant with Amazon standards.
                    </p>

                    {/* ADD NEW PRESET FORM */}
                    {isAddingPreset && (
                       <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 mb-6">
                          <h4 className="text-sm font-bold text-gray-800 mb-3">New Preset</h4>
                          <div className="space-y-3">
                             <input 
                                type="text"
                                placeholder="Preset Name (e.g., Rustic Outdoor)"
                                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                value={newPresetName}
                                onChange={(e) => setNewPresetName(e.target.value)}
                             />
                             <textarea 
                                placeholder="Description / Prompt Template (e.g., A wooden table in a forest...)"
                                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-primary outline-none min-h-[80px]"
                                value={newPresetDesc}
                                onChange={(e) => setNewPresetDesc(e.target.value)}
                             />

                             <div className="flex gap-2 justify-end">
                                <button onClick={() => setIsAddingPreset(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1">Cancel</button>
                                <button onClick={saveNewPreset} className="text-sm bg-primary text-white px-4 py-1.5 rounded hover:bg-orange-600">Save Preset</button>
                             </div>
                          </div>
                       </div>
                    )}

                    {/* PRESETS LIST */}
                    <div className="space-y-4">
                       {presets.map(preset => (
                         <div key={preset.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                            {editingPresetId === preset.id ? (
                               <div className="space-y-3">
                                  <input 
                                    type="text"
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-primary outline-none font-semibold"
                                    value={newPresetName}
                                    onChange={(e) => setNewPresetName(e.target.value)}
                                  />
                                  <textarea 
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-primary outline-none min-h-[80px]"
                                    value={newPresetDesc}
                                    onChange={(e) => setNewPresetDesc(e.target.value)}
                                  />

                                  <div className="flex gap-2 justify-end">
                                      <button onClick={() => setEditingPresetId(null)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-1">
                                        <X className="w-3 h-3" /> Cancel
                                      </button>
                                      <button onClick={() => handleSavePreset(preset.id)} className="flex items-center gap-1 text-sm bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700">
                                        <Save className="w-3 h-3" /> Save Changes
                                      </button>
                                  </div>
                               </div>
                            ) : (
                               <div className="flex justify-between items-start gap-4">
                                  <div>
                                     <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                        {preset.name}
                                     </h4>
                                     <p className="text-sm text-gray-600 mt-1 leading-relaxed">{preset.description}</p>
                                  </div>
                                  <div className="flex gap-2 shrink-0">
                                     <button 
                                        onClick={() => startEditing(preset)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit"
                                     >
                                        <Edit2 className="w-4 h-4" />
                                     </button>
                                     <button 
                                        onClick={() => deletePreset(preset.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                     >
                                        <Trash2 className="w-4 h-4" />
                                     </button>
                                  </div>
                               </div>
                            )}
                         </div>
                       ))}
                    </div>
                  </div>
               </section>

               <div className="flex justify-center pt-8">
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    AmzGen Version 1.1.0 • Powered by OpenRouter
                  </p>
               </div>
             </div>
          </div>
        )}
      </main>

      {editingImage && (
        <ImageEditorModal
          isOpen={!!editingImage}
          onClose={() => setEditingImage(null)}
          imageUrl={editingImage.url}
          onGenerate={handleEditorGenerate}
          isProcessing={isEditorProcessing}
        />
      )}
    </div>
  );
};

export default App;