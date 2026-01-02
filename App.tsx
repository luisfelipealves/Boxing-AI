
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
import { 
  Package, 
  MapPin, 
  Plus, 
  Search, 
  QrCode, 
  Trash2,
  ChevronLeft,
  Loader2,
  Box as BoxIcon,
  X,
  MessageSquare,
  Bot,
  Settings,
  LogOut,
  User,
  ShieldCheck
} from 'lucide-react';
import { QRScanner } from './components/QRScanner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import * as storage from './services/storageService';
import { Location, Box, Item } from './types';

// --- UI COMPONENTS ---

const PageLoader = ({ text = "Carregando..." }: { text?: string }) => (
  <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)] bg-gray-50 dark:bg-gray-950">
    <Loader2 className="animate-spin text-indigo-500" size={48} />
    <p className="mt-4 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs">{text}</p>
  </div>
);

const Navigation = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-600";
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex justify-around items-center z-40 pb-safe shadow-2xl">
      <Link to="/" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/')}`}>
        <Package size={22} />
        <span className="text-[9px] font-black uppercase tracking-tighter">Caixas</span>
      </Link>
      <Link to="/locations" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/locations')}`}>
        <MapPin size={22} />
        <span className="text-[9px] font-black uppercase tracking-tighter">Locais</span>
      </Link>
      <Link to="/chat" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/chat')}`}>
        <MessageSquare size={22} />
        <span className="text-[9px] font-black uppercase tracking-tighter">Assistente</span>
      </Link>
    </nav>
  );
};

const Header: React.FC<{ title: string; backTo?: string; action?: React.ReactNode }> = ({ title, backTo, action }) => {
  return (
    <header className="sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 py-4 flex items-center justify-between z-30">
      <div className="flex items-center gap-3">
        {backTo && (
          <Link to={backTo} className="p-1.5 -ml-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <ChevronLeft size={22} />
          </Link>
        )}
        <div className="flex flex-col">
           <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase leading-none">{title}</h1>
           <span className="text-[8px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={8} /> V5.0 VERIFIED</span>
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </header>
  );
};

// --- PAGES ---

