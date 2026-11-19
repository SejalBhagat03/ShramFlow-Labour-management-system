import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  Check,
  X,
  AlertOctagon,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from 'sonner';

const Reconciliation = () => {
  const { authFetch } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReconciliationReport = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/reconciliation/report');
      const data = await res.json();
      if (data.success) {
        setClaims(data.results || []);
      }
    } catch (error) {
      toast.error('Could not load reconciliation report');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchReconciliationReport();
  }, [fetchReconciliationReport]);

  const handleApply = async (id, adjustedAmount, trustScore, flag) => {
    try {
      const res = await authFetch(`/api/reconciliation/apply/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustedAmount, trustScore, flag }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Adjustment applied and approved!');
        setClaims(claims.filter((c) => c.id !== id));
      } else {
        toast.error(data.error || 'Failed to apply adjustment');
      }
    } catch (err) {
      toast.error('Network error while applying adjustment');
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await authFetch(`/api/work/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          rejected_reason: 'Rejected during AI reconciliation',
        }),
      });
      const data = await res.json();

      if (data.id) {
        toast.success('Claim rejected');
        setClaims(claims.filter((c) => c.id !== id));
      }
    } catch (err) {
      toast.error('Failed to reject claim');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-gray-500">Running AI Reconciliation Engine...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">AI Trust & Reconciliation</h1>
        <p className="text-gray-500">Review labour claims, trust scores, and AI adjustments.</p>
      </div>

      {claims.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <ShieldCheck className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">All Clear!</h2>
          <p className="text-gray-500 mt-2">There are no pending claims to reconcile.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {claims.map((claim) => {
            const isSuspicious = claim.reconciliation?.trustScore < 70;
            const hasAdjustment =
              claim.reconciliation?.adjustedAmount < (claim.meters || claim.work_done);

            return (
              <div
                key={claim.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                  isSuspicious ? 'border-red-200 shadow-red-50' : 'border-gray-100'
                }`}
              >
                <div
                  className={`p-4 border-b flex justify-between items-center ${isSuspicious ? 'bg-red-50/50' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center gap-2">
                    {isSuspicious ? (
                      <ShieldAlert className="w-5 h-5 text-red-500" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-green-500" />
                    )}
                    <span className="font-semibold text-gray-800">
                      Trust Score: {claim.reconciliation?.trustScore || 100}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-500">{claim.date}</span>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {claim.labourers?.name || 'Unknown Labourer'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {claim.projects?.name || 'General Task'} • {claim.task_type}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Claimed</p>
                      <p className="font-semibold text-gray-900">
                        {claim.meters || claim.work_done} m
                      </p>
                    </div>
                    {hasAdjustment && (
                      <>
                        <TrendingDown className="w-5 h-5 text-red-400" />
                        <div className="text-right">
                          <p className="text-xs text-indigo-500 uppercase tracking-wider mb-1">
                            AI Suggestion
                          </p>
                          <p className="font-bold text-indigo-600">
                            {Math.round(claim.reconciliation.adjustedAmount)} m
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {claim.reconciliation?.flag && (
                    <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      <AlertOctagon className="w-4 h-4 mt-0.5 shrink-0" />
                      <p>{claim.reconciliation.flag}</p>
                    </div>
                  )}

                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={() => handleReject(claim.id)}
                      className="flex-1 py-2 px-3 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition flex justify-center items-center gap-1 text-sm"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() =>
                        handleApply(
                          claim.id,
                          claim.reconciliation?.adjustedAmount || claim.meters || claim.work_done,
                          claim.reconciliation?.trustScore,
                          claim.reconciliation?.flag
                        )
                      }
                      className="flex-[2] py-2 px-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex justify-center items-center gap-1 text-sm shadow-sm shadow-indigo-200"
                    >
                      <Check className="w-4 h-4" />{' '}
                      {hasAdjustment ? 'Apply Fix & Approve' : 'Approve Claim'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Reconciliation;
