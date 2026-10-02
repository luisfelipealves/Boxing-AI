
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
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
  RefreshCw,
  User
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { QRScanner } from './components/QRScanner';
import { VoiceInput } from './components/VoiceInput';
import { v4 as uuidv4 } from 'uuid';
import { Chat, GenerateContentResponse } from "@google/genai";
import { Capacitor, registerPlugin } from '@capacitor/core';

import { Location, Category, Box, Item } from './types';
import * as storage from './services/storageService';
import { analyzeItemImage, analyzeItemAudio, createInventoryChat } from './services/geminiService';
import { getGeminiApiKey, setStoredGeminiApiKey } from './services/geminiKeyService';
import { LABEL_PRINT_CONFIG, buildBoxQrValue } from './services/labelPrintConfig';
import {
  B1_PRO_50X30_PROFILE,
  type NiimbotBridgeDevice,
  type NiimbotBridgeError,
  type NiimbotBridgePermissionsResult,
  type NiimbotBridgeSelectedPrinter,
  type NiimbotNativeBlePrinterPlugin,
} from './services/niimbot';
import { renderBoxLabelRaster } from './services/labelRasterRenderer';
import {
  buildNiimbotPrintRequest,
  getNiimbotErrorPresentation,
  isNiimbotPermissionGranted,
  type NiimbotLabelSnapshot,
  type NiimbotPrintProgressStep,
} from './services/niimbotUi';

const NiimbotBlePrinter = registerPlugin<NiimbotNativeBlePrinterPlugin>('NiimbotBlePrinter');

const getBlockedDeleteMessage = (error: unknown): string | undefined => {
  if (!storage.isDeleteBlockedByDependenciesError(error)) return undefined;

  if (error.entity === 'location' && error.dependency === 'boxes') {
    const noun = error.count === 1 ? 'Box' : 'Boxes';
    return `Não é possível excluir esta Location porque ela contém ${error.count} ${noun}. Mova ou exclua ${error.count === 1 ? 'essa Box' : 'essas Boxes'} primeiro.`;
  }

  if (error.entity === 'box' && error.dependency === 'items') {
    const noun = error.count === 1 ? 'Item' : 'Items';
    return `Não é possível excluir esta Box porque ela contém ${error.count} ${noun}. Mova ou exclua ${error.count === 1 ? 'esse Item' : 'esses Items'} primeiro.`;
  }

  return undefined;
};


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

const GeminiKeySetup = ({ onComplete }: { onComplete: () => void }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    const normalizedApiKey = apiKey.trim();
    if (!normalizedApiKey) {
      setError('Informe uma chave válida para continuar.');
      return;
    }

    if (!setStoredGeminiApiKey(normalizedApiKey)) {
      setError('Não foi possível guardar a chave neste dispositivo.');
      return;
    }
    onComplete();
  };

  const handleSkip = () => {
    try {
      window.sessionStorage.setItem('boxtrack.gemini.key-skipped', 'true');
    } catch {
      // Ignore session storage errors.
    }
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
          <Sparkles size={24} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Configure o Gemini</h1>
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-5">
          Não foi encontrada uma chave no ambiente. Informe a sua chave Gemini para ativar o assistente, o reconhecimento por voz e a análise de imagens.
        </p>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="gemini-api-key">
          Chave da API Gemini
        </label>
        <input
          id="gemini-api-key"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={event => {
            setApiKey(event.target.value);
            setError('');
          }}
          onKeyDown={event => event.key === 'Enter' && handleSave()}
          placeholder="AIza..."
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
        />
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          A chave será guardada apenas neste dispositivo. Ela pode ser lida pela aplicação, portanto não use uma chave com permissões ou limites que não esteja disposto a expor.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Continuar sem IA
          </button>
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar chave
          </button>
        </div>
      </div>
    </div>
  );
};


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
      <div className="flex items-center gap-3 min-w-0">
        {backTo && (
          <Link to={backTo} className="p-1 -ml-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full flex-shrink-0">
            <ChevronLeft size={24} />
          </Link>
        )}
        <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <a
          href="https://www.buymeacoffee.com/luisfelipeg1"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:block transition-transform active:scale-95"
        >
          <img
            src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
            alt="Buy Me A Coffee"
            style={{ height: '36px', width: 'auto' }}
          />
        </a>
        <a
          href="https://www.buymeacoffee.com/luisfelipeg1"
          target="_blank"
          rel="noopener noreferrer"
          className="sm:hidden block p-1.5 bg-[#FFDD00] rounded-lg transition-transform active:scale-95 border border-black/10"
        >
          <img
            src="https://cdn.buymeacoffee.com/widget/assets/images/bmc-btn-logo.svg"
            alt="BMC"
            style={{ height: '20px', width: '20px' }}
          />
        </a>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
    </header>
  );
};

// ... [Setting up standard application routes and pages] ...

