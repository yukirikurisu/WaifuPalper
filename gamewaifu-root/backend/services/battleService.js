const db = require('../db/connection');
const { HTTPException } = require('../errors/HTTPException');

const MagicConfig = {
  blue: {
    magicAttack:  { dmgMult: 1.07, costPct: 0.5 },
    buffAttack:   { buffPct: 0.02, costPct: 0.25 },
    magicDefense: { mitPct: 0.10, costPct: 0.5 },
    buffDefense:  { mitPct: 0.02, costPct: 0.25 }
  },
  purple: {
    magicAttack:  { dmgMult: 1.12, costPct: 0.5 },
    buffAttack:   { buffPct: 0.05, costPct: 0.25 },
    magicDefense: { mitPct: 0.15, costPct: 0.5 },
    buffDefense:  { mitPct: 0.05, costPct: 0.25 }
  },
  golden: {
    magicAttack:  { dmgMult: 1.20, costPct: 0.5 },
    buffAttack:   { buffPct: 0.08, costPct: 0.25 },
    magicDefense: { mitPct: 0.20, costPct: 0.5 },
    buffDefense:  { mitPct: 0.08, costPct: 0.25 }
  }
};

class BattleService {
  ACTIONS = {
    BASIC: 'BASIC_ATTACK',
    DEFEND: 'DEFEND',
    M_ATK: 'MAGIC_ATTACK',
    B_ATK: 'BUFF_ATTACK',
    M_DEF: 'MAGIC_DEFENSE',
    B_DEF: 'BUFF_DEFENSE'
  }

  determineInitiative(a, b) {
    const speedDiff = a.speed - b.speed;
    const baseChance = 0.5;
    const speedBonus = Math.min(Math.max(speedDiff * 0.1, -0.4), 0.4);
    const chance = baseChance + speedBonus;
    return Math.random() < chance ? a : b;
  }

  getMagicParams(rarity, action) {
    const cfg = MagicConfig[rarity];
    if (!cfg) throw new HTTPException(400, 'Rareza inválida');
    return cfg[action];
  }

  calculateDamage(attacker, defender) {
    const baseDamage = attacker.attack - (defender.defense * 0.5);
    const critChance = attacker.crit_probability / 100;
    const isCritical = Math.random() < critChance;
    
    const damage = Math.max(1, Math.floor(
      isCritical
        ? baseDamage * (1 + attacker.crit_damage / 100)
        : baseDamage
    ));
    
    return { damage, isCritical };
  }

  resolveAction(state, actor, opponent, choice) {
    const result = { damage: 0, isCritical: false };
    
    switch (choice) {
      case this.ACTIONS.BASIC:
        const basicResult = this.calculateDamage(actor, opponent);
        result.damage = basicResult.damage;
        result.isCritical = basicResult.isCritical;
        
        // Aplicar buff de ataque si existe
        if (state.buffs[actor.id]?.atkPct) {
          result.damage = Math.floor(result.damage * (1 + state.buffs[actor.id].atkPct));
        }
        break;

      case this.ACTIONS.DEFEND:
        state.buffs[actor.id] = state.buffs[actor.id] || {};
        state.buffs[actor.id].isDefending = true;
        return result;

      case this.ACTIONS.M_ATK: {
        const { dmgMult, costPct } = this.getMagicParams(actor.rarity, 'magicAttack');
        const cost = Math.floor(actor.max_magic * costPct);
        
        if (actor.current_magic < cost) {
          throw new HTTPException(400, 'Magia insuficiente');
        }
        
        actor.current_magic -= cost;
        const baseResult = this.calculateDamage(actor, opponent);
        result.damage = Math.floor(baseResult.damage * dmgMult);
        result.isCritical = baseResult.isCritical;
        break;
      }

      case this.ACTIONS.B_ATK: {
        const { buffPct, costPct } = this.getMagicParams(actor.rarity, 'buffAttack');
        const cost = Math.floor(actor.max_magic * costPct);
        
        if (actor.current_magic < cost) {
          throw new HTTPException(400, 'Magia insuficiente');
        }
        
        actor.current_magic -= cost;
        state.buffs[actor.id] = state.buffs[actor.id] || {};
        state.buffs[actor.id].atkPct = (state.buffs[actor.id].atkPct || 0) + buffPct;
        return result;
      }

      case this.ACTIONS.M_DEF: {
        const { mitPct, costPct } = this.getMagicParams(actor.rarity, 'magicDefense');
        const cost = Math.floor(actor.max_magic * costPct);
        
        if (actor.current_magic < cost) {
          throw new HTTPException(400, 'Magia insuficiente');
        }
        
        actor.current_magic -= cost;
        state.buffs[actor.id] = state.buffs[actor.id] || {};
        state.buffs[actor.id].defPct = mitPct;
        return result;
      }

      case this.ACTIONS.B_DEF: {
        const { mitPct, costPct } = this.getMagicParams(actor.rarity, 'buffDefense');
        const cost = Math.floor(actor.max_magic * costPct);
        
        if (actor.current_magic < cost) {
          throw new HTTPException(400, 'Magia insuficiente');
        }
        
        actor.current_magic -= cost;
        state.buffs[actor.id] = state.buffs[actor.id] || {};
        state.buffs[actor.id].defPct = (state.buffs[actor.id].defPct || 0) + mitPct;
        return result;
      }
    }
    
    return result;
  }

  executeTurn(a, b, choiceA, choiceB) {
    const state = {
      buffs: {},
      log: []
    };
    
    const [first, second] = this.determineInitiative(a, b) === a ? [a, b] : [b, a];
    const firstChoice = first === a ? choiceA : choiceB;
    const secondChoice = second === a ? choiceA : choiceB;
    
    // Acción del primer jugador
    const res1 = this.resolveAction(state, first, second, firstChoice);
    if (res1.damage > 0) {
      let damage = res1.damage;
      const secondBuffs = state.buffs[second.id] || {};
      
      // Aplicar defensa mágica
      if (secondBuffs.defPct) {
        damage = Math.floor(damage * (1 - secondBuffs.defPct));
      }
      
      // Aplicar defensa básica
      if (secondBuffs.isDefending) {
        damage = Math.floor(damage / 2);
      }
      
      second.current_health = Math.max(0, second.current_health - damage);
      state.log.push({
        who: first.id,
        action: firstChoice,
        damage,
        isCrit: res1.isCritical
      });
    }
    
    // Acción del segundo jugador (si sigue vivo)
    if (second.current_health > 0) {
      const res2 = this.resolveAction(state, second, first, secondChoice);
      if (res2.damage > 0) {
        let damage = res2.damage;
        const firstBuffs = state.buffs[first.id] || {};
        
        if (firstBuffs.defPct) {
          damage = Math.floor(damage * (1 - firstBuffs.defPct));
        }
        
        if (firstBuffs.isDefending) {
          damage = Math.floor(damage / 2);
        }
        
        first.current_health = Math.max(0, first.current_health - damage);
        state.log.push({
          who: second.id,
          action: secondChoice,
          damage,
          isCrit: res2.isCritical
        });
      }
    }
    
    // Resetear defensa básica
    if (state.buffs[a.id]) state.buffs[a.id].isDefending = false;
    if (state.buffs[b.id]) state.buffs[b.id].isDefending = false;
    
    return {
      health: { [a.id]: a.current_health, [b.id]: b.current_health },
      magic: { [a.id]: a.current_magic, [b.id]: b.current_magic },
      buffs: state.buffs,
      log: state.log
    };
  }

  async executeBattle(attackerId, defenderId) {
    return db.runInTransaction(async (client) => {
      // Obtener datos completos de los personajes
      const attackerQuery = await client.query(
        `SELECT uc.*, c.rarity 
         FROM user_characters uc
         JOIN characters c ON uc.character_id = c.character_id
         WHERE uc.user_character_id = $1`,
        [attackerId]
      );
      
      const defenderQuery = await client.query(
        `SELECT uc.*, c.rarity 
         FROM user_characters uc
         JOIN characters c ON uc.character_id = c.character_id
         WHERE uc.user_character_id = $1`,
        [defenderId]
      );
      
      if (attackerQuery.rowCount === 0 || defenderQuery.rowCount === 0) {
        throw new HTTPException(404, 'Combatiente no encontrado');
      }
      
      let attacker = attackerQuery.rows[0];
      let defender = defenderQuery.rows[0];
      
      // Verificar salud
      if (attacker.current_health <= 0) {
        throw new HTTPException(400, 'El atacante no tiene salud');
      }
      
      if (defender.current_health <= 0) {
        throw new HTTPException(400, 'El defensor no tiene salud');
      }
      
      // Clonar objetos para trabajar sin modificar DB directamente
      const a = { ...attacker, id: attacker.user_character_id };
      const b = { ...defender, id: defender.user_character_id };
      
      const battleLog = [];
      let winner = null;
      let turn = 0;
      
      // Máximo 10 turnos
      while (turn < 10 && a.current_health > 0 && b.current_health > 0) {
        turn++;
        
        // En un caso real, las elecciones vendrían de los jugadores
        const choiceA = this.ACTIONS.BASIC;
        const choiceB = this.ACTIONS.BASIC;
        
        const turnResult = this.executeTurn(a, b, choiceA, choiceB);
        battleLog.push({
          turn,
          actions: turnResult.log,
          health: turnResult.health,
          magic: turnResult.magic,
          buffs: turnResult.buffs
        });
        
        // Verificar si hay ganador
        if (a.current_health <= 0) winner = b.id;
        if (b.current_health <= 0) winner = a.id;
      }
      
      // Determinar ganador si no hubo KO
      if (!winner) {
        winner = a.current_health > b.current_health ? a.id : 
                 b.current_health > a.current_health ? b.id : null;
      }
      
      // Registrar batalla en la base de datos
      const battleRecord = await client.query(
        `INSERT INTO battles (
          attacker_id,
          defender_id,
          winner_id,
          turns,
          battle_log
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING battle_id`,
        [
          attackerId,
          defenderId,
          winner,
          turn,
          JSON.stringify(battleLog)
        ]
      );
      
      // Actualizar salud y magia en la base de datos
      await client.query(
        `UPDATE user_characters 
         SET current_health = $1, current_magic = $2
         WHERE user_character_id = $3`,
        [a.current_health, a.current_magic, attackerId]
      );
      
      await client.query(
        `UPDATE user_characters 
         SET current_health = $1, current_magic = $2
         WHERE user_character_id = $3`,
        [b.current_health, b.current_magic, defenderId]
      );
      
      return {
        battleId: battleRecord.rows[0].battle_id,
        winner,
        turns: turn,
        log: battleLog
      };
    });
  }
}

module.exports = new BattleService();