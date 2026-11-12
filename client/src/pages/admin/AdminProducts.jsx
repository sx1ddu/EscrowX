import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Package, Search, Trash2 } from 'lucide-react';
import api from '../../store/api/axios.js';
import Loader from '../../components/common/Loader.jsx';
import toast from 'react-hot-toast';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/products', { params: { limit: 50, search } })
      .then(({ data }) => setProducts(data.data?.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [search]);

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts(items => items.filter(item => item._id !== id));
      toast.success('Product deleted');
    } catch {
      toast.error('Failed to delete product');
    }
  };

  if (loading) return <Loader text="Loading products..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Manage Products</h1>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No products found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Product', 'Seller', 'Price', 'Status', 'Actions'].map(header => (
                <th key={header} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{header}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(product => (
                <tr key={product._id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={product.images?.[0]?.url || '/placeholder.png'} className="w-10 h-10 rounded-lg object-cover" alt="" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{product.title}</p>
                        <p className="text-xs text-gray-400 capitalize">{product.category} · {product.condition}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{product.seller?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">₹{product.price?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-green-100 text-green-700">
                      {product.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/products/${product._id}`} className="p-1.5 text-gray-400 hover:text-indigo-600 transition" title="View product">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button onClick={() => deleteProduct(product._id)} className="p-1.5 text-gray-400 hover:text-red-500 transition" title="Delete product">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
