import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../store/api/axios.js';
import Loader from '../../components/common/Loader.jsx';
import toast from 'react-hot-toast';

const AdminDisputes = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  const fetchDisputes = useCallback(() => {
    api.get('/disputes').then(({ data }) => setDisputes(data.data?.disputes || []))
      .catch(() => setDisputes([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const resolve = async (id, resolution) => {
    setResolvingId(id);
    try {
      await api.patch(`/disputes/${id}/resolve`, { resolution });
      toast.success('Dispute resolved');
      fetchDisputes();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to resolve'); }
    finally { setResolvingId(null); }
  };

  if (loading) return <Loader text="Loading disputes..." />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
      {disputes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No open disputes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map(d => (
            <div key={d._id} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <p className="font-semibold text-gray-800">{d.reason}</p>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      d.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>{d.status}</span>
                  </div>
                  <p className="text-sm text-gray-500">{d.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Raised by: {d.raisedBy?.name} · Against: {d.against?.name}
                  </p>
                  {d.aiRiskScore > 0 && (
                    <p className="text-xs text-orange-600 mt-1">AI Risk Score: {d.aiRiskScore}/100</p>
                  )}
                </div>
                {d.status === 'open' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => resolve(d._id, 'buyer')} disabled={resolvingId === d._id}
                      className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition disabled:opacity-50">
                      <CheckCircle className="w-3 h-3" /> Favor Buyer
                    </button>
                    <button onClick={() => resolve(d._id, 'seller')} disabled={resolvingId === d._id}
                      className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition disabled:opacity-50">
                      <CheckCircle className="w-3 h-3" /> Favor Seller
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default AdminDisputes;
