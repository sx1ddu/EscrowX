import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EscrowService, ESCROW_STATES } from '../src/services/escrow.service.js';

describe('Escrow State Machine Transitions', () => {
  it('allows pending -> funded transition', () => {
    const allowed = EscrowService.isValidTransition(ESCROW_STATES.PENDING, ESCROW_STATES.FUNDED);
    assert.equal(allowed, true);
  });

  it('allows pending -> cancelled transition', () => {
    const allowed = EscrowService.isValidTransition(ESCROW_STATES.PENDING, ESCROW_STATES.CANCELLED);
    assert.equal(allowed, true);
  });

  it('allows funded -> delivered transition', () => {
    const allowed = EscrowService.isValidTransition(ESCROW_STATES.FUNDED, ESCROW_STATES.DELIVERED);
    assert.equal(allowed, true);
  });

  it('allows funded -> released transition (direct release without separate shipping)', () => {
    const allowed = EscrowService.isValidTransition(ESCROW_STATES.FUNDED, ESCROW_STATES.RELEASED);
    assert.equal(allowed, true);
  });

  it('allows funded -> disputed transition', () => {
    const allowed = EscrowService.isValidTransition(ESCROW_STATES.FUNDED, ESCROW_STATES.DISPUTED);
    assert.equal(allowed, true);
  });

  it('allows delivered -> released transition', () => {
    const allowed = EscrowService.isValidTransition(ESCROW_STATES.DELIVERED, ESCROW_STATES.RELEASED);
    assert.equal(allowed, true);
  });

  it('allows delivered -> disputed transition', () => {
    const allowed = EscrowService.isValidTransition(ESCROW_STATES.DELIVERED, ESCROW_STATES.DISPUTED);
    assert.equal(allowed, true);
  });

  it('allows disputed -> released transition (resolved in favor of seller)', () => {
    const allowed = EscrowService.isValidTransition(ESCROW_STATES.DISPUTED, ESCROW_STATES.RELEASED);
    assert.equal(allowed, true);
  });

  it('allows disputed -> refunded transition (resolved in favor of buyer)', () => {
    const allowed = EscrowService.isValidTransition(ESCROW_STATES.DISPUTED, ESCROW_STATES.REFUNDED);
    assert.equal(allowed, true);
  });

  it('forbids pending -> released directly without funding', () => {
    const allowed = EscrowService.isValidTransition(ESCROW_STATES.PENDING, ESCROW_STATES.RELEASED);
    assert.equal(allowed, false);
  });

  it('forbids released -> disputed (released is terminal state)', () => {
    const allowed = EscrowService.isValidTransition(ESCROW_STATES.RELEASED, ESCROW_STATES.DISPUTED);
    assert.equal(allowed, false);
  });

  it('forbids refunded -> released (refunded is terminal state)', () => {
    const allowed = EscrowService.isValidTransition(ESCROW_STATES.REFUNDED, ESCROW_STATES.RELEASED);
    assert.equal(allowed, false);
  });

  it('forbids cancelled -> funded (cancelled is terminal state)', () => {
    const allowed = EscrowService.isValidTransition(ESCROW_STATES.CANCELLED, ESCROW_STATES.FUNDED);
    assert.equal(allowed, false);
  });
});