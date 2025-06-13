class CharacterManager {
    constructor(threeApp) {
        this.threeApp = threeApp;
        this.currentCharacter = null;
        this.healthBar = null;
        this.consumableCooldowns = {};
        
        this.initHealthBar();
        this.setupConsumableListeners();
    }

    initHealthBar() {
        // Crear UI para la barra de salud
        this.healthBar = document.createElement('div');
        this.healthBar.id = 'health-bar';
        this.healthBar.innerHTML = `
            <div class="health-bar-container">
                <div class="health-bar-fill"></div>
                <div class="health-bar-text">100/100</div>
            </div>
        `;
        document.getElementById('ui-container').appendChild(this.healthBar);
    }

    async loadCharacter(characterData) {
        this.currentCharacter = characterData;
        
        // Cargar modelo 3D
        await this.threeApp.loadCharacterModel(
            characterData.glb_model_url,
            characterData.animation_properties
        );
        
        // Actualizar UI
        this.updateHealthBar(
            characterData.current_health,
            characterData.max_health
        );
        
        // Iniciar regeneración pasiva
        this.startPassiveRegeneration();
    }

    updateHealthBar(current, max) {
        const fill = document.querySelector('.health-bar-fill');
        const text = document.querySelector('.health-bar-text');
        
        const percentage = Math.max(0, (current / max) * 100);
        fill.style.width = `${percentage}%`;
        text.textContent = `${current}/${max}`;
        
        // Cambiar color según la salud
        if (percentage < 20) fill.style.backgroundColor = '#ff0000';
        else if (percentage < 50) fill.style.backgroundColor = '#ff9900';
        else fill.style.backgroundColor = '#00ff00';
    }

    startPassiveRegeneration() {
        // Regenerar cada 5 minutos
        this.regenerationInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/health/regenerate/${this.currentCharacter.user_character_id}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
                
                const result = await response.json();
                if (result.regenerated > 0) {
                    this.currentCharacter.current_health += result.regenerated;
                    this.updateHealthBar(
                        this.currentCharacter.current_health,
                        this.currentCharacter.max_health
                    );
                    
                    // Mostrar efecto visual
                    this.showHealingEffect(result.regenerated);
                }
            } catch (error) {
                console.error('Regeneration error:', error);
            }
        }, 5 * 60 * 1000); // 5 minutos
    }

    showHealingEffect(amount) {
        // Mostrar flotante de curación
        const healText = document.createElement('div');
        healText.className = 'healing-text';
        healText.textContent = `+${amount} HP`;
        healText.style.left = `${Math.random() * 50 + 25}%`;
        
        document.getElementById('ui-container').appendChild(healText);
        
        // Animación
        setTimeout(() => {
            healText.style.opacity = '0';
            healText.style.transform = 'translateY(-50px)';
        }, 100);
        
        // Eliminar después de la animación
        setTimeout(() => {
            healText.remove();
        }, 2000);
    }

    setupConsumableListeners() {
        document.querySelectorAll('.consumable-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const consumableId = btn.dataset.consumableId;
                
                if (this.consumableCooldowns[consumableId]) {
                    alert('Este consumible está en cooldown');
                    return;
                }
                
                try {
                    const response = await fetch('/api/health/use-consumable', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                        },
                        body: JSON.stringify({
                            characterId: this.currentCharacter.user_character_id,
                            consumableId
                        })
                    });
                    
                    const result = await response.json();
                    this.currentCharacter.current_health += result.healthRestored;
                    
                    this.updateHealthBar(
                        this.currentCharacter.current_health,
                        this.currentCharacter.max_health
                    );
                    
                    // Mostrar efecto
                    this.showHealingEffect(result.healthRestored);
                    
                    // Establecer cooldown
                    this.setConsumableCooldown(consumableId, 30); // 30 segundos
                    
                } catch (error) {
                    console.error('Use consumable error:', error);
                }
            });
        });
    }

    setConsumableCooldown(consumableId, seconds) {
        this.consumableCooldowns[consumableId] = true;
        
        const btn = document.querySelector(`.consumable-btn[data-consumable-id="${consumableId}"]`);
        const originalText = btn.textContent;
        let remaining = seconds;
        
        btn.textContent = `${remaining}s`;
        btn.disabled = true;
        
        const countdown = setInterval(() => {
            remaining--;
            
            if (remaining <= 0) {
                clearInterval(countdown);
                this.consumableCooldowns[consumableId] = false;
                btn.textContent = originalText;
                btn.disabled = false;
            } else {
                btn.textContent = `${remaining}s`;
            }
        }, 1000);
    }

    async takeDamage(damage) {
        // Animación de daño
        this.threeApp.playAnimation('hit');
        this.threeApp.shakeCamera(0.5);
        
        // Actualizar salud
        this.currentCharacter.current_health = Math.max(
            0,
            this.currentCharacter.current_health - damage
        );
        
        this.updateHealthBar(
            this.currentCharacter.current_health,
            this.currentCharacter.max_health
        );
        
        // Mostrar flotante de daño
        this.showDamageEffect(damage);
        
        // Verificar derrota
        if (this.currentCharacter.current_health <= 0) {
            this.handleDefeat();
        }
    }

    showDamageEffect(damage) {
        // Similar a showHealingEffect pero en rojo
    }

    handleDefeat() {
        // Animación de derrota
        this.threeApp.playAnimation('defeat');
        
        // Mostrar UI de derrota
        document.getElementById('defeat-screen').style.display = 'block';
        
        // Deshabilitar controles
        this.threeApp.disableControls();
    }
}

export default CharacterManager;