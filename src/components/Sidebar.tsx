import React, { useState } from 'react';
import {
  Music,
  Disc,
  Users,
  UserCheck,
  Tag,
  Calendar,
  Heart,
  Sparkles,
  SlidersHorizontal,
  Activity,
  Palette,
  Keyboard,
  Image,
  Server,
  LucideIcon,
  GripVertical,
  GripHorizontal,
  ArrowLeft,
  ArrowRight,
  Settings,
  PanelTop,
  PanelLeft,
  PanelRight,
  Eye,
  Home,
  Check,
} from 'lucide-react';
import {
  Track,
  NavPosition,
  DraggableSectionId,
  VisibleSidebarItems,
} from '../types/index.ts';
import { DEFAULT_LAYOUT_CONFIG } from '../services/layoutEngine.ts';
import { resolveCoverArt, handleCoverImgError } from '../utils/jellywispArtwork.ts';

export type NavView =
  | 'home'
  | 'tracks'
  | 'albums'
  | 'album-artists'
  | 'artists'
  | 'genres'
  | 'decades'
  | 'favorites'
  | 'smart-playlists'
  | 'dsp'
  | 'specs'
  | 'themes'
  | 'hotkeys'
  | 'art-search'
  | 'jellyfin-config';

interface NavItem {
  id: NavView;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  badge?: number;
  glow?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  trackCount: number;
  albumCount: number;
  artistCount: number;
  albumArtistCount?: number;
  genreCount?: number;
  decadeCount?: number;
  favoriteCount?: number;
  currentTrack: Track | null;
  onOpenMetadataEditor: (track: Track) => void;
  onOpenDedicatedPlayer?: () => void;
  sidebarWidth?: number;
  topTabsHeightPx?: number;
  navItemScale?: number;
  position?: NavPosition;
  uppercaseHeaders?: boolean;
  visibleSidebarItems?: VisibleSidebarItems;
  showSidebarQuickCard?: boolean;
  isLayoutEditMode?: boolean;
  onMoveNavPosition?: (pos: NavPosition) => void;
  onResizeSidebarWidth?: (widthPx: number) => void;
  onResizeTopTabsHeight?: (heightPx: number) => void;
  onToggleSidebarItem?: (itemId: keyof VisibleSidebarItems) => void;
  onDragStartSection?: (section: DraggableSectionId) => void;
  onDragEndSection?: () => void;
  onOpenSettingsModal?: () => void;
  onNavigateToArtist?: (artistName: string) => void;
  onContextMenuArtist?: (e: React.MouseEvent, artistName: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  trackCount,
  albumCount,
  artistCount,
  albumArtistCount,
  genreCount,
  decadeCount,
  favoriteCount,
  currentTrack,
  onOpenMetadataEditor,
  onOpenDedicatedPlayer,
  sidebarWidth = 235,
  topTabsHeightPx = 50,
  navItemScale = 100,
  position = 'left',
  uppercaseHeaders = true,
  visibleSidebarItems,
  showSidebarQuickCard = true,
  isLayoutEditMode = false,
  onMoveNavPosition,
  onResizeSidebarWidth,
  onResizeTopTabsHeight,
  onToggleSidebarItem,
  onDragStartSection,
  onDragEndSection,
  onOpenSettingsModal,
  onNavigateToArtist,
  onContextMenuArtist,
}) => {
  const [showCustomizeMenu, setShowCustomizeMenu] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const vis: VisibleSidebarItems = {
    ...DEFAULT_LAYOUT_CONFIG.visibleSidebarItems,
    ...(visibleSidebarItems || {}),
  };

  const allNavGroups: NavGroup[] = [
    {
      group: 'Discover',
      items: [
        { id: 'home', label: 'Home Dashboard', shortLabel: 'Home', icon: Home },
      ],
    },
    {
      group: 'Library',
      items: [
        { id: 'tracks', label: 'All Tracks', shortLabel: 'Tracks', icon: Music, badge: trackCount },
        { id: 'albums', label: 'Albums', shortLabel: 'Albums', icon: Disc, badge: albumCount },
        {
          id: 'album-artists',
          label: 'Album Artists',
          shortLabel: 'Album Artists',
          icon: UserCheck,
          badge: albumArtistCount,
        },
        { id: 'artists', label: 'Artists', shortLabel: 'Artists', icon: Users, badge: artistCount },
        { id: 'genres', label: 'Genres', shortLabel: 'Genres', icon: Tag, badge: genreCount },
        {
          id: 'decades',
          label: 'Decades & Era',
          shortLabel: 'Decades',
          icon: Calendar,
          badge: decadeCount,
        },
        {
          id: 'favorites',
          label: 'Favorites',
          shortLabel: 'Favorites',
          icon: Heart,
          badge: favoriteCount,
        },
      ],
    },
    {
      group: 'Discovery',
      items: [
        {
          id: 'smart-playlists',
          label: 'Smart Mood Playlists',
          shortLabel: 'Mood Mixes',
          icon: Sparkles,
          glow: true,
        },
      ],
    },
    {
      group: 'Audio & Tools',
      items: [
        { id: 'dsp', label: '10-Band EQ & DSP', shortLabel: 'EQ & DSP', icon: SlidersHorizontal },
        { id: 'specs', label: 'Performance Metrics', shortLabel: 'Telemetry', icon: Activity },
        { id: 'themes', label: 'Themes & Live CSS', shortLabel: 'Themes', icon: Palette },
        { id: 'hotkeys', label: 'Hotkey Manager', shortLabel: 'Hotkeys', icon: Keyboard },
        { id: 'art-search', label: 'Cover Art Search', shortLabel: 'Cover Art', icon: Image },
        { id: 'jellyfin-config', label: 'Jellyfin Server', shortLabel: 'Server', icon: Server },
      ],
    },
  ];

  // Filter visible groups
  const visibleGroups = allNavGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => vis[item.id] !== false),
    }))
    .filter((g) => g.items.length > 0);

  const handleDragStart = (e: React.DragEvent) => {
    if (isResizing) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', 'navigation');
    e.dataTransfer.effectAllowed = 'move';
    onDragStartSection?.('navigation');
  };

  // Real-time Mouse Edge Drag Resizing for Vertical Sidebar (Windows-style)
  const startVerticalResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onResizeSidebarWidth) return;

    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX =
        position === 'right' ? startX - moveEvent.clientX : moveEvent.clientX - startX;
      const nextWidth = Math.max(140, Math.min(520, startWidth + deltaX));
      onResizeSidebarWidth(nextWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Real-time Mouse Edge Drag Resizing for Horizontal Top/Bottom Tabs Bar
  const startHorizontalResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onResizeTopTabsHeight) return;

    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = topTabsHeightPx;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY =
        position === 'bottom' ? startY - moveEvent.clientY : moveEvent.clientY - startY;
      const nextHeight = Math.max(36, Math.min(96, startHeight + deltaY));
      onResizeTopTabsHeight(nextHeight);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'row-resize';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // HORIZONTAL TOP TABS OR BOTTOM RIBBON MODE
  if (position === 'top' || position === 'bottom') {
    const allItems = visibleGroups.flatMap((g) => g.items);
    return (
      <nav
        draggable={!isResizing}
        onDragStart={handleDragStart}
        onDragEnd={() => onDragEndSection?.()}
        style={{
          height: `${topTabsHeightPx}px`,
          fontSize: `${navItemScale}%`,
        }}
        aria-label="Main navigation tabs"
        className={`w-full bg-[var(--fin-sidebar)] px-4 flex items-center justify-between gap-2 shrink-0 select-none backdrop-blur-[var(--fin-blur)] z-20 jellywisp-sidebar relative ${
          position === 'top' ? 'border-b border-white/10' : 'border-t border-white/10'
        } ${isLayoutEditMode ? 'ring-2 ring-cyan-400/60 bg-cyan-950/20' : ''}`}
      >
        {/* Real-time Edge Resize Handle for Top/Bottom Bar */}
        <div
          onMouseDown={startHorizontalResize}
          title="Drag edge to resize bar height"
          className={`absolute left-0 right-0 h-2 z-40 cursor-row-resize hover:bg-cyan-400/60 transition-colors ${
            position === 'top' ? 'bottom-0' : 'top-0'
          } ${isResizing ? 'bg-cyan-400' : ''}`}
        />

        {/* Left Drag Grip & Quick Dock Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-300 cursor-grab active:cursor-grabbing border border-white/10 transition"
            title="Drag Navigation Section to Left Sidebar, Right Sidebar, Top Tabs, or Bottom"
          >
            <GripHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider hidden xl:inline">
              Nav
            </span>
          </div>

          {isLayoutEditMode && onMoveNavPosition && (
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-cyan-500/40">
              <button
                onClick={() => onMoveNavPosition('left')}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 transition flex items-center gap-1"
                title="Dock as Left Sidebar"
              >
                <PanelLeft className="w-3 h-3" /> Left
              </button>
              <button
                onClick={() => onMoveNavPosition('right')}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 transition flex items-center gap-1"
                title="Dock as Right Sidebar"
              >
                <PanelRight className="w-3 h-3" /> Right
              </button>
            </div>
          )}
        </div>

        {/* Center Horizontal Tab Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
          {allItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
                  isActive
                    ? 'bg-[var(--fin-accent)] text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-black/20 text-slate-950 font-bold' : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {item.badge.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Settings Button */}
        {onOpenSettingsModal && (
          <button
            onClick={onOpenSettingsModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 shrink-0 transition"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Settings</span>
          </button>
        )}
      </nav>
    );
  }

  // COMPACT ICON-ONLY RAIL MODE
  const isCompact = position === 'compact';

  // VERTICAL LEFT OR RIGHT SIDEBAR MODE
  return (
    <aside
      draggable={!isResizing}
      onDragStart={handleDragStart}
      onDragEnd={() => onDragEndSection?.()}
      style={{ width: isCompact ? '68px' : `${sidebarWidth}px` }}
      className={`bg-[var(--fin-sidebar)] ${
        position === 'right' ? 'border-l' : 'border-r'
      } border-white/5 flex flex-col justify-between shrink-0 select-none backdrop-blur-[var(--fin-blur)] z-20 jellywisp-sidebar relative ${
        isLayoutEditMode ? 'ring-2 ring-cyan-400/60' : ''
      }`}
    >
      {/* Real-time Windows-style Edge Drag Resize Handle */}
      {!isCompact && (
        <div
          onMouseDown={startVerticalResize}
          title="Drag edge left or right to resize sidebar width"
          className={`absolute top-0 bottom-0 w-2 z-40 cursor-col-resize hover:bg-cyan-400/60 transition-colors group ${
            position === 'right' ? 'left-0 -ml-1' : 'right-0 -mr-1'
          } ${isResizing ? 'bg-cyan-400' : ''}`}
        >
          {isResizing && (
            <span className="absolute top-1/2 -translate-y-1/2 left-3 px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-mono font-bold text-[10px] shadow-lg whitespace-nowrap">
              {Math.round(sidebarWidth)}px
            </span>
          )}
        </div>
      )}

      <div className="p-3 space-y-4 overflow-y-auto flex-1">
        {/* Draggable Section Header / Quick Dock Bar + Show/Hide Sidebar Items Popover */}
        <div className="flex items-center justify-between px-1.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 group relative">
          <div
            className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 group-hover:text-cyan-300 cursor-grab active:cursor-grabbing"
            title="Drag this Sidebar to the Top Zone to turn it into Top Tabs, or to the Right!"
          >
            <GripVertical className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            {!isCompact && <span className="font-bold uppercase tracking-wider">Library Nav</span>}
          </div>

          {!isCompact && (
            <div className="flex items-center gap-0.5">
              {onToggleSidebarItem && (
                <button
                  onClick={() => setShowCustomizeMenu((v) => !v)}
                  className={`p-1 rounded transition ${
                    showCustomizeMenu
                      ? 'bg-cyan-500 text-slate-950'
                      : 'hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300'
                  }`}
                  title="Show or Hide Sidebar Navigation Items"
                >
                  <Eye className="w-3 h-3" />
                </button>
              )}
              {onMoveNavPosition && (
                <>
                  <button
                    onClick={() => onMoveNavPosition('top')}
                    className="p-1 rounded hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 transition"
                    title="Push Sidebar into Top Horizontal Tabs"
                    aria-label="Push sidebar to top tabs"
                  >
                    <PanelTop className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onMoveNavPosition(position === 'left' ? 'right' : 'left')}
                    className="p-1 rounded hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 transition"
                    title={position === 'left' ? 'Move Sidebar to Right' : 'Move Sidebar to Left'}
                    aria-label="Flip sidebar side"
                  >
                    {position === 'left' ? (
                      <ArrowRight className="w-3 h-3" />
                    ) : (
                      <ArrowLeft className="w-3 h-3" />
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Inline Sidebar Items Show/Hide Customizer */}
        {showCustomizeMenu && !isCompact && onToggleSidebarItem && (
          <div className="p-3 rounded-xl bg-[#0b101e] border border-cyan-500/40 space-y-2 shadow-xl">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Show / Hide Sidebar Items
              </span>
              <button
                onClick={() => setShowCustomizeMenu(false)}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                Done
              </button>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
              {allNavGroups
                .flatMap((g) => g.items)
                .map((item) => {
                  const enabled = vis[item.id] !== false;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onToggleSidebarItem(item.id)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition ${
                        enabled
                          ? 'bg-cyan-500/15 text-white font-semibold'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span>{item.label}</span>
                      {enabled && <Check className="w-3 h-3 text-cyan-400" />}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {visibleGroups.map((group) => (
          <div key={group.group}>
            {!isCompact && (
              <div
                className={`text-[10px] font-bold tracking-wider text-slate-500 px-2 mb-1.5 font-mono ${
                  uppercaseHeaders ? 'uppercase' : ''
                }`}
              >
                {group.group}
              </div>
            )}
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectView(item.id)}
                    title={isCompact ? item.label : undefined}
                    style={{ fontSize: `${navItemScale}%` }}
                    className={`w-full flex items-center ${
                      isCompact ? 'justify-center py-2.5' : 'justify-between px-2.5 py-2'
                    } rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-[var(--fin-accent)]/15 text-[var(--fin-accent)] border border-[var(--fin-accent)]/30 font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive
                            ? 'text-[var(--fin-accent)]'
                            : item.glow
                            ? 'text-cyan-400'
                            : 'text-slate-400'
                        }`}
                      />
                      {!isCompact && <span className="truncate">{item.label}</span>}
                    </div>
                    {!isCompact && item.badge !== undefined && item.badge > 0 && (
                      <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded tabular-nums">
                        {item.badge.toLocaleString()}
                      </span>
                    )}
                    {!isCompact && item.glow && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}

        {/* Dedicated Settings & Customization Button */}
        {onOpenSettingsModal && (
          <div className="pt-2">
            <button
              onClick={onOpenSettingsModal}
              className={`w-full flex items-center ${
                isCompact ? 'justify-center py-2.5' : 'gap-2.5 px-3 py-2'
              } rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 hover:from-cyan-500/25 hover:to-indigo-500/25 border border-cyan-500/30 transition shadow-sm`}
              title="Open Settings & Live Customization"
            >
              <Settings className="w-4 h-4 text-cyan-400 shrink-0" />
              {!isCompact && <span>Settings & Customize</span>}
            </button>
          </div>
        )}
      </div>

      {/* Mini Current Track Artwork / Info at Sidebar Base */}
      {currentTrack && !isCompact && showSidebarQuickCard !== false && (
        <div className="p-3 border-t border-white/5 bg-black/25 m-2 rounded-xl backdrop-blur-sm shrink-0">
          <div
            onClick={() => onOpenDedicatedPlayer?.()}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="Click to open Dedicated Track Player"
          >
            <img
              src={resolveCoverArt(currentTrack.coverUrl)}
              onError={handleCoverImgError}
              alt={currentTrack.title}
              className="w-10 h-10 rounded-lg object-cover shadow-md border border-white/10 shrink-0 group-hover:scale-105 transition"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold jw-text-track group-hover:text-[var(--fin-accent)] truncate transition">
                {currentTrack.title}
              </p>
              <p
                onClick={(e) => {
                  if (onNavigateToArtist) {
                    e.stopPropagation();
                    onNavigateToArtist(currentTrack.artist);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenuArtist?.(e, currentTrack.artist);
                }}
                className="text-[11px] jw-text-artist hover:underline truncate w-fit"
                title="Click for Artist Discography • Right-click for Artist Options"
              >
                {currentTrack.artist}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>{currentTrack.genre.split('/')[0]}</span>
            <button
              onClick={() => onOpenMetadataEditor(currentTrack)}
              className="text-[var(--fin-accent)] hover:underline"
            >
              Edit Tags
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
