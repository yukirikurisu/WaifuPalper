// Elements
const splashScreen = document.getElementById('splash-screen');
const continueBtn   = document.querySelector('.continue-btn');
const loginModal    = document.getElementById('telegram-login-modal');
const closeModalBtn = document.getElementById('close-login-modal');

// Cerrar modal
closeModalBtn.addEventListener('click', () => {
  loginModal.style.display = 'none';
});

// Inicialización del juego y enrutamiento
function initGame() {
  console.log("Juego iniciado");

  document.getElementById('start-battle-btn').addEventListener('click', () => navigate('/battle'));
  document.getElementById('start-profile-btn').addEventListener('click', () => navigate('/profile'));
  document.getElementById('start-characters-btn').addEventListener('click', () => navigate('/characters'));
  document.getElementById('start-market-btn').addEventListener('click', () => navigate('/market'));
  document.getElementById('start-pass-btn').addEventListener('click', () => navigate('/pass'));
  document.getElementById('start-config-btn').addEventListener('click', () => navigate('/config'));
  document.getElementById('start-game-btn').addEventListener('click', () => navigate('/game'));
}

const routes = {
  '/':          'home',
  '/battle':    'battle',
  '/profile':   'profile',
  '/characters':'characters',
  '/market':    'market',
  '/pass':      'pass',
  '/config':    'config',
  '/game':      'game',
};

function router() {
  const path = window.location.pathname;
  const view = routes[path] || '404';
  loadView(view);
}

async function loadView(view) {
  try {
    const res  = await fetch(`/frontend/views/${view}.html`);
    const html = await res.text();
    document.getElementById('app').innerHTML = html;
    if (view === 'battle') {
      const module = await import('./battle.js');
      new module.BattleUI();
    }
  } catch (err) {
    console.error('Error al cargar la vista:', err);
    document.getElementById('app').innerHTML = '<h1>Error al cargar la vista.</h1>';
  }
}

function navigate(path) {
  window.history.pushState({}, '', path);
  router();
}

window.addEventListener('popstate', router);
document.addEventListener('DOMContentLoaded', router);