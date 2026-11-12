export const API_URL    = import.meta.env.VITE_API_URL    || 'http://localhost:5000/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const ROLES      = { BUYER: 'buyer', SELLER: 'seller', ADMIN: 'admin' };

export const ESCROW_STATUS = {
  PENDING:   'pending',
  FUNDED:    'funded',
  DELIVERED: 'delivered',
  RELEASED:  'released',
  DISPUTED:  'disputed',
  REFUNDED:  'refunded',
  CANCELLED: 'cancelled',
};

export const CATEGORIES = ['Electronics','Clothing','Books','Furniture','Vehicles','Other'];
export const CONDITIONS  = ['new','like-new','good','fair'];
