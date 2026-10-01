import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Membership } from '../../types';
import { Users2, UserPlus, Shield, Headphones, Mail } from 'lucide-react';

export const TeamManagementPage: React.FC = () => {
  const { organization } = useAuth();
  const [members, setMembers] = useState<Membership[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'org_admin' | 'operator'>('operator');
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const res = await api.getOrgMembers(organization.id);
      setMembers(res.members || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [organization]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !email.trim()) return;
    try {
      await api.inviteMember(organization.id, { email, displayName, role });
      setIsModalOpen(false);
      setEmail('');
      setDisplayName('');
      fetchMembers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Team & Role Access</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage operators, front-counter staff, and administrators for {organization?.name}.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-semibold">
            <tr>
              <th className="py-3 px-4">Member Name</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Joined At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50 transition">
                <td className="py-3 px-4 font-semibold text-gray-900">
                  {m.userName || 'Team Member'}
                </td>
                <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                  {m.userEmail || '—'}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      m.role === 'org_admin'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {m.role === 'org_admin' ? (
                      <Shield className="w-3 h-3" />
                    ) : (
                      <Headphones className="w-3 h-3" />
                    )}
                    <span className="capitalize">{m.role.replace('_', ' ')}</span>
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {m.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-400 text-[11px]">
                  {new Date(m.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Invite New Operator / Admin</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Meera Joshi"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="meera@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Role Assignment</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-hidden"
                >
                  <option value="operator">Operator (Collect on behalf of respondents)</option>
                  <option value="org_admin">Organization Admin (Full schema & submission control)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-xs"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
