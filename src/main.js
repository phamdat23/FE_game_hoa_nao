import './firebase.js';
import { checkWordBankAccessByIp } from './firebase.js';
import { PaintCanvas } from './canvas.js';
import { sounds } from './audio.js';
import { triggerConfetti, spawnFloatingReaction } from './effects.js';

// Guest ID per tab using sessionStorage (isolated per tab, preserved across F5)
export function getTabGuestId() {
  let id = sessionStorage.getItem('doodle_tab_guest_id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem('doodle_tab_guest_id', id);
  }
  return id;
}

// State Management
let currentRoomCode = sessionStorage.getItem('doodle_current_room') || null;
let myPlayerId = getTabGuestId();
let isMyTurnToDraw = false;
let isHost = false;
let lastRoomInfo = null;

// DOM Elements
const lobbyScreen = document.getElementById('lobbyScreen');
const nicknameInput = document.getElementById('nicknameInput');
const avatarSelect = document.getElementById('avatarSelect');
const avatarDropdown = document.getElementById('avatarDropdown');
const avatarTriggerBtn = document.getElementById('avatarTriggerBtn');
const currentAvatarEmoji = document.getElementById('currentAvatarEmoji');
const avatarPopover = document.getElementById('avatarPopover');
const avatarGridList = document.getElementById('avatarGridList');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomCodeInput = document.getElementById('roomCodeInput');

const displayRoomCode = document.getElementById('displayRoomCode');
const copyInviteBtn = document.getElementById('copyInviteBtn');

// Dedicated Waiting Room Elements
const waitingRoomScreen = document.getElementById('waitingRoomScreen');
const waitingCodeVal = document.getElementById('waitingCodeVal');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const copySuccessHint = document.getElementById('copySuccessHint');
const waitingPlayerCount = document.getElementById('waitingPlayerCount');
const waitingMaxPlayerCount = document.getElementById('waitingMaxPlayerCount');
const waitingRoomModeBadge = document.getElementById('waitingRoomModeBadge');
const waitingPlayersGrid = document.getElementById('waitingPlayersGrid');
const waitingHostControls = document.getElementById('waitingHostControls');
const waitingGuestControls = document.getElementById('waitingGuestControls');
const hostTopbarActions = document.getElementById('hostTopbarActions');
const roomSettingsBtn = document.getElementById('roomSettingsBtn');
const waitingStartGameBtn = document.getElementById('waitingStartGameBtn');
const playerCountWarning = document.getElementById('playerCountWarning');

// Settings Modal Elements
const settingsScreen = document.getElementById('settingsScreen');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const modeSelectGrid = document.getElementById('modeSelectGrid');
const drawTimeSelector = document.getElementById('drawTimeSelector');
const maxPlayersSlider = document.getElementById('maxPlayersSlider');
const drawTimeDisplay = document.getElementById('drawTimeDisplay');
const maxPlayersDisplay = document.getElementById('maxPlayersDisplay');
const pillOtherDrawTime = document.getElementById('pillOtherDrawTime');
const customTimeBox = document.getElementById('customTimeBox');
const customDrawTimeInput = document.getElementById('customDrawTimeInput');
const roundsSelector = document.getElementById('roundsSelector');
const roundsDisplay = document.getElementById('roundsDisplay');

// Leaderboard Modal Elements
const roundLeaderboardModal = document.getElementById('roundLeaderboardModal');
const leaderboardModalTitle = document.getElementById('leaderboardModalTitle');
const leaderboardModalDesc = document.getElementById('leaderboardModalDesc');
const modalTrophyBadge = document.getElementById('modalTrophyBadge');
const leaderboardList = document.getElementById('leaderboardList');
const nextRoundCountdownBox = document.getElementById('nextRoundCountdownBox');
const nextRoundCountdownText = document.getElementById('nextRoundCountdownText');
const nextRoundCountdownVal = document.getElementById('nextRoundCountdownVal');
const gameOverActions = document.getElementById('gameOverActions');
const playAgainBtn = document.getElementById('playAgainBtn');
const backToWaitingBtn = document.getElementById('backToWaitingBtn');
const previousPlayerScores = {};

// Room Settings State
let currentRoomSettings = {
  gameMode: 'turn-based',
  drawTime: 60,
  maxPlayers: 8,
  maxRounds: 3
};
let draftRoomSettings = { ...currentRoomSettings };

const secretWordEl = document.getElementById('secretWord');
const wordStatusLabel = document.getElementById('wordStatusLabel');
const roleBadge = document.getElementById('roleBadge');
const roleText = document.getElementById('roleText');
const timerVal = document.getElementById('timerVal');
const wsStatus = document.getElementById('wsStatus');
const canvasRoundInfo = document.getElementById('canvasRoundInfo');
const playerCountEl = document.getElementById('playerCount');
const playersList = document.getElementById('playersList');
const toolbar = document.getElementById('toolbar');
const guesserHintBar = document.getElementById('guesserHintBar');
const spectatorHintBar = document.getElementById('spectatorHintBar');
const spectatorLeaveBtn = document.getElementById('spectatorLeaveBtn');
const canvasViewport = document.getElementById('canvasViewport');

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const guessInput = document.getElementById('guessInput');
const sendBtn = document.getElementById('sendBtn');
let amISpectator = false;

// ================= HỌA NÁO CUSTOM GAME POPUP & DIALOG SYSTEM =================
const gameDialogModal = document.getElementById('gameDialogModal');
const gameDialogTitle = document.getElementById('gameDialogTitle');
const gameDialogMessage = document.getElementById('gameDialogMessage');
const gameDialogIcon = document.getElementById('gameDialogIcon');
const gameDialogIconBadge = document.getElementById('gameDialogIconBadge');
const gameDialogConfirmBtn = document.getElementById('gameDialogConfirmBtn');
const gameDialogCancelBtn = document.getElementById('gameDialogCancelBtn');
const gameDialogCloseBtn = document.getElementById('gameDialogCloseBtn');

let activeDialogResolve = null;

export function showCustomAlert({
  title = 'Thông Báo',
  message = '',
  type = 'info',
  icon = null,
  btnText = 'Đã hiểu'
} = {}) {
  return new Promise((resolve) => {
    if (!gameDialogModal) {
      console.warn(title, message);
      return resolve();
    }

    activeDialogResolve = resolve;

    if (gameDialogTitle) gameDialogTitle.textContent = title;
    if (gameDialogMessage) gameDialogMessage.textContent = message;
    if (gameDialogConfirmBtn) {
      gameDialogConfirmBtn.textContent = btnText;
      gameDialogConfirmBtn.className = `btn btn-dialog-confirm ${type === 'danger' ? 'danger' : ''}`;
    }
    if (gameDialogCancelBtn) {
      gameDialogCancelBtn.style.display = 'none';
    }

    if (gameDialogIconBadge) {
      gameDialogIconBadge.className = `game-dialog-icon-badge ${type}`;
    }
    const defaultIcons = {
      info: '💡',
      warning: '⚠️',
      danger: '🛑',
      success: '🎉'
    };
    if (gameDialogIcon) {
      gameDialogIcon.textContent = icon || defaultIcons[type] || '💡';
    }

    gameDialogModal.classList.add('active');
    gameDialogModal.setAttribute('aria-hidden', 'false');

    if (type === 'danger') {
      sounds?.playTimeUp?.();
    } else {
      sounds?.playPop?.();
    }

    setTimeout(() => gameDialogConfirmBtn?.focus(), 50);
  });
}

export function showCustomConfirm({
  title = 'Xác Nhận',
  message = '',
  type = 'warning',
  icon = null,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ'
} = {}) {
  return new Promise((resolve) => {
    if (!gameDialogModal) {
      return resolve(false);
    }

    activeDialogResolve = resolve;

    if (gameDialogTitle) gameDialogTitle.textContent = title;
    if (gameDialogMessage) gameDialogMessage.textContent = message;
    if (gameDialogConfirmBtn) {
      gameDialogConfirmBtn.textContent = confirmText;
      gameDialogConfirmBtn.className = `btn btn-dialog-confirm ${type === 'danger' ? 'danger' : ''}`;
    }
    if (gameDialogCancelBtn) {
      gameDialogCancelBtn.textContent = cancelText;
      gameDialogCancelBtn.style.display = 'inline-flex';
    }

    if (gameDialogIconBadge) {
      gameDialogIconBadge.className = `game-dialog-icon-badge ${type}`;
    }
    const defaultIcons = {
      info: '💡',
      warning: '⚠️',
      danger: '🛑',
      success: '🎉'
    };
    if (gameDialogIcon) {
      gameDialogIcon.textContent = icon || defaultIcons[type] || '⚠️';
    }

    gameDialogModal.classList.add('active');
    gameDialogModal.setAttribute('aria-hidden', 'false');

    sounds?.playPop?.();
    setTimeout(() => gameDialogConfirmBtn?.focus(), 50);
  });
}

function closeCustomDialog(result = false) {
  if (gameDialogModal) {
    gameDialogModal.classList.remove('active');
    gameDialogModal.setAttribute('aria-hidden', 'true');
  }
  if (activeDialogResolve) {
    const res = activeDialogResolve;
    activeDialogResolve = null;
    res(result);
  }
}

gameDialogConfirmBtn?.addEventListener('click', () => {
  sounds?.playPop?.();
  closeCustomDialog(true);
});

gameDialogCancelBtn?.addEventListener('click', () => {
  sounds?.playPop?.();
  closeCustomDialog(false);
});

