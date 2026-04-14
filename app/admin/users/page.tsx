import { prisma } from '@/lib/database/prisma';
import { isAdmin } from '@/lib/security/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Mail, Zap, CreditCard } from 'lucide-react';
import { DeleteUserButton } from './DeleteUserButton';

export default async function AdminUsersPage() {
  if (!(await isAdmin())) {
    redirect('/forum');
  }

  // Fetch all users with key metrics
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      credits: true,
      accountStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      subscriptionTier: true,
      createdAt: true,
      toxicityWarnings: true,
      isBanned: true,
      _count: {
        select: {
          energyTransactions: true,
          platformCreditPurchases: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.accountStatus === 'ACTIVE').length,
    suspended: users.filter(u => u.isBanned).length,
    deleted: users.filter(u => u.accountStatus === 'DELETED').length,
    subscribers: users.filter(u => u.subscriptionStatus === 'active').length,
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-instrument-serif">User Management</h1>
            <p className="text-white/40 mt-2">Alle Nutzer, Credits & Account-Status</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
          >
            ← Zurück
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="glass-card rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-instrument-serif">{stats.total}</div>
            <div className="text-xs text-white/40">Total Users</div>
          </div>
          <div className="glass-card rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-instrument-serif text-green-500">{stats.active}</div>
            <div className="text-xs text-white/40">Active</div>
          </div>
          <div className="glass-card rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-instrument-serif text-yellow-500">{stats.suspended}</div>
            <div className="text-xs text-white/40">Suspended</div>
          </div>
          <div className="glass-card rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-instrument-serif text-red-500">{stats.deleted}</div>
            <div className="text-xs text-white/40">Deleted</div>
          </div>
          <div className="glass-card rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-instrument-serif text-purple-500">{stats.subscribers}</div>
            <div className="text-xs text-white/40">Subscribers</div>
          </div>
        </div>

        {/* User Table */}
        <div className="glass-card rounded-2xl border border-white/10 p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/60 font-medium">User</th>
                  <th className="text-center py-3 px-4 text-white/60 font-medium">Credits</th>
                  <th className="text-center py-3 px-4 text-white/60 font-medium">Käufe</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Abo</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Erstellt</th>
                  <th className="text-center py-3 px-4 text-white/60 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                            <Mail className="w-4 h-4 text-white/40" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{user.name || 'N/A'}</div>
                          <div className="text-sm text-white/40">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="w-3 h-3 text-yellow-500" />
                        <span className="font-mono text-sm">{user.credits}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-sm">
                      {user._count.platformCreditPurchases}
                    </td>
                    <td className="py-3 px-4">
                      {user.subscriptionStatus === 'active' ? (
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-500 capitalize">{user.subscriptionTier}</span>
                        </div>
                      ) : (
                        <span className="text-white/20 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.accountStatus === 'DELETED' ? 'bg-red-500/10 text-red-500' :
                        user.isBanned ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-green-500/10 text-green-500'
                      }`}>
                        {user.accountStatus === 'DELETED' ? 'DELETED' : user.isBanned ? 'SUSPENDED' : 'ACTIVE'}
                      </span>
                      {user.isBanned && (
                        <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500">
                          BANNED
                        </span>
                      )}
                      {user.toxicityWarnings > 0 && (
                        <span className="ml-2 text-xs text-yellow-500">
                          ⚠️ {user.toxicityWarnings}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-white/60">
                      {new Date(user.createdAt).toLocaleDateString('de-DE')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <DeleteUserButton
                        userId={user.id}
                        userEmail={user.email}
                        isDeleted={user.accountStatus === 'DELETED'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
