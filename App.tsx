import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Package, 
  MapPin, 
  Plus, 
  Search, 
  QrCode, 
  Camera, 
  ArrowRight, 
  Printer, 
  Move, 
  Trash2,
  Sparkles,
  ChevronLeft,
  Loader2,
  Box as BoxIcon,
  Palette,
  Hammer,
  Filter,
  X,
  AlertTriangle,
  Mic,
  Square,
  MessageSquare,
  Send,
  Bot,
  Settings,
  Download,
  Upload,
  Copy,
  Share2,
  Check,
  FilePenLine,
  RefreshCw
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { v4 as uuidv4 } from 'uuid';
import { Chat } from "@google/genai";

import { Location, Box, Item } from './types';
import * as storage from './services/storageService';
import { analyzeItemImage, analyzeItemAudio, createInventoryChat } from './services/geminiService';
import { QRScanner } from './components/QRScanner';

// --- UI COMPONENTS ---

const PageLoader = ({ text = "Loading..." }: { text?: string }) => (
  <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)] bg-gray-50 dark:bg-gray-950">
    <Loader2 className="animate-spin text-indigo-500" size={48} />
    <p className="mt-4 text-gray-500 dark:text-gray-400">{text}</p>
  </div>
);

const ErrorDisplay = ({ message, onRetry }: { message: string; onRetry?: () => void; }) => (
  <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)] bg-gray-50 dark:bg-gray-950 p-4">
    <div className="text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 mx-auto">
            <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Oops! Something went wrong.</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
                <RefreshCw size={16} /> Try Again
            </button>
        )}
    </div>
  </div>
);


const AudioWaveform = ({ stream }: { stream: MediaStream }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current || !stream) return;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    
    source.connect(analyser);
    analyser.fftSize = 2048;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');

    if (!canvasCtx) return;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgba(0, 0, 0, 0)'; // Transparent
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = '#ef4444'; // Tailwind red-500
      canvasCtx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (audioCtx.state !== 'closed') {
        audioCtx.close();
      }
    };
  }, [stream]);

  return (
    <div className="w-full h-16 bg-red-50 dark:bg-red-900/10 rounded-xl overflow-hidden border border-red-100 dark:border-red-900/30 mb-3 flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        width={600} 
        height={100} 
        className="w-full h-full"
      />
    </div>
  );
};

const Navigation = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-3 flex justify-around items-center z-40 pb-safe">
      <Link to="/" className={`flex flex-col items-center ${isActive('/')}`}>
        <Package size={24} />
        <span className="text-xs mt-1 font-medium">Boxes</span>
      </Link>
      <Link to="/locations" className={`flex flex-col items-center ${isActive('/locations')}`}>
        <MapPin size={24} />
        <span className="text-xs mt-1 font-medium">Locations</span>
      </Link>
      <Link to="/chat" className={`flex flex-col items-center ${isActive('/chat')}`}>
        <MessageSquare size={24} />
        <span className="text-xs mt-1 font-medium">Assistant</span>
      </Link>
    </nav>
  );
};

const Header: React.FC<{ title: string; backTo?: string; action?: React.ReactNode }> = ({ title, backTo, action }) => {
  return (
    <header className="sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between z-30">
      <div className="flex items-center gap-3">
        {backTo && (
          <Link to={backTo} className="p-1 -ml-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <ChevronLeft size={24} />
          </Link>
        )}
        <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{title}</h1>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </header>
  );
};