gameDialogCloseBtn?.addEventListener('click', () => {
  sounds?.playPop?.();
  closeCustomDialog(false);
});

gameDialogModal?.addEventListener('click', (e) => {
  if (e.target === gameDialogModal) {
    closeCustomDialog(false);
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && gameDialogModal?.classList.contains('active')) {
    closeCustomDialog(false);
  }
});

// Chặn triệt để window.alert mặc định của trình duyệt để luôn dùng Popup Họa Náo
window.alert = (msg) => {
  showCustomAlert({ title: 'Thông Báo', message: String(msg ?? '') });
};

// Avatar mặc định cố định toàn hệ thống
export const DEFAULT_AVATAR = '🦊';

// Lưu trữ danh sách avatar hiện tại
let loadedAvatarsList = [];

// Load default avatars from backend server and render into modern custom grid
function populateAvatarSelect(avatars) {
  if (!avatars || !avatars.length) return;
  loadedAvatarsList = avatars;

  const currentVal = avatarSelect?.value || DEFAULT_AVATAR;

  // Render Grid Avatar Buttons
  if (avatarGridList) {
    avatarGridList.innerHTML = '';
    avatars.forEach(item => {
      const emoji = item.emoji || DEFAULT_AVATAR;
      const name = item.name || 'Người chơi';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `avatar-option-btn ${emoji === currentVal ? 'active' : ''}`;
      btn.title = name;
      btn.innerHTML = `
        <span class="avatar-option-emoji">${emoji}</span>
        <span class="avatar-option-name">${name}</span>
      `;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectAvatar(emoji);
        closeAvatarDropdown();
        sounds.playPop();
      });

      avatarGridList.appendChild(btn);
    });
  }

  // Set avatar giá trị khởi tạo
  if (currentVal && avatars.some(a => a.emoji === currentVal)) {
    selectAvatar(currentVal, false);
  } else {
    selectAvatar(avatars[0]?.emoji || DEFAULT_AVATAR, false);
  }
}

function selectAvatar(emoji, playSound = false) {
  if (avatarSelect) avatarSelect.value = emoji;
  if (currentAvatarEmoji) currentAvatarEmoji.textContent = emoji;

  // Cập nhật trạng thái active trong grid list
  if (avatarGridList) {
    const btns = avatarGridList.querySelectorAll('.avatar-option-btn');
    btns.forEach(btn => {
      const e = btn.querySelector('.avatar-option-emoji')?.textContent?.trim();
      if (e === emoji) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  if (playSound) sounds.playPop();
}

function toggleAvatarDropdown() {
  if (avatarDropdown) {
    avatarDropdown.classList.toggle('active');
  }
  sounds.playPop();
}

function closeAvatarDropdown() {
  if (avatarDropdown) {
    avatarDropdown.classList.remove('active');
  }
}

// Bắt sự kiện mở dropdown avatar
avatarTriggerBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleAvatarDropdown();
});

// Click ra ngoài thì đóng dropdown avatar
document.addEventListener('click', (e) => {
  if (avatarDropdown && !avatarDropdown.contains(e.target)) {
    closeAvatarDropdown();
  }
});

async function fetchAvatarsFromServer() {
  const apiUrl = `http://${window.location.hostname || 'localhost'}:8080/api/avatars`;
  try {
    const res = await fetch(apiUrl);
    if (res.ok) {
      const avatars = await res.json();
      populateAvatarSelect(avatars);
      return;
    }
  } catch (_e) {
    // Nếu fetch REST API gặp sự cố (ví dụ CORS hoặc chưa sẵn sàng), fallback qua WebSocket
  }
  sendToServer({ action: 'get_avatars' });
}

// WebSocket Connection
let socket = null;

function connectSocket(onOpenCallback) {
  const wsUrl = `ws://${window.location.hostname || 'localhost'}:8080/ws`;
  try {
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      if (wsStatus) wsStatus.textContent = '🟢 Đã kết nối Ktor';
      // Yêu cầu load danh sách avatar từ server nếu chưa load được
      sendToServer({ action: 'get_avatars' });

      // Khôi phục phiên chơi nếu tab này đang ở trong phòng (F5 reload)
      const savedRoom = sessionStorage.getItem('doodle_current_room');
      if (savedRoom) {
        console.log('🔄 Đang khôi phục phiên chơi sau reload F5 cho phòng:', savedRoom);
        sendToServer({
          action: 'reconnect',
          roomCode: savedRoom,
          playerId: getTabGuestId(),
          playerName: sessionStorage.getItem('doodle_player_name') || (nicknameInput ? nicknameInput.value.trim() : '') || 'Người chơi',
          playerAvatar: sessionStorage.getItem('doodle_player_avatar') || avatarSelect?.value || DEFAULT_AVATAR
        });
      }

      // Gửi các tin nhắn đang xếp hàng nếu có
      while (pendingMessages.length > 0) {
        const msg = pendingMessages.shift();
        socket.send(JSON.stringify(msg));
      }
      if (onOpenCallback) onOpenCallback();
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (e) {
        console.error('Socket parse error:', e);
      }
    };

    socket.onclose = () => {
      if (wsStatus) wsStatus.textContent = '🔴 Mất kết nối - Đang thử lại...';
      setTimeout(() => connectSocket(), 2500);
    };

    socket.onerror = (err) => {
      console.warn('WebSocket error:', err);
    };
  } catch (err) {
    console.error('WebSocket init error:', err);
  }
}

const pendingMessages = [];

function sendToServer(payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  } else {
    console.warn('Socket chưa mở, đang xếp hàng tin nhắn:', payload);
    pendingMessages.push(payload);
    if (!socket || socket.readyState === WebSocket.CLOSED) {
      connectSocket();
    }
  }
}

// Render helper for word with separated groups and character slots
function renderSecretWord(text, isRevealed = true) {
  if (!secretWordEl) return;
  secretWordEl.innerHTML = '';
  if (!text) return;
  const words = text.trim().split(/\s+/);
  words.forEach((w, wIdx) => {
    const group = document.createElement('span');
    group.className = 'word-group';
    for (const char of w) {
      const slot = document.createElement('span');
      slot.className = isRevealed ? 'char-slot revealed' : 'char-slot hidden-slot';
      slot.textContent = char;
      group.appendChild(slot);
    }
    secretWordEl.appendChild(group);
    if (wIdx < words.length - 1) {
      const space = document.createElement('span');
      space.className = 'word-space';
      secretWordEl.appendChild(space);
    }
  });
}

function renderWordHint(pattern, fallbackLength = 0) {
  if (!secretWordEl) return;
  secretWordEl.innerHTML = '';
  let words = [];
  if (pattern && pattern.trim().length > 0) {
    words = pattern.trim().split(/\s+/);
  } else if (fallbackLength > 0) {
    words = ['_'.repeat(fallbackLength)];
  } else {
    words = ['____'];
  }
  let totalLetters = 0;
  words.forEach((w, wIdx) => {
    totalLetters += w.length;
    const group = document.createElement('span');
    group.className = 'word-group';
    for (let i = 0; i < w.length; i++) {
      const slot = document.createElement('span');
      slot.className = 'char-slot hidden-slot';
      slot.textContent = ''; // Giữ rỗng để border-bottom là gạch đơn sắc nét, không bị thành dấu =
      group.appendChild(slot);
    }
    secretWordEl.appendChild(group);
    if (wIdx < words.length - 1) {
      const space = document.createElement('span');
      space.className = 'word-space';
      secretWordEl.appendChild(space);
    }
  });
  if (wordStatusLabel) {
    wordStatusLabel.textContent = `Từ có ${totalLetters} chữ:`;
  }
}

let roundCountdownInterval = null;
let leaderboardTimeouts = [];
let leaderboardRafs = [];

function clearLeaderboardTimeouts() {
  leaderboardTimeouts.forEach(t => clearTimeout(t));
  leaderboardTimeouts = [];
  leaderboardRafs.forEach(r => cancelAnimationFrame(r));
  leaderboardRafs = [];
}

let lastGlobalScoreAudioTick = 0;

/**
 * Hiệu ứng cộng điểm đếm số mượt mà (Count-up animation)
 * Tối ưu hóa cập nhật textNode (zero HTML parsing) và đường cong Quartic ease-out
 */
function animateScoreCountUp(elementId, startVal, endVal, onComplete) {
  if (startVal === endVal) {
    if (onComplete) onComplete();
    return;
  }
  const el = document.getElementById(elementId);
  if (!el) {
    if (onComplete) onComplete();
    return;
  }
  const numEl = el.querySelector('.score-num') || el;
  const duration = 1600; // 1.6s nhịp nhàng, khớp với animation nhảy danh sách
  const startTime = performance.now();
  let lastVal = startVal;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Quartic ease-out: xuất phát dứt khoát, giảm tốc siêu êm ái
    const ease = 1 - Math.pow(1 - progress, 4);
    const current = Math.round(startVal + (endVal - startVal) * ease);
    if (current !== lastVal) {
      lastVal = current;
      numEl.textContent = current;
    }

    // Âm thanh tick điều tiết toàn cục, không bị nghẽn âm thanh khi nhiều người cùng tăng
    if (currentTime - lastGlobalScoreAudioTick > 150 && progress < 0.92) {
      lastGlobalScoreAudioTick = currentTime;
      sounds.playTick();
    }

    if (progress < 1) {
      const rafId = requestAnimationFrame(update);
      leaderboardRafs.push(rafId);
    } else {
      numEl.textContent = endVal;
      sounds.playPop();
      if (onComplete) onComplete();
    }
  }
  const initialRaf = requestAnimationFrame(update);
  leaderboardRafs.push(initialRaf);
}

