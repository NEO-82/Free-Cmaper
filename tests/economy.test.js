import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GOODS, LOGS_PER_TREE, FIREWOOD_SELL_PRICE, DEFAULT_TENT_CONFIG, TENT_CHOICES,
  tentPrice, validateTentConfig, buyItem, sellItem, buyTent, purchase, sell,
} from '../src/economy.js';

test('shop includes every requested tool and keeps the existing weather equipment', () => {
  for (const id of ['tent', 'axe', 'shovel', 'pickaxe', 'rope', 'tarp', 'mat', 'winterBag', 'repellent']) {
    const item = GOODS.find(g => g.id === id);
    assert.ok(item && Number.isSafeInteger(item.price) && item.price > 0);
  }
});

test('purchase accepts exactly enough funds and independently copies inventory', () => {
  const inventory = new Map([['food', 1]]);
  const result = buyItem(25000, inventory, 'axe');
  assert.equal(result.ok, true);
  assert.equal(result.money, 0);
  assert.equal(result.inventory.get('axe'), 1);
  assert.equal(result.inventory.get('food'), 1);
  assert.notEqual(result.inventory, inventory);
  assert.equal(inventory.has('axe'), false);
});

test('insufficient funds and invalid shop ids preserve money and items', () => {
  const inventory = new Map([['rope', 1]]);
  const result = buyItem(24999, inventory, 'axe');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'insufficientFunds');
  assert.equal(result.money, 24999);
  assert.deepEqual(result.inventory, inventory);
  assert.notEqual(result.inventory, inventory);
  assert.equal(buyItem(180000, inventory, 'unknown').reason, 'unknownItem');
  assert.equal(buyItem(180000, inventory, 'firewood').reason, 'notForSale');
});

test('used price is 65 percent and repeated purchases preserve quantities', () => {
  const first = purchase({ money: 16250, inventory: new Map() }, 'axe', { used: true });
  assert.equal(first.ok, true);
  assert.equal(first.money, 0);
  const second = buyItem(12000, new Map([['rope', 2]]), 'rope');
  assert.equal(second.inventory.get('rope'), 3);
});

test('selling one of several tools retains the remaining stock and returns 40 percent', () => {
  const inventory = new Map([['axe', 2], ['rope', 1]]);
  const result = sell({ money: 0, inventory }, 'axe');
  assert.equal(result.money, 10000);
  assert.equal(result.inventory.get('axe'), 1);
  assert.equal(inventory.get('axe'), 2);
  const final = sellItem(result.money, result.inventory, 'axe');
  assert.equal(final.inventory.has('axe'), false);
  assert.equal(final.inventory.get('rope'), 1);
  assert.equal(sellItem(100, final.inventory, 'axe').reason, 'notOwned');
});

test('three logs earned from a tree can be sold one by one without underflow', () => {
  let money = 0, inventory = new Map([['firewood', LOGS_PER_TREE]]);
  for (let i = 0; i < LOGS_PER_TREE; i++) {
    const next = sellItem(money, inventory, 'firewood');
    assert.equal(next.ok, true);
    ({ money, inventory } = next);
  }
  assert.equal(money, LOGS_PER_TREE * FIREWOOD_SELL_PRICE);
  assert.equal(inventory.has('firewood'), false);
  assert.equal(sellItem(money, inventory, 'firewood').ok, false);
});

test('every valid tent combination has a deterministic safe integer price', () => {
  assert.equal(tentPrice(DEFAULT_TENT_CONFIG), 55000);
  for (const size of TENT_CHOICES.size) for (const type of TENT_CHOICES.type) {
    for (const color of TENT_CHOICES.color) for (const material of TENT_CHOICES.material) {
      const config = { size, type, color, material };
      assert.ok(Number.isSafeInteger(tentPrice(config)) && tentPrice(config) >= 55000);
      assert.deepEqual(validateTentConfig(config), config);
    }
  }
  assert.ok(tentPrice({ ...DEFAULT_TENT_CONFIG, size: 'family' }) > tentPrice(DEFAULT_TENT_CONFIG));
  assert.ok(tentPrice({ ...DEFAULT_TENT_CONFIG, material: 'ripstop' }) > tentPrice(DEFAULT_TENT_CONFIG));
});

test('configured tent purchase replaces one active tent and returns an independent config', () => {
  const config = { size: 'large', type: 'tunnel', color: 'rust', material: 'ripstop' };
  const inventory = new Map([['tent', 1], ['axe', 1]]), price = tentPrice(config);
  const result = buyTent(price, inventory, config);
  assert.equal(result.ok, true);
  assert.equal(result.money, 0);
  assert.equal(result.inventory.get('tent'), 1);
  assert.equal(result.inventory.get('axe'), 1);
  assert.deepEqual(result.tentConfig, config);
  assert.notEqual(result.tentConfig, config);
  const failed = buyTent(price - 1, inventory, config);
  assert.equal(failed.reason, 'insufficientFunds');
  assert.equal(failed.money, price - 1);
  assert.equal('tentConfig' in failed, false);
});

test('malformed state or tent selections cannot silently corrupt balances', () => {
  assert.throws(() => buyItem(-1, new Map(), 'axe'), TypeError);
  assert.throws(() => buyItem(NaN, new Map(), 'axe'), TypeError);
  assert.throws(() => buyItem(50000, new Set(['axe']), 'axe'), TypeError);
  assert.throws(() => buyItem(50000, new Map([['axe', -1]]), 'axe'), TypeError);
  assert.throws(() => tentPrice({ ...DEFAULT_TENT_CONFIG, size: 'castle' }), RangeError);
  assert.throws(() => tentPrice({ ...DEFAULT_TENT_CONFIG, discount: 999999 }), RangeError);
  assert.throws(() => tentPrice({ size: 'standard' }), RangeError);
});
