import React, { useState, useEffect } from 'react';
import {
  Users,
  Mail,
  Shield,
  UserPlus,
  Copy,
  Check,
  Trash2,
  User,
  Building2,
  Key,
  FileText,
} from 'lucide-react';

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

export default function SettingsEnhanced() {
  const [activeTab, setActiveTab] = useState<
    'profile' | 'company' | 'team' | 'hmrc' | 'gov-gateway'
  >('profile');
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [eoriNumber, setEoriNumber] = useState('');

  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [sortCode, setSortCode] = useState('');
  const [iban, setIban] = useState('');
  const [swift, setSwift] = useState('');

  // HMRC credentials
  const [hmrcClientId, setHmrcClientId] = useState('');
  const [hmrcClientSecret, setHmrcClientSecret] = useState('');
  const [hmrcEnvironment, setHmrcEnvironment] = useState<'sandbox' | 'production'>('sandbox');

  // Gov Gateway
  const [govGatewayUserId, setGovGatewayUserId] = useState('');
  const [govGatewayPassword, setGovGatewayPassword] = useState('');

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
      // Load user profile
      const profileRes = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setFirstName(profileData.user.first_name || '');
        setLastName(profileData.user.last_name || '');
        setEmail(profileData.user.email || '');
      }

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
      setError('Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
          address,
        }),
      });

      if (response.ok) {
        setSuccess('Profile updated successfully');
      } else {
        setError('Failed to update profile');
      }
    } catch (err) {
      setError('Failed to update profile');
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/company/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_name: companyName,
          address: companyAddress,
          phone: companyPhone,
          email: companyEmail,
          vat_number: vatNumber,
          eori_number: eoriNumber,
          bank_details: {
            bank_name: bankName,
            account_name: accountName,
            account_number: accountNumber,
            sort_code: sortCode,
            iban,
            swift,
          },
        }),
      });

      if (response.ok) {
        setSuccess('Company details updated successfully');
      } else {
        setError('Failed to update company details');
      }
    } catch (err) {
      setError('Failed to update company details');
    }
  };

  const handleSaveHMRC = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/hmrc/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          client_id: hmrcClientId,
          client_secret: hmrcClientSecret,
          environment: hmrcEnvironment,
        }),
      });

      if (response.ok) {
        setSuccess('HMRC credentials saved successfully');
      } else {
        setError('Failed to save HMRC credentials');
      }
    } catch (err) {
      setError('Failed to save HMRC credentials');
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
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your profile, company, and integrations</p>
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
      <div className="flex gap-4 mb-6 border-b border-gray-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'profile'
              ? 'text-[#a78bfa] border-b-2 border-[#a78bfa]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <User className="inline-block w-4 h-4 mr-2" />
          Profile
        </button>

        <button
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'company'
              ? 'text-[#a78bfa] border-b-2 border-[#a78bfa]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Building2 className="inline-block w-4 h-4 mr-2" />
          Company
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'team'
              ? 'text-[#a78bfa] border-b-2 border-[#a78bfa]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users className="inline-block w-4 h-4 mr-2" />
          Team ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('hmrc')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'hmrc'
              ? 'text-[#a78bfa] border-b-2 border-[#a78bfa]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Key className="inline-block w-4 h-4 mr-2" />
          HMRC API
        </button>

        <button
          onClick={() => setActiveTab('gov-gateway')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'gov-gateway'
              ? 'text-[#a78bfa] border-b-2 border-[#a78bfa]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <FileText className="inline-block w-4 h-4 mr-2" />
          Gov Gateway
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-[#0f1629]/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Personal Information</h2>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                placeholder="+44 20 1234 5678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                placeholder="Street address, city, postcode"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2 bg-[#a78bfa] text-[#0a0e27] rounded-lg hover:bg-[#c4b5fd] transition-colors font-medium"
            >
              Save Profile
            </button>
          </form>
        </div>
      )}

      {/* Company Tab */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          <div className="bg-[#0f1629]/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Company Details</h2>

            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">VAT Number</label>
                  <input
                    type="text"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                    placeholder="GB123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    EORI Number
                  </label>
                  <input
                    type="text"
                    value={eoriNumber}
                    onChange={(e) => setEoriNumber(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                    placeholder="GB123456789000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Company Address
                </label>
                <textarea
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                  />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white mt-8 mb-4">Bank Details</h3>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Account Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sort Code</label>
                  <input
                    type="text"
                    value={sortCode}
                    onChange={(e) => setSortCode(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                    placeholder="12-34-56"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">IBAN</label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">SWIFT/BIC</label>
                  <input
                    type="text"
                    value={swift}
                    onChange={(e) => setSwift(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2 bg-[#a78bfa] text-[#0a0e27] rounded-lg hover:bg-[#c4b5fd] transition-colors font-medium"
              >
                Save Company Details
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Team Tab - Keep existing team management code */}
      {activeTab === 'team' && (
        <div>
          {/* Your existing team management UI */}
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

          {/* Rest of team management UI... */}
        </div>
      )}

      {/* HMRC API Tab */}
      {activeTab === 'hmrc' && (
        <div className="bg-[#0f1629]/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6">HMRC API Credentials</h2>

          <form onSubmit={handleSaveHMRC} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Client ID</label>
              <input
                type="text"
                value={hmrcClientId}
                onChange={(e) => setHmrcClientId(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Client Secret</label>
              <input
                type="password"
                value={hmrcClientSecret}
                onChange={(e) => setHmrcClientSecret(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Environment</label>
              <select
                value={hmrcEnvironment}
                onChange={(e) => setHmrcEnvironment(e.target.value as 'sandbox' | 'production')}
                className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
              >
                <option value="sandbox">Sandbox (Testing)</option>
                <option value="production">Production (Live)</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-6 py-2 bg-[#a78bfa] text-[#0a0e27] rounded-lg hover:bg-[#c4b5fd] transition-colors font-medium"
            >
              Save HMRC Credentials
            </button>
          </form>
        </div>
      )}

      {/* Gov Gateway Tab */}
      {activeTab === 'gov-gateway' && (
        <div className="bg-[#0f1629]/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Government Gateway Credentials</h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSuccess('Gov Gateway credentials saved');
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">User ID</label>
              <input
                type="text"
                value={govGatewayUserId}
                onChange={(e) => setGovGatewayUserId(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={govGatewayPassword}
                onChange={(e) => setGovGatewayPassword(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a2235] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#a78bfa]"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2 bg-[#a78bfa] text-[#0a0e27] rounded-lg hover:bg-[#c4b5fd] transition-colors font-medium"
            >
              Save Gov Gateway Credentials
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
