export default class StaticApp {
    constructor(containerId, characterData, userId) {
        this.container = document.getElementById(containerId);
        this.characterData = characterData;
        this.userId = userId;
        this.sessionClicks = 0;
        this.sessionTimer = null;
        this.sessionDelay = 5000; // 5 segundos para enviar sesiones
        this.init();
    }
    
    init() {
        // Crear estructura de imagen
        this.createImageContainer();
        
        // Cargar imagen del personaje
        this.loadCharacterImage();
        
        // Configurar interacción de clic
        this.setupClickInteraction();
        
        // Referenciar contador
        this.counterElement = document.getElementById('total-counter');
        if (this.counterElement) {
            this.counterElement.textContent = this.characterData.current_love;
        } else {
            console.error('Elemento contador no encontrado');
        }
    }
    
    createImageContainer() {
        // Crear contenedor para la imagen
        this.imageContainer = document.createElement('div');
        this.imageContainer.id = 'character-image-container';
        this.imageContainer.style.position = 'absolute';
        this.imageContainer.style.top = '0';
        this.imageContainer.style.left = '0';
        this.imageContainer.style.width = '100%';
        this.imageContainer.style.height = '100%';
        this.imageContainer.style.overflow = 'hidden';
        this.imageContainer.style.zIndex = '1';
        
        // Insertar en el contenedor del juego
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
        this.characterImage.style.opacity = '0'; // Inicialmente invisible

        // Usar imagen por defecto si no hay URL
        if (!this.characterData.image_url) {
            this.characterData.image_url = '/images/default-character.png';
        }
        this.characterImage.src = this.characterData.image_url;
        this.imageContainer.appendChild(this.characterImage);
        
        this.characterImage.onload = () => {
            // Ajustar zoom para móviles
            if (window.innerWidth <= 768) {
                this.characterImage.style.objectFit = 'contain';
                this.characterImage.style.transform = 'scale(1.2)';
            }
            
            // Hacer visible la imagen con transición suave
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
        
        const handleClick = () => {
            // Animación de reacción
            this.characterImage.style.transform = 'scale(1.05)';
            setTimeout(() => {
                this.characterImage.style.transform = window.innerWidth <= 768 ? 'scale(1.2)' : 'scale(1)';
            }, 200);
            
            // Incrementar contador de sesión
            this.sessionClicks++;
            
            // Mostrar contador provisional (amor actual + clics en sesión)
            if (this.counterElement) {
                this.counterElement.textContent = parseInt(this.characterData.current_love) + this.sessionClicks;
            }
            
            // Reiniciar el temporizador de sesión
            this.resetSessionTimer();
        };
        
        leftArea.addEventListener('click', handleClick);
        rightArea.addEventListener('click', handleClick);
    }
    
    resetSessionTimer() {
        // Cancelar temporizador existente
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        
        // Iniciar nuevo temporizador
        this.sessionTimer = setTimeout(() => {
            if (this.sessionClicks > 0) {
                this.sendClickSession();
            }
        }, this.sessionDelay);
    }
    
    sendClickSession() {
        if (this.sessionClicks === 0) return;
        
        const sessionData = {
            userId: this.userId,
            characterId: this.characterData.user_character_id, // Usar user_character_id
            clickCount: this.sessionClicks
        };
        
        fetch('/api/click-sessions', {
            method: 'POST',
            headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(sessionData)
        })
        .then(response => {
            if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
            }
            return response.json();
        })
        .then(data => {
            // Actualizar amor del personaje con la respuesta
            this.characterData.current_love = data.newLove;
            if (this.counterElement) {
            this.counterElement.textContent = data.newLove;
            }
            
            // Si el personaje está resentido, mostrar notificación
            if (data.isResentful) {
            this.showResentmentWarning();
            }
            
            // Reiniciar contador de sesión
            this.sessionClicks = 0;
        })
        .catch(error => {
            console.error('Error sending click session:', error);
            // Reintentar en caso de error
            this.sessionTimer = setTimeout(() => this.sendClickSession(), 2000);
        });
        }

    showResentmentWarning() {
        console.warn('¡Personaje resentido! El amor ganado se reduce al 10%');
    }
    
    sendPendingSession() {
        if (this.sessionClicks > 0) {
            this.sendClickSession();
        }
    }
}