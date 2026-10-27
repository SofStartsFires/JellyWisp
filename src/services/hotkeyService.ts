import { HotkeyBinding } from '../types/index.ts';

export const DEFAULT_HOTKEYS: HotkeyBinding[] = [
  { id: 'toggle_play', label: 'Play / Pause', category: 'playback', keyCombo: 'Space' },
  { id: 'next_track', label: 'Next Track', category: 'playback', keyCombo: 'KeyN' },
  { id: 'prev_track', label: 'Previous Track', category: 'playback', keyCombo: 'KeyP' },
  { id: 'seek_forward_5', label: 'Seek Forward 5s', category: 'playback', keyCombo: 'ArrowRight' },
  { id: 'seek_backward_5', label: 'Seek Backward 5s', category: 'playback', keyCombo: 'ArrowLeft' },
  { id: 'volume_up', label: 'Volume Up (+5%)', category: 'playback', keyCombo: 'ArrowUp' },
  { id: 'volume_down', label: 'Volume Down (-5%)', category: 'playback', keyCombo: 'ArrowDown' },
  { id: 'toggle_mute', label: 'Mute / Unmute', category: 'playback', keyCombo: 'KeyM' },
  { id: 'toggle_shuffle', label: 'Toggle Shuffle Mode', category: 'playback', keyCombo: 'KeyS' },
  { id: 'toggle_repeat', label: 'Cycle Repeat Mode', category: 'playback', keyCombo: 'KeyR' },

  { id: 'toggle_eq', label: 'Toggle 10-Band EQ', category: 'dsp', keyCombo: 'KeyE' },
  { id: 'toggle_lyrics', label: 'Toggle Synced Lyrics', category: 'view', keyCombo: 'KeyL' },
  { id: 'toggle_visualizer', label: 'Immersive Visualizer', category: 'view', keyCombo: 'KeyF' },
  { id: 'toggle_mini_player', label: 'Toggle Mini-Player Dock', category: 'view', keyCombo: 'KeyD' },
  { id: 'focus_search', label: 'Focus Quick Search', category: 'navigation', keyCombo: 'Slash' },
  { id: 'open_metadata_editor', label: 'Edit Track Metadata', category: 'dsp', keyCombo: 'KeyI' },
];

const STORAGE_KEY_HOTKEYS = 'finamp_hotkey_bindings';

export class HotkeyService {
  private bindings: HotkeyBinding[];
  private actionHandlers: Map<string, () => void> = new Map();

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY_HOTKEYS);
    if (saved) {
      try {
        this.bindings = JSON.parse(saved);
      } catch {
        this.bindings = [...DEFAULT_HOTKEYS];
      }
    } else {
      this.bindings = [...DEFAULT_HOTKEYS];
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
  }

  public getBindings(): HotkeyBinding[] {
    return [...this.bindings];
  }

  public updateBinding(id: string, keyCombo: string) {
    this.bindings = this.bindings.map((b) => (b.id === id ? { ...b, keyCombo } : b));
    localStorage.setItem(STORAGE_KEY_HOTKEYS, JSON.stringify(this.bindings));
  }

  public resetDefaults() {
    this.bindings = [...DEFAULT_HOTKEYS];
    localStorage.setItem(STORAGE_KEY_HOTKEYS, JSON.stringify(this.bindings));
  }

  public registerAction(id: string, handler: () => void) {
    this.actionHandlers.set(id, handler);
  }

  public unregisterAction(id: string) {
    this.actionHandlers.delete(id);
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Don't trigger hotkeys if user is actively typing in an input, textarea or code editor
    const target = e.target as HTMLElement;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.classList.contains('finamp-ignore-hotkeys'))
    ) {
      // Allow Escape to blur
      if (e.code === 'Escape') {
        target.blur();
      }
      return;
    }

    let combo = e.code;
    if (e.ctrlKey || e.metaKey) combo = `Ctrl+${combo}`;
    if (e.shiftKey) combo = `Shift+${combo}`;
    if (e.altKey) combo = `Alt+${combo}`;

    // Match exact code or combo
    const match = this.bindings.find(
      (b) => b.keyCombo === combo || b.keyCombo === e.code || b.keyCombo === e.key
    );

    if (match) {
      const handler = this.actionHandlers.get(match.id);
      if (handler) {
        e.preventDefault();
        handler();
      }
    }
  }
}

export const hotkeyService = new HotkeyService();