function renderLeaderboardModal(players, isGameOver = false, titleText = '', descText = '', countdownSec = 9, countdownLabel = 'Tiếp tục sau:') {
  if (!roundLeaderboardModal) return;

  if (roundCountdownInterval) {
    clearInterval(roundCountdownInterval);
    roundCountdownInterval = null;
  }
  clearLeaderboardTimeouts();

  if (leaderboardModalTitle) leaderboardModalTitle.textContent = titleText;
  if (leaderboardModalDesc) leaderboardModalDesc.textContent = descText;
  if (modalTrophyBadge) modalTrophyBadge.textContent = isGameOver ? '👑' : '🏆';

  // Lọc bỏ hoàn toàn người chơi trong phòng chờ (Khán giả Spectator)
  const activePlayers = (players || [])
    .filter(p => !p.isSpectator);

  // 1. Tính toán điểm ban đầu và sắp xếp ban đầu theo điểm số cũ (Initial State)
  const playerInitialScores = {};
  activePlayers.forEach(p => {
    playerInitialScores[p.id] = previousPlayerScores[p.id] !== undefined ? previousPlayerScores[p.id] : 0;
  });

  const initialPlayers = [...activePlayers].sort((a, b) => {
    const sA = playerInitialScores[a.id];
    const sB = playerInitialScores[b.id];
    if (sB !== sA) return sB - sA;
    return (a.name || '').localeCompare(b.name || '');
  });

  // 2. Danh sách thứ tự đích sau khi cộng điểm (Final Target Order)
  const finalPlayers = [...activePlayers].sort((a, b) => {
    const sA = a.score || 0;
    const sB = b.score || 0;
    if (sB !== sA) return sB - sA;
    return (a.name || '').localeCompare(b.name || '');
  });

  const gainTasks = [];

  // Render Danh Sách Bảng Xếp Hạng với điểm số BAN ĐẦU và THỨ TỰ CŨ (chưa di chuyển, chưa cộng điểm)
  if (leaderboardList) {
    leaderboardList.innerHTML = '';
    initialPlayers.forEach((p, idx) => {
      const initialRank = idx + 1;
      const medal = initialRank === 1 ? '🥇' : (initialRank === 2 ? '🥈' : (initialRank === 3 ? '🥉' : ''));
      const isYou = p.id === myPlayerId;

      const prevScore = playerInitialScores[p.id];
      const diff = Math.max(0, (p.score || 0) - prevScore);

      const cardId = `card_row_${p.id}`;
      const scoreElementId = `score_val_${p.id}`;
      const gainElementId = `gain_val_${p.id}`;

      if (diff > 0) {
        gainTasks.push({
          playerId: p.id,
          cardElementId: cardId,
          scoreElementId: scoreElementId,
          gainElementId: gainElementId,
          prevScore: prevScore,
          newScore: p.score || 0,
          diff: diff
        });
      }

      const card = document.createElement('div');
      card.id = cardId;
      card.className = `leaderboard-card-row rank-${initialRank} ${isYou ? 'is-you' : ''}`;
      card.style.setProperty('--rank-idx', idx);

      card.innerHTML = `
        <div class="leaderboard-row-left">
          <span class="rank-badge-pill">${initialRank <= 3 ? `${medal} #${initialRank}` : `#${initialRank}`}</span>
          <div class="rank-avatar-wrapper">
            <span>${p.avatar || DEFAULT_AVATAR}</span>
            ${initialRank === 1 ? '<span class="rank-crown-badge">👑</span>' : ''}
          </div>
          <div class="rank-info-group">
            <span class="leaderboard-row-name">
              ${escapeHtml(p.name || 'Người chơi')}
              ${isYou ? '<span class="rank-you-tag">(Bạn)</span>' : ''}
            </span>
          </div>
        </div>
        <div class="leaderboard-row-right">
          ${diff > 0 ? `<span class="rank-point-gain" id="${gainElementId}">+${diff} pts</span>` : ''}
          <span class="leaderboard-row-score" id="${scoreElementId}"><span class="score-num">${prevScore}</span> <small>pts</small></span>
        </div>
      `;
      leaderboardList.appendChild(card);
    });
  }

  // Ban đầu khi vừa hiện modal (t = 0s): Chưa đếm ngược 5s ngay, hiển thị trạng thái chờ tính điểm
  // Điểm số và thứ tự của danh sách người chơi cạnh chat vẫn giữ nguyên điểm cũ trước khi tổng kết
  if (isGameOver) {
    if (nextRoundCountdownBox) nextRoundCountdownBox.style.display = 'none';
    if (gameOverActions) gameOverActions.style.display = 'none';
  } else {
    if (gameOverActions) gameOverActions.style.display = 'none';
    if (nextRoundCountdownBox) nextRoundCountdownBox.style.display = 'flex';
    if (nextRoundCountdownText) {
      nextRoundCountdownText.innerHTML = `<span class="pulse-dot"></span> <span>⏳ Đang tổng kết điểm & xếp hạng...</span>`;
    }
  }

  // Hàm khởi động đếm ngược đúng 5s sau khi tất cả animation đã chạy xong
  function startPostAnimationCountdown() {
    if (isGameOver) {
      if (nextRoundCountdownBox) nextRoundCountdownBox.style.display = 'none';
      if (gameOverActions) gameOverActions.style.display = 'flex';
      triggerConfetti();
      sounds.playCorrect();
      return;
    }

    // ĐẾM NGƯỢC ĐÚNG 5S ĐỂ TIẾP TỤC SAU KHI TẤT CẢ ANIMATION ĐÃ CHẠY XONG
    let remaining = 5;
    if (nextRoundCountdownBox) nextRoundCountdownBox.style.display = 'flex';
    if (nextRoundCountdownText) {
      nextRoundCountdownText.innerHTML = `${countdownLabel} <strong id="nextRoundCountdownVal" class="countdown-seconds">${remaining}</strong>s`;
    }

    roundCountdownInterval = setInterval(() => {
      remaining--;
      const valEl = document.getElementById('nextRoundCountdownVal');
      if (valEl) valEl.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(roundCountdownInterval);
        roundCountdownInterval = null;
        closeLeaderboardModal();
      }
    }, 1000);
  }

  // ĐÚNG 1.5 GIÂY (1500ms) SAU KHI HIỆN VIEW TỔNG KẾT:
  // BẮT ĐẦU CHẠY ANIMATION CỘNG ĐIỂM ĐỒNG THỜI VỚI ANIMATION DI CHUYỂN DANH SÁCH (NHẢY QUA & CHÌM XUỐNG)
  const tallyTimeout = setTimeout(() => {
    // Âm thanh ngân nga khi bắt đầu tính điểm
    sounds.playStart();

    // Cập nhật lưu trữ điểm đã tổng kết cho các lượt kế tiếp và render lại danh sách người chơi cạnh chat
    activePlayers.forEach(p => {
      previousPlayerScores[p.id] = p.score || 0;
    });
    renderSidebarPlayersList();

    let hasMovement = false;

    // === BƯỚC 1: ANIMATION DI CHUYỂN DANH SÁCH (LEAP UP & SINK DOWN) ===
    if (leaderboardList) {
      leaderboardList.classList.add('is-animating');

      // 1. First: Đọc toàn bộ vị trí ban đầu của các hàng (Batch Read 1)
      const firstTops = new Map();
      initialPlayers.forEach(p => {
        const card = document.getElementById(`card_row_${p.id}`);
        if (card) {
          firstTops.set(p.id, card.getBoundingClientRect().top);
        }
      });

      // 2. Batch Write: Sắp xếp lại DOM node và cập nhật thông tin UI (zero forced layout reflow)
      finalPlayers.forEach((p, finalIdx) => {
        const card = document.getElementById(`card_row_${p.id}`);
        if (card) {
          leaderboardList.appendChild(card);

          const newRank = finalIdx + 1;
          const medal = newRank === 1 ? '🥇' : (newRank === 2 ? '🥈' : (newRank === 3 ? '🥉' : ''));
          const isYou = p.id === myPlayerId;

          // Cập nhật class rank-X
          card.className = `leaderboard-card-row rank-${newRank} ${isYou ? 'is-you' : ''}`;

          // Cập nhật huy hiệu thứ hạng
          const rankPill = card.querySelector('.rank-badge-pill');
          if (rankPill) {
            const oldText = rankPill.textContent.trim();
            const newText = newRank <= 3 ? `${medal} #${newRank}` : `#${newRank}`;
            if (oldText !== newText) {
              rankPill.classList.add('rank-changed');
            }
            rankPill.textContent = newText;
          }

          // Cập nhật vương miện 👑 cho quán quân
          const avatarWrapper = card.querySelector('.rank-avatar-wrapper');
          if (avatarWrapper) {
            let crown = avatarWrapper.querySelector('.rank-crown-badge');
            if (newRank === 1) {
              if (!crown) {
                const crownSpan = document.createElement('span');
                crownSpan.className = 'rank-crown-badge';
                crownSpan.textContent = '👑';
                avatarWrapper.appendChild(crownSpan);
              }
            } else {
              if (crown) crown.remove();
            }
          }
        }
      });

      // 3. Last: Đọc toàn bộ vị trí đích sau khi DOM đã được reordered (Batch Read 2)
      const deltas = new Map();
      finalPlayers.forEach(p => {
        const card = document.getElementById(`card_row_${p.id}`);
        if (card && firstTops.has(p.id)) {
          const oldTop = firstTops.get(p.id);
          const newTop = card.getBoundingClientRect().top;
          const deltaY = oldTop - newTop;

          if (deltaY !== 0) {
            hasMovement = true;
            deltas.set(p.id, deltaY);
          }
        }
      });

      // 4. Invert & Play: Kích hoạt keyframe hardware-accelerated trong frame kế tiếp
      const playRaf = requestAnimationFrame(() => {
        deltas.forEach((deltaY, playerId) => {
          const card = document.getElementById(`card_row_${playerId}`);
          if (card) {
            card.style.setProperty('--delta-y', `${deltaY}px`);
            if (deltaY > 0) {
              // Đi lên: hiệu ứng nhảy qua (phóng to, đổ bóng 3D ngọc lục bảo, z-index cao)
              card.classList.add('card-leap-up');
            } else {
              // Đi xuống: hiệu ứng chìm và lặn xuống (thu nhỏ, mờ đi, z-index thấp)
              card.classList.add('card-sink-down');
            }
          }
        });
      });
      leaderboardRafs.push(playRaf);

      // Dọn dẹp inline style & class sau khi animation 1.65s kết thúc
      const cleanupTimeout = setTimeout(() => {
        leaderboardList.classList.remove('is-animating');
        finalPlayers.forEach(p => {
          const card = document.getElementById(`card_row_${p.id}`);
          if (card) {
            card.classList.remove('card-leap-up', 'card-sink-down');
            card.style.removeProperty('--delta-y');
            const rankPill = card.querySelector('.rank-badge-pill');
            if (rankPill) rankPill.classList.remove('rank-changed');
          }
        });
      }, 1650);
      leaderboardTimeouts.push(cleanupTimeout);
    }

    // === BƯỚC 2: CHẠY ANIMATION CỘNG ĐIỂM (ĐỒNG THỜI VỚI DI CHUYỂN DANH SÁCH) ===
    gainTasks.forEach((task) => {
      const gainEl = document.getElementById(task.gainElementId);
      if (gainEl) {
        gainEl.classList.add('visible');
      }
      const cardEl = document.getElementById(task.cardElementId);
      if (cardEl) {
        cardEl.classList.add('scoring');
      }
      const scoreEl = document.getElementById(task.scoreElementId);
      if (scoreEl) {
        scoreEl.classList.add('counting');
      }

      animateScoreCountUp(task.scoreElementId, task.prevScore, task.newScore, () => {
        if (cardEl) cardEl.classList.remove('scoring');
        if (scoreEl) {
          scoreEl.classList.remove('counting');
          scoreEl.classList.add('score-bump');
          setTimeout(() => scoreEl.classList.remove('score-bump'), 600);
        }
      });
    });

    // === BƯỚC 3: KHI TẤT CẢ ANIMATION ĐÃ CHẠY XONG (~1.75s) -> MỚI ĐẾM NGƯỢC 5S TIẾP TỤC ===
    const allAnimationsDuration = (gainTasks.length > 0 || hasMovement) ? 1750 : 200;
    const finishTimeout = setTimeout(() => {
      startPostAnimationCountdown();
    }, allAnimationsDuration);
    leaderboardTimeouts.push(finishTimeout);

  }, 1500); // Rút ngắn delay chỉ còn 1.5s rồi chạy animation
  leaderboardTimeouts.push(tallyTimeout);

  roundLeaderboardModal.classList.add('active');
}

