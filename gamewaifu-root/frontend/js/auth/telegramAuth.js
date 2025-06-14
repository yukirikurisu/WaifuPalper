import StaticApp from '../game/StaticApp.js';
// Función para mostrar el modal de Telegram
function showTelegramLogin() {
  const loginModal = document.getElementById('telegram-login-modal');
  loginModal.style.display = 'flex';
  
  const widgetContainer = document.getElementById('telegram-login-widget');
  widgetContainer.innerHTML = '';
  
  const script = document.createElement('script');
  script.async = true;
  script.src = "https://telegram.org/js/telegram-widget.js?21";
  
  // Usa variable de entorno
  script.setAttribute("data-telegram-login", "WaifuPalper_bot");
  script.setAttribute("data-size", "large");
  script.setAttribute("data-radius", "20");
  script.setAttribute("data-userpic", "false");
  script.setAttribute("data-request-access", "write");
  script.setAttribute("data-lang", "es");
 
  script.setAttribute("data-onauth", "onTelegramAuth(user)");
  
  widgetContainer.appendChild(script);
}

window.onTelegramAuth = function(user) {
  document.getElementById('telegram-login-modal').style.display = 'none';
  
  fetch('/api/auth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userId', data.userId);
      
      if (data.isNewUser) {
        showAvatarSelection();
      } else {
        fadeOutSplashScreen();
      }
    } else {
      alert(`Error: ${data.error}`);
      showTelegramLogin();
    }
  })
  .catch(error => {
    console.error('Auth error:', error);
    alert('Error de conexión con el servidor');
    showTelegramLogin();
  });
};

// Mostrar selector de avatar (solo para nuevos usuarios)
function showAvatarSelection() {
  const avatarModal = document.getElementById('avatar-selection-modal');
  if (!avatarModal) {
    fadeOutSplashScreen();
    return;
  }
  
  fetch('/api/avatars')
  .then(response => response.json())
  .then(avatars => {
    const container = document.getElementById('avatar-container');
    if (!container) {
      fadeOutSplashScreen();
      return;
    }
    
    container.innerHTML = '';
    
    avatars.forEach(avatar => {
      const img = document.createElement('img');
      img.src = avatar.url;
      img.className = 'avatar-option';
      img.dataset.id = avatar.id;
      
      img.onclick = () => {
        document.getElementById('selected-avatar').src = avatar.url;
        localStorage.setItem('selectedAvatarId', avatar.id);
      };
      
      container.appendChild(img);
    });
    
    const telegramData = JSON.parse(localStorage.getItem('telegramUser') || '{}');
    if (telegramData.first_name) {
      document.getElementById('username-display').textContent = telegramData.first_name;
    }
    
    // Configurar botón de confirmación
    document.getElementById('confirm-avatar-btn').onclick = () => {
      const avatarId = localStorage.getItem('selectedAvatarId');
      if (avatarId) {
        updateUserAvatar(avatarId);
      } else {
        alert('Por favor selecciona un avatar');
      }
    };
    
    // Mostrar el modal
    avatarModal.style.display = 'flex';
  })
  .catch(() => fadeOutSplashScreen());
}

// Actualizar solo el avatar del usuario
function updateUserAvatar(avatarId) {
  fetch('/api/user/avatar', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: JSON.stringify({ avatar: avatarId })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      localStorage.removeItem('selectedAvatarId');
      
      document.getElementById('avatar-selection-modal').style.display = 'none';
      fadeOutSplashScreen();
    }
  })
  .catch(() => fadeOutSplashScreen());
}

// Transición a la pantalla de juego
function fadeOutSplashScreen() {
    const splash = document.getElementById('splash-screen');
    splash.style.opacity = 1;
    
    // Iniciar la carga de la vista de juego ANTES de la animación
    const gameLoadPromise = loadGameView();
    
    const fadeOut = () => {
        splash.style.opacity = parseFloat(splash.style.opacity) - 0.02;
        
        if (parseFloat(splash.style.opacity) > 0) {
            requestAnimationFrame(fadeOut);
        } else {
            splash.style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';
            
            // Asegurarnos de que el juego está listo antes de mostrar
            gameLoadPromise.then(() => {
                // El juego ya está cargado, no necesitamos hacer nada más
            });
        }
    };
    
    fadeOut();
}

// Cargar vista de juego y preparar el juego
async function loadGameView() {
    try {
        // Cargar vista game.html
        const response = await fetch('views/game.html');
        const html = await response.text();
        
        // Insertar en el contenedor #app
        document.getElementById('app').innerHTML = html;
        
        // Iniciar la carga del juego ANTES de que termine la animación
        return initGame();
    } catch (error) {
        console.error('Error loading game view:', error);
        return Promise.reject(error);
    }
}

// Inicializar juego
async function initGame() {
    try {
        // Cargar datos del usuario
        const userResponse = await fetch('/api/user/me', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const userData = await userResponse.json();
        
        // Cargar personaje activo
        const charResponse = await fetch('/api/characters/active', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const charData = await charResponse.json();
        
        // Inicializar aplicación estática
        const gameApp = new StaticApp('game-container', charData, userData.user_id);
        
        // Enviar sesión pendiente al salir
        window.addEventListener('beforeunload', () => gameApp.sendPendingSession());
        
        // Devolver promesa que se resuelve cuando la imagen está cargada
        return new Promise((resolve) => {
            gameApp.characterImage.onload = resolve;
        });
        
    } catch (error) {
        console.error('Game initialization error:', error);
        return Promise.reject(error);
    }
}