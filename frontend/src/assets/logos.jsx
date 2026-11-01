import React from "react";

// GSOFT Logo SVG with striped letters, globe O, and cursive tagline
export const LogoGSoft = ({ width = 180, height = 70, style }) => (
  <svg
    viewBox="0 0 320 130"
    width={width}
    height={height}
    style={{ display: "block", ...style }}
  >
    <defs>
      {/* Pattern for horizontal stripes in GSOFT letters */}
      <pattern id="gsoftStripes" width="10" height="7" patternUnits="userSpaceOnUse">
        <rect width="10" height="4.5" fill="#142668" />
        <rect y="4.5" width="10" height="2.5" fill="#FFFFFF" />
      </pattern>
      {/* Globe clip */}
      <clipPath id="globeClip">
        <circle cx="150" cy="46" r="30" />
      </clipPath>
    </defs>

    {/* Letter G */}
    <path
      d="M 58 24 C 42 16, 15 25, 12 48 C 9 70, 32 78, 54 74 C 58 73, 60 70, 60 62 L 38 62 L 38 52 L 72 52 L 72 76 C 58 84, 28 88, 4 72 C -10 54, 4 20, 28 10 C 44 4, 62 10, 70 18 Z"
      fill="url(#gsoftStripes)"
    />

    {/* Letter S */}
    <path
      d="M 116 26 C 112 18, 98 12, 86 16 C 74 20, 76 30, 84 34 L 102 40 C 118 46, 122 62, 110 74 C 98 84, 76 84, 66 76 L 72 64 C 80 70, 94 74, 102 68 C 108 64, 106 56, 98 52 L 82 46 C 68 40, 66 26, 78 16 C 92 6, 114 6, 122 18 Z"
      fill="url(#gsoftStripes)"
    />

    {/* Globe Letter O */}
    <g transform="translate(0, 0)">
      {/* Globe Outer Circle */}
      <circle cx="150" cy="46" r="30" fill="#FFFFFF" stroke="#142668" strokeWidth="2.5" />
      {/* Globe Latitudes */}
      <ellipse cx="150" cy="46" rx="30" ry="10" fill="none" stroke="#142668" strokeWidth="1.2" />
      <ellipse cx="150" cy="46" rx="30" ry="20" fill="none" stroke="#142668" strokeWidth="1.2" />
      <line x1="150" y1="16" x2="150" y2="76" stroke="#142668" strokeWidth="1.5" />
      <line x1="120" y1="46" x2="180" y2="46" stroke="#142668" strokeWidth="1.5" />
      <ellipse cx="150" cy="46" rx="14" ry="30" fill="none" stroke="#142668" strokeWidth="1.2" />
      {/* Globe Continents silhouette */}
      <path
        d="M 144 26 Q 152 28, 154 36 Q 150 44, 146 48 Q 148 56, 158 64 L 152 68 Q 142 56, 140 44 Z"
        fill="#142668"
        opacity="0.85"
        clipPath="url(#globeClip)"
      />
    </g>

    {/* Letter F */}
    <path
      d="M 190 14 L 244 14 L 244 25 L 206 25 L 206 38 L 238 38 L 238 49 L 206 49 L 206 78 L 190 78 Z"
      fill="url(#gsoftStripes)"
    />

    {/* Letter T with extended top bar */}
    <path
      d="M 238 14 L 302 14 Q 312 12, 318 4 L 318 14 L 318 25 L 284 25 L 284 78 L 268 78 L 268 25 L 238 25 Z"
      fill="url(#gsoftStripes)"
    />

    {/* Registered Trademark ® */}
    <circle cx="310" cy="18" r="7" fill="none" stroke="#142668" strokeWidth="1.2" />
    <text
      x="310"
      y="21.5"
      fill="#142668"
      fontSize="9"
      fontWeight="bold"
      textAnchor="middle"
      fontFamily="Montserrat, sans-serif"
    >
      R
    </text>

    {/* Cursive Subtitle "A desire for better life" */}
    <text
      x="160"
      y="114"
      fill="#D92525"
      fontSize="26"
      fontStyle="italic"
      fontWeight="500"
      fontFamily="'Brush Script MT', 'Dancing Script', 'Segoe Script', cursive"
      textAnchor="middle"
      letterSpacing="0.5px"
    >
      A desire for better life
    </text>
  </svg>
);