function closeLeaderboardModal() {
  if (roundCountdownInterval) {
    clearInterval(roundCountdownInterval);
    roundCountdownInterval = null;
  }
  clearLeaderboardTimeouts();
  if (roundLeaderboardModal) {
    roundLeaderboardModal.classList.remove('active');
  }
}

// Handle Incoming Server Message
function handleServerMessage(msg) {
  switch (msg.action) {
    case 'default_avatars':
      try {
        const avatars = JSON.parse(msg.avatars);
        populateAvatarSelect(avatars);
      } catch (_e) {}
      break;

    case 'room_created':
    case 'room_joined':
      currentRoomCode = msg.roomCode;
      myPlayerId = msg.playerId || getTabGuestId();
      displayRoomCode.textContent = currentRoomCode;
      if (waitingCodeVal) waitingCodeVal.textContent = currentRoomCode;

      // Lưu thông tin phiên chơi vào sessionStorage của tab hiện tại
      sessionStorage.setItem('doodle_current_room', currentRoomCode);
      if (nicknameInput && nicknameInput.value.trim()) {
        sessionStorage.setItem('doodle_player_name', nicknameInput.value.trim());
      }
      if (avatarSelect && avatarSelect.value) {
        sessionStorage.setItem('doodle_player_avatar', avatarSelect.value);
      }

      // Đóng màn hình Tạo/Vào phòng, Mở màn hình Phòng chờ
      lobbyScreen.classList.remove('active');
      if (waitingRoomScreen) waitingRoomScreen.classList.add('active');

      // Nếu room_info đã tới trước đó khi myPlayerId chưa gán, gọi lại để cập nhật quyền host ngay lập tức
      if (lastRoomInfo) {
        updateRoomInfo(lastRoomInfo);
      }

      // Kích hoạt lại kích thước canvas sau khi vào phòng
      setTimeout(() => {
        if (canvas) canvas.initCanvasSize();
      }, 100);
      break;

    case 'stroke_history':
      try {
        const rawList = typeof msg.strokes === 'string' ? JSON.parse(msg.strokes) : msg.strokes;
        if (Array.isArray(rawList)) {
          const parsedStrokes = [];
          rawList.forEach(rawItem => {
            try {
              const item = typeof rawItem === 'string' ? JSON.parse(rawItem) : rawItem;
              if (item && item.payload) {
                const p = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload;
                parsedStrokes.push(p);
              } else if (item && item.x0 !== undefined) {
                parsedStrokes.push(item);
              }
            } catch (_err) {}
          });

          if (canvas) {
            canvas.loadStrokeHistory(parsedStrokes);
          }
        }
      } catch (err) {
        console.warn('Lỗi phân tích stroke history:', err);
      }
      break;

    case 'room_info':
      const info = JSON.parse(msg.data);
      lastRoomInfo = info;
      updateRoomInfo(info);
      break;

    case 'your_turn_to_draw':
      closeLeaderboardModal();
      isMyTurnToDraw = true;
      canvas.setCanDraw(true);
      if (canvasViewport) canvasViewport.classList.remove('spectating');
      renderSecretWord(msg.word, true);
      wordStatusLabel.textContent = 'Từ khóa:';
      roleText.textContent = '🎨 BẠN ĐANG VẼ!';
      roleBadge.style.background = 'rgba(236, 72, 153, 0.2)';
      roleBadge.style.color = '#ec4899';
      
      // Hiển thị thanh công cụ vẽ cho họa sĩ
      toolbar.classList.remove('hidden');
      toolbar.style.pointerEvents = 'auto';
      toolbar.style.opacity = '1';
      if (guesserHintBar) guesserHintBar.style.display = 'none';

      // Họa sĩ không được chat đoán từ của chính mình
      guessInput.disabled = true;
      guessInput.placeholder = '🎨 Bạn là họa sĩ, hãy vẽ hình để các bạn đoán nhé!';

      // Lưu ý: Không gọi canvas.clear(false) ở đây để tránh xóa nhầm nét vẽ khi F5 reconnect
      sounds.playStart();
      addChatMessage('Hệ thống', `Đến lượt bạn vẽ! Từ khóa là: "${msg.word}"`, true);
      break;

    case 'tick':
      const sec = parseInt(msg.timeLeft, 10);
      timerVal.textContent = `${sec}s`;
      if (sec <= 10 && sec > 0) {
        timerVal.style.color = '#ef4444';
        sounds.playTick();
      } else {
        timerVal.style.color = '#facc15';
      }
      break;

    case 'correct_guess':
      addChatMessage('Hệ thống', `🎉 ${msg.playerAvatar || '✨'} ${msg.playerName} đã đoán chính xác (+${msg.points} pts)!`, true);
      sounds.playCorrect();
      triggerConfetti();
      break;

    case 'you_guessed_correctly':
      addChatMessage('Hệ thống', `🎯 CHÍNH XÁC! Bạn đã tìm ra từ khóa "${msg.word}"!`, true);
      renderSecretWord(msg.word, true);
      wordStatusLabel.textContent = 'Từ khóa:';
      guessInput.disabled = true;
      guessInput.placeholder = 'Bạn đã đoán trúng rồi! Hãy chờ các bạn khác...';
      sounds.playCorrect();
      triggerConfetti();
      break;

    case 'almost_correct':
      addChatMessage('Gợi ý riêng', msg.hint, true);
      sounds.playPop();
      break;

    case 'round_end':
      addChatMessage('Hệ thống', `⏰ Hết vòng! Đáp án là: "${msg.word}". Đang chuyển lượt...`, true);
      renderSecretWord(msg.word, true);
      wordStatusLabel.textContent = 'Từ khóa:';
      sounds.playTimeUp();
      break;

    case 'reaction':
      spawnFloatingReaction(msg.emoji);
      sounds.playPop();
      break;

    case 'stroke':
      if (msg.payload) {
        canvas.drawRemoteStroke(msg.payload);
      }
      break;

    case 'clear':
      canvas.clear(false);
      break;

    case 'chat':
      const chat = JSON.parse(msg.payload);
      addChatMessage(chat.author, chat.text);
      break;

    case 'round_leaderboard':
      try {
        const sorted = JSON.parse(msg.leaderboard);
        const isTurn = msg.type === 'turn';
        const title = isTurn 
          ? `KẾT QUẢ LƯỢT VẼ (VÒNG ${msg.completedRound} / ${msg.maxRounds})`
          : `KẾT QUẢ VÒNG ${msg.completedRound} / ${msg.maxRounds}`;
        const desc = isTurn
          ? `Cập nhật điểm và thứ hạng người chơi sau lượt vẽ vừa rồi:`
          : `Bảng xếp hạng tổng hợp điểm tích lũy sau vòng ${msg.completedRound}:`;
        const label = isTurn ? 'Lượt tiếp theo bắt đầu sau:' : 'Vòng tiếp theo bắt đầu sau:';

        renderLeaderboardModal(
          sorted,
          false,
          title,
          desc,
          parseInt(msg.countdown, 10) || 9,
          label
        );
        sounds.playPop();
      } catch (err) {
        console.warn('Lỗi phân tích round_leaderboard:', err);
      }
      break;

    case 'game_over':
      try {
        const sorted = JSON.parse(msg.leaderboard);
        renderLeaderboardModal(
          sorted,
          true,
          '🏆 TỔNG KẾT TRẬN ĐẤU',
          'Vinh danh người chơi xuất sắc nhất Họa Náo!'
        );
      } catch (err) {
        console.warn('Lỗi phân tích game_over:', err);
      }
      break;

    case 'room_closed':
      sessionStorage.removeItem('doodle_current_room');
      currentRoomCode = null;
      isHost = false;
      isMyTurnToDraw = false;
      amISpectator = false;
      lastRoomInfo = null;

      // Đóng tất cả modal nếu đang mở
      closeLeaderboardModal();
      closeSettingsModal();

      // Rời các màn hình phòng chơi / phòng chờ về màn hình trang chủ
      if (gameScreen) gameScreen.classList.remove('active');
      if (waitingRoomScreen) waitingRoomScreen.classList.remove('active');
      if (lobbyScreen) {
        lobbyScreen.classList.add('active');
        checkWordBankAccessByIp();
      }

      if (spectatorLeaveBtn) spectatorLeaveBtn.style.display = 'none';
      if (spectatorHintBar) spectatorHintBar.style.display = 'none';

      showCustomAlert({
        title: 'Phòng Đã Bị Giải Tán',
        message: msg.message || 'Chủ phòng đã thoát phòng. Phòng chơi đã bị giải tán!',
        type: 'danger',
        icon: '🚪',
        btnText: 'Về trang chủ'
      });

      // Làm mới socket kết nối để sẵn sàng cho lần vào/tạo phòng tiếp theo
      if (socket) {
        try {
          socket.close();
        } catch (_e) {}
        socket = null;
        connectSocket();
      }
      break;

    case 'error':
      if (msg.code === 'SESSION_EXPIRED' || msg.code === 'ROOM_NOT_FOUND') {
        sessionStorage.removeItem('doodle_current_room');
        closeLeaderboardModal();
        closeSettingsModal();
        if (gameScreen) gameScreen.classList.remove('active');
        if (waitingRoomScreen) waitingRoomScreen.classList.remove('active');
        if (lobbyScreen) lobbyScreen.classList.add('active');
      }
      showCustomAlert({
        title: 'Thông Báo Hệ Thống',
        message: msg.message || 'Đã xảy ra lỗi!',
        type: 'warning',
        icon: '⚠️'
      });
      break;
  }
}

