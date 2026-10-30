/**
 * Canvas Confetti Cannon Effect
 * Bắn pháo hoa rực rỡ khi người chơi đoán trúng hoặc kết thúc trận đấu
 */
export function triggerConfetti() {
  const count = 60;
  const colors = ['#6366f1', '#ec4899', '#38bdf8', '#facc15', '#10b981', '#f43f5e'];

  const container = document.createElement('div');
  container.className = 'confetti-wrapper';
  document.body.appendChild(container);

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    particle.style.left = `${Math.random() * 100}vw`;
    particle.style.animationDuration = `${1.5 + Math.random() * 2}s`;
    particle.style.animationDelay = `${Math.random() * 0.3}s`;
    particle.style.transform = `scale(${0.6 + Math.random() * 0.8}) rotate(${Math.random() * 360}deg)`;
    container.appendChild(particle);
  }

  setTimeout(() => {
    container.remove();
  }, 3800);
}

/**
 * Hiển thị Reaction bay lên màn hình khi người chơi thả icon
 */
export function spawnFloatingReaction(emoji) {
  const el = document.createElement('div');
  el.className = 'floating-reaction';
  el.textContent = emoji;
  el.style.left = `${30 + Math.random() * 40}%`;
  el.style.bottom = '120px';
  document.body.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 2000);
}
