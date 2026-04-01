'use client';

/**
 * API Key Statistics Modal
 *
 * Displays usage analytics for a specific API key:
 * - Total requests & credits
 * - Requests by endpoint (bar chart)
 * - Requests over time (line chart)
 * - Error rate
 * - Average response time
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { useEffect, useState } from 'react';
import { X, Loader2, TrendingUp, Zap, Clock, AlertCircle } from 'lucide-react';
import type { ApiKeyStats as ApiKeyStatsType } from '@/lib/api-keys/types';

interface ApiKeyStatsProps {
  keyId: string;
  keyName: string;
  onClose: () => void;
}

export default function ApiKeyStats({ keyId, keyName, onClose }: ApiKeyStatsProps) {
  const [stats, setStats] = useState<ApiKeyStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  /**
   * Fetch statistics
   */
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError('');

      try {
        const res = await fetch(`/api/keys/${keyId}/stats?days=${days}`);

        if (!res.ok) {
          throw new Error('Failed to fetch statistics');
        }

        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [keyId, days]);

  /**
   * Get top endpoints
   */
  const getTopEndpoints = () => {
    if (!stats) return [];

    const entries = Object.entries(stats.requestsByEndpoint);
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 5);
  };

  /**
   * Get requests chart data (last 7 days)
   */
  const getChartData = () => {
    if (!stats) return [];

    const entries = Object.entries(stats.requestsByDay);
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries.slice(-7);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Usage Statistics</h2>
            <p className="text-sm text-zinc-400 mt-1">{keyName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-6 flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-500 font-semibold mb-1">Error</h3>
                <p className="text-red-200/70 text-sm">{error}</p>
              </div>
            </div>
          ) : stats ? (
            <>
              {/* Time Range Selector */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold">Overview</h3>
                <select
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Requests */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                    <TrendingUp className="w-4 h-4" />
                    Total Requests
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {stats.totalRequests.toLocaleString()}
                  </div>
                </div>

                {/* Credits Used */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                    <Zap className="w-4 h-4" />
                    Credits Used
                  </div>
                  <div className="text-2xl font-bold text-yellow-500">
                    {stats.totalCredits.toLocaleString()}
                  </div>
                </div>

                {/* Avg Response Time */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                    <Clock className="w-4 h-4" />
                    Avg Response
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {stats.avgResponseTime}
                    <span className="text-sm text-zinc-400 ml-1">ms</span>
                  </div>
                </div>

                {/* Error Rate */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Error Rate
                  </div>
                  <div className={`text-2xl font-bold ${
                    stats.errorRate > 0.05 ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {(stats.errorRate * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Top Endpoints */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3">Top Endpoints</h3>
                <div className="space-y-2">
                  {getTopEndpoints().length > 0 ? (
                    getTopEndpoints().map(([endpoint, count]) => {
                      const percentage = (count / stats.totalRequests) * 100;
                      return (
                        <div key={endpoint} className="bg-zinc-800/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <code className="text-sm text-zinc-300">{endpoint}</code>
                            <div className="text-sm text-zinc-400">
                              {count.toLocaleString()} ({percentage.toFixed(1)}%)
                            </div>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-2">
                            <div
                              className="bg-zinc-500 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-zinc-500 text-sm">
                      No requests yet
                    </div>
                  )}
                </div>
              </div>

              {/* Requests Over Time (Last 7 Days) */}
              <div>
                <h3 className="text-white font-semibold mb-3">Requests Over Time (Last 7 Days)</h3>
                {getChartData().length > 0 ? (
                  <div className="bg-zinc-800/30 rounded-lg p-4">
                    <div className="space-y-3">
                      {getChartData().map(([date, count]) => {
                        const maxCount = Math.max(...Object.values(stats.requestsByDay));
                        const percentage = (count / maxCount) * 100;

                        return (
                          <div key={date} className="flex items-center gap-3">
                            <div className="text-xs text-zinc-400 w-20">
                              {new Date(date).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </div>
                            <div className="flex-1 bg-zinc-800 rounded-full h-6 relative overflow-hidden">
                              <div
                                className="bg-zinc-500 h-full rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                              <div className="absolute inset-0 flex items-center justify-start px-3">
                                <span className="text-xs font-medium text-white">
                                  {count.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-zinc-500 text-sm">
                    No data for this period
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