/**
 * Render danh sách người chơi ở thanh sidebar cạnh khung chat.
 * Điểm số và thứ tự sắp xếp được giữ nguyên theo previousPlayerScores (trước khi tổng kết),
 * chỉ cập nhật thứ tự và điểm mới khi bắt đầu chạy animation tổng kết hoặc ván mới.
 */
function renderSidebarPlayersList(playersToRender) {
  if (!playersList) return;
  const list = playersToRender || (lastRoomInfo ? lastRoomInfo.players : []);
  if (!list || list.length === 0) {
    playersList.innerHTML = '';
    return;
  }

  // Sắp xếp danh sách sidebar theo điểm hiển thị (previousPlayerScores)
  const sorted = [...list].sort((a, b) => {
    const sA = previousPlayerScores[a.id] !== undefined ? previousPlayerScores[a.id] : (a.score || 0);
    const sB = previousPlayerScores[b.id] !== undefined ? previousPlayerScores[b.id] : (b.score || 0);
    if (sB !== sA) return sB - sA;
    return (a.name || '').localeCompare(b.name || '');
  });

  playersList.innerHTML = '';
  sorted.forEach(p => {
    const scoreVal = previousPlayerScores[p.id] !== undefined ? previousPlayerScores[p.id] : (p.score || 0);
    const playerAvatar = (p.avatar && p.avatar !== 'undefined') ? p.avatar : DEFAULT_AVATAR;
    const isYou = p.id === myPlayerId;
    const isDrawer = p.isDrawer;
    const hasGuessed = p.hasGuessedCorrectly;
    const spectatorTag = p.isSpectator ? '<span class="spectator-tag">Khán giả</span>' : '';
    const guessedTag = (!p.isSpectator && !isDrawer && hasGuessed) ? '<span class="player-guessed-tag" title="Đã đoán trúng">✓</span>' : '';
    const drawerTag = isDrawer ? '<span class="player-drawer-icon" title="Đang vẽ">✏️</span>' : '';

    const li = document.createElement('li');
    li.className = `player-item ${isDrawer ? 'current-drawer' : ''} ${hasGuessed ? 'guessed-correctly' : ''} ${isYou ? 'is-you' : ''}`;
    li.innerHTML = `
      <span class="player-avatar">${playerAvatar}</span>
      <div class="player-meta">
        <span class="player-name">
          ${escapeHtml(p.name || 'Người chơi')}
          ${isYou ? '<small class="you-tag">(Bạn)</small>' : ''}
          ${p.isHost ? '👑' : ''}
          ${spectatorTag}
          ${drawerTag}
          ${guessedTag}
        </span>
        <span class="player-score">${p.isSpectator ? 'Đang xem' : `${scoreVal} pts`}</span>
      </div>
    `;
    playersList.appendChild(li);
  });
}

