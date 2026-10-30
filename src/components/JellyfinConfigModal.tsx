import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Server,
  Check,
  AlertCircle,
  RefreshCw,
  Key,
  UserCheck,
  Smartphone,
  Copy,
  Loader2,
  FolderOpen,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { JellyfinServerConfig, JellyfinPublicUser } from '../types/index.ts';
import { jellyfin } from '../services/jellyfinService.ts';

interface JellyfinConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverConfig: JellyfinServerConfig;
  onUpdateConfig: (config: JellyfinServerConfig) => void;
  onRefreshLibrary: () => Promise<void> | void;
}

export const JellyfinConfigModal: React.FC<JellyfinConfigModalProps> = ({
  isOpen,
  onClose,
  serverConfig,
  onUpdateConfig,
  onRefreshLibrary,
}) => {
  const [url, setUrl] = useState(() =>
    serverConfig.isDemoMode ? jellyfin.getLastRealUrl() : serverConfig.url
  );
  const [authMode, setAuthMode] = useState<'credentials' | 'quickconnect' | 'token'>('credentials');
  const [username, setUsername] = useState(() =>
    serverConfig.isDemoMode ? '' : serverConfig.username
  );
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(() =>
    serverConfig.isDemoMode ? '' : serverConfig.token
  );

  // Server discovery state
  const [isTesting, setIsTesting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [publicUsers, setPublicUsers] = useState<JellyfinPublicUser[]>([]);
  const [discoveredServer, setDiscoveredServer] = useState<{
    name: string;
    version: string;
    pingMs: number;
    useProxy: boolean;
    quickConnectEnabled: boolean;
  } | null>(null);

  // Quick Connect state
  const [qcCode, setQcCode] = useState<string | null>(null);
  const [qcSecret, setQcSecret] = useState<string | null>(null);
  const [qcUrl, setQcUrl] = useState<string>('');
  const [qcUseProxy, setQcUseProxy] = useState<boolean | undefined>(undefined);
  const [qcPolling, setQcPolling] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const pollIntervalRef = useRef<any>(null);

  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Sync local fields if serverConfig changes externally
  useEffect(() => {
    if (isOpen) {
      if (!serverConfig.isDemoMode) {
        setUrl(serverConfig.url);
        setUsername(serverConfig.username);
        setToken(serverConfig.token);
      } else {
        const lastUrl = jellyfin.getLastRealUrl();
        if (lastUrl && !url) setUrl(lastUrl);
      }
    } else {
      stopQuickConnectPolling();
    }
    return () => stopQuickConnectPolling();
  }, [isOpen, serverConfig]);

  const stopQuickConnectPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setQcPolling(false);
  };

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!url.trim()) {
      setStatusMessage({ text: 'Please enter your Jellyfin server URL first.', type: 'error' });
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);
    const res = await jellyfin.testConnection(url, authMode === 'token' ? token : undefined);
    setIsTesting(false);

    if (res.success && res.serverInfo) {
      if (res.normalizedUrl) setUrl(res.normalizedUrl);
      setPublicUsers(res.publicUsers || []);
      setDiscoveredServer({
        name: res.serverInfo.serverName,
        version: res.serverInfo.serverVersion,
        pingMs: res.pingMs || 18,
        useProxy: Boolean(res.useProxy),
        quickConnectEnabled: res.quickConnectEnabled !== false,
      });
      setStatusMessage({
        text: `Connected to "${res.serverInfo.serverName}" (Jellyfin v${res.serverInfo.serverVersion}) • ${res.pingMs || 18}ms${
          res.useProxy ? ' via Proxy' : ''
        }`,
        type: 'success',
      });
    } else {
      setDiscoveredServer(null);
      setStatusMessage({
        text:
          res.error ||
          'Connection failed. Verify the Jellyfin URL and port (e.g. https://jellyfin.yourdomain.com or http://192.168.1.50:8096).',
        type: 'error',
      });
    }
  };

  const handleStartQuickConnect = async () => {
    if (!url.trim()) {
      setStatusMessage({
        text: 'Please enter your Jellyfin server URL above to start Quick Connect.',
        type: 'error',
      });
      return;
    }

    stopQuickConnectPolling();
    setIsAuthenticating(true);
    setQcCode(null);
    setQcSecret(null);
    setStatusMessage({ text: 'Requesting Quick Connect code from Jellyfin server...', type: 'info' });

    const res = await jellyfin.initiateQuickConnect(url);
    setIsAuthenticating(false);

    if (!res.success || !res.code || !res.secret || !res.normalizedUrl) {
      setStatusMessage({
        text: res.error || 'Could not initiate Quick Connect.',
        type: 'error',
      });
      return;
    }

    const targetUrl = res.normalizedUrl;
    const secret = res.secret;
    const useProxy = res.useProxy;

    setUrl(targetUrl);
    setQcCode(res.code);
    setQcSecret(secret);
    setQcUrl(targetUrl);
    setQcUseProxy(useProxy);
    setQcPolling(true);
    setStatusMessage({
      text: 'Enter the 6-digit code below in your logged-in Jellyfin app (Settings → Quick Connect). Waiting for authorization...',
      type: 'info',
    });

    pollIntervalRef.current = setInterval(async () => {
      await checkAndCompleteQuickConnect(targetUrl, secret, useProxy, true);
    }, 2500);
  };

  const checkAndCompleteQuickConnect = async (
    targetUrl: string,
    secret: string,
    useProxy?: boolean,
    isAutoPoll = false
  ) => {
    const status = await jellyfin.checkQuickConnectStatus(targetUrl, secret, useProxy);
    if (status.authenticated) {
      stopQuickConnectPolling();
      setIsAuthenticating(true);
      setStatusMessage({
        text: 'Quick Connect authorized! Signing in and syncing music library...',
        type: 'info',
      });

      const authRes = await jellyfin.authenticateWithQuickConnect(targetUrl, secret, useProxy);
      if (authRes.success && authRes.config) {
        onUpdateConfig(authRes.config);
        await onRefreshLibrary();
        setIsAuthenticating(false);
        setStatusMessage({
          text: `Signed in as ${authRes.config.username} on ${authRes.config.serverName}!`,
          type: 'success',
        });
        setTimeout(onClose, 900);
      } else {
        setIsAuthenticating(false);
        setStatusMessage({
          text: authRes.error || 'Failed to exchange Quick Connect token.',
          type: 'error',
        });
      }
    } else if (!isAutoPoll) {
      setStatusMessage({
        text: 'Not authorized yet. Please enter the 6-digit code in your Jellyfin client under Quick Connect.',
        type: 'info',
      });
    }
  };

  const handleAuthenticate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) {
      setStatusMessage({ text: 'Please enter your Jellyfin server URL.', type: 'error' });
      return;
    }

    if (authMode === 'quickconnect') {
      if (qcSecret && qcUrl) {
        await checkAndCompleteQuickConnect(qcUrl, qcSecret, qcUseProxy, false);
      } else {
        await handleStartQuickConnect();
      }
      return;
    }

    setIsAuthenticating(true);
    setStatusMessage({ text: 'Authenticating with Jellyfin server...', type: 'info' });

    if (authMode === 'credentials') {
      const res = await jellyfin.authenticate(url, username, password);
      if (res.success && res.config) {
        setUrl(res.config.url);
        onUpdateConfig(res.config);
        setStatusMessage({
          text: `Authenticated as ${res.config.username}! Syncing music library...`,
          type: 'info',
        });
        await onRefreshLibrary();
        setIsAuthenticating(false);
        setStatusMessage({
          text: `Connected to ${res.config.serverName} and synced music library!`,
          type: 'success',
        });
        setTimeout(onClose, 900);
      } else {
        setIsAuthenticating(false);
        setStatusMessage({ text: res.error || 'Authentication failed.', type: 'error' });
      }
    } else if (authMode === 'token') {
      const res = await jellyfin.authenticateWithToken(url, token, username);
      if (res.success && res.config) {
        setUrl(res.config.url);
        onUpdateConfig(res.config);
        setStatusMessage({
          text: `API Token verified for ${res.config.username}! Syncing music library...`,
          type: 'info',
        });
        await onRefreshLibrary();
        setIsAuthenticating(false);
        setStatusMessage({
          text: `Connected to ${res.config.serverName} via API Token!`,
          type: 'success',
        });
        setTimeout(onClose, 900);
      } else {
        setIsAuthenticating(false);
        setStatusMessage({ text: res.error || 'API Token authentication failed.', type: 'error' });
      }
    }
  };

  const handleSelectLibrary = async (libraryId: string) => {
    const updated: JellyfinServerConfig = {
      ...serverConfig,
      selectedLibraryId: libraryId || undefined,
    };
    jellyfin.saveConfig(updated);
    onUpdateConfig(updated);
    setStatusMessage({ text: 'Syncing selected music library...', type: 'info' });
    await onRefreshLibrary();
    setStatusMessage({ text: 'Music library synced!', type: 'success' });
  };

  const handleUseDemo = async () => {
    stopQuickConnectPolling();
    const demo = jellyfin.resetToDemo();
    onUpdateConfig(demo);
    await onRefreshLibrary();
    onClose();
  };

  const handleCopyCode = () => {
    if (!qcCode) return;
    navigator.clipboard?.writeText(qcCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0e1320] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Jellyfin Server Connection
              </h3>
              <p className="text-xs text-slate-400">
                Sign in with Username & Password, Quick Connect code, or API Token
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

        {/* Scrollable Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Active Connection Banner */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  serverConfig.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-white">
                    {serverConfig.isDemoMode
                      ? 'Demo Environment Active (SoundSphere)'
                      : serverConfig.serverName}
                  </p>
                  {!serverConfig.isDemoMode && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 font-semibold">
                      {serverConfig.username}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  {serverConfig.isDemoMode
                    ? 'Enter your Jellyfin server URL below to connect your real library'
                    : `${serverConfig.url} • ${serverConfig.pingMs}ms${
                        serverConfig.useProxy ? ' • Proxy Active' : ''
                      }`}
                </p>
              </div>
            </div>

            {!serverConfig.isDemoMode && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setStatusMessage({ text: 'Refreshing library from Jellyfin...', type: 'info' });
                    await onRefreshLibrary();
                    setStatusMessage({ text: 'Library refreshed!', type: 'success' });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-cyan-300 border border-white/10 flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Resync</span>
                </button>
                <button
                  type="button"
                  onClick={handleUseDemo}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-xs text-rose-300 border border-rose-500/30 flex items-center gap-1 transition"
                  title="Disconnect and return to Demo Mode"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>

          {/* Music Library Selector when connected to a real server with multiple views */}
          {!serverConfig.isDemoMode && serverConfig.musicLibraries.length > 0 && (
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-indigo-200 font-medium">
                <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Active Jellyfin Library:</span>
              </div>
              <select
                value={serverConfig.selectedLibraryId || ''}
                onChange={(e) => handleSelectLibrary(e.target.value)}
                className="bg-[#0b0f1b] text-xs text-white px-3 py-1.5 rounded-lg border border-indigo-500/40 focus:outline-none font-mono"
              >
                <option value="">All Audio Libraries</option>
                {serverConfig.musicLibraries.map((lib) => (
                  <option key={lib.id} value={lib.id}>
                    {lib.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Step 1: Server URL Input + Test Ping */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 font-mono flex items-center justify-between">
              <span>1. JELLYFIN SERVER ADDRESS</span>
              {discoveredServer && (
                <span className="text-[10px] text-emerald-400 font-normal">
                  ✓ {discoveredServer.name} (v{discoveredServer.version})
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTestConnection();
                  }
                }}
                placeholder="https://jellyfin.yourdomain.com or http://192.168.1.50:8096"
                className="flex-1 bg-white/5 text-xs text-white px-3.5 py-2.5 rounded-xl border border-white/15 focus:border-[var(--fin-accent)] focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || isAuthenticating}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-cyan-300 border border-white/10 transition shrink-0 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <span>Check Server</span>
                )}
              </button>
            </div>
          </div>

          {/* Step 2: Authentication Mode Selector */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-slate-300 font-mono block">
              2. AUTHENTICATION METHOD
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  stopQuickConnectPolling();
                  setAuthMode('credentials');
                  setStatusMessage(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
                  authMode === 'credentials'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/20'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Username / Pass</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('quickconnect');
                  setStatusMessage(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
                  authMode === 'quickconnect'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/20'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Quick Connect</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopQuickConnectPolling();
                  setAuthMode('token');
                  setStatusMessage(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
                  authMode === 'token'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/20'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>API Key / Token</span>
              </button>
            </div>

            {/* MODE A: USERNAME & PASSWORD */}
            {authMode === 'credentials' && (
              <form onSubmit={handleAuthenticate} className="space-y-3 pt-1">
                {/* Discovered Public Users quick-pick */}
                {publicUsers.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      Select Profile on Server:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {publicUsers.map((u) => (
                        <button
                          key={u.Id}
                          type="button"
                          onClick={() => setUsername(u.Name)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                            username === u.Name
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold'
                              : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {u.Name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your Jellyfin username"
                      autoComplete="username"
                      className="w-full bg-white/5 text-xs text-white px-3.5 py-2.5 rounded-xl border border-white/15 focus:border-[var(--fin-accent)] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (leave blank if none)"
                      autoComplete="current-password"
                      className="w-full bg-white/5 text-xs text-white px-3.5 py-2.5 rounded-xl border border-white/15 focus:border-[var(--fin-accent)] focus:outline-none"
                    />
                  </div>
                </div>
                <button type="submit" className="hidden" />
              </form>
            )}

            {/* MODE B: QUICK CONNECT */}
            {authMode === 'quickconnect' && (
              <div className="p-4 rounded-2xl bg-black/40 border border-indigo-500/30 space-y-4">
                {!qcCode ? (
                  <div className="text-center space-y-3 py-2">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white">
                        Sign In with Jellyfin Quick Connect
                      </h4>
                      <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                        Generate a 6-digit code, then open your logged-in Jellyfin mobile or web app and go to{' '}
                        <strong className="text-slate-200">Settings → Quick Connect</strong> to authorize this session without typing your password.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartQuickConnect}
                      disabled={isAuthenticating}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      {isAuthenticating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Requesting Code...</span>
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-4 h-4" />
                          <span>Generate Quick Connect Code</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-3 py-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300 font-bold">
                      Enter this Quick Connect code in Jellyfin
                    </span>

                    <div className="flex items-center justify-center gap-3">
                      <div className="px-6 py-3 rounded-2xl bg-indigo-950/80 border-2 border-indigo-400/60 text-2xl sm:text-3xl font-mono font-black tracking-[0.25em] text-white shadow-inner">
                        {qcCode.length === 6
                          ? `${qcCode.slice(0, 3)} ${qcCode.slice(3)}`
                          : qcCode}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
                        title="Copy 6-digit code"
                      >
                        {copiedCode ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs text-cyan-300 font-medium pt-1">
                      {qcPolling && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
                      <span>
                        {qcPolling
                          ? 'Listening for authorization from your Jellyfin server...'
                          : 'Code generated'}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          qcSecret &&
                          qcUrl &&
                          checkAndCompleteQuickConnect(qcUrl, qcSecret, qcUseProxy, false)
                        }
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600/40 hover:bg-indigo-600 text-xs font-semibold text-white border border-indigo-400/40 transition"
                      >
                        I Authorized It — Check Now
                      </button>
                      <button
                        type="button"
                        onClick={handleStartQuickConnect}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-400 hover:text-white transition"
                      >
                        New Code
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODE C: DIRECT API KEY / TOKEN */}
            {authMode === 'token' && (
              <form onSubmit={handleAuthenticate} className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">
                    Jellyfin API Key / Access Token (X-Emby-Token)
                  </label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste your Jellyfin API key or access token"
                    className="w-full bg-white/5 text-xs text-white px-3.5 py-2.5 rounded-xl border border-white/15 focus:border-[var(--fin-accent)] focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">
                    Target Username (Optional for Server Admin API Keys)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Optional: specify Jellyfin user profile name"
                    className="w-full bg-white/5 text-xs text-white px-3.5 py-2 rounded-xl border border-white/15 focus:border-[var(--fin-accent)] focus:outline-none"
                  />
                </div>
                <button type="submit" className="hidden" />
              </form>
            )}
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 leading-relaxed ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                  : statusMessage.type === 'info'
                  ? 'bg-indigo-950/60 text-indigo-200 border border-indigo-500/40'
                  : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : statusMessage.type === 'info' ? (
                <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-black/30 shrink-0">
          <button
            type="button"
            onClick={handleUseDemo}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-400 hover:text-white border border-white/10 transition"
          >
            Use Demo Server
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>

            {authMode !== 'quickconnect' ? (
              <button
                type="button"
                onClick={() => handleAuthenticate()}
                disabled={isAuthenticating || isTesting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting & Syncing...</span>
                  </>
                ) : (
                  <span>Sign In & Sync Library</span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartQuickConnect}
                disabled={isAuthenticating}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{qcCode ? 'Refresh Code' : 'Start Quick Connect'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
