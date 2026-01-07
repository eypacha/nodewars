import Dexie from 'dexie';

export class NodeWarsDB extends Dexie {
  pois;

  constructor() {
    super('NodeWarsDB');
    this.version(1).stores({
      pois: 'id, lat, lng, type, category, name, health, maxHealth, owned, resourceAmount, resourceCapacity, radarActive, conqueredFrom, color'
    });
  }
}

export const db = new NodeWarsDB();