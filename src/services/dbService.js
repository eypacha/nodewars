import Dexie from 'dexie';

export class NodeWarsDB extends Dexie {
  pois;
  game;

  constructor() {
    super('NodeWarsDB');
    // Versión única (dev/pre-alpha): definir todas las tablas aquí
    this.version(1).stores({
      pois: 'id, lat, lng, type, category, name, health, maxHealth, owned, resourceAmount, resourceCapacity, productionRate, lastProducedAt, radarActive, conqueredFrom, color',
      game: 'key'
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
