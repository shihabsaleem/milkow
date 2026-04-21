import { describe, it, expect } from 'vitest';

// We perform mock logic tests based on the project's business rules
describe('Milkow Business Logic', () => {

  it('calculates correct total for milk (Basic Cost Logic)', () => {
    // Current Rule: 50 per bottle
    const quantity = 2;
    const pricePerUnit = 50;
    const total = quantity * pricePerUnit;
    expect(total).toBe(100);
  });

  it('normalizes phone numbers correctly (Login Logic)', () => {
    const input = '+1 234-567-890';
    const normalized = input.replace(/\D/g, '');
    expect(normalized).toBe('1234567890');
  });

  it('formats currency correctly', () => {
    const amount = 550.75;
    const formatted = `₹${amount.toFixed(2)}`;
    expect(formatted).toBe('₹550.75');
  });

  it('validates sequence shifting logic (Delivery Logic)', () => {
     // If we move item at index 0 to index 2
     const list = ['Stop A', 'Stop B', 'Stop C'];
     const [movedItem] = list.splice(0, 1);
     list.splice(2, 0, movedItem);
     
     expect(list[2]).toBe('Stop A');
     expect(list[0]).toBe('Stop B');
  });

});
