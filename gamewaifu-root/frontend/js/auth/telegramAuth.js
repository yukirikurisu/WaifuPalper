const { botToken } = require('../config/config');

// Función para mostrar el modal de Telegram
function showTelegramLogin() {
  const loginModal = document.getElementById('telegram-login-modal');
  loginModal.style.display = 'flex';
  
  // Limpiar widget existente
  const widgetContainer = document.getElementById('telegram-login-widget');
  widgetContainer.innerHTML = '';
  
  // Crear script de Telegram solo si no existe
  if (!document.getElementById('telegram-widget-script')) {
    const script = document.createElement('script');
    script.id = 'telegram-widget-script';
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?21";
    script.setAttribute("data-telegram-login", "WaifuPalper_bot");
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "20");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-lang", "es");
    script.setAttribute("data-auth-url", window.location.origin + "/api/auth/telegram");
    widgetContainer.appendChild(script);
  }
}

// Evento para cerrar el modal
document.getElementById('close-login-modal').addEventListener('click', function() {
  document.getElementById('telegram-login-modal').style.display = 'none';
});

// Evento para el botón CONTINUAR
document.querySelector('.continue-btn').addEventListener('click', showTelegramLogin);

// Función de autenticación (debe ser global)
window.onTelegramAuth = function(user) {
  fetch('/api/auth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      localStorage.setItem('authToken', data.token);
      document.getElementById('telegram-login-modal').style.display = 'none';
      
      if (data.isNewUser) {
        showAvatarSelection();
      } else {
        fadeOutSplashScreen();
      }
    } else {
      alert(`Error: ${data.error}`);
    }
  })
  .catch(error => {
    console.error('Auth error:', error);
    alert('Error de conexión con el servidor');
  });
};
// Mostrar selector de avatar
function showAvatarSelection() {
    fetch('/api/avatars')
    .then(response => response.json())
    .then(avatars => {
        const container = document.getElementById('avatar-container');
        container.innerHTML = '';
        
        avatars.forEach(avatar => {
            const img = document.createElement('img');
            img.src = avatar.url;
            img.className = 'avatar-option';
            img.onclick = () => selectAvatar(avatar.id);
            container.appendChild(img);
        });
        
        document.getElementById('avatar-selection-modal').style.display = 'flex';
    });
}

// Seleccionar avatar
function selectAvatar(avatarId) {
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
            document.getElementById('avatar-selection-modal').style.display = 'none';
            fadeOutSplashScreen();
        }
    });
}

// Transición a la pantalla de juego
function fadeOutSplashScreen() {
    const splash = document.getElementById('splash-screen');
    splash.style.opacity = 1;
    
    const fadeOut = () => {
        splash.style.opacity = parseFloat(splash.style.opacity) - 0.02;
        
        if (parseFloat(splash.style.opacity) > 0) {
            requestAnimationFrame(fadeOut);
        } else {
            splash.style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';
            initGame();
        }
    };
    
    fadeOut();
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
        
        // Inicializar Three.js
        const gameApp = new ThreeApp('game-container');
        
        // Configurar escena según el personaje
        gameApp.setCharacter(charData.glbModelUrl, charData.animationProperties);
        
        // Iniciar loop de juego
        gameApp.startGameLoop();
        
    } catch (error) {
        console.error('Game initialization error:', error);
    }
}