function updateRoomInfo(info) {
  canvasRoundInfo.textContent = `Vòng ${info.round} / ${info.maxRounds}`;
  playerCountEl.textContent = info.players.length;
  if (waitingPlayerCount) waitingPlayerCount.textContent = info.players.length;

  // Cập nhật cài đặt phòng từ server
  if (info.gameMode) currentRoomSettings.gameMode = info.gameMode;
  if (info.drawTime) currentRoomSettings.drawTime = info.drawTime;
  if (info.maxPlayers) currentRoomSettings.maxPlayers = info.maxPlayers;
  if (info.maxRounds) currentRoomSettings.maxRounds = info.maxRounds;

  if (waitingMaxPlayerCount) waitingMaxPlayerCount.textContent = currentRoomSettings.maxPlayers;
  if (waitingRoomModeBadge) {
    if (currentRoomSettings.gameMode === 'speed-1v1') {
      waitingRoomModeBadge.textContent = '⚡ Đấu Tốc Độ 1v1';
    } else if (currentRoomSettings.gameMode === 'relay') {
      waitingRoomModeBadge.textContent = '🤝 Vẽ Tiếp Sức';
    } else {
      waitingRoomModeBadge.textContent = '🎨 Luân Phiên';
    }
  }

  // 1. Render danh sách người chơi ở thanh sidebar cạnh khung chat
  renderSidebarPlayersList(info.players);

  // 2. Render players cards ở Màn hình phòng chờ (Waiting Room Grid)
  if (waitingPlayersGrid) {
    waitingPlayersGrid.innerHTML = '';
    info.players.forEach(p => {
      const displayScore = (p.score !== undefined && p.score !== null) ? p.score : 0;
      const playerAvatar = (p.avatar && p.avatar !== 'undefined') ? p.avatar : DEFAULT_AVATAR;
      const card = document.createElement('div');
      card.className = `waiting-player-card ${p.id === myPlayerId ? 'is-you' : ''}`;
      const spectatorTag = p.isSpectator ? '<span class="spectator-tag">Khán giả</span>' : '';
      card.innerHTML = `
        <div class="card-avatar-wrapper">
          <span class="waiting-player-avatar">${playerAvatar}</span>
          ${p.isHost ? '<span class="host-crown-badge" title="Chủ phòng">👑</span>' : ''}
        </div>
        <div class="card-info-wrapper">
          <span class="waiting-player-name">${escapeHtml(p.name || 'Người chơi')} ${p.id === myPlayerId ? '<small class="you-tag">(Bạn)</small>' : ''} ${spectatorTag}</span>
          <span class="waiting-player-score-pill">${p.isSpectator ? 'Khán giả' : `${displayScore} pts`}</span>
        </div>
      `;
      waitingPlayersGrid.appendChild(card);
    });
  }

  info.players.forEach(p => {
    if (p.id === myPlayerId) {
      isHost = p.isHost;
      if (isHost) {
        if (waitingHostControls) waitingHostControls.style.display = 'block';
        if (waitingGuestControls) waitingGuestControls.style.display = 'none';
        if (hostTopbarActions) hostTopbarActions.style.display = 'flex';
      } else {
        if (waitingHostControls) waitingHostControls.style.display = 'none';
        if (waitingGuestControls) waitingGuestControls.style.display = 'block';
        if (hostTopbarActions) hostTopbarActions.style.display = 'none';
      }
    }
  });

  // Kiểm tra cảnh báo số lượng người chơi trong phòng chờ
  if (playerCountWarning) {
    if (info.players.length < 2) {
      playerCountWarning.textContent = 'Cần ít nhất 2 người chơi để bắt đầu cuộc thi tài!';
      playerCountWarning.style.color = '#f87171';
      if (waitingStartGameBtn) waitingStartGameBtn.disabled = true;
      if (waitingStartGameBtn) waitingStartGameBtn.style.opacity = '0.6';
    } else {
      playerCountWarning.textContent = 'Đã đủ người! Chủ phòng có thể bắt đầu ngay 🚀';
      playerCountWarning.style.color = '#34d399';
      if (waitingStartGameBtn) waitingStartGameBtn.disabled = false;
      if (waitingStartGameBtn) waitingStartGameBtn.style.opacity = '1';
    }
  }

  if (info.state === 'WAITING') {
    // Đang ở chế độ phòng chờ -> reset điểm ván cũ
    for (const k in previousPlayerScores) delete previousPlayerScores[k];
    renderSidebarPlayersList(info.players);
    if (waitingRoomScreen && !lobbyScreen.classList.contains('active')) {
      waitingRoomScreen.classList.add('active');
    }
    roleText.textContent = 'Phòng chờ...';
    toolbar.classList.add('hidden');
    if (guesserHintBar) guesserHintBar.style.display = 'none';
    canvas.setCanDraw(false);
  } else if (info.state === 'DRAWING') {
    closeLeaderboardModal();
    // Trận đấu bắt đầu: ĐÓNG màn hình phòng chờ và sảnh ngay lập tức
    if (waitingRoomScreen) waitingRoomScreen.classList.remove('active');
    if (lobbyScreen) lobbyScreen.classList.remove('active');

    setTimeout(() => {
      if (canvas) canvas.initCanvasSize();
    }, 50);

    const myPlayer = info.players.find(p => p.id === myPlayerId);
    amISpectator = myPlayer?.isSpectator === true;

    if (amISpectator) {
      // Người chơi là KHÁN GIẢ (Spectator) - vào giữa trận đấu
      isMyTurnToDraw = false;
      canvas.setCanDraw(false);
      if (canvasViewport) canvasViewport.classList.add('spectating');
      toolbar.classList.add('hidden');
      if (guesserHintBar) guesserHintBar.style.display = 'none';
      if (spectatorHintBar) spectatorHintBar.style.display = 'flex';
      if (spectatorLeaveBtn) spectatorLeaveBtn.style.display = 'inline-flex';

      // Khán giả không được chat và không được đoán
      guessInput.disabled = true;
      guessInput.placeholder = '👀 Bạn là khán giả (đang xem). Chờ ván mới để tham gia!';
      if (sendBtn) sendBtn.disabled = true;

      renderWordHint(info.wordPattern, info.wordLength);
      roleText.textContent = '👀 BẠN LÀ KHÁN GIẢ';
      roleBadge.style.background = 'rgba(148, 163, 184, 0.2)';
      roleBadge.style.color = '#94a3b8';
    } else {
      if (spectatorHintBar) spectatorHintBar.style.display = 'none';
      if (spectatorLeaveBtn) spectatorLeaveBtn.style.display = 'none';
      if (sendBtn) sendBtn.disabled = false;

      if (info.currentDrawerId !== myPlayerId) {
        // Người chơi là NGƯỜI ĐOÁN (Guesser)
        isMyTurnToDraw = false;
        canvas.setCanDraw(false);
        if (canvasViewport) canvasViewport.classList.add('spectating');

        // Ẩn hoàn toàn bảng vẽ công cụ và hiện thanh chỉ dẫn người đoán
        toolbar.classList.add('hidden');
        if (guesserHintBar) guesserHintBar.style.display = 'flex';

        if (myPlayer && !myPlayer.hasGuessedCorrectly) {
          guessInput.disabled = false;
          guessInput.placeholder = '💬 Nhập câu trả lời để đoán từ...';
        }
        if (!myPlayer || !myPlayer.hasGuessedCorrectly) {
          renderWordHint(info.wordPattern, info.wordLength);
        }
        roleText.textContent = `Họa sĩ: ${info.currentDrawerName || 'Bạn bè'}`;
        roleBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        roleBadge.style.color = '#10b981';
      } else {
        // Người chơi là HỌA SĨ (Drawer)
        isMyTurnToDraw = true;
        canvas.setCanDraw(true);
        if (canvasViewport) canvasViewport.classList.remove('spectating');
        toolbar.classList.remove('hidden');
        if (guesserHintBar) guesserHintBar.style.display = 'none';
        guessInput.disabled = true;
        guessInput.placeholder = '🎨 Bạn là họa sĩ, hãy vẽ hình để các bạn đoán nhé!';
      }
    }
  }
}

// Helpers
function addChatMessage(author, text, isSystem = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = isSystem ? 'msg system' : 'msg player';
  if (isSystem) {
    msgDiv.textContent = text;
  } else {
    msgDiv.innerHTML = `<span class="author">${escapeHtml(author)}:</span> ${escapeHtml(text)}`;
  }
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Initialize Canvas
const canvasEl = document.getElementById('paintCanvas');
const canvas = new PaintCanvas(
  canvasEl,
  (stroke) => {
    if (isMyTurnToDraw) {
      sendToServer({ action: 'stroke', payload: stroke });
    }
  },
  () => {
    if (isMyTurnToDraw) {
      sendToServer({ action: 'clear' });
    }
  }
);

// Setup Toolbar interactions
const colorBtns = document.querySelectorAll('.color-btn');
colorBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    colorBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    canvas.setColor(btn.dataset.color);
  });
});

const sizeBtns = document.querySelectorAll('.size-btn');
sizeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    sizeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    canvas.setSize(parseInt(btn.dataset.size, 10));
  });
});

const eraserBtn = document.getElementById('eraserBtn');
let isEraserActive = false;
eraserBtn.addEventListener('click', () => {
  isEraserActive = !isEraserActive;
  canvas.setEraser(isEraserActive);
  eraserBtn.style.background = isEraserActive ? 'var(--accent-neon)' : '';
});

const clearBtn = document.getElementById('clearBtn');
clearBtn.addEventListener('click', async () => {
  if (!isMyTurnToDraw) return;
  const confirmed = await showCustomConfirm({
    title: 'Xóa Bảng Vẽ',
    message: 'Bạn có chắc chắn muốn xóa sạch toàn bộ nét vẽ trên bảng?',
    confirmText: 'Xóa sạch',
    cancelText: 'Giữ lại',
    type: 'warning',
    icon: '🧹'
  });
  if (confirmed) {
    canvas.clear(true);
  }
});

// Sound Toggle (Bật / Tắt âm thanh)
const soundToggleBtn = document.getElementById('soundToggleBtn');
const soundIcon = document.getElementById('soundIcon');
soundToggleBtn?.addEventListener('click', () => {
  sounds.enabled = !sounds.enabled;
  if (soundIcon) soundIcon.textContent = sounds.enabled ? '🔊' : '🔇';
  if (sounds.enabled) sounds.playPop();
});

// Bottom Reaction Popovers (Thả biểu cảm từ thanh vẽ & người đoán)
const drawerReactTrigger = document.getElementById('drawerReactTrigger');
const drawerReactMenu = document.getElementById('drawerReactMenu');
const guesserReactTrigger = document.getElementById('guesserReactTrigger');
const guesserReactMenu = document.getElementById('guesserReactMenu');

function toggleReactionMenu(menu, trigger) {
  const isOpen = menu?.classList.contains('open');
  closeAllReactionMenus();
  if (!isOpen && menu) {
    menu.classList.add('open');
    trigger?.classList.add('active');
    sounds.playPop();
  }
}

function closeAllReactionMenus() {
  document.querySelectorAll('.reaction-popover-menu').forEach(m => m.classList.remove('open'));
  document.querySelectorAll('.reaction-trigger-btn').forEach(b => b.classList.remove('active'));
}

drawerReactTrigger?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleReactionMenu(drawerReactMenu, drawerReactTrigger);
});

guesserReactTrigger?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleReactionMenu(guesserReactMenu, guesserReactTrigger);
});

// Click ra ngoài đóng khay biểu cảm
document.addEventListener('click', (e) => {
  if (!e.target.closest('.reaction-popover-wrapper')) {
    closeAllReactionMenus();
  }
});

// Chọn biểu cảm trong khay thả icon
document.addEventListener('click', (e) => {
  const emojiBtn = e.target.closest('.react-emoji-btn');
  if (!emojiBtn) return;
  e.stopPropagation();

  if (amISpectator) {
    showCustomAlert({
      title: 'Chế Độ Khán Giả',
      message: 'Khán giả không thể thả biểu cảm trong lúc theo dõi!',
      type: 'info',
      icon: '👀'
    });
    closeAllReactionMenus();
    return;
  }

  const emoji = emojiBtn.dataset.emoji;
  if (!emoji) return;

  // Hiệu ứng bay icon và âm thanh cục bộ
  spawnFloatingReaction(emoji);
  sounds.playPop();

  // Phát tín hiệu tới server để toàn phòng cùng thấy
  sendToServer({
    action: 'reaction',
    emoji: emoji
  });

  closeAllReactionMenus();
});

// Home / Lobby Events
const playTurnBasedBtn = document.getElementById('playTurnBasedBtn');
const modeTurnBased = document.getElementById('modeTurnBased');

