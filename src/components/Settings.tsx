import React, { useState, useEffect } from 'react';
import { Users, Mail, Shield, UserPlus, Copy, Check, Trash2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'user';
  created_at: string;
  last_login?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  invitation_link: string;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'team' | 'invitations'>('team');
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');
  const [inviting, setInviting] = useState(false);

  // Copy link state
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      // Load team members
      const usersRes = await fetch(`${API_URL}/auth/team`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      // Load pending invitations
      const invitesRes = await fetch(`${API_URL}/auth/invitations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvitations(invitesData.invitations || []);
      }
    } catch (err: any) {
      setError('Failed to load team data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setInviting(true);

    try {
      const response = await fetch(`${API_URL}/auth/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('user');
      setShowInviteForm(false);

      // Reload invitations
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const copyInviteLink = (link: string, email: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(email);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const deleteInvitation = async (invitationId: string) => {
    if (!confirm('Delete this invitation?')) return;

    try {
      const response = await fetch(`${API_URL}/auth/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setSuccess('Invitation deleted');
        loadData();
      }
    } catch (err) {
      setError('Failed to delete invitation');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a78bfa]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Team Settings</h1>
        <p className="text-gray-400">Manage your team members and invitations</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'team'
              ? 'text-[#a78bfa] border-b-2 border-[#a78bfa]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users className="inline-block w-4 h-4 mr-2" />
          Team Members ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('invitations')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'invitations'
              ? 'text-[#a78bfa] border-b-2 border-[#a78bfa]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Mail className="inline-block w-4 h-4 mr-2" />
          Pending Invitations ({invitations.length})
        </button>
      </div>

      {/* Team Members Tab */}
      {activeTab === 'team' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Team Members</h2>
            <button
              onClick={() => setShowInviteForm(true)}
              className="px-4 py-2 bg-[#a78bfa] text-[#0a0e27] rounded-lg hover:bg-[#c4b5fd] transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Invite User
            </button>
          </div>

          {/* Invite Form Modal */}
          {showInviteForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-[#0f1629] border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-semibold text-white mb-4">Invite Team Member</h3>

                <form onSubmit={handleInvite}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                      placeholder="user@example.com"
                      required
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'user' | 'admin')}
                      className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      Admins can invite and manage other users
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={inviting}
                      className="flex-1 px-4 py-2 bg-[#a78bfa] text-[#0a0e27] rounded-lg hover:bg-[#c4b5fd] transition-colors disabled:opacity-50"
                    >
                      {inviting ? 'Sending...' : 'Send Invitation'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInviteForm(false)}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-[#0f1629]/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#a78bfa]/20 flex items-center justify-center">
                      <span className="text-[#a78bfa] font-semibold">
                        {user.first_name[0]}
                        {user.last_name[0]}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium">
                          {user.first_name} {user.last_name}
                        </h3>
                        {user.role === 'admin' && (
                          <span className="px-2 py-0.5 bg-[#a78bfa]/20 text-[#a78bfa] text-xs rounded-full flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500">Joined {formatDate(user.created_at)}</p>
                    {user.last_login && (
                      <p className="text-xs text-gray-500">
                        Last login: {formatDate(user.last_login)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No team members yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Pending Invitations</h2>
            <button
              onClick={() => setShowInviteForm(true)}
              className="px-4 py-2 bg-[#a78bfa] text-[#0a0e27] rounded-lg hover:bg-[#c4b5fd] transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Invite User
            </button>
          </div>

          <div className="space-y-3">
            {invitations.map((invite) => {
              const expired = isExpired(invite.expires_at);

              return (
                <div
                  key={invite.id}
                  className={`bg-[#0f1629]/50 border rounded-lg p-4 ${
                    expired ? 'border-red-500/30' : 'border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-white font-medium">{invite.email}</span>
                        <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">
                          {invite.role}
                        </span>
                        {expired && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Sent {formatDate(invite.created_at)} • Expires{' '}
                        {formatDate(invite.expires_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyInviteLink(invite.invitation_link, invite.email)}
                        className="px-3 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
                      >
                        {copiedLink === invite.email ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy Link
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => deleteInvitation(invite.id)}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete invitation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {invitations.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No pending invitations</p>
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="mt-4 text-[#a78bfa] hover:underline"
                >
                  Invite your first team member
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
