const widget = document.querySelector('#widget');
const nickname = document.querySelector('#nickname');
const controls = document.querySelector('#controls');
const nameInput = document.querySelector('#name');
const statusText = document.querySelector('#status');

const queue = [];
let playing = false;

const timing = Object.freeze({
  wake: 1250,
  cloudIn: 650,
  hold: 5000,
  sleep: 1350,
});

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function setState(state, message) {
  widget.className = `widget ${state}`;
  if (statusText && message) statusText.textContent = message;
}

function normalizeName(value) {
  const clean = String(value ?? '').replace(/[<>]/g, '').trim();
  return clean.slice(0, 50) || 'Новый фолловер';
}

function fitNickname() {
  const scale = Math.min(widget.clientWidth / 1200, 1);
  let size = Math.round(48 * scale);
  const minimum = Math.max(14, Math.round(16 * scale));
  nickname.style.fontSize = `${size}px`;
  while (nickname.scrollWidth > nickname.clientWidth && size > minimum) {
    nickname.style.fontSize = `${--size}px`;
  }
}

async function playFollowerAlert(followerName) {
  const safeName = normalizeName(followerName);
  nickname.textContent = safeName;
  fitNickname();

  setState('is-waking', `Дракон просыпается для ${safeName}…`);
  await wait(timing.wake);

  setState('is-alert', `${safeName} только что зафолловился!`);
  await wait(timing.cloudIn + timing.hold);

  setState('is-sleeping-down', 'Дракон снова укладывается спать…');
  await wait(timing.sleep);

  setState('is-sleeping', 'Дракон спит. Можно запустить следующую проверку.');
}

async function drainQueue() {
  if (playing) return;
  playing = true;
  while (queue.length) await playFollowerAlert(queue.shift());
  playing = false;
}

function triggerFollower(name) {
  queue.push(normalizeName(name));
  drainQueue();
}

controls?.addEventListener('submit', (event) => {
  event.preventDefault();
  triggerFollower(nameInput.value);
});

window.addEventListener('onEventReceived', (event) => {
  const detail = event.detail ?? {};
  if (detail.listener !== 'follower-latest') return;
  triggerFollower(detail.event?.name);
});

window.addEventListener('onWidgetLoad', () => {
  setState('is-sleeping', 'StreamElements подключён. Дракон ждёт нового фолловера.');
});

const params = new URLSearchParams(location.search);
if (params.has('overlay') || params.has('obs')) document.body.classList.add('overlay');
if (params.has('demo')) setTimeout(() => triggerFollower(params.get('demo')), 500);

window.dragonAlert = triggerFollower;
