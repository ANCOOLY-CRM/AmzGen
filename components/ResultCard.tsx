import React from 'react';
import { Download, ZoomIn } from 'lucide-react';
import { GeneratedImage } from '../types';

interface ResultCardProps {
  image: GeneratedImage;
  onDownload: (url: string) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ image, onDownload }) => {
  return (
    <div className="group relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-square w-full overflow-hidden bg-gray-100 relative">
        <img 
          src={image.url} 
          alt={image.prompt} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button 
            onClick={() => onDownload(image.url)}
            className="p-2 bg-white text-gray-900 rounded-full hover:bg-primary hover:text-white transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={() => window.open(image.url, '_blank')}
             className="p-2 bg-white text-gray-900 rounded-full hover:bg-primary hover:text-white transition-colors"
             title="View Fullscreen"
          >
             <ZoomIn className="w-5 h-5" />
          </button>
        </div>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                {image.vibe}
            </span>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-500 line-clamp-2" title={image.prompt}>
          {image.prompt}
        </p>
      </div>
    </div>
  );
};