import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Trash2, Package } from 'lucide-react';
import api from '../../store/api/axios.js';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import toast from 'react-hot-toast';

const statusColors = {
  active:  'bg-green-100 text-green-700',
  sold:    'bg-blue-100 text-blue-700',
  paused:  'bg-yellow-100 text-yellow-700',
  deleted: 'bg-red-100 text-red-700',
};

const MyListings = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);

  const fetchListings = async () => {
    try {
      const { data } = await api.get('/products?seller=me&limit=20');
      setProducts(data.data.products);
    } catch { setProducts([]); } finally { setLoading(false); }
  };

  useEffect(() => { fetchListings(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this listing?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Listing deleted');
      setProducts(p => p.filter(x => x._id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <Loader text="Loading listings..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
        <Link to="/seller/listings/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
          <Plus className="w-4 h-4" /> Add Listing
        </Link>
      </div>

      {products.length === 0 ? (
        <EmptyState icon={Package} title="No listings yet"
          description="Create your first listing to start selling."
          action={<Link to="/seller/listings/new" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Create Listing</Link>} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Product','Price','Status','Views','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(p => (
                <tr key={p._id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.images?.[0]?.url||'/placeholder.png'} className="w-10 h-10 object-cover rounded-lg" alt="" />
                      <div>
                        <p className="font-medium text-gray-800 line-clamp-1">{p.title}</p>
                        <p className="text-xs text-gray-400 capitalize">{p.category} · {p.condition}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">₹{p.price?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[p.status]||'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <div className="flex items-center gap-1"><Eye className="w-3 h-3" />{p.views}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/products/${p._id}`} className="p-1.5 text-gray-400 hover:text-indigo-600 transition"><Eye className="w-4 h-4" /></Link>
                      <button onClick={() => handleDelete(p._id)} className="p-1.5 text-gray-400 hover:text-red-500 transition"><Trash2 className="w-4 h-4" /></button>
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
export default MyListings;
