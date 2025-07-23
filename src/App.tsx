import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Download, Upload, Grid, Type, X, Settings, ChevronDown, ChevronUp, Sliders, Palette, Move, Film, AlertCircle } from 'lucide-react';

const Scii = () => {
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [asciiArt, setAsciiArt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const asciiCanvasRef = useRef(null);
  const asciiRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const animationRef = useRef(null);
  
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
    alphaThreshold: 50,
    // Video-specific parameters
    cropStart: 0,
    cropEnd: 100,
    videoWidth: 320,
    videoHeight: 240,
    fps: 30
  });

  const charsets = {
    standard: '@%#*+=-:. ',
    dense: '█▉▊▋▌▍▎▏ ',
    blocks: '██▓▒░  ',
    minimal: '█▄▀ '
  };

  const handleFileUpload = useCallback((file) => {
    if (!file) return;
    
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    
    if (!isImage && !isVideo) {
      setError('Please upload an image or video file');
      return;
    }
    
    // Reset states
    setError('');
    setVideoLoaded(false);
    setLoadingStatus('');
    setAsciiArt('');
    
    // Check file size (limit to 100MB for videos)
    if (isVideo && file.size > 100 * 1024 * 1024) {
      setError('Video file is too large. Please use a video under 100MB.');
      return;
    }
    
    if (isVideo) {
      setLoadingStatus('Reading video file...');
    }
    
    const reader = new FileReader();
    
    reader.onprogress = (e) => {
      if (e.lengthComputable && isVideo) {
        const percentLoaded = Math.round((e.loaded / e.total) * 100);
        setLoadingStatus(`Reading video file... ${percentLoaded}%`);
      }
    };
    
    reader.onerror = () => {
      setError('Failed to read file. Please try again.');
      setLoadingStatus('');
    };
    
    reader.onload = (e) => {
      if (isVideo) {
        setLoadingStatus('Loading video...');
        setVideo(e.target.result);
        setImage(null);
      } else if (isImage) {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setVideo(null);
          convertToAscii(img);
        };
        img.onerror = () => {
          setError('Failed to load image. Please try a different file.');
        };
        img.src = e.target.result;
      }
    };
    
    reader.readAsDataURL(file);
  }, []);

  const convertToAscii = useCallback((img) => {
    if (!img) return;
    
    setIsProcessing(true);
    
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setIsProcessing(false);
        return;
      }
      
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
    });
  }, [params]);

  const convertVideoFrameToAscii = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('Video has invalid dimensions');
      return;
    }
    
    // Set canvas dimensions
    canvas.width = params.width;
    canvas.height = params.height;
    
    // Draw video frame to canvas
    try {
      ctx.drawImage(video, 0, 0, params.width, params.height);
    } catch (e) {
      console.error('Failed to draw video frame:', e);
      return;
    }
    
    // Get image data
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
          ascii += ' ';
        } else {
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
    
    // Draw ASCII to canvas for recording if needed
    if (asciiCanvasRef.current && (isRecording || isPlaying)) {
      const asciiCanvas = asciiCanvasRef.current;
      const asciiCtx = asciiCanvas.getContext('2d');
      
      const fontSize = Math.max(6, params.fontSize);
      const lineHeight = fontSize * 0.8;
      const charWidth = fontSize * 0.6;
      
      asciiCanvas.width = params.width * charWidth;
      asciiCanvas.height = params.height * lineHeight;
      
      asciiCtx.fillStyle = '#000000';
      asciiCtx.fillRect(0, 0, asciiCanvas.width, asciiCanvas.height);
      
      asciiCtx.fillStyle = '#ffffff';
      asciiCtx.font = `${fontSize}px monospace`;
      asciiCtx.textBaseline = 'top';
      
      const lines = ascii.split('\n');
      lines.forEach((line, i) => {
        asciiCtx.fillText(line, 0, i * lineHeight);
      });
    }
    
    if (isPlaying && !video.paused) {
      animationRef.current = requestAnimationFrame(convertVideoFrameToAscii);
    }
  }, [params, isPlaying, isRecording]);

  const handleVideoCanPlay = useCallback(() => {
    setLoadingStatus('Video ready, generating preview...');
    setVideoLoaded(true);
    setIsProcessing(true);
    
    // Ensure video is seekable and at the beginning
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    
    // Small delay to ensure video frame is ready
    setTimeout(() => {
      convertVideoFrameToAscii();
      setIsProcessing(false);
      setLoadingStatus('');
    }, 100);
  }, [convertVideoFrameToAscii]);

  const handleVideoError = useCallback((e) => {
    console.error('Video error:', e);
    setError('Failed to load video. The format may not be supported by your browser.');
    setLoadingStatus('');
    setVideoLoaded(false);
  }, []);

  const handleVideoLoadStart = useCallback(() => {
    setLoadingStatus('Initializing video...');
  }, []);

  const handleVideoProgress = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration;
        if (duration > 0) {
          const bufferedPercent = Math.round((bufferedEnd / duration) * 100);
          setLoadingStatus(`Buffering video... ${bufferedPercent}%`);
        }
      }
    }
  }, []);

  const handleVideoPlay = () => {
    if (!videoLoaded) {
      setError('Please wait for the video to load');
      return;
    }
    
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.play().catch((e) => {
        console.error('Failed to play video:', e);
        setError('Failed to play video');
        setIsPlaying(false);
      });
      convertVideoFrameToAscii();
    }
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const startRecording = () => {
    if (!asciiCanvasRef.current || !videoLoaded) {
      setError('Please wait for the video to load before recording');
      return;
    }
    
    const stream = asciiCanvasRef.current.captureStream(params.fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    });
    
    mediaRecorderRef.current = mediaRecorder;
    setRecordedChunks([]);
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks(prev => [...prev, event.data]);
      }
    };
    
    mediaRecorder.start();
    setIsRecording(true);
    handleVideoPlay();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      handleVideoPause();
    }
  };

  const downloadRecording = () => {
    if (recordedChunks.length === 0) return;
    
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    downloadFile(blob, 'scii-ascii-video.webm');
  };

  // Re-convert video frame when parameters change
  useEffect(() => {
    if (video && videoLoaded && !isPlaying) {
      convertVideoFrameToAscii();
    }
  }, [params, video, videoLoaded, isPlaying, convertVideoFrameToAscii]);

  useEffect(() => {
    if (image) {
      convertToAscii(image);
    }
  }, [params, image, convertToAscii]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const removeMedia = () => {
    setImage(null);
    setVideo(null);
    setAsciiArt('');
    setIsPlaying(false);
    setIsRecording(false);
    setRecordedChunks([]);
    setVideoLoaded(false);
    setLoadingStatus('');
    setError('');
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-stone-800">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Grid className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-3xl font-light text-white">scii</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Main Preview Area - Always visible */}
          <div className="rounded-xl p-6 border bg-stone-950 border-stone-800">
            {!image && !video ? (
              // Upload State
              <>
                <div className="mb-4">
                  <h2 className="text-lg font-medium">Upload</h2>
                </div>
                <div
                  className="border-2 border-dashed border-stone-700 hover:border-stone-600 rounded-lg p-12 text-center cursor-pointer transition-colors max-w-lg mx-auto"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 text-stone-500 mx-auto mb-3" />
                  <p className="text-white text-sm mb-1">Drop image or video here</p>
                  <p className="text-xs text-stone-400">or click to browse</p>
                  <p className="text-xs text-stone-500 mt-2">Supported: JPG, PNG, GIF, MP4, WebM, MOV (max 100MB)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                  />
                </div>
                {error && (
                  <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
              </>
            ) : (
              // Preview State
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Type className="w-5 h-5 text-white" />
                    <h2 className="text-lg font-medium">{video ? 'Video Preview' : 'Image Preview'}</h2>
                    {isProcessing && (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    )}
                  </div>
                  <button
                    onClick={removeMedia}
                    className="p-2 bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Error display */}
                {error && (
                  <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Loading status */}
                {loadingStatus && (
                  <div className="mb-4 p-3 bg-stone-800 rounded-lg">
                    <p className="text-sm text-stone-300">{loadingStatus}</p>
                  </div>
                )}

                {video && (
                  // Video Controls
                  <div className="mb-4 flex items-center justify-center space-x-4">
                    <button
                      onClick={isPlaying ? handleVideoPause : handleVideoPlay}
                      disabled={!videoLoaded}
                      className={`px-4 py-2 rounded-lg transition-opacity ${
                        videoLoaded 
                          ? 'bg-white text-black hover:opacity-90' 
                          : 'bg-stone-700 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </button>
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={!videoLoaded}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        !videoLoaded 
                          ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                          : isRecording 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-stone-700 hover:bg-stone-600 text-white'
                      }`}
                    >
                      {isRecording ? 'Stop Recording' : 'Record ASCII'}
                    </button>
                    {recordedChunks.length > 0 && (
                      <button
                        onClick={downloadRecording}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Download Video
                      </button>
                    )}
                  </div>
                )}

                <div className="bg-black rounded-lg p-6 overflow-auto max-h-[70vh] border border-stone-800 flex justify-center">
                  {video && (
                    <video
                      ref={videoRef}
                      src={video}
                      style={{ display: 'none' }}
                      loop
                      muted
                      playsInline
                      crossOrigin="anonymous"
                      onCanPlay={handleVideoCanPlay}
                      onError={handleVideoError}
                      onLoadStart={handleVideoLoadStart}
                      onProgress={handleVideoProgress}
                    />
                  )}
                  <pre
                    ref={asciiRef}
                    className="text-white whitespace-pre font-mono leading-none"
                    style={{
                      fontSize: `${params.fontSize}px`,
                      minHeight: video && !asciiArt ? '200px' : 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {asciiArt || (video && !videoLoaded && !error ? 'Preparing video...' : '')}
                  </pre>
                </div>
              </>
            )}
          </div>

          {/* Settings - Only show when image or video is loaded */}
          {(image || video) && (
            <div className="rounded-xl border bg-stone-950 border-stone-800">
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
                <div className="px-4 pb-4">
                  <div className={`grid grid-cols-1 ${video ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
                    {/* Size Section */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Move className="w-4 h-4 text-stone-400" />
                        <h3 className="text-sm font-medium text-stone-300">Dimensions</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="p-3 rounded-lg bg-stone-900">
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm text-white">Width</label>
                            <span className="text-xs px-2 py-1 rounded bg-stone-700 text-white">{params.width}</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="200"
                            value={params.width}
                            onChange={(e) => setParams(p => ({ ...p, width: parseInt(e.target.value) }))}
                            className="w-full h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer slider"
                          />
                        </div>
                        <div className="p-3 rounded-lg bg-stone-900">
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm text-white">Height</label>
                            <span className="text-xs px-2 py-1 rounded bg-stone-700 text-white">{params.height}</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={params.height}
                            onChange={(e) => setParams(p => ({ ...p, height: parseInt(e.target.value) }))}
                            className="w-full h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer slider"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Video Section - Only show for videos */}
                    {video && (
                      <div>
                        <div className="flex items-center space-x-2 mb-3">
                          <Film className="w-4 h-4 text-stone-400" />
                          <h3 className="text-sm font-medium text-stone-300">Video</h3>
                        </div>
                        <div className="space-y-4">
                          <div className="p-3 rounded-lg bg-stone-900">
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-sm text-white">Frame Rate</label>
                              <span className="text-xs px-2 py-1 rounded bg-stone-700 text-white">{params.fps}</span>
                            </div>
                            <input
                              type="range"
                              min="15"
                              max="60"
                              step="15"
                              value={params.fps}
                              onChange={(e) => setParams(p => ({ ...p, fps: parseInt(e.target.value) }))}
                              className="w-full h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer slider"
                            />
                          </div>
                          <div className="p-3 rounded-lg bg-stone-900">
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-sm text-white">Video Width</label>
                              <span className="text-xs px-2 py-1 rounded bg-stone-700 text-white">{params.videoWidth}</span>
                            </div>
                            <input
                              type="range"
                              min="240"
                              max="1920"
                              step="80"
                              value={params.videoWidth}
                              onChange={(e) => setParams(p => ({ ...p, videoWidth: parseInt(e.target.value) }))}
                              className="w-full h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer slider"
                            />
                          </div>
                          <div className="p-3 rounded-lg bg-stone-900">
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-sm text-white">Video Height</label>
                              <span className="text-xs px-2 py-1 rounded bg-stone-700 text-white">{params.videoHeight}</span>
                            </div>
                            <input
                              type="range"
                              min="180"
                              max="1080"
                              step="60"
                              value={params.videoHeight}
                              onChange={(e) => setParams(p => ({ ...p, videoHeight: parseInt(e.target.value) }))}
                              className="w-full h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer slider"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Appearance Section */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Palette className="w-4 h-4 text-stone-400" />
                        <h3 className="text-sm font-medium text-stone-300">Appearance</h3>
                      </div>
                      <div className="space-y-4">
                        {/* Character Set */}
                        <div className="p-3 rounded-lg bg-stone-900">
                          <label className="block text-sm text-white mb-2">Character Set</label>
                          <select
                            value={Object.keys(charsets).find(key => charsets[key] === params.charset) || 'standard'}
                            onChange={(e) => setParams(p => ({ ...p, charset: charsets[e.target.value] }))}
                            className="w-full rounded-lg px-3 py-2 text-white text-sm border bg-stone-800 border-stone-600"
                          >
                            <option value="standard">Standard (@%#*+=-:. )</option>
                            <option value="dense">Dense (█▉▊▋▌▍▎▏ )</option>
                            <option value="blocks">Blocks (██▓▒░  )</option>
                            <option value="minimal">Minimal (█▄▀ )</option>
                          </select>
                        </div>

                        {/* Contrast & Size */}
                        <div className="space-y-4">
                          <div className="p-3 rounded-lg bg-stone-900">
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-sm text-white">Contrast</label>
                              <span className="text-xs px-2 py-1 rounded bg-stone-700 text-white">{params.contrast.toFixed(1)}</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="3"
                              step="0.1"
                              value={params.contrast}
                              onChange={(e) => setParams(p => ({ ...p, contrast: parseFloat(e.target.value) }))}
                              className="w-full h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer slider"
                            />
                          </div>
                          <div className="p-3 rounded-lg bg-stone-900">
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-sm text-white">Font Size</label>
                              <span className="text-xs px-2 py-1 rounded bg-stone-700 text-white">{params.fontSize}px</span>
                            </div>
                            <input
                              type="range"
                              min="6"
                              max="16"
                              value={params.fontSize}
                              onChange={(e) => setParams(p => ({ ...p, fontSize: parseInt(e.target.value) }))}
                              className="w-full h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer slider"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Section */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Sliders className="w-4 h-4 text-stone-400" />
                        <h3 className="text-sm font-medium text-stone-300">Advanced</h3>
                      </div>
                      <div className="space-y-3">
                        {/* Toggle Controls */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-stone-900">
                            <label className="text-sm text-white">Preserve Transparency</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={params.preserveTransparency}
                                onChange={(e) => setParams(p => ({ ...p, preserveTransparency: e.target.checked }))}
                                className="sr-only peer"
                              />
                              <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${params.preserveTransparency ? 'bg-white' : 'bg-stone-600'}`}></div>
                            </label>
                          </div>
                          
                          {params.preserveTransparency && (
                            <div className="p-3 rounded-lg bg-stone-900">
                              <div className="flex justify-between items-center mb-2">
                                <label className="text-sm text-white">Alpha Threshold</label>
                                <span className="text-xs px-2 py-1 rounded bg-stone-700 text-white">{params.alphaThreshold}</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="255"
                                value={params.alphaThreshold}
                                onChange={(e) => setParams(p => ({ ...p, alphaThreshold: parseInt(e.target.value) }))}
                                className="w-full h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer slider"
                              />
                              <p className="text-xs mt-2 text-stone-400">Lower values make more areas transparent</p>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between p-3 rounded-lg bg-stone-900">
                            <label className="text-sm text-white">Invert Colors</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={params.invert}
                                onChange={(e) => setParams(p => ({ ...p, invert: e.target.checked }))}
                                className="sr-only peer"
                              />
                              <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${params.invert ? 'bg-white' : 'bg-stone-600'}`}></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Export Section - Only show when ASCII is generated */}
          {asciiArt && (
            <div className="rounded-xl p-6 border bg-stone-950 border-stone-800">
              <div className="flex items-center space-x-2 mb-6">
                <Download className="w-5 h-5 text-white" />
                <h2 className="text-lg font-medium">Export</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <button
                  onClick={exportAsSVG}
                  className="bg-white hover:opacity-90 text-black font-medium py-4 px-6 rounded-lg transition-opacity"
                >
                  Save as SVG
                </button>
                <button
                  onClick={exportAsPNG}
                  className="bg-stone-900 hover:bg-stone-800 font-medium py-4 px-6 rounded-lg transition-colors border border-stone-700 text-white"
                >
                  Save as PNG
                </button>
                <button
                  onClick={exportAsWebP}
                  className="bg-stone-900 hover:bg-stone-800 font-medium py-4 px-6 rounded-lg transition-colors border border-stone-700 text-white"
                >
                  Save as WebP
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvases for processing */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={asciiCanvasRef} className="hidden" />

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
      `}</style>
    </div>
  );
};

export default Scii;