function handleCreateRoom() {
  const name = nicknameInput.value.trim() || 'Họa Sĩ';
  const avatar = (avatarSelect?.value && avatarSelect.value !== 'undefined') ? avatarSelect.value : DEFAULT_AVATAR;
  sendToServer({
    action: 'create_room',
    playerId: getTabGuestId(),
    playerName: name,
    playerAvatar: avatar
  });
}

if (createRoomBtn) {
  createRoomBtn.addEventListener('click', handleCreateRoom);
}

if (playTurnBasedBtn) {
  playTurnBasedBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleCreateRoom();
  });
}

if (modeTurnBased) {
  modeTurnBased.addEventListener('click', () => {
    // Luôn chọn chế độ luân phiên
    modeTurnBased.classList.add('selected');
  });
}

joinRoomBtn.addEventListener('click', () => {
  const code = roomCodeInput.value.trim().toUpperCase();
  if (!code) {
    showCustomAlert({
      title: 'Thiếu Mã Phòng',
      message: 'Vui lòng nhập mã phòng hợp lệ để tham gia!',
      type: 'warning',
      icon: '🔑'
    });
    return;
  }
  const name = nicknameInput.value.trim() || 'Người Đoán';
  const avatar = (avatarSelect?.value && avatarSelect.value !== 'undefined') ? avatarSelect.value : DEFAULT_AVATAR;
  sendToServer({
    action: 'join_room',
    playerId: getTabGuestId(),
    roomCode: code,
    playerName: name,
    playerAvatar: avatar
  });
});

