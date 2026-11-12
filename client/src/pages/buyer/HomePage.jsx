import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { fetchProducts } from '../../store/slices/product.slice.js';
import ProductCard from '../../components/common/ProductCard.jsx';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { Package, SlidersHorizontal } from 'lucide-react';
import { CATEGORIES, CONDITIONS } from '../../constants/index.js';

const HomePage = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { products, loading, total, totalPages } = useSelector(s => s.products);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ category:'', minPrice:'', maxPrice:'', condition:'', sort:'-createdAt' });

  useEffect(() => {
    dispatch(fetchProducts({ ...filters, search: searchParams.get('search') || '', page }));
  }, [filters, page, searchParams.get('search')]);

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Buy & Sell Safely</h1>
        <p className="text-indigo-100 mb-4">Every transaction protected by escrow. Payment held until you confirm delivery.</p>
        <div className="flex items-center gap-4 text-sm text-indigo-200">
          <span>🔒 Escrow Protection</span>
          <span>🤝 Trusted Sellers</span>
          <span>💰 No Hidden Fees</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center">
        <SlidersHorizontal className="w-4 h-4 text-gray-400" />
        <select value={filters.category} onChange={e => setFilters(f => ({...f, category: e.target.value}))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.condition} onChange={e => setFilters(f => ({...f, condition: e.target.value}))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
          <option value="">Any Condition</option>
          {CONDITIONS.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
        <input type="number" placeholder="Min ₹" value={filters.minPrice}
          onChange={e => setFilters(f => ({...f, minPrice: e.target.value}))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        <input type="number" placeholder="Max ₹" value={filters.maxPrice}
          onChange={e => setFilters(f => ({...f, maxPrice: e.target.value}))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        <select value={filters.sort} onChange={e => setFilters(f => ({...f, sort: e.target.value}))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
          <option value="-createdAt">Newest</option>
          <option value="price">Price: Low to High</option>
          <option value="-price">Price: High to Low</option>
          <option value="-views">Most Viewed</option>
        </select>
        <span className="ml-auto text-sm text-gray-500">{total} products</span>
      </div>

      {/* Products */}
      {loading ? <Loader text="Loading products..." /> : products.length === 0 ? (
        <EmptyState icon={Package} title="No products found" description="Try adjusting your filters." />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition ${page === p ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default HomePage;
