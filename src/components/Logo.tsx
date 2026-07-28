"use client";

import React, { useId } from "react";

/**
 * Vaya pixel-arrow logo — colored version (blue→sky gradient).
 * Extracted verbatim from the source app. The gradient id is made unique per
 * instance (via useId) so multiple logos on one page don't collide.
 */
export function Logo() {
  const raw = useId();
  const gid = "vy-" + raw.replace(/[:]/g, "");
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2F6BFF" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      <rect x="5.50" y="2.50" width="7" height="7" transform="rotate(45 9 6)" fill={`url(#${gid})`} />
      <rect x="11.50" y="7.50" width="7" height="7" transform="rotate(45 15 11)" fill={`url(#${gid})`} />
      <rect x="17.00" y="12.00" width="8" height="8" transform="rotate(45 21 16)" fill={`url(#${gid})`} />
      <rect x="11.50" y="17.50" width="7" height="7" transform="rotate(45 15 21)" fill={`url(#${gid})`} />
      <rect x="5.50" y="22.50" width="7" height="7" transform="rotate(45 9 26)" fill={`url(#${gid})`} />
      <rect x="1.50" y="9.30" width="3.4" height="3.4" transform="rotate(45 3.2 11)" fill="#9CC0FF" />
      <rect x="1.50" y="19.30" width="3.4" height="3.4" transform="rotate(45 3.2 21)" fill="#9CC0FF" />
    </svg>
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
