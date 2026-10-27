import React, { useState } from 'react';
import { X, Server, Check, AlertCircle, RefreshCw, Radio, Shield, Key } from 'lucide-react';
import { JellyfinServerConfig } from '../types/index.ts';
import { jellyfin } from '../services/jellyfinService.ts';

interface JellyfinConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverConfig: JellyfinServerConfig;
  onUpdateConfig: (config: JellyfinServerConfig) => void;
  onRefreshLibrary: () => void;
}

export const JellyfinConfigModal: React.FC<JellyfinConfigModalProps> = ({
  isOpen,
  onClose,
  serverConfig,
  onUpdateConfig,
  onRefreshLibrary,
}) => {
  if (!isOpen) return null;

  const [url, setUrl] = useState(serverConfig.url);
  const [authMode, setAuthMode] = useState<'credentials' | 'token'>('credentials');
  const [username, setUsername] = useState(serverConfig.username);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(serverConfig.token);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setStatusMessage(null);
    const res = await jellyfin.testConnection(url, token);
    setIsTesting(false);

    if (res.success) {
      setStatusMessage({
        text: `Successfully connected to ${res.serverInfo.serverName} (v${res.serverInfo.serverVersion})!`,
        type: 'success',
      });
    } else {
      setStatusMessage({
        text: res.error || 'Connection failed. Please ensure CORS is enabled on Jellyfin.',
        type: 'error',
      });
    }
  };

  const handleAuthenticate = async () => {
    setIsTesting(true);
    setStatusMessage(null);

    if (authMode === 'credentials') {
      const res = await jellyfin.authenticate(url, username, password);
      setIsTesting(false);
      if (res.success && res.config) {
        onUpdateConfig(res.config);
        onRefreshLibrary();
        setStatusMessage({ text: 'Authenticated and synced library successfully!', type: 'success' });
        setTimeout(onClose, 1200);
      } else {
        setStatusMessage({ text: res.error || 'Authentication error.', type: 'error' });
      }
    } else {
      // Direct token save
      const newConfig: JellyfinServerConfig = {
        ...serverConfig,
        url,
        token,
        isDemoMode: false,
        isConnected: true,
      };
      jellyfin.saveConfig(newConfig);
      onUpdateConfig(newConfig);
      onRefreshLibrary();
      setStatusMessage({ text: 'API Token configured!', type: 'success' });
      setIsTesting(false);
      setTimeout(onClose, 1000);
    }
  };

  const handleUseDemo = () => {
    const demo = jellyfin.resetToDemo();
    onUpdateConfig(demo);
    onRefreshLibrary();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0e1320] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Jellyfin Server Connection
              </h3>
              <p className="text-xs text-slate-400">
                Connect your personal Jellyfin server or use built-in demo environment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Active Connection Status */}
          <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  serverConfig.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <div>
                <p className="text-xs font-semibold text-white">
                  {serverConfig.isDemoMode ? 'Demo Mode Active' : serverConfig.serverName}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {serverConfig.url} • {serverConfig.pingMs}ms latency
                </p>
              </div>
            </div>

            {!serverConfig.isDemoMode && (
              <button
                onClick={handleUseDemo}
                className="text-xs text-cyan-400 hover:underline font-medium"
              >
                Switch to Demo Mode
              </button>
            )}
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 font-mono">
                JELLYFIN SERVER URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://jellyfin.yourdomain.com or http://192.168.1.50:8096"
                className="w-full bg-white/5 text-xs text-white px-3 py-2 rounded-lg border border-white/10 focus:border-[var(--fin-accent)] focus:outline-none font-mono"
              />
            </div>

            {/* Auth Mode Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAuthMode('credentials')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  authMode === 'credentials'
                    ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                Username & Password
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('token')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  authMode === 'token'
                    ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                Direct API Key / Token
              </button>
            </div>

            {authMode === 'credentials' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400">USERNAME</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Jellyfin username"
                    className="w-full bg-white/5 text-xs text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400">PASSWORD</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave empty if none"
                    className="w-full bg-white/5 text-xs text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400">
                  JELLYFIN API TOKEN (X-Emby-Token)
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your Jellyfin API token"
                  className="w-full bg-white/5 text-xs text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none font-mono"
                />
              </div>
            )}
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-950/50 text-rose-300 border border-rose-500/30'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-black/20">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 border border-white/10 transition"
          >
            {isTesting ? 'Pinging...' : 'Test Ping'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUseDemo}
              className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Reset to Demo Server
            </button>
            <button
              onClick={handleAuthenticate}
              disabled={isTesting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
            >
              Connect & Sync
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
