class StaticApp {
  constructor(containerId, characterData, userId) {
    this.containerId = containerId || 'character-container';
    this.characterData = characterData || {};
    this.userId = userId || '';
    this.sessionClicks = 0;
    this.sessionTimer = null;
    this.inactivityTimer = null;
    this.lastClickTime = 0;
    this.sessionDelay = 5000; // 5s de inactividad
    this.maxSessionTime = 60000; // 60s máximo por sesión
    this.sessionStartTime = 0;
    
    if (document.readyState === 'complete') {
      this.init();
    } else {
      document.addEventListener('DOMContentLoaded', this.init.bind(this));
    }
  }
  
  init() {
    this.container = document.getElementById(this.containerId);
    
    if (!this.container) {
      console.error(`Contenedor '${this.containerId}' no encontrado`);
      return;
    }
    
    // Configurar contador
    this.setupCounter();
    
    // Crear estructura de imagen
    this.createImageContainer();
    
    // Cargar imagen del personaje
    this.loadCharacterImage();
    
    // Configurar interacción de clic
    this.setupClickInteraction();
    
    // Configurar temporizador de sesión máxima
    this.resetMaxSessionTimer();
  }
  
  setupCounter() {
    this.counterElement = document.getElementById('total-counter');
    if (this.counterElement) {
      this.counterElement.textContent = this.characterData.current_love || '0';
    } else {
      console.warn('Elemento contador no encontrado');
    }
  }
  
  createImageContainer() {
    this.imageContainer = document.createElement('div');
    this.imageContainer.id = 'character-image-container';
    this.imageContainer.style.position = 'absolute';
    this.imageContainer.style.top = '0';
    this.imageContainer.style.left = '0';
    this.imageContainer.style.width = '100%';
    this.imageContainer.style.height = '100%';
    this.imageContainer.style.overflow = 'hidden';
    this.imageContainer.style.zIndex = '1';
    this.container.appendChild(this.imageContainer);
  }
  
  loadCharacterImage() {
    this.characterImage = document.createElement('img');
    this.characterImage.id = 'character-static-image';
    this.characterImage.style.width = '100%';
    this.characterImage.style.height = '100%';
    this.characterImage.style.objectFit = 'cover';
    this.characterImage.style.objectPosition = 'center';
    this.characterImage.style.transition = 'transform 0.2s ease';
    this.characterImage.style.opacity = '0';
    this.characterImage.src = this.characterData.image_url || '/images/default-character.png';
    this.imageContainer.appendChild(this.characterImage);
    
    this.characterImage.onload = () => {
      // Ajustar para móviles
      if (window.innerWidth <= 768) {
        this.characterImage.style.objectFit = 'contain';
        this.characterImage.style.transform = 'scale(1.2)';
      }
      
      // Mostrar progresivamente
      setTimeout(() => {
        this.characterImage.style.transition = 'opacity 0.5s ease';
        this.characterImage.style.opacity = '1';
      }, 50);
    };

    this.characterImage.onerror = () => {
      console.error('Error cargando imagen, usando imagen por defecto');
      this.characterImage.src = '/images/default-character.png';
    };
  }
  
  setupClickInteraction() {
    const leftArea = document.querySelector('.click-area.left');
    const rightArea = document.querySelector('.click-area.right');
    
    if (!leftArea || !rightArea) {
      console.error('Áreas de clic no encontradas');
      return;
    }
    
    // Configurar posición y tamaño de las áreas circulares
    this.setupClickAreasPosition(leftArea, rightArea);
    
    const handleClick = (area) => {
      return () => {
        const now = Date.now();
        
        // Prevenir clics demasiado rápidos (menos de 200ms)
        if (now - this.lastClickTime < 200) {
          return;
        }
        
        this.lastClickTime = now;
        
        // Crear efecto de pulso en el área de clic
        this.createPulseEffect(area);
        
        // Incrementar contador
        this.sessionClicks++;
        
        // Actualizar contador provisional
        if (this.counterElement) {
          this.counterElement.textContent = parseInt(this.characterData.current_love) + this.sessionClicks;
        }
        
        // Reiniciar temporizadores
        this.resetInactivityTimer();
        this.resetMaxSessionTimer();
      };
    };
    
    leftArea.addEventListener('click', handleClick(leftArea));
    rightArea.addEventListener('click', handleClick(rightArea));
  }
  
