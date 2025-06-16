export function showTelegramLogin() {
  const loginModal = document.getElementById('telegram-login-modal');
  if (!loginModal) return;
  
  loginModal.style.display = 'flex';
  
  const widgetContainer = document.getElementById('telegram-login-widget');
  widgetContainer.innerHTML = '';
  
  const script = document.createElement('script');
  script.async = true;
  script.src = "https://telegram.org/js/telegram-widget.js?21";
  
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
      localStorage.setItem('telegramUser', JSON.stringify(user));
      
      if (data.isNewUser) {
        showAvatarSelection();
      } else {
        // Ir directamente al juego
        window.navigate('/game');
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

function showAvatarSelection() {
  const avatarModal = document.getElementById('avatar-selection-modal');
  if (!avatarModal) return window.navigate('/game');
  
  fetch('/api/avatars', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
  })
  .then(async response => {
    if (!response.ok) throw new Error(`Status ${response.status}`);
    return response.json();
  })
  .then(avatars => {
    if (!Array.isArray(avatars) || avatars.length === 0) {
      alert('No hay avatares disponibles');
      return window.navigate('/game');
    }

    const container = document.getElementById('avatar-container');
    if (!container) return window.navigate('/game');
    container.innerHTML = '';

    avatars.forEach((avatar, i) => {
      const img = document.createElement('img');
      img.src = avatar.url;
      img.className = 'avatar-option';
      img.dataset.id = avatar.id;
      img.addEventListener('click', () => {
        document.querySelectorAll('.avatar-option.selected')
          .forEach(el => el.classList.remove('selected'));
        img.classList.add('selected');
        document.getElementById('selected-avatar').src = avatar.url;
        localStorage.setItem('selectedAvatarId', avatar.id);
      });
      container.appendChild(img);

      // auto‑seleccionar el primero
      if (i === 0 && !localStorage.getItem('selectedAvatarId')) {
        img.click();
      }
    });

    // Nombre telegram
    const telegramData = JSON.parse(localStorage.getItem('telegramUser') || '{}');
    if (telegramData.first_name) {
      document.getElementById('username-display').textContent = telegramData.first_name;
    }

    // Botón Aceptar
    document.getElementById('confirm-avatar-btn').onclick = () => {
      const avatarId = localStorage.getItem('selectedAvatarId');
      if (avatarId) updateUserAvatar(avatarId);
      else alert('Por favor selecciona un avatar');
    };

    avatarModal.style.display = 'flex';
  })
  .catch(err => {
    console.error('Error cargando avatares:', err);
    alert('No se pudieron cargar los avatares');
    window.navigate('/game');
  });
}


async function updateUserAvatar(avatarId) {
  const btn = document.getElementById('confirm-avatar-btn');
  const modal = document.getElementById('avatar-selection-modal');
  btn.disabled = true;

  try {
    const res = await fetch('/api/user/avatar', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({ avatar: avatarId })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Error ${res.status} actualizando avatar`);
    }

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'No se pudo guardar el avatar');
    }

    localStorage.removeItem('selectedAvatarId');
    modal.style.display = 'none';

    window.navigate('/game');

  } catch (err) {
    console.error('Error updating avatar:', err);
    alert(err.message || 'Error de conexión con el servidor');
  } finally {
    btn.disabled = false;
  }
}
