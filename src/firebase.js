// Firebase App, Analytics & Remote Config for Họa Náo
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-analytics.js";
import { 
  getRemoteConfig, 
  fetchAndActivate, 
  getString 
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-remote-config.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAUhY70Pq567CTtCpVTxxQMIGo-g6Xh_8c",
  authDomain: "gamehoanao.firebaseapp.com",
  projectId: "gamehoanao",
  storageBucket: "gamehoanao.firebasestorage.app",
  messagingSenderId: "88655005275",
  appId: "1:88655005275:web:76cf2fe0392fdaf73d617e",
  measurementId: "G-Q7QJQDRPLZ"
};

// Khởi tạo Firebase App an toàn (tránh duplicate app)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

// Khởi tạo Remote Config
export const remoteConfig = typeof window !== "undefined" ? getRemoteConfig(app) : null;
if (remoteConfig) {
  // Đặt minimumFetchIntervalMillis = 0 để fetch giá trị mới ngay lập tức
  remoteConfig.settings.minimumFetchIntervalMillis = 0;
  remoteConfig.defaultConfig = {
    ip_config: ""
  };
}

if (typeof window !== "undefined") {
  window.firebaseApp = app;
  window.firebaseAnalytics = analytics;
  window.firebaseRemoteConfig = remoteConfig;
}

let cachedClientIp = null;

/**
 * Lấy IP Public của client phía Frontend và in ra console
 */
export async function getClientPublicIp() {
  if (cachedClientIp) return cachedClientIp;

  let ip = null;
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) ip = data.ip.trim();
    }
  } catch (_e) {}

  if (!ip) {
    try {
      const res = await fetch("https://api64.ipify.org?format=json");
      if (res.ok) {
        const data = await res.json();
        if (data && data.ip) ip = data.ip.trim();
      }
    } catch (_e) {}
  }

  if (!ip) {
    try {
      const res = await fetch("https://icanhazip.com");
      if (res.ok) {
        const text = await res.text();
        if (text) ip = text.trim();
      }
    } catch (_e) {}
  }

  cachedClientIp = ip;
  if (typeof window !== "undefined") {
    window.currentClientIp = ip;
  }

  if (ip) {
    console.log(
      `%c🌐 IP Hiện Tại Của Bạn:%c ${ip} `,
      "background: #4f46e5; color: white; padding: 4px 8px; border-radius: 4px 0 0 4px; font-weight: bold;",
      "background: #10b981; color: white; padding: 4px 8px; border-radius: 0 4px 4px 0; font-weight: bold; font-size: 13px;"
    );
    console.log(`📋 Bạn có thể copy IP này điền vào "ip_config" trong Firebase Remote Config: ${ip}`);
  } else {
    console.warn("⚠️ Không thể xác định IP mạng hiện tại của bạn qua API.");
  }

  return ip;
}

// Tự động lấy và log IP ngay khi script tải
if (typeof window !== "undefined") {
  getClientPublicIp();
}

/**
 * So khớp IP client với danh sách IP trong remoteConfig ip_config
 * Hỗ trợ: IP đơn lẻ, danh sách cách nhau bởi dấu phẩy/chấm phẩy/xuống dòng, hoặc JSON Array
 */
export function checkIpMatch(clientIp, allowedIpsString) {
  if (!clientIp || !allowedIpsString) return false;
  const raw = String(allowedIpsString).trim();
  if (!raw) return false;
  if (raw === "*" || raw.toLowerCase() === "all") return true;

  // Hỗ trợ định dạng JSON Array: ["1.2.3.4", "5.6.7.8"]
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.some(ip => String(ip).trim() === clientIp);
    }
    if (parsed && Array.isArray(parsed.ips)) {
      return parsed.ips.some(ip => String(ip).trim() === clientIp);
    }
  } catch (_e) {}

  // Hỗ trợ danh sách ngăn cách bởi dấu phẩy, chấm phẩy, khoảng trắng, xuống dòng
  const list = raw.split(/[\s,;\n\r]+/).map(s => s.trim()).filter(Boolean);
  return list.includes(clientIp);
}

/**
 * Kiểm tra IP và cập nhật hiển thị nút Kho Từ Khóa
 * Mặc định là ẩn đi. Chỉ hiển thị khi IP client khớp với ip_config trong Remote Config.
 */
export async function checkWordBankAccessByIp() {
  const btn = document.getElementById("cornerWordBankBtn");
  if (btn) {
    btn.style.display = "none";
    btn.classList.remove("visible");
  }

  // 1. Luôn lấy và in IP client ra console trước
  const clientIp = await getClientPublicIp();

  if (!remoteConfig) return;

  try {
    await fetchAndActivate(remoteConfig);
    const ipConfigVal = getString(remoteConfig, "ip_config");
    console.log("🔥 Firebase Remote Config [ip_config]:", ipConfigVal || "(Chưa có giá trị)");

    if (!ipConfigVal || !ipConfigVal.trim()) {
      if (btn) {
        btn.style.display = "none";
        btn.classList.remove("visible");
      }
      return;
    }

    if (!clientIp) {
      if (btn) {
        btn.style.display = "none";
        btn.classList.remove("visible");
      }
      return;
    }

    const isMatch = checkIpMatch(clientIp, ipConfigVal);
    if (isMatch) {
      if (btn) {
        btn.style.display = "inline-flex";
        btn.classList.add("visible");
      }
      console.log(`✅ IP (${clientIp}) trùng khớp với ip_config! Nút Kho Từ Khóa đã được hiển thị.`);
    } else {
      if (btn) {
        btn.style.display = "none";
        btn.classList.remove("visible");
      }
      console.log(`🔒 IP (${clientIp}) không khớp với ip_config. Nút Kho Từ Khóa tiếp tục ẩn.`);
    }
  } catch (err) {
    console.warn("⚠️ Lỗi kiểm tra Firebase Remote Config IP:", err);
    if (btn) {
      btn.style.display = "none";
      btn.classList.remove("visible");
    }
  }
}
