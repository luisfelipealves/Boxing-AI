
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

import { Location, Box, Item } from './types';
import * as storage from './services/storageService';
import { analyzeItemImage, analyzeItemAudio, createInventoryChat } from './services/geminiService';
import { getGeminiApiKey, setStoredGeminiApiKey } from './services/geminiKeyService';


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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
      setBoxes(boxesData);

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
    box.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    box.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        const [locationsData, boxData] = await Promise.all([
          storage.getLocations(),
          isEditing && id ? storage.getBoxById(id) : Promise.resolve(undefined)
        ]);

        setLocations(locationsData);
        if (isEditing && boxData) {
          setName(boxData.name);
          setDescription(boxData.description || '');
          setLocationId(boxData.locationId || '');
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
          name,
          description,
        });
      } else {
        await storage.addBox({
          name,
          description,
          locationId
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
              disabled={!name.trim() || !locationId || isSubmitting}
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
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (!id) return;
    storage.getBoxById(id).then(data => {
      if (data) setBox(data);
    });
  }, [id]);

  if (!box) return <PageLoader />;

  // URL format: Current Origin + /#/box/ID
  const qrValue = `${window.location.origin}${window.location.pathname}#/box/${id}`;

  return (
    <div className="min-h-screen bg-white">
      <div className="print:hidden p-4">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:bg-gray-100 p-2 rounded-lg"
        >
          <ChevronLeft size={20} /> Back
        </button>
        <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-sm mb-4 border border-blue-100">
          ℹ️ Connect to a printer and tap the button below. This view is optimized for label printers.
        </div>
        <button
          onClick={() => window.print()}
          className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
        >
          <Printer size={20} /> Print Label
        </button>
      </div>

      <div className="flex flex-col items-center justify-center p-8 border-4 border-black m-4 rounded-3xl print:border-4 print:m-0 print:p-4 print:h-screen print:flex print:items-center print:justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black text-black uppercase tracking-tighter leading-none mb-4">
            {box.name}
          </h1>

          <div className="bg-white p-2 inline-block">
            <QRCode
              value={qrValue}
              size={256}
              level="H"
            />
          </div>

          <div className="text-center mt-4 space-y-1">
            <p className="text-sm font-mono text-gray-500 uppercase tracking-widest">BOX ID</p>
            <p className="font-mono font-bold text-xl">{box.id.slice(0, 8)}</p>
          </div>
          <div className="mt-8 pt-4 border-t-2 border-gray-100 w-full">
            <p className="text-gray-400 font-bold tracking-widest uppercase text-xs">Property of BoxTrack</p>
          </div>
        </div>
      </div>

      <style>{`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    body {
                        background: white;
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
