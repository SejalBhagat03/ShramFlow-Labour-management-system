import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Upload, CheckCircle, AlertTriangle, FileText, Loader2, Save, X, 
  RefreshCw, Copy, Check, Info, ShieldAlert, Sparkles, Image as ImageIcon,
  Cpu, Database, ChevronDown, ChevronUp, Zap, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';

const OcrScanner = () => {
  const { authFetch } = useAuth();
  
  // Pipeline/Scan States
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0); // 0: Uploading, 1: Enhancing, 2: Extracting, 3: Structuring
  
  // Scanned Results States
  const [scannedData, setScannedData] = useState([]);
  const [rawOcrText, setRawOcrText] = useState('');
  const [confidenceScore, setConfidenceScore] = useState(null);
  const [isAiParsed, setIsAiParsed] = useState(false);
  const [aiWarning, setAiWarning] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [imageMetadata, setImageMetadata] = useState(null);
  
  // UI States
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('structured'); // 'structured' or 'raw'
  const [isCopied, setIsCopied] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  
  // Camera States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  
  // Refs
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Stepper steps configuration
  const steps = [
    { id: 'contrast', label: 'Enhancing Contrast', desc: 'Uploading buffer & expanding dynamic brightness range', icon: Zap },
    { id: 'cleaning', label: 'Cleaning Background', desc: 'Binarizing into pure black & white to strip creases & shadows', icon: Sparkles },
    { id: 'aligning', label: 'Aligning Text', desc: 'EXIF camera alignment check, auto-rotation & upscale scaling', icon: RefreshCw },
    { id: 'running', label: 'Running OCR', desc: 'Tesseract local CPU worker thread character extraction', icon: Cpu }
  ];

  // Simulates incremental progression through stepper during API latency
  useEffect(() => {
    let timer;
    if (isScanning) {
      setScanStep(0);
      
      // Step 1 -> Step 2 (Image enhancement starts after 0.8s)
      timer = setTimeout(() => {
        setScanStep(1);
        
        // Step 2 -> Step 3 (Tesseract kicks in after 2.2s)
        timer = setTimeout(() => {
          setScanStep(2);
          
          // Step 3 -> Step 4 (AI structuring begins after 4.8s)
          timer = setTimeout(() => {
            setScanStep(3);
          }, 2600);
          
        }, 1400);
        
      }, 800);
    } else {
      setScanStep(0);
    }
    return () => clearTimeout(timer);
  }, [isScanning]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelected(file);
    } else {
      toast.error('Please drop a valid image file');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelected(file);
  };

  const handleFileSelected = (file) => {
    setSelectedFile(file);
    setIsCameraActive(false);
    stopCamera();

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      processImageFile(file);
    };
    reader.readAsDataURL(file);
  };

  // Camera integration (HTML5 MediaDevices)
  const startCamera = async () => {
    setImagePreview(null);
    setSelectedFile(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera Access Error:', err);
      toast.error('Could not access camera. Please upload an image file.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(blob));
      stopCamera();
      processImageFile(file);
    }, 'image/jpeg', 0.95);
  };

  // Call the multi-threaded OCR backend scanning endpoint
  const processImageFile = async (file) => {
    setIsScanning(true);
    setScannedData([]);
    setRawOcrText('');
    setConfidenceScore(null);
    setAiWarning(null);
    setPerformanceMetrics(null);
    setImageMetadata(null);
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await authFetch('/api/ocr/scan', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setRawOcrText(data.rawText || '');
        setConfidenceScore(data.confidence || 0);
        setIsAiParsed(data.isAiParsed || false);
        setAiWarning(data.warning || null);
        setPerformanceMetrics(data.performance || null);
        setImageMetadata(data.preprocessingMetadata || null);
        
        if (data.entries && data.entries.length > 0) {
          setScannedData(data.entries);
          toast.success(`Scanning successfully completed! Structured ${data.entries.length} entries.`);
          setActiveTab('structured');
        } else {
          setScannedData([]);
          setActiveTab('raw');
          if (data.warning) {
            toast.warning(data.warning);
          } else {
            toast.info('Local OCR scanned successfully. Adjust data manually from raw text.');
          }
        }
      } else {
        toast.error(data.error || 'Failed to scan image. Please try again.');
      }
    } catch (error) {
      console.error('OCR API Error:', error);
      toast.error('Network Error. Ensure your backend server is online.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleEditEntry = (index, field, value) => {
    const updated = [...scannedData];
    updated[index][field] = value;
    setScannedData(updated);
  };

  const handleRejectEntry = (index) => {
    const updated = scannedData.filter((_, idx) => idx !== index);
    setScannedData(updated);
    toast.info('Work entry rejected.');
  };

  const handleCopyRawText = () => {
    if (!rawOcrText) return;
    navigator.clipboard.writeText(rawOcrText);
    setIsCopied(true);
    toast.success('Raw text copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveAll = async () => {
    if (scannedData.length === 0) return;
    setIsSaving(true);
    
    try {
      const payload = {
        entries: scannedData.map(entry => ({
          labourer_id: entry.labourer_id,
          date: entry.date || new Date().toISOString().split('T')[0],
          meters: Number(entry.meters || 0),
          work_done: Number(entry.meters || 0),
          task_type: entry.taskType || 'Unspecified Work',
          payment: Number(entry.payment || 0)
        }))
      };

      const response = await authFetch('/api/work/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('All extracted records saved to database successfully!');
        setScannedData([]);
        setImagePreview(null);
        setSelectedFile(null);
        setConfidenceScore(null);
        setRawOcrText('');
        setPerformanceMetrics(null);
        setImageMetadata(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to save entries to the database.');
      }
    } catch (error) {
      toast.error('Database connection error. Try saving again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Color mappings for OCR confidence levels
  const getConfidenceColor = (score) => {
    if (score >= 80) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', progress: 'bg-emerald-500' };
    if (score >= 50) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', progress: 'bg-amber-500' };
    return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', progress: 'bg-rose-500' };
  };

  const confidenceStyle = confidenceScore !== null ? getConfidenceColor(confidenceScore) : null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 max-w-6xl mx-auto space-y-5 text-slate-800"
    >
      {/* Premium SaaS Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">SaaS Multi-threaded OCR Suite</h1>
            <span className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 font-medium rounded-full border border-indigo-100 flex items-center gap-1">
              <Zap className="w-3 h-3 text-indigo-500 fill-indigo-200" />
              Event-Loop Isolated
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Local Sharp image enhancements & local Tesseract processing operating on independent CPU worker threads.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left Panel: Stepper or Preview (6 cols) */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col flex-grow min-h-[500px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-md font-semibold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-500" />
                Capture Diary
              </h2>
              <div className="flex gap-2">
                {isCameraActive ? (
                  <button 
                    onClick={stopCamera}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg flex items-center gap-1 transition"
                  >
                    <X className="w-3.5 h-3.5" /> Stop Feed
                  </button>
                ) : (
                  <button 
                    onClick={startCamera}
                    className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg border border-indigo-100/50 flex items-center gap-1 transition"
                  >
                    <Camera className="w-3.5 h-3.5" /> Live Camera
                  </button>
                )}
              </div>
            </div>

            {/* Main Interactive Capture Area */}
            <div className="relative flex-grow flex flex-col justify-center items-center rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden min-h-[320px] transition-all">
              
              {/* Drag and Drop Active Overlay */}
              <div 
                ref={dragRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-indigo-50/90 text-indigo-700 backdrop-blur-sm transition-opacity duration-200 ${isDragging ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
              >
                <Upload className="w-10 h-10 animate-bounce mb-2" />
                <p className="font-semibold">Drop the Image Here</p>
                <p className="text-xs mt-1">Enhancements will run in parallel thread</p>
              </div>

              {/* State 1: Active Camera Feed */}
              {isCameraActive && (
                <div className="absolute inset-0 flex flex-col bg-black">
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover flex-grow"
                    playsInline 
                    muted 
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
                    <button 
                      onClick={capturePhoto}
                      className="p-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-lg border-4 border-white active:scale-95 transition-all"
                      title="Capture Image"
                    >
                      <Camera className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )}

              {/* State 2: Image Preview & Scan Progress Line */}
              {imagePreview && !isCameraActive && (
                <div className="w-full h-full flex justify-center items-center relative overflow-hidden bg-slate-900 rounded-lg">
                  <img src={imagePreview} alt="Preview" className="max-w-full max-h-[380px] object-contain" />
                  
                  {/* Digital Scanning Laser Animation */}
                  {isScanning && (
                    <motion.div 
                      initial={{ top: '0%' }}
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_10px_rgba(99,102,241,0.8)] z-20"
                    />
                  )}
                  
                  {/* Action Overlay */}
                  {!isScanning && (
                    <div className="absolute top-2 right-2 flex gap-1.5 z-20">
                      <button 
                        onClick={() => { setImagePreview(null); setSelectedFile(null); }}
                        className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition"
                        title="Clear Image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* State 3: Default Empty State */}
              {!imagePreview && !isCameraActive && (
                <div 
                  className="flex flex-col items-center justify-center p-6 text-center cursor-pointer h-full w-full hover:bg-slate-100/50 transition duration-150"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                >
                  <div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl mb-3 border border-indigo-100">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm">Upload Diary Image</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                    Drag & drop or tap to browse. English + Hindi supported locally.
                  </p>
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
            
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>

        {/* Right Panel: Stepper Pipeline or Scan Results (6 cols) */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col flex-grow min-h-[500px]">
            
            {/* Conditional header tabs when scanning vs complete */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-b border-slate-100 pb-3 gap-2">
              <h2 className="text-md font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                {isScanning ? 'Scan Processing Pipeline' : 'Extracted Results'}
              </h2>
              
              {/* Tab Navigation */}
              {!isScanning && rawOcrText && (
                <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs self-start sm:self-auto border border-slate-200">
                  <button 
                    onClick={() => setActiveTab('structured')}
                    className={`px-3 py-1 rounded-md font-medium transition ${activeTab === 'structured' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Structured Entries ({scannedData.length})
                  </button>
                  <button 
                    onClick={() => setActiveTab('raw')}
                    className={`px-3 py-1 rounded-md font-medium transition ${activeTab === 'raw' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Raw Text
                  </button>
                </div>
              )}
            </div>

            {/* Results Body */}
            <div className="flex-grow flex flex-col justify-between mt-4">
              
              {/* STATE 1: Animated Stepper Pipeline (Active Scanning) */}
              {isScanning && (
                <div className="flex-grow flex flex-col justify-center py-6 px-2">
                  <div className="space-y-5 relative">
                    {/* Vertical connecting line */}
                    <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-slate-100 z-0">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${(scanStep / (steps.length - 1)) * 100}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full w-full bg-indigo-500"
                      />
                    </div>

                    {steps.map((step, idx) => {
                      const StepIcon = step.icon;
                      const isCompleted = scanStep > idx;
                      const isActive = scanStep === idx;
                      
                      return (
                        <motion.div 
                          key={step.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex items-start gap-4 relative z-10"
                        >
                          {/* Step Badge */}
                          <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${
                            isCompleted ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                            isActive ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 scale-105' :
                            'bg-white border-slate-200 text-slate-400'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5 fill-emerald-100" />
                            ) : isActive ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <StepIcon className="w-4 h-4" />
                            )}
                          </div>

                          {/* Step Content */}
                          <div className="text-left">
                            <h4 className={`text-sm font-semibold transition ${isActive ? 'text-indigo-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                              {step.label}
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                              {step.desc}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STATE 2: Content Loaded (Render tabs & metrics) */}
              {!isScanning && rawOcrText && (
                <div className="flex-grow flex flex-col justify-between">
                  
                  {/* Info Panel: Score Bar, warnings, and system diagnostics */}
                  <div className="space-y-2 mb-4">
                    {confidenceScore !== null && confidenceStyle && (
                      <div className={`p-3 rounded-xl border ${confidenceStyle.bg} ${confidenceStyle.border} ${confidenceStyle.text} flex flex-col gap-2`}>
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="flex items-center gap-1">
                            <Info className="w-3.5 h-3.5" /> Local OCR Confidence Score:
                          </span>
                          <span>{confidenceScore}%</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200/50 rounded-full h-2 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${confidenceScore}%` }}
                            transition={{ duration: 0.8 }}
                            className={`h-full ${confidenceStyle.progress}`}
                          />
                        </div>

                        {/* Collapsible Diagnostic Metrics Dashboard */}
                        {performanceMetrics && (
                          <div className="mt-1 pt-1.5 border-t border-slate-200/30">
                            <button 
                              onClick={() => setShowMetrics(!showMetrics)}
                              className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 select-none opacity-85 hover:opacity-100 transition"
                            >
                              {showMetrics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              System Diagnostics {showMetrics ? 'Hide' : 'Show'}
                            </button>

                            <AnimatePresence>
                              {showMetrics && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-dashed border-slate-200/40 text-[10px] leading-relaxed text-slate-600 bg-white/40 p-2 rounded-lg"
                                >
                                  <div>
                                    <span className="font-semibold">Resolution:</span> {imageMetadata?.width || 'N/A'} x {imageMetadata?.height || 'N/A'} px
                                  </div>
                                  <div>
                                    <span className="font-semibold">Binarized:</span> Yes (Pure B&W)
                                  </div>
                                  <div>
                                    <span className="font-semibold">Auto-Aligned:</span> {imageMetadata?.autoRotated ? 'Yes (EXIF)' : 'No'}
                                  </div>
                                  <div>
                                    <span className="font-semibold">Upscaled:</span> {imageMetadata?.hasResized ? 'Yes (to 2000px)' : 'No'}
                                  </div>
                                  <div>
                                    <span className="font-semibold">Noise Filter:</span> 1px Median Clean
                                  </div>
                                  <div>
                                    <span className="font-semibold">Sharp Preprocess:</span> {performanceMetrics.preprocessingDuration}ms
                                  </div>
                                  <div>
                                    <span className="font-semibold">Tesseract OCR:</span> {performanceMetrics.ocrDuration}ms
                                  </div>
                                  <div>
                                    <span className="font-semibold">Worker Event Sync:</span> {performanceMetrics.workerDuration}ms
                                  </div>
                                  <div className="col-span-2 pt-1 border-t border-slate-200/20 font-semibold text-slate-700">
                                    <span className="font-semibold text-slate-500 text-[9px] uppercase tracking-wider block">Parser Extraction Mode</span>
                                    <span className={isAiParsed ? "text-indigo-600 flex items-center gap-1 mt-0.5" : "text-emerald-600 flex items-center gap-1 mt-0.5"}>
                                      {isAiParsed ? <Sparkles className="w-3 h-3 text-indigo-500" /> : <Cpu className="w-3 h-3 text-emerald-500" />}
                                      {isAiParsed ? 'AI Structured Layer (Gemini)' : 'Offline Local Rules Engine (Fuzzy + Regex)'}
                                    </span>
                                  </div>
                                  <div className="col-span-2 pt-1 border-t border-slate-200/20 flex items-center gap-1 font-semibold text-indigo-700">
                                    <Clock className="w-3 h-3 shrink-0" /> Total Thread Sync: {performanceMetrics.totalServiceDuration}ms (Main thread isolated)
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Gemini warnings */}
                    {aiWarning && (
                      <div className="p-2.5 bg-amber-50 border border-amber-100 text-amber-800 rounded-lg text-xs flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">AI Structuring Alert</p>
                          <p className="text-[10px] mt-0.5">{aiWarning}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TAB 1: Structured Entries */}
                  {activeTab === 'structured' && (
                    <div className="flex-grow overflow-y-auto max-h-[300px] pr-1 space-y-3">
                      {scannedData.length > 0 ? (
                        <AnimatePresence>
                          {scannedData.map((entry, idx) => (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              className="p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100/50 transition flex flex-col gap-2.5"
                            >
                              {/* Header info */}
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                  {entry.labourer_id ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <ShieldAlert className="w-4 h-4 text-amber-500 hover:cursor-help" title="Unmatched Name" />
                                  )}
                                  <input 
                                    type="text" 
                                    value={entry.labourerName || ''} 
                                    onChange={(e) => handleEditEntry(idx, 'labourerName', e.target.value)}
                                    className="font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white px-1 outline-none text-sm w-36 text-slate-800"
                                    placeholder="Labourer Name"
                                  />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <input 
                                    type="date" 
                                    value={entry.date || ''} 
                                    onChange={(e) => handleEditEntry(idx, 'date', e.target.value)}
                                    className="text-xs bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white px-1.5 py-0.5 rounded outline-none text-slate-500 font-medium"
                                  />
                                  <button
                                    onClick={() => handleRejectEntry(idx)}
                                    className="p-1 hover:bg-slate-200 text-rose-500 rounded-md transition"
                                    title="Reject Record"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Input metrics */}
                              <div className="grid grid-cols-3 gap-2.5">
                                <div>
                                  <label className="text-[10px] text-slate-400 font-medium block mb-0.5">Task Type</label>
                                  <input 
                                    type="text" 
                                    value={entry.taskType || ''} 
                                    onChange={(e) => handleEditEntry(idx, 'taskType', e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 text-slate-700"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400 font-medium block mb-0.5">Qty (meters)</label>
                                  <input 
                                    type="number" 
                                    value={entry.meters || 0} 
                                    onChange={(e) => handleEditEntry(idx, 'meters', e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 text-slate-700"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400 font-medium block mb-0.5">Payment (₹)</label>
                                  <input 
                                    type="number" 
                                    value={entry.payment || 0} 
                                    onChange={(e) => handleEditEntry(idx, 'payment', e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 text-slate-700"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 text-center">
                          <Info className="w-8 h-8 opacity-25 mb-2 text-indigo-500" />
                          <p className="text-sm font-semibold">No structured entries parsed.</p>
                          <p className="text-xs text-slate-400 max-w-[280px] mt-0.5">
                            AI parsing skipped. Click raw text tab to copy and record information manually.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: Raw Text Extraction */}
                  {activeTab === 'raw' && (
                    <div className="flex-grow flex flex-col justify-between overflow-hidden">
                      <div className="relative bg-slate-50 border border-slate-100 rounded-xl p-3 flex-grow overflow-y-auto max-h-[280px]">
                        <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed select-all">
                          {rawOcrText}
                        </pre>
                        <button 
                          onClick={handleCopyRawText}
                          className="absolute top-2 right-2 p-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg shadow-sm border border-slate-200 transition"
                          title="Copy Raw Text"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bottom buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between gap-3 shrink-0">
                    <button 
                      onClick={() => {
                        if (selectedFile) {
                          processImageFile(selectedFile);
                        } else {
                          toast.error('Please upload an image first.');
                        }
                      }}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry Scan
                    </button>
                    
                    <button 
                      onClick={handleSaveAll}
                      disabled={scannedData.length === 0 || isSaving}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save {scannedData.length} Entries
                    </button>
                  </div>

                </div>
              )}

              {/* State 3: Default Empty Results State */}
              {!isScanning && !rawOcrText && (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-400 py-12 text-center">
                  <div className="p-3 bg-slate-50 text-slate-300 rounded-full mb-3 border border-slate-100">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-slate-700 text-sm">Extracted Records Panel</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                    Once you upload or capture a diary page, character extraction will execute in real-time.
                  </p>
                </div>
              )}

            </div>

          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default OcrScanner;
