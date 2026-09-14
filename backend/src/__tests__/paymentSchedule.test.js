import { calculatePaymentSchedule } from '../utils/paymentSchedule.js';

describe('Flexible lease payment schedule', () => {
  it('calculates the advance and remaining balance', () => {
    const schedule = calculatePaymentSchedule({
      totalAmount: 100000,
      advancePaymentPercent: 30,
      startDate: '2026-10-01',
      balanceDueDaysBeforeLease: 7,
    });

    expect(schedule.advanceAmount).toBe(30000);
    expect(schedule.remainingAmount).toBe(100000);
    expect(schedule.amountDueNow).toBe(30000);
    expect(schedule.balanceDueDate.toISOString()).toBe('2026-09-24T00:00:00.000Z');
  });

  it('marks a booking partial until the full balance is paid', () => {
    const schedule = calculatePaymentSchedule({
      totalAmount: 100000,
      advancePaymentPercent: 30,
      amountPaid: 50000,
      startDate: '2026-10-01',
    });

    expect(schedule.paymentStatus).toBe('partial');
    expect(schedule.remainingAmount).toBe(50000);
  });
});