// Dedicated Waiting Room & In-Game Actions: Thoát phòng
const closeWaitingRoomBtn = document.getElementById('closeWaitingRoomBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const inGameLeaveBtn = document.getElementById('inGameLeaveBtn');

async function handleLeaveRoom() {
  if (isHost) {
    const confirmed = await showCustomConfirm({
      title: 'Giải Tán Phòng?',
      message: 'Bạn là chủ phòng 👑. Nếu bạn thoát, phòng chơi sẽ bị giải tán và tất cả người chơi sẽ bị đá về trang chủ.',
      confirmText: 'Giải tán & Thoát',
      cancelText: 'Ở lại',
      type: 'danger',
      icon: '🚪'
    });
    if (!confirmed) return;
  } else {
    const confirmed = await showCustomConfirm({
      title: 'Rời Phòng Chơi?',
      message: 'Bạn có chắc chắn muốn rời phòng và quay về màn hình chính?',
      confirmText: 'Rời phòng',
      cancelText: 'Ở lại',
      type: 'warning',
      icon: '🚪'
    });
    if (!confirmed) return;
  }

  // Gửi thông báo rời phòng tới server
  sendToServer({
    action: 'leave_room',
    roomCode: currentRoomCode
  });

  // Xóa phòng đã lưu trong tab này
  sessionStorage.removeItem('doodle_current_room');

  // Reset state cục bộ
  currentRoomCode = null;
  isHost = false;
  isMyTurnToDraw = false;
  amISpectator = false;
  lastRoomInfo = null;

  closeLeaderboardModal();
  closeSettingsModal();

  // Đóng màn hình phòng chờ và phòng chơi, hiển thị lại trang chủ (Home Screen)
  if (gameScreen) {
    gameScreen.classList.remove('active');
  }
  if (waitingRoomScreen) {
    waitingRoomScreen.classList.remove('active');
  }
  if (lobbyScreen) {
    lobbyScreen.classList.add('active');
    checkWordBankAccessByIp();
  }

  if (spectatorLeaveBtn) spectatorLeaveBtn.style.display = 'none';
  if (spectatorHintBar) spectatorHintBar.style.display = 'none';

  sounds.playPop();

  // Đóng socket và kết nối lại sẵn sàng cho lần tạo/vào phòng tiếp theo
  if (socket) {
    try {
      socket.close();
    } catch (_e) {}
    socket = null;
    connectSocket();
  }
}

closeWaitingRoomBtn?.addEventListener('click', handleLeaveRoom);
leaveRoomBtn?.addEventListener('click', handleLeaveRoom);
inGameLeaveBtn?.addEventListener('click', handleLeaveRoom);

// ================= CÀI ĐẶT PHÒNG CHƠI (ROOM SETTINGS - AUTO-SAVE) =================
function sendRoomSettingsUpdate() {
  if (!isHost) return;
  sendToServer({
    action: 'update_settings',
    gameMode: currentRoomSettings.gameMode,
    drawTime: currentRoomSettings.drawTime,
    maxPlayers: currentRoomSettings.maxPlayers,
    maxRounds: currentRoomSettings.maxRounds
  });
}

/**
 * Đồng bộ trạng thái khóa của các chế độ chơi từ bên ngoài (Lobby/Sảnh) vào bên trong Cài đặt phòng
 */
function syncLockedModesToSettings() {
  if (!modeSelectGrid) return;
  const lockedModes = new Set();
  const lobbyDisabledCards = document.querySelectorAll('#gameModesContainer .game-mode-card.disabled');
  lobbyDisabledCards.forEach(c => {
    const m = c.dataset.mode;
    if (m === 'speed-run' || m === 'speed-1v1') {
      lockedModes.add('speed-1v1');
      lockedModes.add('speed-run');
    } else if (m) {
      lockedModes.add(m);
    }
  });

  const settingCards = modeSelectGrid.querySelectorAll('.mode-select-card');
  settingCards.forEach(c => {
    const m = c.dataset.mode;
    if (lockedModes.has(m)) {
      c.classList.add('disabled');
      c.setAttribute('title', 'Chế độ chơi này hiện đang bị khóa (Sắp ra mắt)');
      const badge = c.querySelector('.mode-card-badge');
      if (badge && !badge.textContent.includes('🔒')) {
        badge.textContent = '🔒 Sắp ra mắt';
      }
    } else {
      c.classList.remove('disabled');
      c.removeAttribute('title');
    }
  });
}

function renderSettingsUI() {
  // 1. Cập nhật chọn chế độ chơi (Đồng bộ khóa từ ngoài sảnh)
  if (modeSelectGrid) {
    syncLockedModesToSettings();
    // Nếu mode hiện tại vô tình rơi vào mode bị khóa -> tự động fallback về turn-based
    const activeIsLocked = Array.from(modeSelectGrid.querySelectorAll('.mode-select-card.disabled'))
      .some(c => c.dataset.mode === currentRoomSettings.gameMode);
    if (activeIsLocked) {
      currentRoomSettings.gameMode = 'turn-based';
      sendRoomSettingsUpdate();
    }

    const cards = modeSelectGrid.querySelectorAll('.mode-select-card');
    cards.forEach(card => {
      const isDisabled = card.classList.contains('disabled');
      if (!isDisabled && card.dataset.mode === currentRoomSettings.gameMode) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  // 2. Cập nhật chọn thời gian vẽ
  const standardTimes = [30, 60, 80, 100, 120];
  const isCustom = !standardTimes.includes(currentRoomSettings.drawTime);

  if (drawTimeSelector) {
    const timeBtns = drawTimeSelector.querySelectorAll('.pill-option');
    timeBtns.forEach(btn => {
      const t = parseInt(btn.dataset.time, 10);
      if (!isNaN(t)) {
        if (t === currentRoomSettings.drawTime) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });

    if (pillOtherDrawTime) {
      if (isCustom) {
        pillOtherDrawTime.classList.add('active');
        pillOtherDrawTime.querySelector('small').textContent = `(${currentRoomSettings.drawTime}s)`;
      } else {
        pillOtherDrawTime.classList.remove('active');
        pillOtherDrawTime.querySelector('small').textContent = '(Tự nhập)';
      }
    }
  }

  if (drawTimeDisplay) {
    drawTimeDisplay.textContent = `${currentRoomSettings.drawTime} giây`;
  }

  if (customTimeBox) {
    if (isCustom) {
      customTimeBox.style.display = 'flex';
      if (customDrawTimeInput) customDrawTimeInput.value = currentRoomSettings.drawTime;
    } else {
      customTimeBox.style.display = 'none';
    }
  }

  // 3. Cập nhật chọn số người tối đa (Slider 2 - 16 người)
  if (maxPlayersSlider) {
    maxPlayersSlider.value = currentRoomSettings.maxPlayers;
  }
  if (maxPlayersDisplay) {
    maxPlayersDisplay.textContent = `${currentRoomSettings.maxPlayers} người`;
  }

  // 4. Cập nhật chọn số vòng thi đấu (3 - 6 vòng)
  if (roundsSelector) {
    const roundBtns = roundsSelector.querySelectorAll('.pill-option');
    roundBtns.forEach(btn => {
      const r = parseInt(btn.dataset.rounds, 10);
      if (r === currentRoomSettings.maxRounds) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
  if (roundsDisplay) {
    roundsDisplay.textContent = `${currentRoomSettings.maxRounds} vòng`;
  }
}

function openSettingsModal() {
  syncLockedModesToSettings();
  renderSettingsUI();
  if (settingsScreen) {
    settingsScreen.classList.add('active');
  }
  sounds.playPop();
}

function closeSettingsModal() {
  if (settingsScreen) {
    settingsScreen.classList.remove('active');
  }
  sounds.playPop();
}

// Bắt sự kiện chọn Chế độ chơi -> THAY ĐỔI VÀ TỰ ĐỘNG LƯU LUÔN
modeSelectGrid?.addEventListener('click', (e) => {
  if (!isHost) return;
  const card = e.target.closest('.mode-select-card');
  if (!card) return;
  if (card.classList.contains('disabled')) {
    // Chế độ bị khóa bên ngoài: rung cảnh báo và từ chối chọn
    card.classList.remove('shake-anim');
    void card.offsetWidth;
    card.classList.add('shake-anim');
    sounds.playPop();
    return;
  }
  const newMode = card.dataset.mode || 'turn-based';
  if (newMode !== currentRoomSettings.gameMode) {
    currentRoomSettings.gameMode = newMode;
    renderSettingsUI();
    sendRoomSettingsUpdate();
    sounds.playPop();
  }
});

// Bắt sự kiện chọn Thời gian vẽ
drawTimeSelector?.addEventListener('click', (e) => {
  if (!isHost) return;
  const btn = e.target.closest('.pill-option');
  if (!btn) return;

  if (btn.dataset.time === 'other') {
    // Mở khung nhập thời gian tùy chọn
    if (customTimeBox) {
      const isVisible = customTimeBox.style.display === 'flex';
      customTimeBox.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible && customDrawTimeInput) {
        customDrawTimeInput.focus();
        customDrawTimeInput.select();
      }
    }
    sounds.playPop();
    return;
  }

  const time = parseInt(btn.dataset.time, 10);
  if (!isNaN(time) && time !== currentRoomSettings.drawTime) {
    currentRoomSettings.drawTime = time;
    if (customTimeBox) customTimeBox.style.display = 'none';
    renderSettingsUI();
    sendRoomSettingsUpdate();
    sounds.playPop();
  }
});

// Xử lý tự động áp dụng thời gian tùy chọn (Custom Time) khi người dùng nhập
function handleCustomTimeInput(commit = false) {
  if (!isHost || !customDrawTimeInput) return;
  const val = parseInt(customDrawTimeInput.value.trim(), 10);
  if (!isNaN(val) && val >= 10 && val <= 300) {
    if (val !== currentRoomSettings.drawTime) {
      currentRoomSettings.drawTime = val;
      if (drawTimeDisplay) drawTimeDisplay.textContent = `${val} giây`;
      if (pillOtherDrawTime) {
        pillOtherDrawTime.classList.add('active');
        pillOtherDrawTime.querySelector('small').textContent = `(${val}s)`;
      }
      sendRoomSettingsUpdate();
    }
  } else if (commit && (isNaN(val) || val < 10 || val > 300)) {
    // Khi rời chuột hoặc Enter mà chưa hợp lệ thì hồi phục về giá trị hiện tại
    customDrawTimeInput.value = currentRoomSettings.drawTime;
  }
}

// Tự động nhận diện khi người dùng nhập số
let customTimeDebounce = null;
customDrawTimeInput?.addEventListener('input', () => {
  clearTimeout(customTimeDebounce);
  customTimeDebounce = setTimeout(() => {
    handleCustomTimeInput(false);
  }, 400);
});

customDrawTimeInput?.addEventListener('change', () => {
  handleCustomTimeInput(true);
});

customDrawTimeInput?.addEventListener('blur', () => {
  handleCustomTimeInput(true);
});

customDrawTimeInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleCustomTimeInput(true);
    customDrawTimeInput.blur();
    sounds.playCorrect();
  }
});

// Bắt sự kiện Slider Số người tối đa (2 - 16 người) -> THAY ĐỔI VÀ TỰ ĐỘNG LƯU LUÔN
maxPlayersSlider?.addEventListener('input', () => {
  if (!isHost) return;
  const val = parseInt(maxPlayersSlider.value, 10);
  if (!isNaN(val)) {
    currentRoomSettings.maxPlayers = val;
    if (maxPlayersDisplay) maxPlayersDisplay.textContent = `${val} người`;
    sendRoomSettingsUpdate();
  }
});

maxPlayersSlider?.addEventListener('change', () => {
  if (!isHost) return;
  sounds.playPop();
});

// Bắt sự kiện chọn Số vòng thi đấu (3 - 6 vòng) -> THAY ĐỔI VÀ TỰ ĐỘNG LƯU LUÔN
roundsSelector?.addEventListener('click', (e) => {
  if (!isHost) return;
  const btn = e.target.closest('.pill-option');
  if (!btn) return;
  const r = parseInt(btn.dataset.rounds, 10);
  if (r && r >= 3 && r <= 6 && r !== currentRoomSettings.maxRounds) {
    currentRoomSettings.maxRounds = r;
    renderSettingsUI();
    sendRoomSettingsUpdate();
    sounds.playPop();
  }
});

// Bắt sự kiện nút Tổng kết trận đấu (Game Over Modal)
playAgainBtn?.addEventListener('click', () => {
  if (!isHost) {
    showCustomAlert({
      title: 'Quyền Chủ Phòng',
      message: 'Chỉ chủ phòng mới có quyền bắt đầu lại trận đấu mới!',
      type: 'info',
      icon: '👑'
    });
    return;
  }
  for (const k in previousPlayerScores) delete previousPlayerScores[k];
  renderSidebarPlayersList();
  closeLeaderboardModal();
  sendToServer({ action: 'start_game' });
});

backToWaitingBtn?.addEventListener('click', () => {
  closeLeaderboardModal();
  if (gameScreen) gameScreen.classList.remove('active');
  if (waitingRoomScreen) waitingRoomScreen.classList.add('active');
});

// Mở màn hình Cài đặt khi chủ phòng bấm nút ⚙️
roomSettingsBtn?.addEventListener('click', () => {
  if (!isHost) {
    showCustomAlert({
      title: 'Quyền Chủ Phòng',
      message: 'Chỉ chủ phòng mới có quyền tùy chỉnh cài đặt thể thức phòng chơi!',
      type: 'info',
      icon: '⚙️'
    });
    return;
  }
  openSettingsModal();
});

closeSettingsBtn?.addEventListener('click', closeSettingsModal);

// Start Game by Host trong màn hình phòng chờ
waitingStartGameBtn?.addEventListener('click', () => {
  for (const k in previousPlayerScores) delete previousPlayerScores[k];
  renderSidebarPlayersList();
  sendToServer({ action: 'start_game' });
});

// Copy Room Code Button in Dedicated Waiting Room
copyCodeBtn?.addEventListener('click', () => {
  if (currentRoomCode) {
    navigator.clipboard.writeText(currentRoomCode).then(() => {
      sounds.playPop();
      if (copySuccessHint) {
        copySuccessHint.style.display = 'block';
        setTimeout(() => {
          copySuccessHint.style.display = 'none';
        }, 2500);
      }
    }).catch(() => {
      showCustomAlert({
        title: 'Mã Phòng',
        message: `Mã phòng của bạn là: ${currentRoomCode}`,
        type: 'info',
        icon: '📋'
      });
    });
  }
});

// Copy Invite Link at Game Header
copyInviteBtn?.addEventListener('click', () => {
  if (currentRoomCode) {
    navigator.clipboard.writeText(currentRoomCode).then(() => {
      sounds.playPop();
      showCustomAlert({
        title: 'Đã Sao Chép',
        message: `Đã sao chép mã phòng: ${currentRoomCode} vào bộ nhớ tạm! 🎉`,
        type: 'success',
        icon: '📋'
      });
    }).catch(() => {
      showCustomAlert({
        title: 'Mã Phòng',
        message: `Mã phòng của bạn là: ${currentRoomCode}`,
        type: 'info',
        icon: '📋'
      });
    });
  }
});

// Thoát phòng cho Khán giả (Spectator)
spectatorLeaveBtn?.addEventListener('click', handleLeaveRoom);

// Chat Submit
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (amISpectator) {
    showCustomAlert({
      title: 'Chế Độ Khán Giả',
      message: 'Bạn đang ở chế độ khán giả (đang xem). Hãy chờ ván mới sau khi hoàn thành các vòng để cùng thi tài nhé!',
      type: 'info',
      icon: '👀'
    });
    return;
  }
  const text = guessInput.value.trim();
  if (!text) return;

  sendToServer({
    action: 'chat',
    text: text
  });

  guessInput.value = '';
});

// Initialize immediately
connectSocket();
fetchAvatarsFromServer();
checkWordBankAccessByIp();

window.addEventListener('DOMContentLoaded', () => {
  fetchAvatarsFromServer();
  checkWordBankAccessByIp();

  // Khôi phục biệt danh người chơi đã lưu trong tab hoặc trình duyệt
  if (nicknameInput) {
    const savedName = sessionStorage.getItem('doodle_player_name') || localStorage.getItem('doodle_player_name');
    if (savedName) nicknameInput.value = savedName;
    nicknameInput.addEventListener('input', () => {
      const val = nicknameInput.value.trim();
      sessionStorage.setItem('doodle_player_name', val);
      localStorage.setItem('doodle_player_name', val);
    });
  }

  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    roomCodeInput.value = roomParam;
  }
});

// ================= TẮT ZOOM VIEW TOÀN BỘ TRANG WEB =================
// 1. Chặn Ctrl + Lăn chuột (Ctrl + MouseWheel) & Trackpad Pinch Zoom
window.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault();
  }
}, { passive: false });

// 2. Chặn các tổ hợp phím thu phóng: Ctrl/Cmd + '+', '-', '=', '0', Numpad
window.addEventListener('keydown', (e) => {
  if (
    (e.ctrlKey || e.metaKey) &&
    (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0' || e.key === '_' || e.code === 'NumpadAdd' || e.code === 'NumpadSubtract')
  ) {
    e.preventDefault();
  }
});

// 3. Chặn Safari / iOS Gesture Pinch-to-zoom
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());

// 4. Chặn Multi-touch pinch zoom trên màn hình cảm ứng
document.addEventListener('touchstart', (e) => {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

// 5. Chặn double-tap phóng to trên thiết bị di động
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });
