import Dexie from 'dexie';

export class NodeWarsDB extends Dexie {
  pois;
  game;
  enemies;

  constructor() {
    super('NodeWarsDB');
    // Versión única (dev/pre-alpha): definir todas las tablas aquí
    this.version(1).stores({
      pois: 'id, lat, lng, type, category, name, health, maxHealth, owned, resourceAmount, resourceCapacity, productionRate, lastProducedAt, radarActive, conqueredFrom, color, barrackAutoAttackLevel, barrackAutoHealLevel, barrackNodesLevel, barrackRadarRadius',
      game: 'key',
      enemies: 'id'
    });
  }
}

export const db = new NodeWarsDB();

export const wipeDatabase = async () => {
  try {
    await db.delete();
  } catch (error) {
    console.error('Error wiping database:', error);
  }
};

export const clearGameData = async () => {
  try {
    await db.transaction('rw', db.pois, db.game, db.enemies, async () => {
      await db.pois.clear();
      await db.game.clear();
      await db.enemies.clear();
    });
  } catch (error) {
    console.error('Error clearing game data:', error);
  }
};
