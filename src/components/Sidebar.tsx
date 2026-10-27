import React from 'react';
import {
  Music,
  Disc,
  Users,
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
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  Settings,
  PanelTop,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import { Track, NavPosition, DraggableSectionId } from '../types/index.ts';

export type NavView =
  | 'tracks'
  | 'albums'
  | 'artists'
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
  currentTrack: Track | null;
  onOpenMetadataEditor: (track: Track) => void;
  sidebarWidth?: number;
  topTabsHeightPx?: number;
  navItemScale?: number;
  position?: NavPosition;
  uppercaseHeaders?: boolean;
  isLayoutEditMode?: boolean;
  onMoveNavPosition?: (pos: NavPosition) => void;
  onDragStartSection?: (section: DraggableSectionId) => void;
  onDragEndSection?: () => void;
  onOpenSettingsModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  trackCount,
  albumCount,
  artistCount,
  currentTrack,
  onOpenMetadataEditor,
  sidebarWidth = 230,
  topTabsHeightPx = 50,
  navItemScale = 100,
  position = 'left',
  uppercaseHeaders = true,
  isLayoutEditMode = false,
  onMoveNavPosition,
  onDragStartSection,
  onDragEndSection,
  onOpenSettingsModal,
}) => {
  const navItems: NavGroup[] = [
    {
      group: 'Library',
      items: [
        { id: 'tracks', label: 'All Tracks', shortLabel: 'Tracks', icon: Music, badge: trackCount },
        { id: 'albums', label: 'Albums', shortLabel: 'Albums', icon: Disc, badge: albumCount },
        { id: 'artists', label: 'Artists', shortLabel: 'Artists', icon: Users, badge: artistCount },
      ],
    },
    {
      group: 'Discovery & ML',
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
      group: 'Hi-Fi Audio',
      items: [
        { id: 'dsp', label: '10-Band EQ & DSP', shortLabel: 'EQ & DSP', icon: SlidersHorizontal },
        { id: 'specs', label: 'Performance Metrics', shortLabel: 'Telemetry', icon: Activity },
      ],
    },
    {
      group: 'Customize',
      items: [
        { id: 'themes', label: 'Themes & Live CSS', shortLabel: 'Themes', icon: Palette },
        { id: 'hotkeys', label: 'Hotkey Manager', shortLabel: 'Hotkeys', icon: Keyboard },
        { id: 'art-search', label: 'Cover Art Search', shortLabel: 'Cover Art', icon: Image },
      ],
    },
    {
      group: 'Server',
      items: [
        { id: 'jellyfin-config', label: 'Jellyfin Sync', shortLabel: 'Server', icon: Server },
      ],
    },
  ];

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', 'navigation');
    e.dataTransfer.effectAllowed = 'move';
    onDragStartSection?.('navigation');
  };

  // HORIZONTAL TOP TABS OR BOTTOM RIBBON MODE
  if (position === 'top' || position === 'bottom') {
    const allItems = navItems.flatMap((g) => g.items);
    return (
      <nav
        draggable
        onDragStart={handleDragStart}
        onDragEnd={() => onDragEndSection?.()}
        style={{
          minHeight: `${topTabsHeightPx}px`,
          fontSize: `${navItemScale}%`,
        }}
        aria-label="Main navigation tabs"
        className={`w-full bg-[var(--fin-sidebar)] px-4 py-1.5 flex items-center justify-between gap-2 shrink-0 select-none backdrop-blur-[var(--fin-blur)] z-20 finamp-sidebar transition-all ${
          position === 'top' ? 'border-b border-white/10' : 'border-t border-white/10'
        } ${isLayoutEditMode ? 'ring-2 ring-cyan-400/60 bg-cyan-950/20' : ''}`}
      >
        {/* Left Drag Grip & Quick Dock Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-300 cursor-grab active:cursor-grabbing border border-white/10 transition"
            title="Drag Navigation Section to Left Sidebar, Right Sidebar, Top Tabs, or Bottom"
          >
            <GripHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider hidden xl:inline">
              Nav Tabs
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
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-black/20 text-slate-950 font-bold' : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: All Settings Button in Top Tab Bar */}
        {onOpenSettingsModal && (
          <button
            onClick={onOpenSettingsModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 shrink-0 transition"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Customize</span>
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
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => onDragEndSection?.()}
      style={{ width: isCompact ? '68px' : `${sidebarWidth}px` }}
      className={`bg-[var(--fin-sidebar)] ${
        position === 'right' ? 'border-l' : 'border-r'
      } border-white/5 flex flex-col justify-between shrink-0 select-none backdrop-blur-[var(--fin-blur)] z-20 finamp-sidebar overflow-y-auto transition-all duration-150 ${
        isLayoutEditMode ? 'ring-2 ring-cyan-400/60' : ''
      }`}
    >
      <div className="p-3 space-y-4">
        {/* Draggable Section Header / Quick Dock Bar */}
        <div className="flex items-center justify-between px-1.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 group">
          <div
            className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 group-hover:text-cyan-300 cursor-grab active:cursor-grabbing"
            title="Drag this Sidebar to the Top Zone to turn it into Top Tabs, or to the Right!"
          >
            <GripVertical className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            {!isCompact && <span className="font-bold uppercase tracking-wider">Navigation</span>}
          </div>

          {!isCompact && onMoveNavPosition && (
            <div className="flex items-center gap-0.5">
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
            </div>
          )}
        </div>

        {navItems.map((group) => (
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
                    {!isCompact && item.badge !== undefined && (
                      <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">
                        {item.badge}
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

        {/* Dedicated All Settings Button */}
        {onOpenSettingsModal && (
          <div className="pt-2">
            <button
              onClick={onOpenSettingsModal}
              className={`w-full flex items-center ${
                isCompact ? 'justify-center py-2.5' : 'gap-2.5 px-3 py-2'
              } rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 hover:from-cyan-500/25 hover:to-indigo-500/25 border border-cyan-500/30 transition shadow-sm`}
              title="Open All Settings & Customization"
            >
              <Settings className="w-4 h-4 text-cyan-400 shrink-0" />
              {!isCompact && <span>All Settings</span>}
            </button>
          </div>
        )}
      </div>

      {/* Mini Current Track Artwork / Info at Sidebar Base */}
      {currentTrack && !isCompact && (
        <div className="p-3 border-t border-white/5 bg-black/20 m-2 rounded-xl backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-10 h-10 rounded-lg object-cover shadow-md border border-white/10 shrink-0 cursor-pointer hover:opacity-80 transition"
              onClick={() => onOpenMetadataEditor(currentTrack)}
              title="Click to view/edit metadata"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {currentTrack.title}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
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
