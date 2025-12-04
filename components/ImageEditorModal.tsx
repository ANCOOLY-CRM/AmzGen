import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, RotateCcw, Check, MousePointer2, Square } from 'lucide-react';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onGenerate: (maskBase64: string, prompt: string) => void;
  isProcessing: boolean;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onGenerate,
  isProcessing
}) => {
  const [prompt, setPrompt] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Load image to get dimensions and setup canvas
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
  }, [isOpen, imageUrl]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
        setSelection(null);
        setStartPos(null);
        setIsSelecting(false);
        setPrompt('');
    }
  }, [isOpen]);

  // Redraw canvas whenever selection changes
  useEffect(() => {
    if (!canvasRef.current || imageDimensions.width === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If there is a selection, draw semi-transparent overlay everywhere EXCEPT the selection
    if (selection) {
        // Draw semi-transparent black over everything
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Clear the selected area (making it transparent to see the image below)
        ctx.clearRect(selection.x, selection.y, selection.w, selection.h);

        // Draw border around selection
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(selection.x, selection.y, selection.w, selection.h);
    }
  }, [selection, imageDimensions]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsSelecting(true);
    const coords = getCoordinates(e);
    setStartPos(coords);
    setSelection({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !startPos) return;
    e.preventDefault(); // Prevent scrolling on touch

    const current = getCoordinates(e);
    
    const x = Math.min(startPos.x, current.x);
    const y = Math.min(startPos.y, current.y);
    const w = Math.abs(current.x - startPos.x);
    const h = Math.abs(current.y - startPos.y);

    setSelection({ x, y, w, h });
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setStartPos(null);
  };

  const clearSelection = () => {
    setSelection(null);
  };

  const handleGenerateClick = () => {
    if (!selection || imageDimensions.width === 0) return;
    
    // Create mask: Black background, White rectangle for selection
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = imageDimensions.width;
    maskCanvas.height = imageDimensions.height;
    const maskCtx = maskCanvas.getContext('2d');
    
    if (maskCtx) {
        // 1. Fill black (ignore)
        maskCtx.fillStyle = '#000000';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        
        // 2. Fill selection with white (edit area)
        maskCtx.fillStyle = '#FFFFFF';
        maskCtx.fillRect(selection.x, selection.y, selection.w, selection.h);
        
        const maskBase64 = maskCanvas.toDataURL('image/png');
        onGenerate(maskBase64, prompt);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
             <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <Square className="w-5 h-5" />
             </div>
             <div>
               <h3 className="font-bold text-gray-800">Magic Editor</h3>
               <p className="text-xs text-gray-500">Drag to select area & describe changes</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            
            {/* Canvas Area */}
            <div 
                ref={containerRef}
                className="flex-1 bg-gray-100 relative overflow-auto flex items-center justify-center p-4 select-none"
            >
                {imageDimensions.width > 0 && (
                    <div className="relative shadow-lg" style={{ width: 'fit-content' }}>
                        <img 
                            src={imageUrl} 
                            alt="Target" 
                            className="max-w-full max-h-[60vh] object-contain block pointer-events-none"
                            draggable={false}
                        />
                        <canvas
                            ref={canvasRef}
                            width={imageDimensions.width}
                            height={imageDimensions.height}
                            className="absolute top-0 left-0 w-full h-full cursor-crosshair touch-none"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onTouchStart={handleMouseDown}
                            onTouchMove={handleMouseMove}
                            onTouchEnd={handleMouseUp}
                        />
                    </div>
                )}
            </div>

            {/* Controls Sidebar */}
            <div className="w-full lg:w-80 bg-white border-l border-gray-100 flex flex-col p-5 gap-6 z-10">
                
                {/* Selection Tools */}
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-3 block">Selection</label>
                    <div className="flex items-center gap-3 mb-4">
                         <div className="flex-1 bg-gray-100 rounded-lg p-1 flex">
                             <button className="flex-1 py-1.5 px-2 text-xs font-medium bg-white shadow rounded-md text-gray-800 flex items-center justify-center gap-1">
                                 <Square className="w-3.5 h-3.5" /> Rectangular Marquee
                             </button>
                         </div>
                         <button 
                            onClick={clearSelection}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Clear Selection"
                         >
                            <RotateCcw className="w-4 h-4" />
                         </button>
                    </div>
                    
                    {selection ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700 flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            Area selected ({Math.round(selection.w)}x{Math.round(selection.h)})
                        </div>
                    ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500 flex items-center gap-2">
                            <MousePointer2 className="w-4 h-4" />
                            Please select an area to edit
                        </div>
                    )}
                </div>

                {/* Prompt Input */}
                <div className="flex-1 flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-2">Edit Instruction</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe changes for the selected area..."
                        className="w-full flex-1 border border-gray-300 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none min-h-[120px]"
                    />
                </div>

                {/* Action Buttons */}
                <div className="mt-auto pt-4 border-t border-gray-100">
                    <button
                        onClick={handleGenerateClick}
                        disabled={!selection || !prompt.trim() || isProcessing}
                        className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all
                            ${!selection || !prompt.trim() || isProcessing
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:from-purple-700 hover:to-indigo-700 transform hover:-translate-y-0.5'
                            }`}
                    >
                        {isProcessing ? (
                            <>
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                Processing...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Generate Changes
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};
