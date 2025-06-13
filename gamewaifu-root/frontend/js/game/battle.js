class BattleUI {
  constructor() {
    this.actionButtons = {
      basic: document.getElementById('btn-basic'),
      defend: document.getElementById('btn-defend'),
      magicAtk: document.getElementById('btn-magic-atk'),
      buffAtk: document.getElementById('btn-buff-atk'),
      magicDef: document.getElementById('btn-magic-def'),
      buffDef: document.getElementById('btn-buff-def')
    };
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.actionButtons.basic.addEventListener('click', () => this.selectAction('BASIC_ATTACK'));
    this.actionButtons.defend.addEventListener('click', () => this.selectAction('DEFEND'));
    this.actionButtons.magicAtk.addEventListener('click', () => this.selectAction('MAGIC_ATTACK'));
    this.actionButtons.buffAtk.addEventListener('click', () => this.selectAction('BUFF_ATTACK'));
    this.actionButtons.magicDef.addEventListener('click', () => this.selectAction('MAGIC_DEFENSE'));
    this.actionButtons.buffDef.addEventListener('click', () => this.selectAction('BUFF_DEFENSE'));
  }
  
  async selectAction(action) {
    try {
      const response = await fetch('/api/battle/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ 
          battleId: this.currentBattleId,
          action 
        })
      });
      
      const result = await response.json();
      this.updateBattleState(result);
    } catch (error) {
      console.error('Action error:', error);
    }
  }
  
  updateBattleState(state) {
    // Actualizar barras de salud y magia
    document.getElementById('player-health').value = state.player.health;
    document.getElementById('player-magic').value = state.player.magic;
    document.getElementById('opponent-health').value = state.opponent.health;
    
    // Mostrar log de batalla
    const logContainer = document.getElementById('battle-log');
    state.log.forEach(event => {
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry';
      logEntry.textContent = this.formatLogEntry(event);
      logContainer.appendChild(logEntry);
    });
    
    // Scroll al final del log
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // Actualizar estado de botones
    this.updateActionButtons(state.player);
  }
  
  formatLogEntry(event) {
    const characterName = event.who === 'player' ? 'Tu personaje' : 'Oponente';
    let message = '';
    
    switch(event.action) {
      case 'BASIC_ATTACK':
        message = `${characterName} ataca causando ${event.damage} de daño`;
        if (event.isCritical) message += ' (CRÍTICO!)';
        break;
      case 'DEFEND':
        message = `${characterName} se defiende`;
        break;
      case 'MAGIC_ATTACK':
        message = `${characterName} usa ataque mágico causando ${event.damage} de daño`;
        break;
      case 'BUFF_ATTACK':
        message = `${characterName} aumenta su poder de ataque`;
        break;
      case 'MAGIC_DEFENSE':
        message = `${characterName} conjura una defensa mágica`;
        break;
      case 'BUFF_DEFENSE':
        message = `${characterName} fortalece su defensa`;
        break;
    }
    
    return message;
  }
  
  updateActionButtons(playerState) {
    const magicConfig = MagicConfig[playerState.rarity];
    
    // Deshabilitar botones si no hay magia suficiente
    this.actionButtons.magicAtk.disabled = 
      playerState.magic < Math.floor(playerState.max_magic * magicConfig.magicAttack.costPct);
    
    this.actionButtons.buffAtk.disabled = 
      playerState.magic < Math.floor(playerState.max_magic * magicConfig.buffAttack.costPct);
    
    this.actionButtons.magicDef.disabled = 
      playerState.magic < Math.floor(playerState.max_magic * magicConfig.magicDefense.costPct);
    
    this.actionButtons.buffDef.disabled = 
      playerState.magic < Math.floor(playerState.max_magic * magicConfig.buffDefense.costPct);
  }
}