const ConfirmDialog = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Delete", 
  isDestructive = false 
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  isDestructive?: boolean;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
            {isDestructive ? <AlertTriangle size={24} /> : <Sparkles size={24} />}
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex bg-gray-50 dark:bg-gray-800 p-4 gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${isDestructive ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- PAGES ---

const SettingsPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    try {
      const data = await storage.getExportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `boxtrack_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Failed to export data.");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const { success } = await storage.importData(json);
        if (success) {
          setImportStatus({ type: 'success', msg: 'Data restored successfully! Please refresh.' });
        } else {
          setImportStatus({ type: 'error', msg: 'Invalid backup file or server error.' });
        }
      } catch (err) {
        setImportStatus({ type: 'error', msg: 'Failed to parse file.' });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  const handleShareToGemini = async () => {
    try {
        const inventoryText = await storage.generateHumanReadableInventory();
        const prompt = `You are my Inventory Assistant. Here is my current home inventory data. Please memorize it so I can ask you questions about where my things are.\n\n${inventoryText}\n\n[End of Data]\n\nI am ready to ask questions now.`;
        
        if (navigator.share) {
            await navigator.share({
              title: 'BoxTrack Inventory',
              text: prompt,
            });
        } else {
          copyToClipboard(prompt);
        }
    } catch (err) {
      alert("Could not generate inventory context. Please try again.");
      copyToClipboard("Failed to generate prompt. Please copy your inventory manually.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="pb-24 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <Header title="Settings & Data" backTo="/" />
      
      <div className="p-4 space-y-6">
        {/* Gemini Integration Section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/20">
              <Bot size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ask External Gemini</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Integrate with the Android App</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
            Want to ask the official Google Gemini app about your boxes? Use this to generate a "Context Prompt" containing all your items, then share it to Gemini.
          </p>

          <button 
            onClick={handleShareToGemini}
            className="w-full py-3 px-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-100 dark:border-indigo-900/50"
          >
            {copied ? <Check size={18} /> : <Share2 size={18} />}
            {copied ? "Copied to Clipboard!" : "Share Context to Gemini App"}
          </button>
          <p className="text-[10px] text-center text-gray-400 mt-2">
            Tip: If the Gemini app doesn't appear in the share sheet, the text is copied to your clipboard. Just paste it into Gemini!
          </p>
        </div>

        {/* Data Management Section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gray-100 dark:bg-gray-800 p-2.5 rounded-xl text-gray-600 dark:text-gray-400">
              <Settings size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Data Management</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Backup & Restore</p>
            </div>
          </div>

          <div className="space-y-3">
             <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 bg-green-50 dark:bg-green-900/10 p-3 rounded-lg border border-green-100 dark:border-green-900/30 text-center">
              Your data is now stored on a secure backend.
            </p>

            <button 
              onClick={handleExport}
              className="w-full py-3 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl font-medium border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Download size={18} /> Download Backup (JSON)
            </button>

            <div className="relative">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl font-medium border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Upload size={18} /> Restore Backup
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImport}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>

          {importStatus && (
            <div className={`mt-4 p-3 rounded-lg text-sm text-center font-medium ${importStatus.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
              {importStatus.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const HomePage = () => {
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterColor, setFilterColor] = useState('');
  
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [fetchedBoxes, fetchedItems, fetchedLocations] = await Promise.all([
        storage.getBoxes(),
        storage.getItems(),
        storage.getLocations(),
      ]);
      setBoxes(fetchedBoxes);
      setItems(fetchedItems);
      setLocations(fetchedLocations);
    } catch (err) {
      setError("Failed to load inventory. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleScan = (data: string) => {
    setShowScanner(false);
    navigate(`/box/${data}`);
  };

  const uniqueMaterials = Array.from(new Set(items.map(i => i.material).filter(Boolean) as string[])).sort();
  const uniqueColors = Array.from(new Set(items.map(i => i.color).filter(Boolean) as string[])).sort();

  const filteredBoxes = boxes.filter(box => {
    const boxItems = items.filter(i => i.boxId === box.id);
    const term = search.toLowerCase();
    const boxNameMatch = box.name.toLowerCase().includes(term);
    const itemsTextMatch = boxItems.some(item => 
      item.name.toLowerCase().includes(term) ||
      (item.description && item.description.toLowerCase().includes(term)) ||
      (item.material && item.material.toLowerCase().includes(term)) ||
      (item.color && item.color.toLowerCase().includes(term))
    );
    const matchesText = !term || boxNameMatch || itemsTextMatch;
    const matchesMaterial = !filterMaterial || boxItems.some(i => i.material?.toLowerCase() === filterMaterial.toLowerCase());
    const matchesColor = !filterColor || boxItems.some(i => i.color?.toLowerCase() === filterColor.toLowerCase());
    return matchesText && matchesMaterial && matchesColor;
  });

  const activeFiltersCount = (filterMaterial ? 1 : 0) + (filterColor ? 1 : 0);

  const renderContent = () => {
    if (isLoading) return <PageLoader text="Loading your inventory..." />;
    if (error) return <ErrorDisplay message={error} onRetry={fetchData} />;

    return (
      <div className="p-4 space-y-4">
        {/* Search & Actions */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <input 
              type="text"
              placeholder="Search items..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm shadow-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-xl shadow-sm border transition-colors relative ${showFilters || activeFiltersCount > 0 ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
          >
            <Filter size={24} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[10px] flex items-center justify-center rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setShowScanner(true)}
            className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-colors"
          >
            <QrCode size={24} />
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filters</h3>
              {(filterMaterial || filterColor) && (
                <button 
                  onClick={() => { setFilterMaterial(''); setFilterColor(''); }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-medium"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Material</label>
                <select 
                  className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                  value={filterMaterial}
                  onChange={e => setFilterMaterial(e.target.value)}
                >
                  <option value="">Any Material</option>
                  {uniqueMaterials.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Color</label>
                <select 
                  className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                  value={filterColor}
                  onChange={e => setFilterColor(e.target.value)}
                >
                  <option value="">Any Color</option>
                  {uniqueColors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
            <div className="text-indigo-600 dark:text-indigo-400 font-bold text-2xl">{boxes.length}</div>
            <div className="text-indigo-400 dark:text-indigo-300 text-xs font-medium uppercase tracking-wide">Total Boxes</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
            <div className="text-emerald-600 dark:text-emerald-400 font-bold text-2xl">{items.length}</div>
            <div className="text-emerald-400 dark:text-emerald-300 text-xs font-medium uppercase tracking-wide">Total Items</div>
          </div>
        </div>

        {/* List */}
        <div className="mt-6">
          <h2 className="text-gray-900 dark:text-white font-semibold mb-3 flex items-center justify-between">
            <span>Your Boxes</span>
            <Link 
              to="/box/new" 
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1 shadow-md hover:bg-indigo-700 transition-colors"
            >
              <Plus size={18} /> New Box
            </Link>
          </h2>
          
          {filteredBoxes.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <Package className="mx-auto mb-2 opacity-50" size={48} />
              <p>No boxes found.</p>
              {search && <p className="text-xs mt-1">Try adjusting your search or filters.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBoxes.map(box => {
                const location = locations.find(l => l.id === box.locationId);
                const itemCount = items.filter(i => i.boxId === box.id).length;
                
                return (
                  <Link key={box.id} to={`/box/${box.id}`} className="block bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{box.name}</h3>
                        <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs mt-1">
                          <MapPin size={12} className="mr-1" />
                          {location?.name || 'Unknown Location'}
                        </div>
                      </div>
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs font-medium">
                        {itemCount} items
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-24">
      {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
      <Header 
        title="BoxTrack AI" 
        action={
          <Link to="/settings" className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <Settings size={22} />
          </Link>
        }
      />
      {renderContent()}
    </div>
  );
};

const LocationsPage = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedLocations, fetchedBoxes] = await Promise.all([
        storage.getLocations(),
        storage.getBoxes()
      ]);
      setLocations(fetchedLocations);
      setBoxes(fetchedBoxes);
    } catch (err) {
      setError("Failed to load locations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      const newLoc = await storage.addLocation({ name: newName });
      setLocations(prev => [...prev, newLoc]);
      setNewName('');
      setIsAdding(false);
    } catch (err) {
      alert("Failed to add location.");
    }
  };

  const handleDelete = async () => {
    if (locationToDelete) {
      try {
        await storage.deleteLocation(locationToDelete.id);
        setLocations(prev => prev.filter(l => l.id !== locationToDelete.id));
        setLocationToDelete(null);
      } catch (err) {
        alert("Failed to delete location.");
      }
    }
  };

  const getDeleteMessage = () => {
    if (!locationToDelete) return "";
    const boxCount = boxes.filter(b => b.locationId === locationToDelete.id).length;
    if (boxCount > 0) {
      return `This location is assigned to ${boxCount} box${boxCount === 1 ? '' : 'es'}. Deleting it will unassign them (this action may vary based on backend implementation).`;
    }
    return "Are you sure you want to delete this location?";
  };

  const renderContent = () => {
    if (isLoading) return <PageLoader text="Loading locations..." />;
    if (error) return <ErrorDisplay message={error} onRetry={fetchData} />;

    return (
      <div className="p-4">
        {isAdding && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-4 animate-in fade-in slide-in-from-top-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Add New Location</h3>
            <div className="flex gap-2">
              <input 
                autoFocus
                type="text"
                placeholder="e.g., Garage, Attic, Basement"
                className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {locations.map(loc => (
            <div key={loc.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <MapPin size={20} />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">{loc.name}</span>
              </div>
              <button 
                onClick={() => setLocationToDelete(loc)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                aria-label="Delete location"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {locations.length === 0 && !isAdding && (
            <div className="text-center py-10 text-gray-400 dark:text-gray-500">
              <p>No locations yet. Tap + to add one.</p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="pb-24">
      <Header 
        title="Locations" 
        action={
          <button onClick={() => setIsAdding(true)} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 p-2 rounded-lg">
            <Plus size={24} />
          </button>
        }
      />
      {renderContent()}
      <ConfirmDialog
        isOpen={!!locationToDelete}
        title="Delete Location"
        message={getDeleteMessage()}
        onConfirm={handleDelete}
        onCancel={() => setLocationToDelete(null)}
        isDestructive={true}
      />
    </div>
  );
};

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

const ChatPage = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: 'Hi! I\'m your BoxTrack Assistant. Ask me anything about your inventory, like "Where is my drill?" or "What is in the attic?".' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const locations = await storage.getLocations();
        const boxes = await storage.getBoxes();
        const items = await storage.getItems();

        const inventoryData = boxes.map(box => {
          const locName = locations.find(l => l.id === box.locationId)?.name || 'Unknown';
          const boxItems = items.filter(i => i.boxId === box.id).map(i => ({
            name: i.name,
            description: i.description,
            material: i.material,
            color: i.color
          }));
          return {
            boxName: box.name,
            location: locName,
            contents: boxItems
          };
        });

        chatSessionRef.current = createInventoryChat(JSON.stringify(inventoryData, null, 2));
      } catch (error) {
        setMessages(prev => [...prev, { id: uuidv4(), role: 'model', text: "Sorry, I couldn't load your inventory data to start the chat.", isError: true }]);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !chatSessionRef.current || isLoading) return;

    const userText = input.trim();
    setInput('');
    setIsLoading(true);
    
    setMessages(prev => [...prev, { id: uuidv4(), role: 'user', text: userText }]);

    try {
      const response = await chatSessionRef.current.sendMessage({ message: userText });
      const text = response.text;
      setMessages(prev => [...prev, { id: uuidv4(), role: 'model', text: text || '' }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: uuidv4(), role: 'model', text: "Sorry, I had trouble connecting to the AI. Please try again.", isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pb-24 flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Header title="Assistant" />
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : msg.isError 
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-bl-none'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-none'
              }`}
            >
              {msg.role === 'model' && !msg.isError && (
                <div className="flex items-center gap-1 mb-1 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wide">
                  <Bot size={12} /> BoxTrack AI
                </div>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {(isLoading || isInitializing) && (
          <div className="flex justify-start">
             <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about your inventory..."
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-500"
            disabled={isLoading || isInitializing}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading || isInitializing}
            className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

const BoxFormPage = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Location[]>([]);
  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const locs = await storage.getLocations();
        setLocations(locs);
        if (locs.length > 0) setLocationId(locs[0].id);
      } catch (err) {
        // Error is handled by showing disabled state
        console.error("Failed to load locations for new box form");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLocations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !locationId) return;

    try {
      const newBoxData = { locationId, name, description };
      const newBox = await storage.addBox(newBoxData);
      navigate(`/box/${newBox.id}`);
    } catch (err) {
      alert("Failed to create box. Please try again.");
    }
  };

  if (isLoading) return <PageLoader text="Loading form..." />;

  return (
    <div className="pb-10">
      <Header title="Create Box" backTo="/" />
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Box Name/Number</label>
          <input 
            type="text" 
            required
            placeholder="e.g., Box #42 - Winter Clothes"
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
          {locations.length === 0 ? (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm border border-yellow-200 dark:border-yellow-900/50">
              Please create a location first. <Link to="/locations" className="underline font-bold">Go to Locations</Link>
            </div>
          ) : (
            <select 
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white"
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
            >
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
          <textarea 
            rows={3}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <button 
          type="submit"
          disabled={locations.length === 0}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold text-lg shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Box
        </button>
      </form>
    </div>
  );
};

const BoxDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [box, setBox] = useState<Box | undefined>();
  const [locationName, setLocationName] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [allBoxes, setAllBoxes] = useState<Box[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showPrintLabel, setShowPrintLabel] = useState(false);
  const [isMovingItem, setIsMovingItem] = useState<string | null>(null);
  const [showDeleteBoxConfirm, setShowDeleteBoxConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [b, allLocs, allItems, everyBox] = await Promise.all([
        storage.getBoxById(id),
        storage.getLocations(),
        storage.getItems(),
        storage.getBoxes()
      ]);
      
      if (b) {
        setBox(b);
        const loc = allLocs.find(l => l.id === b.locationId);
        setLocationName(loc?.name || 'Unknown');
        setItems(allItems.filter(i => i.boxId === b.id));
        setAllBoxes(everyBox);
      } else {
        setError("Box not found.");
      }
    } catch (err) {
      setError("Failed to load box details.");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [id]);

  const handleMoveItem = async (targetBoxId: string) => {
    if (isMovingItem && id) {
      try {
        await storage.moveItem(isMovingItem, targetBoxId);
        setItems(prev => prev.filter(i => i.id !== isMovingItem));
        setIsMovingItem(null);
      } catch (err) {
        alert("Failed to move item.");
      }
    }
  };

  const handleConfirmDeleteBox = async () => {
    if (!box) return;
    try {
      await storage.deleteBox(box.id);
      setShowDeleteBoxConfirm(false);
      navigate('/', { replace: true });
    } catch (err) {
      alert("Failed to delete box.");
    }
  };

  const handleConfirmDeleteItem = async () => {
    if (itemToDelete) {
      try {
        await storage.deleteItem(itemToDelete);
        setItems(prev => prev.filter(i => i.id !== itemToDelete));
        setItemToDelete(null);
      } catch (err) {
        alert("Failed to delete item.");
      }
    }
  };

  const renderContent = () => {
    if (isLoading) return <PageLoader text="Loading box details..." />;
    if (error) return <ErrorDisplay message={error} onRetry={fetchData} />;
    if (!box) return <ErrorDisplay message="This box could not be found." />;

    return (
      <>
        <div className="bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center text-gray-500 dark:text-gray-400 mb-2">
            <MapPin size={16} className="mr-1" />
            <span className="text-sm font-medium">{locationName}</span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{box.description || "No description provided."}</p>
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
            <span>Contents ({items.length})</span>
          </h3>

          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex">
                <div className="w-16 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center border-r border-gray-100 dark:border-gray-700 flex-shrink-0">
                  <BoxIcon className="text-gray-300 dark:text-gray-500" size={24} />
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white leading-tight mb-1">{item.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{item.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.material && <span className="inline-flex items-center text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full uppercase tracking-wider">{item.material}</span>}
                      {item.color && <span className="inline-flex items-center text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full uppercase tracking-wider"><Palette size={10} className="mr-1" />{item.color}</span>}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <Link to={`/box/${box.id}/edit-item/${item.id}`} className="p-1.5 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors" title="Edit Item"><FilePenLine size={16} /></Link>
                    <button onClick={() => setIsMovingItem(item.id)} className="p-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors" title="Move Item"><Move size={16} /></button>
                    <button onClick={() => setItemToDelete(item.id)} className="p-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors" title="Delete"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="text-center py-8 text-gray-400 dark:text-gray-500 italic">This box is empty.</div>}
          </div>
        </div>

        <Link to={`/box/${box.id}/add-item`} className="fixed bottom-20 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-xl shadow-indigo-500/40 hover:bg-indigo-700 active:scale-95 transition-all z-10"><Plus size={28} /></Link>
      </>
    );
  };

  return (
    <div className="pb-24 relative">
      <Header 
        title={box?.name || "..."}
        backTo="/" 
        action={
          <>
            <Link to={`/box/${id}/edit`} className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors" title="Edit Box"><FilePenLine size={24} /></Link>
            <button onClick={() => setShowDeleteBoxConfirm(true)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-full transition-colors" title="Delete Box"><Trash2 size={24} /></button>
            <button onClick={() => setShowPrintLabel(true)} className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors" title="Print Label"><Printer size={24} /></button>
          </>
        }
      />
      {renderContent()}

      <ConfirmDialog isOpen={showDeleteBoxConfirm} title="Delete Box" message={`Are you sure you want to delete "${box?.name}"? This will also permanently delete all ${items.length} items inside it.`} onConfirm={handleConfirmDeleteBox} onCancel={() => setShowDeleteBoxConfirm(false)} isDestructive={true} />
      <ConfirmDialog isOpen={!!itemToDelete} title="Delete Item" message="Are you sure you want to delete this item?" onConfirm={handleConfirmDeleteItem} onCancel={() => setItemToDelete(null)} isDestructive={true} />
      
      {showPrintLabel && box && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">Box Label</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Print and stick this on your box</p>
            <div className="border-4 border-black p-4 inline-block bg-white text-black" id="printable-area">
              <h2 className="text-2xl font-black text-black mb-4 uppercase tracking-tighter">{box.name}</h2>
              <div className="flex justify-center mb-4"><QRCode value={box.id} size={160} /></div>
              <p className="text-xs font-mono text-gray-500">{box.id}</p>
              <p className="text-sm font-bold mt-2 text-black">{locationName}</p>
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setShowPrintLabel(false)} className="flex-1 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">Close</button>
              <button onClick={() => window.print()} className="flex-1 py-3 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2"><Printer size={18} /> Print</button>
            </div>
          </div>
        </div>
      )}
      
      {isMovingItem && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md sm:mx-auto max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Move Item To...</h3>
              <button onClick={() => setIsMovingItem(null)}><XButton /></button>
            </div>
            <div className="overflow-y-auto space-y-2 flex-1">
              {allBoxes.filter(b => b.id !== id).map(b => (
                <button key={b.id} onClick={() => handleMoveItem(b.id)} className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-gray-200">{b.name}</span>
                  <ArrowRight size={16} className="text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AddItemPage = () => {
  const { boxId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [material, setMaterial] = useState('');
  const [color, setColor] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeItemImage(image);
      setName(result.name);
      setDescription(result.description);
      setMaterial(result.material);
      setColor(result.color);
    } catch (err) {
      alert("Failed to analyze image. Please try again or enter details manually.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      setRecordingStream(null);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setRecordingStream(stream);
        
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };

        mediaRecorder.onstop = async () => {
          const mimeType = mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            setIsAnalyzing(true);
            try {
              const result = await analyzeItemAudio(base64Audio);
              setName(result.name);
              setDescription(result.description);
              setMaterial(result.material);
              setColor(result.color);
            } catch (err) {
              alert("Failed to analyze audio. Please try again or enter details manually.");
            } finally {
              setIsAnalyzing(false);
              stream.getTracks().forEach(track => track.stop());
            }
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Microphone access denied or unavailable.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boxId || !name) return;

    try {
      const newItemData = { boxId, name, description, material, color };
      await storage.addItem(newItemData);
      navigate(`/box/${boxId}`);
    } catch (err) {
      alert("Failed to save item. Please try again.");
    }
  };

  return (
    <div className="pb-10">
      <Header title="Add Item" backTo={`/box/${boxId}`} />
      
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Image & Voice Section */}
        <div className="space-y-3">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`w-full h-64 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden relative transition-all ${image ? 'border-indigo-500 bg-gray-900' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            {image ? (
              <img src={image} alt="Preview" className="w-full h-full object-contain" />
            ) : (
              <>
                <Camera size={48} className="text-gray-300 dark:text-gray-500 mb-2" />
                <span className="text-gray-500 dark:text-gray-400 font-medium">Tap to take photo</span>
              </>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" capture="environment" />
          </div>

          {isRecording && recordingStream && <AudioWaveform stream={recordingStream} />}

          <div className="flex gap-3">
            {image && (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || isRecording}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isAnalyzing && !isRecording ? ( <><Loader2 className="animate-spin" size={20} /> Analyzing...</> ) : ( <><Sparkles size={20} /> Analyze Image</> )}
              </button>
            )}
            
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isAnalyzing && !isRecording}
              className={`flex-1 py-3 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 transition-all ${ isRecording ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200 dark:ring-red-900' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600' }`}
            >
              {isRecording ? ( <><Square size={20} fill="currentColor" /> Stop & Analyze</> ) : ( <><Mic size={20} /> Voice Input</> )}
            </button>
          </div>
          
          {isAnalyzing && isRecording === false && !image && (
             <div className="text-center text-sm text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2 py-2">
                <Loader2 className="animate-spin" size={16} /> Processing audio...
             </div>
          )}
        </div>

        {/* Fields */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Item Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" placeholder="What is it?" />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Hammer size={12} /> Material</label>
              <input type="text" value={material} onChange={e => setMaterial(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" placeholder="e.g. Plastic" />
            </div>
             <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Palette size={12} /> Color</label>
              <input type="text" value={color} onChange={e => setColor(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" placeholder="e.g. Red" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Description</label>
            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" placeholder="Brief details..." />
          </div>
        </div>

        <button type="submit" className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-4 rounded-xl font-bold text-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">Save Item</button>
      </form>
    </div>
  );
};

const EditItemPage = () => {
  const { boxId, itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);

  useEffect(() => {
    if (itemId) {
      storage.getItemById(itemId)
        .then(existingItem => {
          if (existingItem) setItem(existingItem);
          else if (boxId) navigate(`/box/${boxId}`);
        })
        .catch(() => { if (boxId) navigate(`/box/${boxId}`); });
    }
  }, [itemId, boxId, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!item) return;
    const { name, value } = e.target;
    setItem({ ...item, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boxId || !item || !item.name.trim()) return;
    try {
      await storage.updateItem(item);
      navigate(`/box/${boxId}`);
    } catch (err) {
      alert("Failed to update item.");
    }
  };

  if (!item) return <PageLoader text="Loading item..." />;

  return (
    <div className="pb-10">
      <Header title="Edit Item" backTo={`/box/${boxId}`} />
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Item Name</label>
            <input type="text" name="name" required value={item.name} onChange={handleInputChange} className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-lg text-gray-900 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Hammer size={12} /> Material</label>
              <input type="text" name="material" value={item.material || ''} onChange={handleInputChange} className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-gray-900 dark:text-white" />
            </div>
             <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Palette size={12} /> Color</label>
              <input type="text" name="color" value={item.color || ''} onChange={handleInputChange} className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-gray-900 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Description</label>
            <textarea rows={3} name="description" value={item.description || ''} onChange={handleInputChange} className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-gray-900 dark:text-white" />
          </div>
        </div>
        <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30">Save Changes</button>
      </form>
    </div>
  );
};

const EditBoxPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [box, setBox] = useState<Box | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locs, existingBox] = await Promise.all([
          storage.getLocations(),
          id ? storage.getBoxById(id) : Promise.resolve(null)
        ]);
        setLocations(locs);
        if (existingBox) setBox(existingBox);
        else if (id) navigate('/');
      } catch (err) {
        navigate('/');
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!box) return;
    const { name, value } = e.target;
    setBox({ ...box, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !box || !box.name.trim()) return;
    try {
      await storage.updateBox(box);
      navigate(`/box/${id}`);
    } catch (err) {
      alert("Failed to update box.");
    }
  };

  if (!box) return <PageLoader text="Loading box..." />;

  return (
    <div className="pb-10">
      <Header title="Edit Box" backTo={`/box/${id}`} />
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Box Name/Number</label>
          <input type="text" name="name" required value={box.name} onChange={handleInputChange} className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
          <select name="locationId" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white" value={box.locationId} onChange={handleInputChange}>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
          <textarea rows={3} name="description" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white" value={box.description || ''} onChange={handleInputChange} />
        </div>
        <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold text-lg shadow-lg shadow-indigo-500/30 hover:bg-indigo-700">Save Changes</button>
      </form>
    </div>
  );
};

// Helper Component
const XButton = () => (
  <div className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded-full text-gray-600 dark:text-gray-300">
    <X size={20} />
  </div>
);


// --- MAIN APP ---

export default function App() {
  // The app no longer manages initial data. This should be handled by the backend.
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/locations" element={<LocationsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/box/new" element={<BoxFormPage />} />
        <Route path="/box/:id" element={<BoxDetailPage />} />
        <Route path="/box/:id/edit" element={<EditBoxPage />} />
        <Route path="/box/:boxId/add-item" element={<AddItemPage />} />
        <Route path="/box/:boxId/edit-item/:itemId" element={<EditItemPage />} />
      </Routes>
      <Navigation />
    </HashRouter>
  );
}