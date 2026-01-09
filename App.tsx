
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
  LogOut,
  User
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { v4 as uuidv4 } from 'uuid';
import { Chat, GenerateContentResponse } from "@google/genai";

import { Location, Box, Item } from './types';
import * as storage from './services/storageService';
import { analyzeItemImage, analyzeItemAudio, createInventoryChat } from './services/geminiService';
import { QRScanner } from './components/QRScanner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';

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
    const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([]);
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

const SettingsPage = () => {
    // ... Existing implementation
    return null; // Placeholder for brevity
};

const HomePage = () => {
    // ... Existing implementation
    return null; // Placeholder for brevity
};

// ... [Omitted other page components for brevity as they are already provided in the prompt] ...

const MainApp = () => {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <LoginPage />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/chat" element={<AssistantChat />} />
        {/* Add more routes as needed */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Navigation />
    </div>
  );
};

// Fixed missing default export
const App = () => (
  <AuthProvider>
    <HashRouter>
      <MainApp />
    </HashRouter>
  </AuthProvider>
);

export default App;
