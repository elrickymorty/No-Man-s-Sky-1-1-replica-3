// ============ Inventory: resources, items, quickbar ============

export class Inventory {
  constructor() {
    this.res = {};      // {id: count}
    this.items = {};    // {id: count}
    this.quickbar = []; // last 4 collected resource ids
    this.suit2 = false;
    this.batteryLevels = 0;
  }

  addRes(id, n = 1) {
    this.res[id] = (this.res[id] || 0) + n;
    if (!this.quickbar.includes(id)) {
      this.quickbar.push(id);
      if (this.quickbar.length > 4) this.quickbar.shift();
    }
  }

  hasCost(cost) {
    for (const [id, n] of Object.entries(cost)) {
      if ((this.res[id] || 0) < n) return false;
    }
    return true;
  }

  payCost(cost) {
    if (!this.hasCost(cost)) return false;
    for (const [id, n] of Object.entries(cost)) this.res[id] -= n;
    return true;
  }

  toJSON() {
    return { res: this.res, items: this.items, quickbar: this.quickbar, suit2: this.suit2, batteryLevels: this.batteryLevels };
  }

  fromJSON(d) {
    if (!d) return;
    this.res = d.res || {};
    this.items = d.items || {};
    this.quickbar = d.quickbar || [];
    this.suit2 = !!d.suit2;
    this.batteryLevels = d.batteryLevels || 0;
  }
}