// Small Logo (Isometric 3D Cube with G, M, S)
export const LogoSmallGms = ({ size = 64, style }) => (
  <svg
    viewBox="0 0 100 110"
    width={size}
    height={size * 1.1}
    style={{ display: "block", ...style }}
  >
    {/* Outer isometric cube outline */}
    <g stroke="#1A1A1A" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" fill="none">
      {/* Top Face */}
      <polygon points="50,6 92,28 50,52 8,28" fill="#F8FAFC" stroke="#1A1A1A" strokeWidth="6" />
      {/* Left Face */}
      <polygon points="8,28 50,52 50,98 8,76" fill="#E2E8F0" stroke="#1A1A1A" strokeWidth="6" />
      {/* Right Face */}
      <polygon points="50,52 92,28 92,76 50,98" fill="#CBD5E1" stroke="#1A1A1A" strokeWidth="6" />
    </g>

    {/* Inner isometric letter lines */}
    {/* Top Face Letter/Lines */}
    <path
      d="M 32 20 L 68 38 M 50 15 L 50 42"
      stroke="#1A1A1A"
      strokeWidth="6"
      strokeLinecap="round"
    />
    {/* Left Face Letter M */}
    <path
      d="M 20 40 L 20 78 M 36 48 L 36 86 M 20 52 L 36 60"
      stroke="#1A1A1A"
      strokeWidth="5.5"
      strokeLinecap="round"
    />
    {/* Right Face Letter S */}
    <path
      d="M 78 40 L 62 48 L 78 62 L 62 72 L 78 80"
      stroke="#1A1A1A"
      strokeWidth="5.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Department of Health Login Logo (SỞ Y TẾ TP. HỒ CHÍ MINH)
export const LogoSoYTe = ({ width = 240, height = 75, style }) => (
  <svg
    viewBox="0 0 340 100"
    width={width}
    height={height}
    style={{ display: "block", ...style }}
  >
    {/* Seal Emblem */}
    <g transform="translate(10, 4)">
      {/* Outer concentric rings */}
      <circle cx="46" cy="46" r="44" fill="#FFFFFF" stroke="#003893" strokeWidth="4" />
      <circle cx="46" cy="46" r="39" fill="#FFFFFF" stroke="#003893" strokeWidth="1.5" />
      
      {/* Red building silhouette banner */}
      <path
        d="M 12 36 L 80 36 L 80 40 L 12 40 Z"
        fill="#E52320"
      />
      <path
        d="M 36 36 L 36 28 L 42 28 L 42 22 L 50 22 L 50 28 L 56 28 L 56 36 Z"
        fill="#E52320"
      />
      <circle cx="46" cy="26" r="2.5" fill="#FFFFFF" />

      {/* Blue lower background */}
      <path
        d="M 12 40 A 34 34 0 0 0 80 40 Z"
        fill="#003893"
      />

      {/* Asclepius Staff and Snake (Symbol of Medicine) */}
      <rect x="44.5" y="32" width="3" height="46" rx="1.5" fill="#FFFFFF" />
      {/* Snake coiled around rod */}
      <path
        d="M 40 42 Q 52 46, 46 54 Q 40 62, 52 68 Q 44 74, 46 76"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Snake head */}
      <path
        d="M 40 42 Q 35 41, 36 38 Q 40 37, 42 41 Z"
        fill="#FFFFFF"
      />
      {/* Snake tongue */}
      <line x1="35" y1="39" x2="31" y2="38" stroke="#FFFFFF" strokeWidth="1.2" />

      {/* Text on upper ring: SỞ Y TẾ TP. HỒ CHÍ MINH */}
      <path id="upperRingPath" d="M 15 42 A 32 32 0 0 1 77 42" fill="none" />
      <text fill="#003893" fontSize="6.5" fontWeight="bold" fontFamily="Montserrat, sans-serif">
        <textPath href="#upperRingPath" startOffset="50%" textAnchor="middle">
          SỞ Y TẾ TP. HỒ CHÍ MINH
        </textPath>
      </text>

      {/* Text on lower ring: DEPARTMENT OF HEALTH OF HCM CITY */}
      <path id="lowerRingPath" d="M 80 50 A 35 35 0 0 1 12 50" fill="none" />
      <text fill="#003893" fontSize="5.2" fontWeight="bold" fontFamily="Montserrat, sans-serif">
        <textPath href="#lowerRingPath" startOffset="50%" textAnchor="middle">
          DEPARTMENT OF HEALTH OF HCM CITY
        </textPath>
      </text>
    </g>

    {/* Text next to emblem */}
    <g transform="translate(112, 28)">
      <text
        x="0"
        y="18"
        fill="#003893"
        fontSize="17"
        fontWeight="800"
        fontFamily="Montserrat, sans-serif"
        letterSpacing="0.6px"
      >
        SỞ Y TẾ
      </text>
      <text
        x="0"
        y="38"
        fill="#003893"
        fontSize="14"
        fontWeight="700"
        fontFamily="Montserrat, sans-serif"
        letterSpacing="0.4px"
      >
        TP. HỒ CHÍ MINH
      </text>
      <text
        x="0"
        y="54"
        fill="#555555"
        fontSize="9"
        fontWeight="600"
        fontFamily="Montserrat, sans-serif"
        letterSpacing="0.2px"
      >
        DEPARTMENT OF HEALTH OF HCM CITY
      </text>
    </g>
  </svg>
);
