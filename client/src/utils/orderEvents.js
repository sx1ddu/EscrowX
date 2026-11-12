export const emitOrderStatus = ({ orderId, status, order, ...detail }) => {
  if (!orderId && !order?._id) return;

  window.dispatchEvent(new CustomEvent('trusttrade:order-status', {
    detail: {
      ...detail,
      orderId: orderId || order._id,
      status: status || order?.escrowStatus,
      order,
    },
  }));
};
