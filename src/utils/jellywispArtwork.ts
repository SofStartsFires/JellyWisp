import React from 'react';

const JELLYWISP_PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="70%">
      <stop offset="0%" stop-color="#132242" />
      <stop offset="52%" stop-color="#090e1d" />
      <stop offset="100%" stop-color="#04060d" />
    </radialGradient>
    <linearGradient id="dome" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee" />
      <stop offset="50%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
    <linearGradient id="tentacles" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.95" />
      <stop offset="60%" stop-color="#6366f1" stop-opacity="0.75" />
      <stop offset="100%" stop-color="#a855f7" stop-opacity="0.1" />
    </linearGradient>
    <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="600" height="600" fill="url(#bg)" />
  <circle cx="300" cy="285" r="245" fill="none" stroke="#22d3ee" stroke-opacity="0.05" stroke-width="1.5" />
  <circle cx="300" cy="285" r="205" fill="none" stroke="#38bdf8" stroke-opacity="0.07" stroke-width="1.5" />
  <circle cx="300" cy="285" r="165" fill="none" stroke="#6366f1" stroke-opacity="0.09" stroke-width="1.5" />
  <circle cx="300" cy="285" r="125" fill="none" stroke="#22d3ee" stroke-opacity="0.06" stroke-width="1" stroke-dasharray="6 8" />
  <g filter="url(#glow)">
    <path d="M170 250 C170 154, 430 154, 430 250 C430 276, 398 286, 374 277 C348 268, 324 284, 300 284 C276 284, 252 268, 226 277 C202 286, 170 276, 170 250 Z" fill="url(#dome)" fill-opacity="0.92" />
    <path d="M204 235 C204 176, 396 176, 396 235 C362 218, 238 218, 204 235 Z" fill="#e0f2fe" fill-opacity="0.45" />
  </g>
  <g fill="none" stroke="url(#tentacles)" stroke-linecap="round">
    <path d="M214 288 C196 342, 232 392, 208 452" stroke-width="11" />
    <path d="M256 292 C240 356, 276 408, 254 474" stroke-width="13" />
    <path d="M300 294 C300 360, 300 416, 300 486" stroke-width="14" />
    <path d="M344 292 C360 356, 324 408, 346 474" stroke-width="13" />
    <path d="M386 288 C404 342, 368 392, 392 452" stroke-width="11" />
  </g>
  <circle cx="225" cy="135" r="5" fill="#22d3ee" fill-opacity="0.65" />
  <circle cx="380" cy="130" r="4" fill="#818cf8" fill-opacity="0.65" />
  <circle cx="155" cy="195" r="3.5" fill="#38bdf8" fill-opacity="0.5" />
  <circle cx="445" cy="202" r="4.5" fill="#22d3ee" fill-opacity="0.55" />
  <text x="300" y="542" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" letter-spacing="6">JELLYWISP</text>
</svg>`;

export const JELLYWISP_COVER_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  JELLYWISP_PLACEHOLDER_SVG
)}`;

/**
 * Returns the cover URL if valid, or the JellyWisp logo artwork placeholder.
 * Also replaces old stock photo fallbacks with the JellyWisp emblem.
 */
export function resolveCoverArt(url?: string | null): string {
  if (!url || !url.trim()) return JELLYWISP_COVER_PLACEHOLDER;
  if (url.includes('images.unsplash.com/photo-1511671782779-c97d3d27a1d4')) {
    return JELLYWISP_COVER_PLACEHOLDER;
  }
  return url;
}

/**
 * Returns true if the URL is empty or points to the JellyWisp placeholder artwork.
 */
export function isPlaceholderArt(url?: string | null): boolean {
  if (!url || !url.trim()) return true;
  if (url === JELLYWISP_COVER_PLACEHOLDER) return true;
  if (url.startsWith('data:image/svg+xml')) return true;
  if (url.includes('images.unsplash.com/photo-1511671782779-c97d3d27a1d4')) return true;
  return false;
}

/**
 * Automatic onError handler for any <img> element showing album/track/artist cover art
 */
export function handleCoverImgError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const img = e.currentTarget;
  if (img.src !== JELLYWISP_COVER_PLACEHOLDER) {
    img.src = JELLYWISP_COVER_PLACEHOLDER;
  }
}
