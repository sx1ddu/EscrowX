const statusConfig = {
  pending:   { label: 'Awaiting Payment',    color: 'bg-yellow-100 text-yellow-700' },
  funded:    { label: 'In Escrow',           color: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Delivered',           color: 'bg-purple-100 text-purple-700' },
  released:  { label: 'Funds Released',      color: 'bg-green-100 text-green-700' },
  disputed:  { label: 'Disputed',            color: 'bg-red-100 text-red-700' },
  refunded:  { label: 'Refunded',            color: 'bg-orange-100 text-orange-700' },
  cancelled: { label: 'Cancelled',           color: 'bg-gray-100 text-gray-600' },
};

const EscrowBadge = ({ status }) => {
  const { label, color } = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
};
export default EscrowBadge;