const HomePage = () => {
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      storage.getBoxes(),
      storage.getItems(),
      storage.getLocations()
    ]).then(([b, i, l]) => {
      setBoxes(b);
      setItems(i);
      setLocations(l);
    }).finally(() => setIsLoading(false));
  }, []);

  const filteredBoxes = boxes.filter(box => {
    const term = search.toLowerCase();
    const boxItems = items.filter(i => i.boxId === box.id);
    return box.name.toLowerCase().includes(term) || boxItems.some(i => i.name.toLowerCase().includes(term));
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="pb-28">
      {showScanner && <QRScanner onScan={(id) => navigate(`/box/${id}`)} onClose={() => setShowScanner(false)} />}
      <Header title="BoxWise" action={
        <Link to="/settings" className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 transition-colors"><Settings size={22} /></Link>
      } />
      <div className="p-4 space-y-6">
        <div className="flex gap-2">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
              type="text" placeholder="Procurar caixas ou itens..."
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => setShowScanner(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
            <QrCode size={24} />
          </button>
        </div>

        <div className="flex justify-between items-center px-1">
          <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Minhas Caixas</h2>
          <Link to="/box/new" className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">+ Nova Caixa</Link>
        </div>

        <div className="grid gap-4">
          {filteredBoxes.map(box => (
            <Link key={box.id} to={`/box/${box.id}`} className="block bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-50 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98]">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-50 dark:bg-gray-850 rounded-2xl flex items-center justify-center text-indigo-500">
                    <BoxIcon size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">{box.name}</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                      📍 {locations.find(l => l.id === box.locationId)?.name || 'Local não definido'}
                    </p>
                  </div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1.5 rounded-xl">
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-300 uppercase">{items.filter(i => i.boxId === box.id).length} itens</span>
                </div>
              </div>
            </Link>
          ))}
          {filteredBoxes.length === 0 && (
            <div className="text-center py-20 flex flex-col items-center gap-4 grayscale opacity-30">
              <Package size={56} />
              <p className="text-xs font-black uppercase tracking-widest">Nenhuma caixa aqui</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AddItemPage = () => {
  const { boxId } = useParams();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [material, setMaterial] = useState('');
  const [color, setColor] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !boxId || isSaving) return;
    setIsSaving(true);
    try {
      await storage.addItem({ boxId, name, description, material, color });
      navigate(`/box/${boxId}`);
    } catch (err) {
      console.error("Erro ao salvar:", err);
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-10">
      <Header title="Adicionar Item" backTo={`/box/${boxId}`} />
      <div className="p-4 max-w-2xl mx-auto">
        <form onSubmit={saveItem} className="space-y-6">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 space-y-8 shadow-sm">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Nome do Objeto *</label>
              <input 
                type="text" 
                required 
                autoFocus
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full px-0 py-3 bg-transparent border-b-2 border-gray-100 dark:border-gray-800 focus:border-indigo-500 outline-none text-xl font-bold transition-all" 
                placeholder="Ex: Ferro de Passar" 
              />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Material</label>
                <input 
                  type="text" 
                  value={material} 
                  onChange={e => setMaterial(e.target.value)} 
                  className="w-full px-0 py-2 bg-transparent border-b-2 border-gray-100 dark:border-gray-800 focus:border-indigo-500 outline-none font-bold transition-all" 
                  placeholder="Cerâmica" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Cor Principal</label>
                <input 
                  type="text" 
                  value={color} 
                  onChange={e => setColor(e.target.value)} 
                  className="w-full px-0 py-2 bg-transparent border-b-2 border-gray-100 dark:border-gray-800 focus:border-indigo-500 outline-none font-bold transition-all" 
                  placeholder="Azul" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Notas Adicionais</label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                rows={4} 
                className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-950 rounded-2xl outline-none font-medium text-sm transition-all resize-none border border-transparent focus:border-indigo-500" 
                placeholder="Observações importantes sobre o item..." 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-indigo-600 disabled:bg-gray-400 text-white py-5 rounded-2xl font-black text-xl shadow-2xl shadow-indigo-500/30 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {isSaving ? <Loader2 className="animate-spin" size={24} /> : 'SALVAR NOVO ITEM'}
          </button>
        </form>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  
  const handleForceUpdate = () => {
    if (confirm('Deseja forçar a atualização da aplicação? Isso limpará o cache local.')) {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for(let registration of registrations) registration.unregister();
            });
        }
        // Fix: Removed deprecated 'true' argument to window.location.reload() to satisfy modern TypeScript/browser specs
        window.location.reload();
    }
  };

  return (
    <div className="pb-24">
      <Header title="Configurações" backTo="/" />
      <div className="p-4 space-y-4">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 text-center shadow-sm">
          <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
            <User size={48} />
          </div>
          <h3 className="font-extrabold text-xl text-gray-900 dark:text-white uppercase">{user?.email?.split('@')[0]}</h3>
          <p className="text-sm text-gray-400 font-bold mb-8">{user?.email}</p>
          
          <div className="space-y-3">
            <button onClick={signOut} className="w-full py-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all">
                <LogOut size={20} /> ENCERRAR SESSÃO
            </button>
            <button onClick={handleForceUpdate} className="w-full py-3 text-[10px] text-indigo-500 font-black uppercase tracking-widest hover:bg-indigo-50 rounded-xl transition-all">
                Forçar Atualização V5
            </button>
          </div>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-950 p-4 rounded-2xl text-center border border-gray-200 dark:border-gray-900">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">BoxWise v5.0.0 STABLE</p>
        </div>
      </div>
    </div>
  );
};

const LocationsPage = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => { storage.getLocations().then(setLocations); }, []);

  const add = async () => {
    if (!name) return;
    const loc = await storage.addLocation({ name });
    setLocations([...locations, loc]);
    setName('');
    setIsAdding(false);
  };

  return (
    <div className="pb-24">
      <Header title="Locais" action={<button onClick={() => setIsAdding(true)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Plus size={28} /></button>} />
      <div className="p-4 space-y-4">
        {isAdding && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border-2 border-indigo-200 dark:border-indigo-800 shadow-2xl animate-in fade-in zoom-in duration-200">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Nome do Novo Local</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Sótão, Closet..." className="w-full p-4 mb-4 bg-gray-50 dark:bg-gray-950 rounded-2xl outline-none border border-transparent focus:border-indigo-500 font-bold text-lg" />
            <div className="flex gap-3">
              <button onClick={() => setIsAdding(false)} className="flex-1 py-4 text-gray-500 font-black text-xs uppercase tracking-widest">Voltar</button>
              <button onClick={add} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20">Criar Agora</button>
            </div>
          </div>
        )}
        <div className="grid gap-3">
          {locations.map(loc => (
            <div key={loc.id} className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-50 dark:border-gray-800 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-4">
                 <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-2xl text-indigo-600"><MapPin size={24} /></div>
                 <span className="font-extrabold text-gray-800 dark:text-gray-200">{loc.name}</span>
              </div>
              <button onClick={() => { if(confirm('Excluir local?')) storage.deleteLocation(loc.id).then(() => setLocations(locations.filter(l => l.id !== loc.id))) }} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BoxDetailPage = () => {
  const { id } = useParams();
  const [box, setBox] = useState<Box>();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      storage.getBoxById(id).then(setBox);
      storage.getItems().then(all => {
        setItems(all.filter(i => i.boxId === id));
        setIsLoading(false);
      });
    }
  }, [id]);

  if (isLoading || !box) return <PageLoader />;

  return (
    <div className="pb-28">
      <Header title={box.name} backTo="/" action={
        <button onClick={() => { if(confirm('Excluir esta caixa permanentemente?')) storage.deleteBox(box.id).then(() => navigate('/')); }} className="text-red-400 hover:text-red-600 p-2 transition-colors">
          <Trash2 size={22} />
        </button>
      } />
      
      <div className="p-4">
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 mb-8 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center text-indigo-600">
                <Package size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Inventário Ativo</p>
              <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">Itens Listados</h3>
            </div>
          </div>
          <div className="text-center bg-gray-50 dark:bg-gray-850 w-12 h-12 flex items-center justify-center rounded-2xl">
            <span className="font-black text-xl text-indigo-600">{items.length}</span>
          </div>
        </div>

        <div className="grid gap-3">
          {items.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-50 dark:border-gray-800 shadow-sm flex items-center gap-4 group">
              <div className="w-14 h-14 bg-gray-50 dark:bg-gray-850 rounded-2xl flex items-center justify-center text-gray-300">
                <BoxIcon size={26} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">{item.name}</h4>
                <div className="flex gap-2 mt-1">
                  {item.material && <span className="text-[9px] font-black uppercase bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-md">{item.material}</span>}
                  {item.color && <span className="text-[9px] font-black uppercase bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-md">{item.color}</span>}
                </div>
              </div>
              <button onClick={() => { if(confirm('Remover este item?')) storage.deleteItem(item.id).then(() => setItems(items.filter(i => i.id !== item.id))) }} className="p-2 text-gray-200 hover:text-red-500 transition-all">
                <X size={20} />
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center py-20 grayscale opacity-20 flex flex-col items-center gap-4">
              <Bot size={48} />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Caixa Vazia</p>
            </div>
          )}
        </div>
      </div>
      
      <Link to={`/box/${id}/add-item`} className="fixed bottom-24 right-6 bg-indigo-600 text-white w-20 h-20 rounded-[2rem] shadow-2xl shadow-indigo-500/40 flex items-center justify-center z-20 active:scale-90 transition-transform border-4 border-white dark:border-gray-950">
        <Plus size={40} />
      </Link>
    </div>
  );
};

const BoxFormPage = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { 
    storage.getLocations().then(l => { 
      setLocations(l); 
      if(l.length) setLocationId(l[0].id); 
    }); 
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!name || !locationId || isSaving) return;
    setIsSaving(true);
    try {
      const box = await storage.addBox({ name, locationId });
      navigate(`/box/${box.id}`);
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-10">
      <Header title="Nova Caixa" backTo="/" />
      <form onSubmit={save} className="p-4 space-y-6 max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-10">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Identificador</label>
            <input 
              required 
              autoFocus
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full text-3xl font-black bg-transparent border-b-4 border-gray-100 dark:border-gray-800 focus:border-indigo-500 outline-none pb-4 transition-colors placeholder:opacity-20" 
              placeholder="Ex: FERRAMENTAS" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Onde ficará?</label>
            <select 
              value={locationId} 
              onChange={e => setLocationId(e.target.value)} 
              className="w-full bg-gray-50 dark:bg-gray-950 p-5 rounded-2xl font-black text-xl outline-none appearance-none border border-transparent focus:border-indigo-500 transition-all text-gray-900 dark:text-white"
            >
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              {locations.length === 0 && <option value="">Sem locais</option>}
            </select>
          </div>
        </div>
        <button type="submit" disabled={isSaving || locations.length === 0} className="w-full bg-indigo-600 disabled:bg-gray-400 text-white py-6 rounded-3xl font-black text-xl shadow-2xl shadow-indigo-500/20 active:scale-95 transition-all">
          {isSaving ? <Loader2 className="animate-spin mx-auto" /> : 'CRIAR CAIXA'}
        </button>
      </form>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /><Navigation /></ProtectedRoute>} />
          <Route path="/locations" element={<ProtectedRoute><LocationsPage /><Navigation /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /><Navigation /></ProtectedRoute>} />
          <Route path="/box/new" element={<ProtectedRoute><BoxFormPage /><Navigation /></ProtectedRoute>} />
          <Route path="/box/:id" element={<ProtectedRoute><BoxDetailPage /><Navigation /></ProtectedRoute>} />
          <Route path="/box/:boxId/add-item" element={<ProtectedRoute><AddItemPage /><Navigation /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><div className="p-12 text-center h-[80vh] flex flex-col items-center justify-center gap-8"><div className="relative"><div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse"></div><Bot size={100} className="text-indigo-600 relative z-10" /></div><div className="space-y-3"><h2 className="text-3xl font-black uppercase tracking-tighter italic">BoxWise Assistente</h2><p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] animate-pulse">Pronto para encontrar seus itens - v5.0</p></div></div><Navigation /></ProtectedRoute>} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
