// ─────────────────────────────────────────────────────────────
//  NHAI API Configuration
//  Set ACTIVE to match how you run the app:
//    • emulator  → Android Emulator (10.0.2.2 maps to host PC)
//    • physical  → Real phone on same Wi‑Fi (use your PC LAN IP)
//    • localhost → iOS Simulator
// ─────────────────────────────────────────────────────────────
const ENDPOINTS = {
  emulator: 'http://10.0.2.2:5000',
  physical: 'http://192.168.1.10:5000',
  localhost: 'http://localhost:5000',
};

const ACTIVE = 'physical';

const BASE_URL = ENDPOINTS[ACTIVE];

export default BASE_URL;
