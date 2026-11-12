import { Link } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';

const ProductCard = ({ product }) => (
  <Link to={`/products/${product._id}`} className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
    <div className="aspect-square overflow-hidden bg-gray-100">
      <img
        src={product.images?.[0]?.url || '/placeholder.png'}
        alt={product.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
    </div>
    <div className="p-3">
      <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide">{product.category}</p>
      <h3 className="font-semibold text-gray-800 mt-0.5 text-sm line-clamp-2">{product.title}</h3>
      <p className="text-lg font-bold text-gray-900 mt-1">₹{product.price.toLocaleString()}</p>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="w-3 h-3" />
          {product.location?.city || 'India'}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          {product.seller?.rating?.average?.toFixed(1) || '0.0'}
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-1.5 capitalize">{product.condition} condition</p>
    </div>
  </Link>
);
export default ProductCard;
