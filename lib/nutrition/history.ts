/**
 * Per-user food memory: favorites + recents. Interface is storage-agnostic so a
 * Notion/Postgres-backed implementation drops in later; the in-memory default is
 * fine for a single process and for tests.
 */
import type { FoodItem } from "./types";

export interface FoodMemory {
  addFavorite(userId: string, food: FoodItem): Promise<void>;
  removeFavorite(userId: string, foodId: string): Promise<void>;
  listFavorites(userId: string): Promise<FoodItem[]>;
  recordRecent(userId: string, food: FoodItem): Promise<void>;
  listRecent(userId: string, limit?: number): Promise<FoodItem[]>;
}

export class InMemoryFoodMemory implements FoodMemory {
  private favs = new Map<string, Map<string, FoodItem>>();
  private recents = new Map<string, FoodItem[]>();
  constructor(private recentCap = 50) {}

  private favMap(u: string) {
    let m = this.favs.get(u);
    if (!m) this.favs.set(u, (m = new Map()));
    return m;
  }

  async addFavorite(userId: string, food: FoodItem): Promise<void> {
    this.favMap(userId).set(food.id, food);
  }
  async removeFavorite(userId: string, foodId: string): Promise<void> {
    this.favMap(userId).delete(foodId);
  }
  async listFavorites(userId: string): Promise<FoodItem[]> {
    return [...this.favMap(userId).values()];
  }
  async recordRecent(userId: string, food: FoodItem): Promise<void> {
    const list = (this.recents.get(userId) ?? []).filter((f) => f.id !== food.id);
    list.unshift(food);
    this.recents.set(userId, list.slice(0, this.recentCap));
  }
  async listRecent(userId: string, limit = 20): Promise<FoodItem[]> {
    return (this.recents.get(userId) ?? []).slice(0, limit);
  }
}
