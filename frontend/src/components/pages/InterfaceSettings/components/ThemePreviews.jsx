import React from "react";

export const ThemePreviews = {
  themeDefault: () => (
    <svg viewBox="0 0 200 130" width="100%" height="100%" style={{ display: "block" }}>
      <rect width="200" height="130" fill="#F4F6F9" />
      <rect x="0" y="0" width="22" height="130" fill="#FFFFFF" />
      <rect x="5" y="8" width="12" height="12" rx="3" fill="#3577DB" />
      <rect x="5" y="26" width="12" height="3" rx="1.5" fill="#A0ABC0" />
      <rect x="5" y="34" width="12" height="3" rx="1.5" fill="#3577DB" />
      <rect x="5" y="42" width="12" height="3" rx="1.5" fill="#A0ABC0" />
      <rect x="5" y="50" width="12" height="3" rx="1.5" fill="#A0ABC0" />
      <rect x="22" y="0" width="178" height="16" fill="#FFFFFF" />
      <rect x="28" y="5" width="40" height="6" rx="2" fill="#E2E8F0" />
      <circle cx="188" cy="8" r="4" fill="#3577DB" />
      <rect x="28" y="22" width="48" height="32" rx="4" fill="#FF5B5B" />
      <rect x="34" y="27" width="22" height="4" rx="1" fill="#FFFFFF" opacity="0.8" />
      <rect x="34" y="34" width="16" height="8" rx="1" fill="#FFFFFF" />
      <rect x="80" y="22" width="48" height="32" rx="4" fill="#FFFFFF" />
      <rect x="85" y="27" width="22" height="4" rx="1" fill="#718096" />
      <rect x="85" y="34" width="18" height="8" rx="1" fill="#2D3748" />
      <rect x="132" y="22" width="62" height="32" rx="4" fill="#FFFFFF" />
      <path d="M 136 44 Q 150 30, 162 42 T 188 32" fill="none" stroke="#00C9A7" strokeWidth="2" />
      <rect x="28" y="60" width="166" height="62" rx="4" fill="#FFFFFF" />
      <rect x="34" y="66" width="36" height="5" rx="1.5" fill="#2D3748" />
      <path d="M 34 105 Q 60 75, 90 95 T 140 70 T 186 85" fill="none" stroke="#3577DB" strokeWidth="2.5" />
      <path d="M 34 105 Q 60 75, 90 95 T 140 70 T 186 85 L 186 114 L 34 114 Z" fill="rgba(53,119,219,0.1)" />
    </svg>
  ),
  theme2: () => (
    <svg viewBox="0 0 200 130" width="100%" height="100%" style={{ display: "block" }}>
      <rect width="200" height="130" fill="#EDF2F7" />
      <defs>
        <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1565C0" />
          <stop offset="60%" stopColor="#0288D1" />
          <stop offset="100%" stopColor="#00B4D8" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="40" fill="url(#g2)" />
      <text x="10" y="16" fill="#FFFFFF" fontSize="8" fontWeight="bold">Dashboard</text>
      <rect x="10" y="22" width="28" height="4" rx="2" fill="#FFFFFF" opacity="0.6" />
      <rect x="155" y="10" width="35" height="12" rx="3" fill="#FFFFFF" opacity="0.9" />
      <rect x="10" y="32" width="55" height="42" rx="4" fill="#FFFFFF" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.08))" />
      <rect x="15" y="36" width="24" height="4" rx="1" fill="#718096" />
      <path d="M 15 62 Q 28 42, 42 58 T 60 48" fill="none" stroke="#22C55E" strokeWidth="2" />
      <rect x="70" y="32" width="58" height="42" rx="4" fill="#FFFFFF" />
      <rect x="75" y="36" width="48" height="16" rx="3" fill="#6B21A8" />
      <rect x="75" y="56" width="22" height="14" rx="2" fill="#0284C7" />
      <rect x="101" y="56" width="22" height="14" rx="2" fill="#10B981" />
      <rect x="133" y="32" width="57" height="42" rx="4" fill="#0F172A" />
      <circle cx="161" cy="53" r="14" fill="#F59E0B" />
      <rect x="10" y="78" width="55" height="46" rx="4" fill="#F43F5E" />
      <path d="M 15 106 Q 30 88, 45 102 T 60 92" fill="none" stroke="#FFFFFF" strokeWidth="2" />
      <rect x="70" y="78" width="58" height="46" rx="4" fill="#FFFFFF" />
      <rect x="133" y="78" width="57" height="46" rx="4" fill="#FFFFFF" />
      <path d="M 138 108 Q 155 88, 170 104 T 186 96" fill="none" stroke="#0284C7" strokeWidth="2" />
    </svg>
  ),
  theme3: () => (
    <svg viewBox="0 0 200 130" width="100%" height="100%" style={{ display: "block" }}>
      <rect width="200" height="130" fill="#F8FAFC" />
      <rect x="0" y="0" width="30" height="130" fill="#FFFFFF" />
      <text x="5" y="14" fill="#0F172A" fontSize="7" fontWeight="bold">studio.</text>
      <rect x="5" y="26" width="20" height="3" rx="1.5" fill="#E2E8F0" />
      <rect x="5" y="33" width="18" height="3" rx="1.5" fill="#E2E8F0" />
      <rect x="5" y="40" width="20" height="3" rx="1.5" fill="#E2E8F0" />
      <rect x="35" y="8" width="36" height="26" rx="3" fill="#FFE4E6" />
      <text x="39" y="25" fill="#E11D48" fontSize="10" fontWeight="bold">$560</text>
      <rect x="75" y="8" width="36" height="26" rx="3" fill="#CCFBF1" />
      <text x="79" y="25" fill="#0D9488" fontSize="10" fontWeight="bold">47</text>
      <rect x="115" y="8" width="32" height="26" rx="3" fill="#EDE9FE" />
      <rect x="35" y="38" width="112" height="52" rx="3" fill="#FFFFFF" />
      <rect x="40" y="44" width="30" height="4" rx="1" fill="#64748B" />
      <circle cx="44" cy="58" r="3.5" fill="#F43F5E" />
      <rect x="52" y="56" width="40" height="4" rx="1" fill="#CBD5E1" />
      <circle cx="44" cy="70" r="3.5" fill="#3B82F6" />
      <rect x="52" y="68" width="40" height="4" rx="1" fill="#CBD5E1" />
      <rect x="152" y="0" width="48" height="130" fill="#1E293B" />
      <rect x="158" y="12" width="36" height="24" rx="3" fill="#334155" />
      <rect x="158" y="42" width="36" height="16" rx="3" fill="#F59E0B" />
      <rect x="158" y="62" width="36" height="16" rx="3" fill="#06B6D4" />
      <rect x="158" y="82" width="36" height="16" rx="3" fill="#EC4899" />
    </svg>
  ),
  theme4: () => (
    <svg viewBox="0 0 200 130" width="100%" height="100%" style={{ display: "block" }}>
      <rect width="200" height="130" fill="#F1F5F9" />
      <rect x="0" y="0" width="24" height="130" fill="#7C3AED" />
      <rect x="5" y="8" width="14" height="14" rx="3" fill="#FFFFFF" opacity="0.9" />
      <circle cx="12" cy="32" r="3" fill="#FFFFFF" opacity="0.6" />
      <circle cx="12" cy="44" r="3" fill="#FFFFFF" opacity="0.6" />
      <circle cx="12" cy="56" r="3" fill="#FFFFFF" opacity="0.6" />
      <rect x="24" y="0" width="176" height="32" fill="#4A0E4E" />
      <rect x="30" y="10" width="70" height="12" rx="3" fill="#FFFFFF" />
      <path d="M 160 5 C 175 10, 185 5, 195 20" fill="none" stroke="#F59E0B" strokeWidth="4" />
      <rect x="30" y="38" width="50" height="42" rx="4" fill="#FFFFFF" />
      <rect x="35" y="42" width="28" height="4" rx="1" fill="#718096" />
      <path d="M 35 68 Q 48 54, 60 70 T 75 62" fill="none" stroke="#F59E0B" strokeWidth="2.5" />
      <rect x="85" y="38" width="109" height="42" rx="4" fill="#FFFFFF" />
      <rect x="90" y="44" width="40" height="4" rx="1" fill="#475569" />
      <rect x="160" y="42" width="28" height="8" rx="2" fill="#7C3AED" />
      <rect x="30" y="84" width="50" height="42" rx="4" fill="#FFFFFF" />
      <rect x="85" y="84" width="52" height="42" rx="4" fill="#7C3AED" />
      <rect x="93" y="100" width="4" height="20" fill="#FFFFFF" />
      <rect x="101" y="94" width="4" height="26" fill="#FFFFFF" />
      <rect x="109" y="106" width="4" height="14" fill="#FFFFFF" />
      <rect x="117" y="90" width="4" height="30" fill="#FFFFFF" />
      <rect x="125" y="98" width="4" height="22" fill="#FFFFFF" />
      <rect x="142" y="84" width="52" height="42" rx="4" fill="#FFFFFF" />
    </svg>
  ),
  theme5: () => (
    <svg viewBox="0 0 200 130" width="100%" height="100%" style={{ display: "block" }}>
      <rect width="200" height="130" fill="#F8FAFC" />
      <rect x="0" y="0" width="24" height="130" fill="#FFFFFF" />
      <circle cx="12" cy="12" r="5" fill="#3B82F6" />
      <rect x="6" y="28" width="12" height="2" fill="#CBD5E1" />
      <rect x="6" y="34" width="12" height="2" fill="#CBD5E1" />
      <rect x="30" y="10" width="162" height="20" rx="3" fill="#FFFFFF" />
      <rect x="36" y="16" width="50" height="8" rx="2" fill="#E2E8F0" />
      <rect x="30" y="36" width="105" height="88" rx="4" fill="#FFFFFF" />
      <rect x="38" y="44" width="60" height="6" rx="2" fill="#1E293B" />
      <rect x="38" y="56" width="90" height="3" rx="1.5" fill="#94A3B8" />
      <rect x="38" y="63" width="85" height="3" rx="1.5" fill="#94A3B8" />
      <rect x="38" y="70" width="70" height="3" rx="1.5" fill="#94A3B8" />
      <rect x="140" y="36" width="52" height="88" rx="4" fill="#FFFFFF" />
      <circle cx="166" cy="56" r="12" fill="#EFF6FF" />
      <circle cx="166" cy="56" r="6" fill="#3B82F6" />
    </svg>
  ),
  theme6: () => (
    <svg viewBox="0 0 200 130" width="100%" height="100%" style={{ display: "block" }}>
      <rect width="200" height="130" fill="#F0FDF4" />
      <rect x="0" y="0" width="26" height="130" fill="#0F766E" />
      <circle cx="13" cy="12" r="5" fill="#2DD4BF" />
      <rect x="32" y="10" width="78" height="42" rx="4" fill="#FFFFFF" />
      <path d="M 38 40 Q 55 20, 72 38 T 104 28" fill="none" stroke="#0D9488" strokeWidth="2.5" />
      <rect x="116" y="10" width="78" height="42" rx="4" fill="#FFFFFF" />
      <path d="M 122 40 Q 140 22, 158 35 T 188 25" fill="none" stroke="#F43F5E" strokeWidth="2.5" />
      <rect x="32" y="58" width="162" height="66" rx="4" fill="#FFFFFF" />
      <rect x="40" y="66" width="60" height="6" rx="2" fill="#0F172A" />
      <rect x="40" y="80" width="146" height="10" rx="2" fill="#F1F5F9" />
      <rect x="40" y="96" width="146" height="10" rx="2" fill="#F1F5F9" />
    </svg>
  ),
  theme7: () => (
    <svg viewBox="0 0 200 130" width="100%" height="100%" style={{ display: "block" }}>
      <rect width="200" height="130" fill="#F8FAFC" />
      <rect x="0" y="0" width="30" height="130" fill="#FFFFFF" />
      <rect x="36" y="10" width="48" height="34" rx="4" fill="#FFFFFF" />
      <rect x="42" y="15" width="20" height="5" rx="1" fill="#10B981" />
      <rect x="90" y="10" width="48" height="34" rx="4" fill="#FFFFFF" />
      <rect x="96" y="15" width="20" height="5" rx="1" fill="#3B82F6" />
      <rect x="144" y="10" width="48" height="34" rx="4" fill="#FFFFFF" />
      <rect x="150" y="15" width="20" height="5" rx="1" fill="#F59E0B" />
      <rect x="36" y="50" width="156" height="74" rx="4" fill="#FFFFFF" />
      <rect x="44" y="58" width="50" height="6" rx="2" fill="#334155" />
      <rect x="44" y="72" width="140" height="14" rx="3" fill="#ECFDF5" />
      <rect x="44" y="92" width="140" height="14" rx="3" fill="#EFF6FF" />
    </svg>
  ),
  theme8: () => (
    <svg viewBox="0 0 200 130" width="100%" height="100%" style={{ display: "block" }}>
      <rect width="200" height="130" fill="#F1F5F9" />
      <rect x="0" y="0" width="32" height="130" fill="#1E293B" />
      <rect x="6" y="10" width="20" height="6" rx="2" fill="#38BDF8" />
      <rect x="38" y="10" width="154" height="20" rx="3" fill="#FFFFFF" />
      <rect x="38" y="36" width="98" height="88" rx="4" fill="#FFFFFF" />
      <rect x="48" y="80" width="8" height="36" fill="#3B82F6" />
      <rect x="62" y="65" width="8" height="51" fill="#3B82F6" />
      <rect x="76" y="72" width="8" height="44" fill="#3B82F6" />
      <rect x="90" y="55" width="8" height="61" fill="#3B82F6" />
      <rect x="104" y="85" width="8" height="31" fill="#3B82F6" />
      <rect x="142" y="36" width="50" height="88" rx="4" fill="#FFFFFF" />
    </svg>
  ),
  theme9: () => (
    <svg viewBox="0 0 200 130" width="100%" height="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id="g9" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      <rect width="200" height="130" fill="#F0F9FF" />
      <rect x="0" y="0" width="200" height="36" fill="url(#g9)" />
      <circle cx="15" cy="18" r="8" fill="#FFFFFF" opacity="0.9" />
      <rect x="10" y="44" width="85" height="78" rx="4" fill="#FFFFFF" />
      <circle cx="52" cy="74" r="18" fill="#E0F2FE" />
      <rect x="102" y="44" width="88" height="78" rx="4" fill="#FFFFFF" />
      <path d="M 108 90 Q 125 70, 145 88 T 184 76" fill="none" stroke="#0284C7" strokeWidth="2.5" />
    </svg>
  ),
  theme10: () => (
    <svg viewBox="0 0 200 130" width="100%" height="100%" style={{ display: "block" }}>
      <rect width="200" height="130" fill="#0A192F" />
      <rect x="0" y="0" width="28" height="130" fill="#020C1B" />
      <circle cx="14" cy="14" r="6" fill="#64FFDA" />
      <rect x="36" y="12" width="48" height="42" rx="4" fill="#172A45" />
      <rect x="42" y="18" width="24" height="6" rx="2" fill="#F59E0B" />
      <rect x="90" y="12" width="48" height="42" rx="4" fill="#172A45" />
      <rect x="96" y="18" width="24" height="6" rx="2" fill="#EC4899" />
      <rect x="144" y="12" width="48" height="42" rx="4" fill="#172A45" />
      <rect x="150" y="18" width="24" height="6" rx="2" fill="#8B5CF6" />
      <rect x="36" y="60" width="156" height="62" rx="4" fill="#172A45" />
      <path d="M 44 105 Q 80 75, 115 95 T 184 75" fill="none" stroke="#64FFDA" strokeWidth="2.5" />
    </svg>
  ),
  theme11: () => (
    <svg viewBox="0 0 200 130" width="100%" height="100%" style={{ display: "block" }}>
      <rect width="200" height="130" fill="#FAFAFA" />
      <rect x="0" y="0" width="200" height="20" fill="#FFFFFF" />
      <rect x="10" y="6" width="30" height="8" rx="2" fill="#10B981" />
      <rect x="10" y="28" width="115" height="94" rx="4" fill="#FFFFFF" />
      <rect x="18" y="36" width="50" height="8" rx="2" fill="#18181B" />
      <rect x="132" y="28" width="58" height="94" rx="4" fill="#FFFFFF" />
      <circle cx="161" cy="65" r="18" fill="#D1FAE5" />
    </svg>
  ),
  theme12: () => (
    <svg viewBox="0 0 200 130" width="100%" height="100%" style={{ display: "block" }}>
      <rect width="200" height="130" fill="#FFFBEB" />
      <rect x="0" y="0" width="200" height="34" fill="#F59E0B" />
      <text x="12" y="20" fill="#FFFFFF" fontSize="9" fontWeight="bold">Build your next project</text>
      <rect x="12" y="42" width="55" height="80" rx="4" fill="#FFFFFF" />
      <rect x="74" y="42" width="55" height="80" rx="4" fill="#FFFFFF" />
      <rect x="136" y="42" width="54" height="80" rx="4" fill="#FFFFFF" />
    </svg>
  ),
  theme13: () => (
    <svg viewBox="0 0 200 130" width="100%" height="100%" style={{ display: "block" }}>
      <rect width="200" height="130" fill="#1E293B" />
      <rect x="0" y="0" width="200" height="20" fill="#0F172A" />
      <rect x="10" y="28" width="55" height="34" rx="4" fill="#334155" />
      <rect x="15" y="33" width="20" height="6" rx="2" fill="#EF4444" />
      <rect x="72" y="28" width="55" height="34" rx="4" fill="#334155" />
      <rect x="77" y="33" width="20" height="6" rx="2" fill="#06B6D4" />
      <rect x="134" y="28" width="56" height="34" rx="4" fill="#334155" />
      <rect x="10" y="68" width="180" height="54" rx="4" fill="#334155" />
      <path d="M 18 105 Q 60 80, 100 100 T 180 85" fill="none" stroke="#38BDF8" strokeWidth="2.5" />
    </svg>
  ),
};

export const THEMES_LIST = [
  { id: "default", name: "Theme Default", Component: ThemePreviews.themeDefault },
  { id: "theme2", name: "Theme 2", Component: ThemePreviews.theme2 },
  { id: "theme3", name: "Theme 3", Component: ThemePreviews.theme3 },
  { id: "theme4", name: "Theme 4", Component: ThemePreviews.theme4 },
  { id: "theme5", name: "Theme 5", Component: ThemePreviews.theme5 },
  { id: "theme6", name: "Theme 6", Component: ThemePreviews.theme6 },
  { id: "theme7", name: "Theme 7", Component: ThemePreviews.theme7 },
  { id: "theme8", name: "Theme 8", Component: ThemePreviews.theme8 },
  { id: "theme9", name: "Theme 9", Component: ThemePreviews.theme9 },
  { id: "theme10", name: "Theme 10", Component: ThemePreviews.theme10 },
  { id: "theme11", name: "Theme 11", Component: ThemePreviews.theme11 },
  { id: "theme12", name: "Theme 12", Component: ThemePreviews.theme12 },
  { id: "theme13", name: "Theme 13", Component: ThemePreviews.theme13 },
];
