import React from 'react';
import { THEMES } from './registry';

export default function BrewHeaderMenu({
  showMenu,
  setShowMenu,
  theme,
  onOpenConverter,
  onOpenRagAdmin,
  onOpenCachePanel,
  onOpenHelp,
  onSetTheme,
}) {
  const themeEntries  = Object.entries(THEMES);

  return (
    <div className="brew-header-menu-wrap">
      <button
        type="button"
        className="brew-header-btn"
        onClick={() => setShowMenu(v => !v)}
        aria-expanded={showMenu}
        aria-label="Utilities"
      >
        {THEMES[theme]?.label ?? '☾ Dark'} ▾
      </button>
      {showMenu && (
        <div className="brew-header-dropdown">
          <div className="brew-header-dropdown-label">Tools</div>
          <button type="button" className="brew-header-dropdown-item"
            onClick={() => { onOpenConverter?.(); setShowMenu(false); }}>
            Convert GGUF → MLX
          </button>
          <button type="button" className="brew-header-dropdown-item"
            onClick={() => { onOpenRagAdmin?.(); setShowMenu(false); }}>
            RAG Docs
          </button>
          <button type="button" className="brew-header-dropdown-item"
            onClick={() => { onOpenCachePanel?.(); setShowMenu(false); }}>
            Response Cache
          </button>
          <button type="button" className="brew-header-dropdown-item"
            onClick={() => { onOpenHelp?.(); setShowMenu(false); }}>
            Help (?)
          </button>
          <div className="brew-header-dropdown-label">Theme</div>
          {themeEntries.map(([id, { label }]) => (
            <button key={id} type="button"
              className={`brew-header-dropdown-item${theme === id ? ' active' : ''}`}
              onClick={() => { onSetTheme?.(id); setShowMenu(false); }}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