const AssistantChat = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatRef = useRef<Chat | null>(null);

  const initChat = async () => {
    const inventory = await storage.generateHumanReadableInventory();
    chatRef.current = createInventoryChat(inventory);
  };

  useEffect(() => {
    initChat();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current || isThinking) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsThinking(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userMsg });
      // Access .text property directly
      setMessages(prev => [...prev, { role: 'bot', text: response.text || "I'm sorry, I couldn't process that." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: "Error communicating with the assistant." }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="pb-24 flex flex-col h-screen">
      <Header title="BoxTrack Assistant" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {isThinking && <div className="text-gray-400 text-sm animate-pulse">Assistant is thinking...</div>}
      </div>
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex gap-2">
        <input
          className="flex-1 bg-gray-100 dark:bg-gray-800 p-3 rounded-xl outline-none dark:text-white"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask about your boxes..."
        />
        <button onClick={handleSend} className="bg-indigo-600 text-white p-3 rounded-xl">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

const HomePage = () => {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [locationOptions, setLocationOptions] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>(storage.DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    // Set up real-time subscription or simple refresh
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [boxesData, locationsData] = await Promise.all([
        storage.getBoxes(),
        storage.getLocations()
      ]);
      let categoriesData = storage.DEFAULT_CATEGORIES;
      try {
        const storedCategories = await storage.getCategories();
        if (storedCategories.length > 0) categoriesData = storedCategories;
      } catch (error) {
        console.error("Failed to load categories, using defaults", error);
      }
      setBoxes(boxesData);
      setCategories(categoriesData);
      setLocationOptions(locationsData);

      const locMap: Record<string, string> = {};
      locationsData.forEach(l => locMap[l.id] = l.name);
      setLocations(locMap);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (data: string) => {
    if (data) {
      // Check if it's a URL or direct ID
      // Expected format: .../#/box/ID or just ID
      let boxId = data;
      if (data.includes('/box/')) {
        const parts = data.split('/box/');
        if (parts.length > 1) {
          boxId = parts[1];
        }
      }

      setIsScanning(false);
      if (boxId) {
        navigate(`/box/${boxId}`);
      } else {
        alert('Invalid QR Code');
      }
    }
  };

  const filteredBoxes = boxes.filter(box =>
    (!categoryFilter || box.categoryId === categoryFilter) &&
    (!locationFilter || box.locationId === locationFilter) &&
    (box.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      box.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const categoryNames: Record<string, string> = {};
  categories.forEach(category => { categoryNames[category.id] = category.name; });

  if (loading) return <PageLoader />;

  return (
    <div className="pb-24 min-h-screen">
      {isScanning && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setIsScanning(false)}
        />
      )}
      <Header
        title="My Boxes"
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setIsScanning(true)} className="text-gray-600 dark:text-gray-300">
              <Camera size={24} />
            </button>
            <button onClick={() => navigate('/settings')} className="text-gray-600 dark:text-gray-300">
              <Settings size={24} />
            </button>
          </div>
        }
      />

      <div className="p-4 sticky top-[60px] z-20 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search boxes..."
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            <select
              aria-label="Filter by category"
              className="w-full appearance-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-3 pl-9 pr-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white text-sm"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <select
            aria-label="Filter by location"
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white text-sm"
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
          >
            <option value="">All locations</option>
            {locationOptions.map(location => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {filteredBoxes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            <Package size={48} className="mb-4 opacity-50" />
            <p>No boxes found.</p>
            <p className="text-sm">Tap + to add your first box.</p>
          </div>
        ) : (
          filteredBoxes.map(box => (
            <div key={box.id} onClick={() => navigate(`/box/${box.id}`)} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 active:scale-[0.98] transition-all cursor-pointer shadow-sm hover:shadow-md">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <BoxIcon size={20} className="text-indigo-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">{box.name}</h3>
                </div>
                <span className={`text-xs font-mono px-2 py-1 rounded ${box.locationId ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-900/30' : 'text-gray-400 bg-gray-100 dark:bg-gray-800'}`}>
                  {box.locationId ? locations[box.locationId] || 'LOCATED' : 'UNASSIGNED'}
                </span>
              </div>
              {box.categoryId && (
                <span className="inline-block text-xs font-medium text-purple-700 bg-purple-50 dark:text-purple-300 dark:bg-purple-900/30 px-2 py-1 rounded-lg mb-2">
                  {categoryNames[box.categoryId] || box.categoryId}
                </span>
              )}
              {box.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">{box.description}</p>
              )}
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => navigate('/box/new')}
        className="fixed right-6 bottom-24 shadow-lg shadow-indigo-500/30 bg-indigo-600 text-white p-4 rounded-full active:scale-95 transition-all z-30 hover:bg-indigo-700"
      >
        <Plus size={24} />
      </button>
    </div >
  );
};

const LocationsPage = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const data = await storage.getLocations();
      setLocations(data);
    } catch (error) {
      console.error("Failed to load locations", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="pb-24 min-h-screen">
      <Header
        title="Locations"
        action={
          <button onClick={() => navigate('/settings')} className="text-gray-600 dark:text-gray-300">
            <Settings size={24} />
          </button>
        }
      />

      <div className="px-4 py-4 space-y-3">
        {locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            <MapPin size={48} className="mb-4 opacity-50" />
            <p>No locations defined.</p>
            <p className="text-sm">Create a location to organize your boxes.</p>
          </div>
        ) : (
          locations.map(loc => (
            <button
              key={loc.id}
              onClick={() => navigate(`/locations/${loc.id}/edit`)}
              className="w-full text-left bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:border-emerald-400 hover:shadow-md"
            >
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={20} className="text-emerald-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">{loc.name}</h3>
              </div>
              {loc.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm">{loc.description}</p>
              )}
            </button>
          ))
        )}
      </div>

      <button
        onClick={() => navigate('/locations/new')}
        className="fixed right-6 bottom-24 shadow-lg shadow-emerald-500/30 bg-emerald-600 text-white p-4 rounded-full active:scale-95 transition-all z-30 hover:bg-emerald-700"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

const ManageLocationPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(Boolean(id && id !== 'new'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(id && id !== 'new');

  useEffect(() => {
    if (!isEditing) {
      setLoading(false);
      return;
    }

    const loadLocation = async () => {
      try {
        const data = await storage.getLocationById(id!);
        if (data) {
          setName(data.name);
          setDescription(data.description || '');
        }
      } catch (error) {
        console.error('Failed to load location', error);
      } finally {
        setLoading(false);
      }
    };

    loadLocation();
  }, [id, isEditing]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      if (isEditing && id) {
        await storage.updateLocation({ id, name, description });
      } else {
        await storage.addLocation({ name, description });
      }
      navigate('/locations');
    } catch (error) {
      console.error('Failed to save location', error);
      alert('Failed to save location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !isEditing || !confirm('Delete this location?')) return;
    setIsSubmitting(true);
    try {
      await storage.deleteLocation(id);
      navigate('/locations');
    } catch (error) {
      const blockedDeleteMessage = getBlockedDeleteMessage(error);
      if (blockedDeleteMessage) {
        alert(blockedDeleteMessage);
        return;
      }

      console.error('Failed to delete location', error);
      alert('Failed to delete location');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="pb-safe min-h-screen bg-white dark:bg-gray-950">
      <Header title={isEditing ? 'Edit Location' : 'New Location'} backTo="/locations" action={isEditing ? (
        <button onClick={handleDelete} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full transition-colors">
          <Trash2 size={20} />
        </button>
      ) : undefined} />

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            placeholder="e.g. Garage"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px] resize-none dark:text-white"
            placeholder="Optional details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="pt-4 flex gap-3">
          <button
            onClick={() => navigate('/locations')}
            className="flex-1 py-3 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Location'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AddBoxPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [categoryId, setCategoryId] = useState(storage.DEFAULT_CATEGORY_ID);
  const [categories, setCategories] = useState<Category[]>(storage.DEFAULT_CATEGORIES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(Boolean(id && id !== 'new'));

  // Inline Location Creation State
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocDesc, setNewLocDesc] = useState('');
  const isEditing = Boolean(id && id !== 'new');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [locationsData, categoriesData, boxData] = await Promise.all([
          storage.getLocations(),
          storage.getCategories(),
          isEditing && id ? storage.getBoxById(id) : Promise.resolve(undefined)
        ]);

        setLocations(locationsData);
        setCategories(categoriesData);
        if (isEditing && boxData) {
          setName(boxData.name);
          setDescription(boxData.description || '');
          setLocationId(boxData.locationId || '');
          setCategoryId(boxData.categoryId || storage.DEFAULT_CATEGORY_ID);
        }
      } catch (error) {
        console.error("Failed to load box data", error);
        alert("Failed to load box data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEditing]);

  const handleSubmit = async () => {
    if (!name.trim() || !locationId) return;
    setIsSubmitting(true);
    try {
      if (isEditing && id) {
        await storage.updateBox({
          id,
          locationId,
          categoryId,
          name,
          description,
        });
      } else {
        await storage.addBox({
          name,
          description,
          locationId,
          categoryId
        });
      }
      navigate('/');
    } catch (error) {
      console.error("Failed to save box", error);
      alert(isEditing ? "Failed to update box" : "Failed to create box");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLocation = async () => {
    if (!newLocName.trim()) return;
    try {
      const newLocation = await storage.addLocation({
        name: newLocName,
        description: newLocDesc
      });
      const updatedLocations = await storage.getLocations();
      setLocations(updatedLocations);
      setLocationId(newLocation.id);
      setIsCreatingLocation(false);
      setNewLocName('');
      setNewLocDesc('');
    } catch (error) {
      console.error("Failed to create location", error);
      alert("Failed to create location");
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="pb-safe min-h-screen bg-white dark:bg-gray-950">
      <Header title={isEditing ? 'Edit Box' : 'New Box'} backTo={isEditing ? (id ? `/box/${id}` : '/') : '/'} />

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category <span className="text-red-500">*</span></label>
          <select
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            required
          >
            <option value="">Select a category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            placeholder="e.g. Summer Clothes"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location <span className="text-red-500">*</span></label>
              <button
                onClick={() => setIsCreatingLocation(true)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
              >
                + New Location
              </button>
            </div>
            <select
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
            >
              <option value="">Select a location</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-none dark:text-white"
              placeholder="Optional details..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={() => navigate(isEditing && id ? `/box/${id}` : '/')}
              className="flex-1 py-3 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || !locationId || !categoryId || isSubmitting}
              className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
            >
              {isSubmitting ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Box')}
            </button>
          </div>
        </div>
      </div>
      {/* Inline Location Creation Modal */}
      {
        isCreatingLocation && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="font-bold text-lg dark:text-white">New Location</h3>
                <button
                  onClick={() => setIsCreatingLocation(false)}
                  className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    placeholder="e.g. Garage"
                    value={newLocName}
                    onChange={e => setNewLocName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none h-20"
                    placeholder="Optional..."
                    value={newLocDesc}
                    onChange={e => setNewLocDesc(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleCreateLocation}
                  disabled={!newLocName.trim()}
                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                >
                  Create Location
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
};

const BoxDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [box, setBox] = useState<Box | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      const [boxData, itemsData] = await Promise.all([
        storage.getBoxById(id),
        storage.getItemsByBox(id)
      ]);
      if (boxData) {
        setBox(boxData);
        let categories = storage.DEFAULT_CATEGORIES;
        try {
          const storedCategories = await storage.getCategories();
          if (storedCategories.length > 0) categories = storedCategories;
        } catch (error) {
          console.error("Failed to load categories, using defaults", error);
        }
        const category = categories.find(entry => entry.id === boxData.categoryId);
        if (category) setCategoryName(category.name);
        if (boxData.locationId) {
          const loc = await storage.getLocationById(boxData.locationId);
          if (loc) setLocationName(loc.name);
        }
      }
      setItems(itemsData);
    } catch (error) {
      console.error("Failed to load box details", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBox = async () => {
    if (!id || !confirm('Delete this box?')) return;
    setIsDeleting(true);
    try {
      await storage.deleteBox(id);
      navigate('/');
    } catch (error) {
      const blockedDeleteMessage = getBlockedDeleteMessage(error);
      if (blockedDeleteMessage) {
        alert(blockedDeleteMessage);
        return;
      }

      console.error('Failed to delete box', error);
      alert('Failed to delete box');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!box) return <ErrorDisplay message="Box not found" />;

  return (
    <div className="pb-24 min-h-screen">
      <Header
        title={box.name}
        backTo="/"
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/box/${id}/print`)} className="text-gray-600 dark:text-gray-300">
              <Printer size={24} />
            </button>
            <button onClick={() => navigate(`/box/${id}/edit`)} className="text-gray-600 dark:text-gray-300">
              <FilePenLine size={24} />
            </button>
            <button
              onClick={handleDeleteBox}
              disabled={isDeleting}
              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded-full transition-colors disabled:opacity-50"
            >
              <Trash2 size={24} />
            </button>
          </div>
        }
      />

      <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <BoxIcon size={16} />
          <span>Details</span>
          {locationName && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                <MapPin size={14} />
                <span className="font-medium">{locationName}</span>
              </div>
            </>
          )}
          {categoryName && (
            <>
              <span>•</span>
              <span className="font-medium text-purple-700 dark:text-purple-300">{categoryName}</span>
            </>
          )}
        </div>
        {box.description && (
          <p className="text-gray-700 dark:text-gray-300">{box.description}</p>
        )}
      </div>

      <div className="px-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1 mb-2">
          Items inside ({items.length})
        </h3>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <Package size={32} className="mb-3 opacity-50" />
            <p>This box is empty.</p>
            <button
              onClick={() => navigate(`/box/${id}/add-item`)}
              className="mt-4 text-indigo-600 dark:text-indigo-400 font-medium text-sm hover:underline"
            >
              Add first item
            </button>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} onClick={() => navigate(`/item/${item.id}`)} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all hover:bg-gray-50 dark:hover:bg-gray-800">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                {item.description && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-1">{item.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {item.material && (
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg">
                    {item.material}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => navigate(`/box/${id}/add-item`)}
        className="fixed right-6 bottom-24 shadow-lg shadow-indigo-500/30 bg-indigo-600 text-white p-4 rounded-full active:scale-95 transition-all z-30 hover:bg-indigo-700"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

const AddItemPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [material, setMaterial] = useState('');
  const [color, setColor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!id || !name.trim()) return;
    setIsSubmitting(true);
    try {
      await storage.addItem({
        boxId: id,
        name,
        description,
        material,
        color
      });
      navigate(-1);
    } catch (error) {
      console.error("Failed to add item", error);
      alert("Failed to save item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-safe min-h-screen bg-white dark:bg-gray-950">
      <Header
        title="New Item"
        backTo={`/box/${id}`}
      />

      <div className="p-4 space-y-4">
        <VoiceInput onItemParsed={(item) => {
          if (item.name) setName(item.name);
          if (item.description) setDescription(item.description);
          if (item.material) setMaterial(item.material);
          if (item.color) setColor(item.color);
        }} />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            placeholder="e.g. Winter Jacket"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-none dark:text-white"
            placeholder="Optional details..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material</label>
            <input
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              placeholder="e.g. Cotton"
              value={material}
              onChange={e => setMaterial(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
            <input
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              placeholder="e.g. Red"
              value={color}
              onChange={e => setColor(e.target.value)}
            />
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-3 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
            Save Item
          </button>
        </div>
      </div>
    </div>
  );
};

const EditItemPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [material, setMaterial] = useState('');
  const [color, setColor] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [item, setItem] = useState<Item | null>(null);

  useEffect(() => {
    if (!id) return;
    loadItem();
  }, [id]);

  const loadItem = async () => {
    if (!id) return;
    try {
      const data = await storage.getItemById(id);
      if (data) {
        setItem(data);
        setName(data.name);
        setDescription(data.description || '');
        setMaterial(data.material || '');
        setColor(data.color || '');
      }
    } catch (error) {
      console.error("Failed to load item", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!id || !name.trim() || !item) return;
    setIsSubmitting(true);
    try {
      await storage.updateItem({
        ...item,
        name,
        description,
        material,
        color
      });
      navigate(-1);
    } catch (error) {
      console.error("Failed to update item", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("Are you sure you want to delete this item?")) return;
    setIsSubmitting(true);
    try {
      await storage.deleteItem(id);
      navigate(-1);
    } catch (error) {
      console.error("Failed to delete item", error);
      alert("Failed to delete item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!item) return <ErrorDisplay message="Item not found" />;

  return (
    <div className="pb-safe min-h-screen bg-white dark:bg-gray-950">
      <Header
        title="Edit Item"
        backTo={`/box/${item.boxId}`}
        action={
          <button onClick={handleDelete} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full transition-colors">
            <Trash2 size={20} />
          </button>
        }
      />

      <div className="p-4 space-y-4">
        <VoiceInput onItemParsed={(item) => {
          if (item.name) setName(item.name);
          if (item.description) setDescription(item.description);
          if (item.material) setMaterial(item.material);
          if (item.color) setColor(item.color);
        }} />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-none dark:text-white"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material</label>
            <input
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              value={material}
              onChange={e => setMaterial(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
            <input
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              value={color}
              onChange={e => setColor(e.target.value)}
            />
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-3 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const BoxLabelPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [box, setBox] = useState<Box | null>(null);
  const [permissions, setPermissions] = useState<NiimbotBridgePermissionsResult | null>(null);
  const [selectedPrinter, setSelectedPrinter] = useState<NiimbotBridgeSelectedPrinter | null>(null);
  const [candidates, setCandidates] = useState<readonly NiimbotBridgeDevice[]>([]);
  const [step, setStep] = useState<NiimbotPrintProgressStep>('permission/setup');
  const [error, setError] = useState<NiimbotBridgeError | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [lastLabelSnapshot, setLastLabelSnapshot] = useState<NiimbotLabelSnapshot | null>(null);
  const isAndroid = Capacitor.getPlatform() === 'android';
  const isPluginAvailable = Capacitor.isPluginAvailable('NiimbotBlePrinter');

  useEffect(() => {
    if (!id) return;
    storage.getBoxById(id).then(data => {
      if (data) setBox(data);
    });
  }, [id]);

  useEffect(() => {
    if (!isAndroid || !isPluginAvailable) return;
    let cancelled = false;
    const loadPrinterState = async () => {
      setStep('permission/setup');
      const [permissionResult, selectedResult] = await Promise.all([
        NiimbotBlePrinter.checkPermissions(),
        NiimbotBlePrinter.getSelectedPrinter(),
      ]);
      if (cancelled) return;
      if (permissionResult.ok) setPermissions(permissionResult.value);
      if (selectedResult.ok) setSelectedPrinter(selectedResult.value);
      if (!permissionResult.ok) setError(permissionResult.error);
      if (!selectedResult.ok) setError(selectedResult.error);
    };
    loadPrinterState();
    return () => { cancelled = true; };
  }, [isAndroid, isPluginAvailable]);

  if (!id || !box) return <PageLoader />;

  // URL format: Current Origin + /#/box/ID
  const qrValue = buildBoxQrValue(window.location.origin, window.location.pathname, id);
  const labelSnapshot: NiimbotLabelSnapshot = {
    qrValue,
    boxId: id,
    boxNumber: box.boxNumber,
    boxName: box.name,
  };
  const labelStyle: React.CSSProperties = {
    width: LABEL_PRINT_CONFIG.cssWidth,
    height: LABEL_PRINT_CONFIG.cssHeight,
  };
  const qrStyle: React.CSSProperties = {
    width: `${LABEL_PRINT_CONFIG.qrSizeMm}mm`,
    height: `${LABEL_PRINT_CONFIG.qrSizeMm}mm`,
  };
  const profile = B1_PRO_50X30_PROFILE;
  const canPrint = isAndroid && isPluginAvailable && isNiimbotPermissionGranted(permissions) && Boolean(selectedPrinter) && !isBusy;
  const visibleError = error ? getNiimbotErrorPresentation(error) : null;

  const setBridgeError = (bridgeError: NiimbotBridgeError) => {
    setError(bridgeError);
    setStep('failure');
  };

  const requestPermissions = async () => {
    if (!isPluginAvailable) return;
    setIsBusy(true);
    setError(null);
    setStep('permission/setup');
    try {
      const result = await NiimbotBlePrinter.requestPermissions();
      if (!result.ok) {
        setBridgeError(result.error);
        return;
      }
      setPermissions(result.value);
    } finally {
      setIsBusy(false);
    }
  };

  const scanForPrinters = async () => {
    if (!isPluginAvailable) return;
    setIsBusy(true);
    setError(null);
    setStep('scanning');
    try {
      const result = await NiimbotBlePrinter.scan({ serviceUuid: profile.serviceUuid, timeoutMs: 10_000 });
      if (!result.ok) {
        setBridgeError(result.error);
        return;
      }
      setCandidates(result.value);
      if (result.value.length === 0) {
        setBridgeError({ code: 'no-printer-found', message: 'No NIIMBOT B1 Pro candidates were found.', recoverable: true });
      }
    } finally {
      setIsBusy(false);
    }
  };

  const identifySelectedPrinter = async (device: NiimbotBridgeDevice) => {
    setIsBusy(true);
    setError(null);
    setStep('identifying');
    try {
      const identifyResult = await NiimbotBlePrinter.identify({ deviceId: device.deviceId, timeoutMs: 10_000 });
      if (!identifyResult.ok) {
        setBridgeError(identifyResult.error);
        return;
      }
      setSelectedPrinter(identifyResult.value);
    } finally {
      setIsBusy(false);
    }
  };

  const reconnectSelectedPrinter = async () => {
    if (!selectedPrinter) return;
    await identifySelectedPrinter({
      deviceId: selectedPrinter.reconnectId,
      name: selectedPrinter.displayName,
      address: selectedPrinter.address,
    });
  };

  const forgetPrinter = async () => {
    if (!isPluginAvailable) return;
    setIsBusy(true);
    setError(null);
    setStep('permission/setup');
    try {
      const result = await NiimbotBlePrinter.forgetSelectedPrinter();
      if (!result.ok) {
        setBridgeError(result.error);
        return;
      }
      setSelectedPrinter(null);
      setCandidates([]);
      setLastLabelSnapshot(null);
    } finally {
      setIsBusy(false);
    }
  };

  const printCurrentLabel = async () => {
    const snapshot = lastLabelSnapshot ?? labelSnapshot;
    setLastLabelSnapshot(snapshot);
    if (!selectedPrinter) return;
    setIsBusy(true);
    setError(null);
    try {
      setStep('rendering');
      let labelRaster: ReturnType<typeof renderBoxLabelRaster>;
      try {
        labelRaster = renderBoxLabelRaster({
          box: {
            id: snapshot.boxId,
            boxNumber: snapshot.boxNumber,
            locationId: box.locationId,
            categoryId: box.categoryId,
            name: snapshot.boxName,
            description: box.description,
          },
          origin: window.location.origin,
          pathname: window.location.pathname,
          profile,
        });
      } catch (renderError) {
        setBridgeError({
          code: 'invalid-raster',
          message: renderError instanceof Error ? renderError.message : 'Unable to render the 50 × 30 mm B1 Pro label raster.',
          recoverable: true,
        });
        return;
      }
      const request = {
        ...buildNiimbotPrintRequest(selectedPrinter.reconnectId, snapshot),
        rasterBase64: labelRaster.rasterBase64,
      };
      setStep('sending');
      const result = await NiimbotBlePrinter.printLabel(request);
      if (!result.ok) {
        setBridgeError(result.error);
        return;
      }
      setStep(result.value.confirmed ? 'success' : 'printing/confirming');
      if (!result.value.confirmed) {
        setBridgeError({
          code: 'unconfirmed-print',
          message: 'The B1 Pro transfer finished but print confirmation was not received.',
          recoverable: true,
        });
        return;
      }
    } finally {
      setIsBusy(false);
    }
  };

  const retrySameLabel = async () => {
    if (!selectedPrinter || !lastLabelSnapshot) return;
    await printCurrentLabel();
  };

  return (
    <div className="min-h-screen bg-white print:min-h-0 print:w-[50mm] print:h-[30mm] print:overflow-hidden">
      <div className="print:hidden p-4 space-y-4 bg-gray-50 dark:bg-gray-950 min-h-screen">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg"
        >
          <ChevronLeft size={20} /> Back
        </button>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Printer size={22} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">Direct NIIMBOT B1 Pro printing</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                On Android, BoxTrack AI connects directly to a NIIMBOT B1 Pro over Bluetooth BLE without leaving the app.
              </p>
            </div>
          </div>
        </div>

        {!isAndroid && (
          <div className="bg-amber-50 text-amber-900 border border-amber-200 p-4 rounded-2xl text-sm">
            This device shows a browser label preview only. Supported production printing is the Android direct Bluetooth connection to a NIIMBOT B1 Pro.
            <button
              onClick={() => window.print()}
              className="mt-3 w-full bg-amber-600 text-white font-semibold py-2 rounded-xl hover:bg-amber-700 transition-colors"
            >
              Print browser preview
            </button>
          </div>
        )}

        {isAndroid && !isPluginAvailable && (
          <div className="bg-red-50 text-red-800 border border-red-100 p-4 rounded-2xl text-sm">
            Direct Bluetooth printing is not available in this Android build. Install a build that includes the NiimbotBlePrinter plugin.
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Label to print</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Box number</p>
              <p className="font-mono font-bold text-gray-900 dark:text-white">{box.boxNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Profile</p>
              <p className="font-semibold text-gray-900 dark:text-white">{profile.labelName}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Printer target</p>
              <p className="font-semibold text-gray-900 dark:text-white">NIIMBOT B1 Pro</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Raster</p>
              <p className="font-semibold text-gray-900 dark:text-white">{profile.rasterWidthPx} × {profile.rasterHeightPx}px</p>
            </div>
          </div>
        </div>

        {isAndroid && isPluginAvailable && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">B1 Pro setup</h3>
                {isBusy && <Loader2 className="animate-spin text-indigo-500" size={18} />}
              </div>
              <ol className="space-y-2 text-sm">
                {[
                  ['permission/setup', 'Grant Bluetooth access'],
                  ['scanning', 'Scan for NIIMBOT B1 Pro'],
                  ['identifying', 'Prepare selected B1 Pro'],
                  ['rendering', 'Render 50 × 30 mm label'],
                  ['sending', 'Send over BLE'],
                  ['printing/confirming', 'Confirm print result'],
                ].map(([stepId, label]) => (
                  <li key={stepId} className={`flex items-center gap-2 ${step === stepId ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                    {step === stepId ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                    {label}
                  </li>
                ))}
              </ol>
            </div>

            {!isNiimbotPermissionGranted(permissions) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border border-blue-100 dark:border-blue-800 p-4 rounded-2xl text-sm">
                Bluetooth access is required to find and print directly to your NIIMBOT B1 Pro.
                <button
                  onClick={requestPermissions}
                  disabled={isBusy}
                  className="mt-3 w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Grant Bluetooth access
                </button>
              </div>
            )}

            {selectedPrinter && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100 border border-emerald-100 dark:border-emerald-800 p-4 rounded-2xl text-sm">
                <p className="font-semibold">Selected NIIMBOT B1 Pro</p>
                <p>{selectedPrinter.displayName}</p>
                <p>Model id {selectedPrinter.modelId} · {selectedPrinter.profile.labelName} · {selectedPrinter.reconnectId}</p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button onClick={reconnectSelectedPrinter} disabled={isBusy} className="bg-white/80 dark:bg-gray-900/80 py-2 rounded-lg font-semibold disabled:opacity-50">Reconnect</button>
                  <button onClick={scanForPrinters} disabled={isBusy} className="bg-white/80 dark:bg-gray-900/80 py-2 rounded-lg font-semibold disabled:opacity-50">Change</button>
                  <button onClick={forgetPrinter} disabled={isBusy} className="bg-white/80 dark:bg-gray-900/80 py-2 rounded-lg font-semibold text-red-600 disabled:opacity-50">Forget</button>
                </div>
              </div>
            )}

            <button
              onClick={scanForPrinters}
              disabled={isBusy || !isNiimbotPermissionGranted(permissions)}
              className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-bold py-3 px-4 rounded-xl hover:opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={18} /> {selectedPrinter ? 'Rescan / change B1 Pro' : 'Scan for NIIMBOT B1 Pro'}
            </button>

            {candidates.length > 0 && (
              <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">Nearby B1 Pro candidates</h3>
                {candidates.map(device => (
                  <button
                    key={device.deviceId}
                    onClick={() => identifySelectedPrinter(device)}
                    disabled={isBusy}
                    className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-400 disabled:opacity-50"
                  >
                    <p className="font-semibold text-gray-900 dark:text-white">{device.name || 'NIIMBOT candidate'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{device.address || device.deviceId}{typeof device.rssi === 'number' ? ` · RSSI ${device.rssi}` : ''}</p>
                  </button>
                ))}
              </div>
            )}

            {visibleError && (
              <div className={`p-4 rounded-2xl text-sm border ${visibleError.unconfirmedPrint ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-red-50 text-red-800 border-red-100'}`}>
                <p className="font-bold">{visibleError.title}</p>
                <p className="mt-1">{visibleError.action}</p>
                <p className="mt-1 text-xs opacity-80">{error?.message}</p>
                {visibleError.recoverable && selectedPrinter && (
                  <button
                    onClick={lastLabelSnapshot ? retrySameLabel : printCurrentLabel}
                    disabled={isBusy}
                    className="mt-3 w-full bg-indigo-600 text-white font-semibold py-2 rounded-xl disabled:opacity-50"
                  >
                    Retry same label
                  </button>
                )}
              </div>
            )}

            {step === 'success' && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-4 rounded-2xl text-sm font-semibold">
                Print confirmed by the NIIMBOT B1 Pro.
              </div>
            )}

            <button
              onClick={printCurrentLabel}
              disabled={!canPrint}
              className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={20} /> {selectedPrinter ? 'Print current label to NIIMBOT B1 Pro' : 'Set up NIIMBOT B1 Pro before printing'}
            </button>
          </div>
        )}
      </div>

      <div
        className="box-label flex items-center gap-[2mm] overflow-hidden bg-white text-black border-2 border-black rounded-[2mm] m-4 p-[2mm] print:m-0 print:box-border print:border-2"
        style={labelStyle}
        aria-label="Niimbot B1 Pro 50 × 30 mm box label"
      >
        <div className="box-label__qr flex-shrink-0 bg-white p-[0.75mm] border border-black">
          <QRCode
            value={qrValue}
            size={128}
            level="H"
            style={qrStyle}
          />
        </div>

        <div className="min-w-0 flex-1 self-stretch flex flex-col justify-between py-[0.5mm]">
          <div className="min-w-0">
            <p className="text-[5.2mm] font-black leading-none uppercase tracking-[-0.2mm] truncate">
              {box.name}
            </p>
            <div className="mt-[1mm]">
              <p className="text-[2mm] font-mono text-gray-600 uppercase tracking-[0.25mm] leading-none">Box number</p>
              <p className="font-mono font-black text-[5mm] leading-none">{box.boxNumber ?? '—'}</p>
            </div>
          </div>
          <p className="text-[1.8mm] text-gray-500 font-bold tracking-[0.2mm] uppercase leading-none">BoxTrack</p>
        </div>
      </div>

      <style>{`
                @media print {
                    @page {
                        margin: 0;
                        size: ${LABEL_PRINT_CONFIG.cssPageSize};
                    }
                    html,
                    body,
                    #root {
                        width: ${LABEL_PRINT_CONFIG.cssWidth};
                        height: ${LABEL_PRINT_CONFIG.cssHeight};
                        margin: 0;
                        padding: 0;
                        overflow: hidden;
                        background: white;
                    }
                    * {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .box-label {
                        width: ${LABEL_PRINT_CONFIG.cssWidth} !important;
                        height: ${LABEL_PRINT_CONFIG.cssHeight} !important;
                    }
                }
            `}</style>
    </div>
  );
};

const SettingsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="pb-24 min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header title="Settings" backTo="/" />

      <div className="p-4 space-y-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
            <User size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Armazenamento local</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Os seus dados ficam guardados neste navegador.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 ml-1">APP INFO</h3>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-900 dark:text-white">Version</span>
              <span className="text-gray-500 text-sm">1.0.0</span>
            </div>
            <a
              href="https://github.com/luisfelipeg1"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="text-gray-900 dark:text-white">Developer</span>
              <span className="text-indigo-600 dark:text-indigo-400 text-sm">Luis Felipe</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MainApp = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/box/new" element={<AddBoxPage />} />
        <Route path="/box/:id/edit" element={<AddBoxPage />} />
        <Route path="/box/:id" element={<BoxDetailsPage />} />
        <Route path="/box/:id/add-item" element={<AddItemPage />} />
        <Route path="/item/:id" element={<EditItemPage />} />
        <Route path="/box/:id/print" element={<BoxLabelPage />} />
        <Route path="/locations" element={<LocationsPage />} />
        <Route path="/locations/new" element={<ManageLocationPage />} />
        <Route path="/locations/:id/edit" element={<ManageLocationPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/chat" element={<AssistantChat />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Navigation />
    </div>
  );
};

const GeminiKeyGate = () => {
  const [isChecking, setIsChecking] = useState(true);
  const [needsKey, setNeedsKey] = useState(false);

  useEffect(() => {
    let skippedThisSession = false;
    try {
      skippedThisSession = window.sessionStorage.getItem('boxtrack.gemini.key-skipped') === 'true';
    } catch {
      // Ignore session storage errors.
    }

    setNeedsKey(!getGeminiApiKey() && !skippedThisSession);
    setIsChecking(false);
  }, []);

  if (isChecking) return <PageLoader text="A carregar..." />;
  if (needsKey) return <GeminiKeySetup onComplete={() => setNeedsKey(false)} />;

  return <MainApp />;
};

// Fixed missing default export
const App = () => (
  <HashRouter>
    <GeminiKeyGate />
  </HashRouter>
);

export default App;
