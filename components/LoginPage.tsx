import React from 'react';
import { Package, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage = () => {
  const { signInWithGoogle, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30">
            <Package className="text-white" size={40} />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">BoxTrack AI</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Organize your boxes, track items, and find everything instantly.
          </p>

          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold py-4 px-6 rounded-xl transition-all shadow-sm group"
          >
            <Package className="w-5 h-5" />
            <span>Continue locally</span>
          </button>
          
          <p className="mt-8 text-xs text-gray-400 dark:text-gray-600">
            By continuing, you agree to organize your life.
          </p>
        </div>
      </div>
    </div>
  );
};
