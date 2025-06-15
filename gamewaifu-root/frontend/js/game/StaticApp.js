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
    
    // Primero crear áreas de clic para que estén encima
    this.createClickAreas();
    
    // Luego crear el contenedor de imagen
    this.createImageContainer();
    
    // Cargar imagen del personaje
    this.loadCharacterImage();
    
    // Configurar contador
    this.setupCounter();
    
    // Configurar temporizador de sesión máxima
    this.resetMaxSessionTimer();
  }
  
  createClickAreas() {
    // Crear contenedor para áreas de clic
    this.clickAreasContainer = document.createElement('div');
    this.clickAreasContainer.id = 'click-areas-container';
    this.clickAreasContainer.style.position = 'absolute';
    this.clickAreasContainer.style.top = '0';
    this.clickAreasContainer.style.left = '0';
    this.clickAreasContainer.style.width = '100%';
    this.clickAreasContainer.style.height = '100%';
    this.clickAreasContainer.style.zIndex = '20'; // Encima de la imagen
    this.clickAreasContainer.style.pointerEvents = 'none'; // Permite clics a través de este contenedor
    
    // Crear área izquierda
    this.leftArea = document.createElement('div');
    this.leftArea.className = 'click-area left';
    this.leftArea.style.pointerEvents = 'auto'; // Acepta clics
    
    // Crear área derecha
    this.rightArea = document.createElement('div');
    this.rightArea.className = 'click-area right';
    this.rightArea.style.pointerEvents = 'auto'; // Acepta clics
    
    // Añadir áreas al contenedor
    this.clickAreasContainer.appendChild(this.leftArea);
    this.clickAreasContainer.appendChild(this.rightArea);
    
    // Añadir contenedor al game-container
    this.container.appendChild(this.clickAreasContainer);
    
    // Configurar posición y estilo de áreas
    this.setupClickAreasPosition();
    
    // Configurar interacción de clic
    this.setupClickInteraction();
  }
  
  setupClickAreasPosition() {
    // Obtener el elemento de instrucciones para posicionar las áreas debajo
    const instructions = document.querySelector('.instructions');
    let bottomPosition = '70px';
    
    if (instructions) {
      const rect = instructions.getBoundingClientRect();
      // Posicionar las áreas de clic justo encima de las instrucciones
      bottomPosition = `${window.innerHeight - rect.top + 20}px`;
    }
    
    // Configurar áreas circulares
    const areaStyle = {
      position: 'absolute',
      bottom: bottomPosition,
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: 'rgba(255, 182, 193, 0.3)',
      boxShadow: '0 0 15px rgba(255, 105, 180, 0.5)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      zIndex: '21' // Encima del contenedor
    };
    
    // Aplicar estilos
    Object.assign(this.leftArea.style, areaStyle, {
      left: 'calc(35% - 40px)'
    });
    
    Object.assign(this.rightArea.style, areaStyle, {
      right: 'calc(35% - 40px)'
    });
  }
  
  setupClickInteraction() {
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
        console.log(`Clic registrado! Total en sesión: ${this.sessionClicks}`);
        
        // Actualizar contador provisional
        if (this.counterElement) {
          this.counterElement.textContent = parseInt(this.characterData.current_love) + this.sessionClicks;
        }
        
        // Reiniciar temporizadores
        this.resetInactivityTimer();
        this.resetMaxSessionTimer();
      };
    };
    
    this.leftArea.addEventListener('click', handleClick(this.leftArea));
    this.rightArea.addEventListener('click', handleClick(this.rightArea));
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
    effect.style.zIndex = '22';
    effect.style.pointerEvents = 'none';
    
    // Aplicar animación
    effect.style.animation = 'pulseAnimation 0.5s ease-out';
    
    document.body.appendChild(effect);
    
    // Eliminar después de la animación
    setTimeout(() => {
      effect.remove();
    }, 500);
    
    // Añadir estilo de animación si no existe
    if (!document.getElementById('pulse-animation-style')) {
      const style = document.createElement('style');
      style.id = 'pulse-animation-style';
      style.textContent = `
        @keyframes pulseAnimation {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          70% {
            transform: scale(1.3);
            opacity: 0.7;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
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
    this.imageContainer.style.zIndex = '1'; // Debajo de los círculos
    this.container.appendChild(this.imageContainer);
  }
  
  loadCharacterImage() {
    this.characterImage = document.createElement('img');
    this.characterImage.id = 'character-static-image';
    this.characterImage.style.width = '100%';
    this.characterImage.style.height = '100%';
    this.characterImage.style.objectFit = 'cover'; 
    this.characterImage.style.objectPosition = 'center top'; 
    this.characterImage.style.transform = 'scale(1.05)'; 
    this.characterImage.style.opacity = '0';
    this.characterImage.src = this.characterData.image_url || '/images/default-character.png';
    this.imageContainer.appendChild(this.characterImage);
    
    this.characterImage.onload = () => {
    const containerRatio = this.imageContainer.offsetWidth / this.imageContainer.offsetHeight;
    const imgRatio = this.characterImage.naturalWidth / this.characterImage.naturalHeight;
    
    // Ajustar zoom según relación de aspecto
    if (imgRatio > containerRatio) {
        this.characterImage.style.transform = 'scale(1.05)';
    } else {
        this.characterImage.style.transform = 'scale(1.1)';
    }
    };

    // Mostrar progresivamente
    setTimeout(() => {
      this.characterImage.style.transition = 'opacity 0.5s ease';
      this.characterImage.style.opacity = '1';
    }, 50);

    this.characterImage.onerror = () => {
      console.error('Error cargando imagen, usando imagen por defecto');
      this.characterImage.src = '/images/default-character.png';
    };
  }
  
  setupCounter() {
    this.counterElement = document.getElementById('total-counter');
    if (this.counterElement) {
      this.counterElement.textContent = this.characterData.current_love || '0';
    } else {
      console.warn('Elemento contador no encontrado');
    }
  }
  
  resetInactivityTimer() {
    if (this.sessionTimer) clearTimeout(this.sessionTimer);
    this.sessionTimer = setTimeout(() => {
      if (this.sessionClicks > 0) {
        console.log('Enviando sesión por inactividad');
        this.sendClickSession();
      }
    }, this.sessionDelay);
  }
  
  resetMaxSessionTimer() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.sessionStartTime = Date.now();
    this.inactivityTimer = setTimeout(() => {
      if (this.sessionClicks > 0) {
        console.log('Enviando sesión por tiempo máximo');
        this.sendClickSession();
      }
    }, this.maxSessionTime);
  }
  
  sendClickSession() {
    if (this.sessionClicks === 0) return;
    
    console.log(`Enviando sesión al servidor: ${this.sessionClicks} clics`);
    
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
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      console.log('Respuesta del servidor:', data);
      
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
      console.log('Enviando sesión pendiente al salir');
      this.sendClickSession();
    }
  }
}

export default StaticApp;