  setupClickAreasPosition(leftArea, rightArea) {
    // Obtener el elemento de instrucciones para posicionar las áreas debajo
    const instructions = document.querySelector('.instructions');
    if (instructions) {
      const rect = instructions.getBoundingClientRect();
      
      // Posicionar las áreas de clic justo encima de las instrucciones
      const bottomPosition = window.innerHeight - rect.top + 20;
      
      leftArea.style.bottom = `${bottomPosition}px`;
      rightArea.style.bottom = `${bottomPosition}px`;
    }
    
    // Establecer propiedades de círculo
    leftArea.style.borderRadius = '50%';
    rightArea.style.borderRadius = '50%';
    leftArea.style.width = '80px';
    leftArea.style.height = '80px';
    rightArea.style.width = '80px';
    rightArea.style.height = '80px';
    leftArea.style.background = 'rgba(255, 182, 193, 0.3)';
    rightArea.style.background = 'rgba(255, 182, 193, 0.3)';
    leftArea.style.boxShadow = '0 0 15px rgba(255, 105, 180, 0.5)';
    rightArea.style.boxShadow = '0 0 15px rgba(255, 105, 180, 0.5)';
    leftArea.style.transition = 'all 0.3s ease';
    rightArea.style.transition = 'all 0.3s ease';
    
    // Posicionar horizontalmente
    leftArea.style.left = 'calc(35% - 40px)';
    rightArea.style.right = 'calc(35% - 40px)';
  }
  
  createPulseEffect(area) {
    // Crear elemento para el efecto visual
    const effect = document.createElement('div');
    effect.className = 'pulse-effect';
    
    // Copiar posición y tamaño del área de clic
    const rect = area.getBoundingClientRect();
    effect.style.position = 'absolute';
    effect.style.left = `${rect.left}px`;
    effect.style.top = `${rect.top}px`;
    effect.style.width = `${rect.width}px`;
    effect.style.height = `${rect.height}px`;
    effect.style.borderRadius = '50%';
    effect.style.backgroundColor = 'rgba(255, 105, 180, 0.3)';
    effect.style.zIndex = '16';
    effect.style.pointerEvents = 'none';
    
    // Aplicar animación
    effect.style.animation = 'pulseAnimation 0.5s ease-out';
    
    document.body.appendChild(effect);
    
    // Eliminar después de la animación
    setTimeout(() => {
      effect.remove();
    }, 500);
  }
  
  resetInactivityTimer() {
    if (this.sessionTimer) clearTimeout(this.sessionTimer);
    this.sessionTimer = setTimeout(() => {
      if (this.sessionClicks > 0) this.sendClickSession();
    }, this.sessionDelay);
  }
  
  resetMaxSessionTimer() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.sessionStartTime = Date.now();
    this.inactivityTimer = setTimeout(() => {
      if (this.sessionClicks > 0) this.sendClickSession();
    }, this.maxSessionTime);
  }
  
  sendClickSession() {
    if (this.sessionClicks === 0) return;
    
    const sessionData = {
      userId: this.userId,
      characterId: this.characterData.user_character_id,
      clickCount: this.sessionClicks
    };
    
    fetch('/api/clicks/sessions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(sessionData)
    })
    .then(response => {
      if (!response.ok) throw new Error('Error en la respuesta del servidor');
      return response.json();
    })
    .then(data => {
      // Actualizar amor
      this.characterData.current_love = data.newLove;
      if (this.counterElement) {
        this.counterElement.textContent = data.newLove;
      }
      
      // Mostrar advertencia si está resentido
      if (data.isResentful) {
        this.showResentmentWarning();
      }
      
      // Reiniciar contador de sesión
      this.sessionClicks = 0;
      
      // Reiniciar temporizador de sesión máxima
      this.resetMaxSessionTimer();
    })
    .catch(error => {
      console.error('Error sending click session:', error);
      // Reintentar después de 2 segundos
      setTimeout(() => this.sendClickSession(), 2000);
    });
  }
  
  showResentmentWarning() {
    // Crear notificación visual
    const warning = document.createElement('div');
    warning.textContent = '¡Personaje resentido! Amor reducido';
    warning.style.position = 'absolute';
    warning.style.bottom = '120px';
    warning.style.left = '0';
    warning.style.width = '100%';
    warning.style.textAlign = 'center';
    warning.style.color = '#ff6b6b';
    warning.style.fontWeight = 'bold';
    warning.style.fontSize = '1.2rem';
    warning.style.zIndex = '30';
    warning.style.animation = 'fadeInOut 3s ease';
    document.querySelector('.game-container').appendChild(warning);
    
    // Añadir estilo de animación si no existe
    if (!document.getElementById('fade-animation-style')) {
      const style = document.createElement('style');
      style.id = 'fade-animation-style';
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(20px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
      warning.remove();
    }, 3000);
  }
  
  // Método para enviar sesión pendiente al salir
  sendPendingSession() {
    if (this.sessionClicks > 0) {
      this.sendClickSession();
    }
  }
}

export default StaticApp;