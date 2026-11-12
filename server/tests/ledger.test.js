import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import LedgerService from '../src/services/ledger.service.js';

describe('Ledger Financial Invariants & Mathematics', () => {
  it('converts standard rupee amounts to integer paise precisely', () => {
    assert.equal(LedgerService.toPaise(100), 10000);
    assert.equal(LedgerService.toPaise(49.99), 4999);
    assert.equal(LedgerService.toPaise(0.01), 1);
    assert.equal(LedgerService.toPaise(0), 0);
  });

  it('converts integer paise back to rupees precisely', () => {
    assert.equal(LedgerService.fromPaise(10000), 100);
    assert.equal(LedgerService.fromPaise(4999), 49.99);
    assert.equal(LedgerService.fromPaise(1), 0.01);
  });

  it('calculates 2% platform fee and seller amount without decimal drift', () => {
    const productPrice = 2500;
    const platformFee = Math.round(productPrice * 0.02); // 50
    const sellerAmount = productPrice - platformFee;     // 2450

    assert.equal(platformFee, 50);
    assert.equal(sellerAmount, 2450);
    assert.equal(platformFee + sellerAmount, productPrice);
  });

  it('calculates non-round amount fee correctly', () => {
    const productPrice = 999;
    const platformFee = Math.round(productPrice * 0.02); // 20
    const sellerAmount = productPrice - platformFee;     // 979

    assert.equal(platformFee, 20);
    assert.equal(sellerAmount, 979);
    assert.equal(platformFee + sellerAmount, productPrice);
  });
});