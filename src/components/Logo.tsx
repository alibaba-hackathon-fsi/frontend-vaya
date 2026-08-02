"use client";

import React from "react";

/**
 * Vaya brand mark — the green pixel-arrow logo (served from /public/logo.png).
 */
export function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="brandmark" src="/logo.png" alt="Vaya" />
  );
}

/**
 * The same mark, recoloured white for dark surfaces. Generated from logo.png by
 * keeping its alpha channel and painting the pixels white, so the shape and the
 * antialiasing are identical to the header logo rather than an approximation.
 */
export function LogoLight() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="brandmark" src="/logo-white.png" alt="Vaya" />
  );
}

/**
 * White version of the Vaya pixel-arrow — used on dark surfaces (chat avatar).
 * Extracted verbatim from the source app.
 */
export function LogoWhite() {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="5.50" y="2.50" width="7" height="7" transform="rotate(45 9 6)" fill="#ffffff" />
      <rect x="11.50" y="7.50" width="7" height="7" transform="rotate(45 15 11)" fill="#ffffff" />
      <rect x="17.00" y="12.00" width="8" height="8" transform="rotate(45 21 16)" fill="#ffffff" />
      <rect x="11.50" y="17.50" width="7" height="7" transform="rotate(45 15 21)" fill="#ffffff" />
      <rect x="5.50" y="22.50" width="7" height="7" transform="rotate(45 9 26)" fill="#ffffff" />
      <rect x="1.50" y="9.30" width="3.4" height="3.4" transform="rotate(45 3.2 11)" fill="rgba(255,255,255,.5)" />
      <rect x="1.50" y="19.30" width="3.4" height="3.4" transform="rotate(45 3.2 21)" fill="rgba(255,255,255,.5)" />
    </svg>
  );
}
