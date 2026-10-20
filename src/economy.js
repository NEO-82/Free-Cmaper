/**
 * Prices are whole won. Inventory is a Map<itemId, positive integer count>.
 * Transactions never mutate caller state, including when they fail.
 */
export const LOGS_PER_TREE = 3;
export const FIREWOOD_SELL_PRICE = 1200;
export const DEFAULT_TENT_CONFIG = Object.freeze({ size: 'standard', type: 'dome', color: 'sand', material: 'canvas' });
export const TENT_CHOICES = Object.freeze({
  size: Object.freeze(['standard', 'large', 'family']),
  type: Object.freeze(['dome', 'ridge', 'tunnel']),
  color: Object.freeze(['sand', 'forest', 'rust', 'navy']),
  material: Object.freeze(['canvas', 'ripstop']),
});
export const GOODS = Object.freeze([
  { id: 'tent', price: 55000, configurable: true },
  { id: 'axe', price: 25000 },
  { id: 'shovel', price: 18000 },
  { id: 'pickaxe', price: 32000 },
  { id: 'rope', price: 12000 },
  { id: 'tarp', price: 45000 },
  { id: 'mat', price: 25000 },
  { id: 'winterBag', price: 60000 },
  { id: 'repellent', price: 30000 },
  // Trees supply firewood. The shop buys it; it does not create free timber.
  { id: 'firewood', price: 3000, sellPrice: FIREWOOD_SELL_PRICE, forSale: false },
].map(Object.freeze));
const byId = new Map(GOODS.map(item => [item.id, item]));
const TENT_SURCHARGES = Object.freeze({
  size: Object.freeze({ standard: 0, large: 22000, family: 48000 }),
  type: Object.freeze({ dome: 0, ridge: 5000, tunnel: 12000 }),
  color: Object.freeze({ sand: 0, forest: 0, rust: 0, navy: 0 }),
  material: Object.freeze({ canvas: 0, ripstop: 9000 }),
});

export function validateTentConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new TypeError('A tent configuration object is required.');
  for (const key of Object.keys(config)) {
    if (!Object.hasOwn(TENT_CHOICES, key)) throw new RangeError(`Unknown tent setting: ${key}`);
  }
  const result = {};
  for (const [key, values] of Object.entries(TENT_CHOICES)) {
    if (!values.includes(config[key])) throw new RangeError(`Unknown tent ${key}: ${String(config[key])}`);
    result[key] = config[key];
  }
  return result;
}

export function tentPrice(config = DEFAULT_TENT_CONFIG) {
  const validated = validateTentConfig(config);
  return 55000 + Object.entries(validated).reduce((total, [key, value]) => total + TENT_SURCHARGES[key][value], 0);
}

function copyState(money, inventory) {
  if (!Number.isSafeInteger(money) || money < 0) throw new TypeError('Money must be a nonnegative whole number.');
  if (!(inventory instanceof Map)) throw new TypeError('Inventory must be a Map of item counts.');
  const copy = new Map();
  for (const [id, count] of inventory) {
    if (typeof id !== 'string' || !id || !Number.isSafeInteger(count) || count < 0) {
      throw new TypeError('Inventory entries must have a nonempty item id and a nonnegative whole count.');
    }
    if (count > 0) copy.set(id, count);
  }
  return { money, inventory: copy };
}
function failed(state, reason) { return { ok: false, reason, ...state }; }

export function buyItem(money, inventory, id, used = false) {
  const state = copyState(money, inventory), item = byId.get(id);
  if (!item) return failed(state, 'unknownItem');
  if (item.forSale === false) return failed(state, 'notForSale');
  if (typeof used !== 'boolean') throw new TypeError('Used must be a boolean.');
  const price = used ? Math.floor(item.price * 0.65) : item.price;
  if (state.money < price) return failed(state, 'insufficientFunds');
  state.money -= price;
  state.inventory.set(id, (state.inventory.get(id) ?? 0) + 1);
  return { ok: true, reason: null, ...state };
}

export function sellItem(money, inventory, id) {
  const state = copyState(money, inventory), item = byId.get(id);
  if (!item) return failed(state, 'unknownItem');
  const count = state.inventory.get(id) ?? 0;
  if (count === 0) return failed(state, 'notOwned');
  const amount = item.sellPrice ?? Math.floor(item.price * 0.4);
  if (!Number.isSafeInteger(state.money + amount)) throw new RangeError('Money exceeds the supported range.');
  state.money += amount;
  if (count === 1) state.inventory.delete(id); else state.inventory.set(id, count - 1);
  return { ok: true, reason: null, ...state };
}

export function buyTent(money, inventory, config = DEFAULT_TENT_CONFIG) {
  const validated = validateTentConfig(config), state = copyState(money, inventory);
  const price = tentPrice(validated);
  if (state.money < price) return failed(state, 'insufficientFunds');
  state.money -= price;
  // A configured tent replaces the carried tent; there is one active tent design.
  state.inventory.set('tent', 1);
  return { ok: true, reason: null, ...state, tentConfig: validated };
}

export function purchase({ money, inventory }, id, { used = false } = {}) {
  return buyItem(money, inventory, id, used);
}
export function sell({ money, inventory }, id) { return sellItem(money, inventory, id); }
