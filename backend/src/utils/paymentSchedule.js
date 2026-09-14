export const calculatePaymentSchedule = ({
  totalAmount,
  advancePaymentPercent,
  amountPaid = 0,
  startDate,
  balanceDueDaysBeforeLease = 0,
}) => {
  const total = Math.max(0, Number(totalAmount) || 0);
  const percent = Math.min(100, Math.max(0, Number(advancePaymentPercent) || 0));
  const paid = Math.min(total, Math.max(0, Number(amountPaid) || 0));
  const advanceAmount = Math.round((total * percent) / 100);
  const remainingAmount = Math.max(0, total - paid);
  const balanceDueDate = startDate
    ? new Date(new Date(startDate).getTime() - (Number(balanceDueDaysBeforeLease) || 0) * 24 * 60 * 60 * 1000)
    : null;

  return {
    advanceAmount,
    remainingAmount,
    balanceDueDate,
    paymentStatus: paid >= total && total > 0 ? 'paid' : paid > 0 ? 'partial' : 'pending',
    amountDueNow: Math.max(0, advanceAmount - paid),
  };
};
