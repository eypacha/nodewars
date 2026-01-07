import Dexie from 'dexie';

export class NodeWarsDB extends Dexie {
  pois;

  constructor() {
    super('NodeWarsDB');
    this.version(2).stores({
      pois: 'id, lat, lng, type, category, name, health, maxHealth, owned, resourceAmount, resourceCapacity, productionRate, lastProducedAt, radarActive, conqueredFrom, color'
    });
  }
}

export const db = new NodeWarsDB();
