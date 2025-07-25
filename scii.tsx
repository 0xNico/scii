import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Download, Upload, Grid, Type, X, Settings, ChevronDown, ChevronUp, Sliders, Palette, Move } from 'lucide-react';

const Scii = () => {
  const [image, setImage] = useState(null);
  const [asciiArt, setAsciiArt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(true);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const asciiRef = useRef(null);
  
  // ASCII parameters
  const [params, setParams] = useState({
    width: 80,
    height: 40,
    charset: '@%#*+=-:. ',
    contrast: 1.0,
    brightness: 0,
    invert: false,
    fontSize: 8,
    preserveTransparency: true,
    alphaThreshold: 50
  });

  const charsets = {
    standard: '@%#*+=-:. ',
    dense: '█▉▊▋▌▍▎▏ ',
    blocks: '██▓▒░  ',
    minimal: '█▄▀ '
  };

  const handleImageUpload = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        convertToAscii(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, []);

  const convertToAscii = useCallback((img) => {
    if (!img) return;
    
    setIsProcessing(true);
    
    setTimeout(() => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.width = params.width;
      canvas.height = params.height;
      
      // Clear canvas with transparent background
      ctx.clearRect(0, 0, params.width, params.height);
      ctx.drawImage(img, 0, 0, params.width, params.height);
      
      const imageData = ctx.getImageData(0, 0, params.width, params.height);
      const data = imageData.data;
      
      let ascii = '';
      const chars = params.charset;
      const charRange = chars.length - 1;
      
      for (let y = 0; y < params.height; y++) {
        for (let x = 0; x < params.width; x++) {
          const offset = (y * params.width + x) * 4;
          
          // Check alpha channel for transparency
          const alpha = data[offset + 3];
          
          if (params.preserveTransparency && alpha < params.alphaThreshold) {
            // Transparent pixel - use space
            ascii += ' ';
          } else {
            // Opaque pixel - convert to ASCII
            let gray = (data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114);
            gray = Math.max(0, Math.min(255, (gray + params.brightness) * params.contrast));
            
            if (params.invert) gray = 255 - gray;
            
            const charIndex = Math.floor((gray / 255) * charRange);
            ascii += chars[params.invert ? charRange - charIndex : charIndex];
          }
        }
        ascii += '\n';
      }
      
      setAsciiArt(ascii);
      setIsProcessing(false);
    }, 10);
  }, [params]);

  useEffect(() => {
    if (image) {
      convertToAscii(image);
    }
  }, [params, image, convertToAscii]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleImageUpload(file);
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const removeImage = () => {
    setImage(null);
    setAsciiArt('');
  };

  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsSVG = () => {
    if (!asciiArt) return;
    
    const lines = asciiArt.trim().split('\n');
    const charWidth = params.fontSize * 0.6;
    const lineHeight = params.fontSize;
    const width = Math.max(...lines.map(line => line.length)) * charWidth;
    const height = lines.length * lineHeight;
    
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="white"/>
  <style>
    .ascii-text { 
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: ${params.fontSize}px;
      fill: black;
    }
  </style>
  ${lines.map((line, i) => 
    `<text x="0" y="${(i + 1) * lineHeight}" class="ascii-text">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`
  ).join('\n  ')}
</svg>`;
    
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    downloadFile(blob, 'scii-ascii-art.svg');
  };

  const exportAsPNG = () => {
    if (!asciiArt) return;
    
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');
    
    const lines = asciiArt.trim().split('\n');
    const charWidth = params.fontSize * 0.6;
    const lineHeight = params.fontSize;
    const padding = 20;
    
    exportCanvas.width = Math.max(...lines.map(line => line.length)) * charWidth + padding * 2;
    exportCanvas.height = lines.length * lineHeight + padding * 2;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    
    ctx.fillStyle = '#000000';
    ctx.font = `${params.fontSize}px "SF Mono", "Monaco", "Inconsolata", monospace`;
    ctx.textBaseline = 'top';
    
    lines.forEach((line, i) => {
      ctx.fillText(line, padding, padding + i * lineHeight);
    });
    
    exportCanvas.toBlob((blob) => {
      if (blob) {
        downloadFile(blob, 'scii-ascii-art.png');
      }
    }, 'image/png');
  };

  const exportAsWebP = () => {
    if (!asciiArt) return;
    
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');
    
    const lines = asciiArt.trim().split('\n');
    const charWidth = params.fontSize * 0.6;
    const lineHeight = params.fontSize;
    const padding = 20;
    
    exportCanvas.width = Math.max(...lines.map(line => line.length)) * charWidth + padding * 2;
    exportCanvas.height = lines.length * lineHeight + padding * 2;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    
    ctx.fillStyle = '#000000';
    ctx.font = `${params.fontSize}px "SF Mono", "Monaco", "Inconsolata", monospace`;
    ctx.textBaseline = 'top';
    
    lines.forEach((line, i) => {
      ctx.fillText(line, padding, padding + i * lineHeight);
    });
    
    exportCanvas.toBlob((blob) => {
      if (blob) {
        downloadFile(blob, 'scii-ascii-art.webp');
      }
    }, 'image/webp', 0.95);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#000000', color: '#ffffff' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: '#1f1f1f' }}>
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Grid className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-3xl font-light text-white">scii</h1>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload/Preview Area */}
            <div className="rounded-xl p-6 border" style={{ backgroundColor: '#0a0a0a', borderColor: '#1f1f1f' }}>
              {!image ? (
                // Upload State
                <>
                  <div className="mb-4">
                    <h2 className="text-lg font-medium">Upload</h2>
                  </div>
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
                    style={{ borderColor: '#333333' }}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    onMouseEnter={(e) => e.target.style.borderColor = '#555555'}
                    onMouseLeave={(e) => e.target.style.borderColor = '#333333'}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-3" style={{ color: '#666666' }} />
                    <p className="text-white text-sm mb-1">Drop image here</p>
                    <p className="text-xs" style={{ color: '#888888' }}>or click to browse</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files[0])}
                    />
                  </div>
                </>
              ) : (
                // Preview State
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Type className="w-5 h-5 text-white" />
                      <h2 className="text-lg font-medium">Preview</h2>
                      {isProcessing && (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      )}
                    </div>
                    <button
                      onClick={removeImage}
                      className="p-2 rounded-lg transition-colors"
                      style={{ backgroundColor: '#1f1f1f' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#2a2a2a'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#1f1f1f'}
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <div className="bg-black rounded-lg p-4 overflow-auto h-[400px] border" style={{ borderColor: '#1f1f1f' }}>
                    <pre
                      ref={asciiRef}
                      className="text-white whitespace-pre font-mono leading-none"
                      style={{
                        fontSize: `${params.fontSize}px`
                      }}
                    >
                      {asciiArt}
                    </pre>
                  </div>
                </>
              )}
            </div>

            {/* Settings - Only show when image is loaded */}
            {image && (
              <div className="rounded-xl border" style={{ backgroundColor: '#0a0a0a', borderColor: '#1f1f1f' }}>
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setSettingsExpanded(!settingsExpanded)}
                >
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-white" />
                    <h2 className="text-lg font-medium">Settings</h2>
                  </div>
                  {settingsExpanded ? (
                    <ChevronUp className="w-5 h-5 text-white" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white" />
                  )}
                </div>

                {settingsExpanded && (
                  <div className="px-4 pb-4 space-y-6">
                    {/* Size Section */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Move className="w-4 h-4" style={{ color: '#888888' }} />
                        <h3 className="text-sm font-medium" style={{ color: '#cccccc' }}>Dimensions</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm text-white">Width</label>
                            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#333333', color: '#ffffff' }}>{params.width}</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="200"
                            value={params.width}
                            onChange={(e) => setParams(p => ({ ...p, width: parseInt(e.target.value) }))}
                            className="w-full h-1 rounded-lg appearance-none cursor-pointer slider"
                            style={{ backgroundColor: '#333333' }}
                          />
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm text-white">Height</label>
                            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#333333', color: '#ffffff' }}>{params.height}</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={params.height}
                            onChange={(e) => setParams(p => ({ ...p, height: parseInt(e.target.value) }))}
                            className="w-full h-1 rounded-lg appearance-none cursor-pointer slider"
                            style={{ backgroundColor: '#333333' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Appearance Section */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Palette className="w-4 h-4" style={{ color: '#888888' }} />
                        <h3 className="text-sm font-medium" style={{ color: '#cccccc' }}>Appearance</h3>
                      </div>
                      <div className="space-y-4">
                        {/* Character Set */}
                        <div className="p-3 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
                          <label className="block text-sm text-white mb-2">Character Set</label>
                          <select
                            value={Object.keys(charsets).find(key => charsets[key] === params.charset) || 'standard'}
                            onChange={(e) => setParams(p => ({ ...p, charset: charsets[e.target.value] }))}
                            className="w-full rounded-lg px-3 py-2 text-white text-sm border"
                            style={{ backgroundColor: '#2a2a2a', borderColor: '#444444' }}
                          >
                            <option value="standard">Standard (@%#*+=-:. )</option>
                            <option value="dense">Dense (█▉▊▋▌▍▎▏ )</option>
                            <option value="blocks">Blocks (██▓▒░  )</option>
                            <option value="minimal">Minimal (█▄▀ )</option>
                          </select>
                        </div>

                        {/* Contrast & Size Row */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-sm text-white">Contrast</label>
                              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#333333', color: '#ffffff' }}>{params.contrast.toFixed(1)}</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="3"
                              step="0.1"
                              value={params.contrast}
                              onChange={(e) => setParams(p => ({ ...p, contrast: parseFloat(e.target.value) }))}
                              className="w-full h-1 rounded-lg appearance-none cursor-pointer slider"
                              style={{ backgroundColor: '#333333' }}
                            />
                          </div>
                          <div className="p-3 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-sm text-white">Font Size</label>
                              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#333333', color: '#ffffff' }}>{params.fontSize}px</span>
                            </div>
                            <input
                              type="range"
                              min="6"
                              max="16"
                              value={params.fontSize}
                              onChange={(e) => setParams(p => ({ ...p, fontSize: parseInt(e.target.value) }))}
                              className="w-full h-1 rounded-lg appearance-none cursor-pointer slider"
                              style={{ backgroundColor: '#333333' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Section */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Sliders className="w-4 h-4" style={{ color: '#888888' }} />
                        <h3 className="text-sm font-medium" style={{ color: '#cccccc' }}>Advanced</h3>
                      </div>
                      <div className="space-y-3">
                        {/* Toggle Controls */}
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
                            <label className="text-sm text-white">Preserve Transparency</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={params.preserveTransparency}
                                onChange={(e) => setParams(p => ({ ...p, preserveTransparency: e.target.checked }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ backgroundColor: params.preserveTransparency ? '#ffffff' : '#374151' }}></div>
                            </label>
                          </div>
                          
                          {params.preserveTransparency && (
                            <div className="p-3 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
                              <div className="flex justify-between items-center mb-2">
                                <label className="text-sm text-white">Alpha Threshold</label>
                                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#333333', color: '#ffffff' }}>{params.alphaThreshold}</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="255"
                                value={params.alphaThreshold}
                                onChange={(e) => setParams(p => ({ ...p, alphaThreshold: parseInt(e.target.value) }))}
                                className="w-full h-1 rounded-lg appearance-none cursor-pointer slider"
                                style={{ backgroundColor: '#333333' }}
                              />
                              <p className="text-xs mt-2" style={{ color: '#666666' }}>Lower values make more areas transparent</p>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
                            <label className="text-sm text-white">Invert Colors</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={params.invert}
                                onChange={(e) => setParams(p => ({ ...p, invert: e.target.checked }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ backgroundColor: params.invert ? '#ffffff' : '#374151' }}></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Export */}
          <div className="lg:col-span-3">
            {asciiArt && (
              <div className="rounded-xl p-6 border h-full" style={{ backgroundColor: '#0a0a0a', borderColor: '#1f1f1f' }}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <Download className="w-5 h-5 text-white" />
                    <h2 className="text-lg font-medium">Export</h2>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={exportAsSVG}
                    className="bg-white hover:opacity-90 text-black font-medium py-4 px-6 rounded-lg transition-opacity"
                  >
                    Save as SVG
                  </button>
                  <button
                    onClick={exportAsPNG}
                    className="font-medium py-4 px-6 rounded-lg transition-colors border text-white"
                    style={{ backgroundColor: '#1f1f1f', borderColor: '#333333' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#2a2a2a'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#1f1f1f'}
                  >
                    Save as PNG
                  </button>
                  <button
                    onClick={exportAsWebP}
                    className="font-medium py-4 px-6 rounded-lg transition-colors border text-white"
                    style={{ backgroundColor: '#1f1f1f', borderColor: '#333333' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#2a2a2a'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#1f1f1f'}
                  >
                    Save as WebP
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 0;
        }
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 0;
        }
        
        /* Custom toggle switch styling */
        input[type="checkbox"]:checked + div {
          background-color: white !important;
        }
        input[type="checkbox"]:checked + div:after {
          background-color: black !important;
        }
        input[type="checkbox"]:not(:checked) + div:after {
          background-color: white !important;
        }
      `}</style>
    </div>
  );
};

export default Scii;