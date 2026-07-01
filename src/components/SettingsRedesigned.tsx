import { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Users,
  Key,
  FileText,
  CheckCircle2,
  AlertCircle,
  Mail,
  Trash2,
  Copy,
  Check,
  UserPlus,
  Eye,
  EyeOff,
  RefreshCw,
  Edit2,
  Send,
  Info,
  Palette,
  Sun,
  Moon,
} from 'lucide-react';
import KPITile from '@/components/ui/KPITile';
import UniversalPageLayout from '@/components/ui/UniversalPageLayout';
import UniversalPageHeader from '@/components/ui/UniversalPageHeader';
import { useSettings } from '@/contexts/SettingsContext';

type SettingsSection = 'appearance' | 'profile' | 'company' | 'team' | 'hmrc' | 'gov-gateway';

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

export default function SettingsRedesigned() {
  const { settings, updateSettings } = useSettings();
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [eoriNumber, setEoriNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

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
  const [hmrcStatus, setHmrcStatus] = useState<'connected' | 'disconnected'>('disconnected');

  // Gov Gateway
  const [govGatewayUserId, setGovGatewayUserId] = useState('');
  const [govGatewayPassword, setGovGatewayPassword] = useState('');
  const [govGatewayStatus, setGovGatewayStatus] = useState<'connected' | 'disconnected'>(
    'disconnected'
  );
  const [showGovPassword, setShowGovPassword] = useState(false);

  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');
  const [inviting, setInviting] = useState(false);

  // HMRC Testing
  const [testingHmrc, setTestingHmrc] = useState(false);
  const [hmrcLastVerified, setHmrcLastVerified] = useState<string | null>(null);
  const [hmrcTestResult, setHmrcTestResult] = useState<'success' | 'error' | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const profileRes = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setFirstName(profileData.user.first_name || '');
        setLastName(profileData.user.last_name || '');
        setEmail(profileData.user.email || '');
        setPhone(profileData.user.phone || '');
      }

      const usersRes = await fetch(`${API_URL}/auth/team`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      const invitesRes = await fetch(`${API_URL}/auth/invitations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvitations(invitesData.invitations || []);
      }
    } catch (err) {
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
        body: JSON.stringify({ first_name: firstName, last_name: lastName, phone }),
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
      const response = await fetch(`${API_URL}/settings/company`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_name: companyName,
          eori_number: eoriNumber,
          vat_number: vatNumber,
          company_email: companyEmail,
          company_address: companyAddress,
          company_phone: companyPhone,
          bank_name: bankName,
          account_name: accountName,
          account_number: accountNumber,
          sort_code: sortCode,
          iban,
          swift,
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
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send invitation');

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

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleTestHmrcConnection = async () => {
    setTestingHmrc(true);
    setHmrcTestResult(null);

    try {
      const response = await fetch(`${API_URL}/settings/hmrc/test`, {
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
        setHmrcTestResult('success');
        setHmrcLastVerified(new Date().toISOString());
        setHmrcStatus('connected');
        showToast('success', 'HMRC API connection successful!');
      } else {
        setHmrcTestResult('error');
        showToast('error', 'HMRC API connection failed. Check your credentials.');
      }
    } catch (err) {
      setHmrcTestResult('error');
      showToast('error', 'Failed to test HMRC connection');
    } finally {
      setTestingHmrc(false);
    }
  };

  const sidebarSections = [
    { id: 'appearance' as SettingsSection, label: 'Appearance', icon: Palette },
    { id: 'profile' as SettingsSection, label: 'Profile', icon: User },
    { id: 'company' as SettingsSection, label: 'Company', icon: Building2 },
    { id: 'team' as SettingsSection, label: 'Team & Users', icon: Users },
    { id: 'hmrc' as SettingsSection, label: 'HMRC API', icon: Key },
    { id: 'gov-gateway' as SettingsSection, label: 'Government Gateway', icon: FileText },
  ];

  if (loading) {
    return (
      <UniversalPageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        </div>
      </UniversalPageLayout>
    );
  }

  return (
    <UniversalPageLayout>
      <UniversalPageHeader
        title="Settings"
        subtitle="Manage your profile, company information, integrations and team access"
      />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {/* KPI Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPITile
            title="Identity Verified"
            value={firstName && lastName ? '✓' : '—'}
            subtext={firstName && lastName ? 'Profile complete' : 'Complete your profile'}
            icon={firstName && lastName ? CheckCircle2 : AlertCircle}
            color={firstName && lastName ? 'emerald' : 'amber'}
          />
          <KPITile
            title="HMRC API Status"
            value={hmrcStatus === 'connected' ? hmrcEnvironment : 'Not Connected'}
            subtext={hmrcStatus === 'connected' ? 'API credentials active' : 'Configure API access'}
            icon={hmrcStatus === 'connected' ? CheckCircle2 : AlertCircle}
            color={hmrcStatus === 'connected' ? 'emerald' : 'slate'}
          />
          <KPITile
            title="Gov Gateway Status"
            value={govGatewayStatus === 'connected' ? 'Connected' : 'Not Connected'}
            subtext={govGatewayStatus === 'connected' ? 'Credentials saved' : 'Add gateway login'}
            icon={govGatewayStatus === 'connected' ? CheckCircle2 : AlertCircle}
            color={govGatewayStatus === 'connected' ? 'emerald' : 'slate'}
          />
          <KPITile
            title="Team Members"
            value={`${users.length} / 10`}
            subtext={`${invitations.length} pending invites`}
            icon={Users}
            color="blue"
          />
        </div>

        {/* Two Column Layout: Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1 sticky top-8">
              {sidebarSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-yellow-50 text-yellow-700 font-semibold border-l-4 border-yellow-500'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              {/* Appearance Section */}
              {activeSection === 'appearance' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Appearance</h2>
                  <p className="text-slate-600 mb-6">
                    Choose how the reusable Arcanus theme is applied across Customs.
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => updateSettings({ themeMode: 'light' })}
                      className={`rounded-xl border p-5 text-left transition-all ${
                        settings.themeMode === 'light'
                          ? 'border-yellow-500 bg-yellow-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-yellow-600 shadow-sm">
                          <Sun className="h-5 w-5" />
                        </span>
                        {settings.themeMode === 'light' && (
                          <CheckCircle2 className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <p className="font-semibold text-slate-900">Light theme</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Bright content surfaces with the Customs brand accents.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateSettings({ themeMode: 'dark' })}
                      className={`rounded-xl border p-5 text-left transition-all ${
                        settings.themeMode === 'dark'
                          ? 'border-violet-500 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-violet-300 shadow-sm">
                          <Moon className="h-5 w-5" />
                        </span>
                        {settings.themeMode === 'dark' && (
                          <CheckCircle2 className="h-5 w-5 text-violet-300" />
                        )}
                      </div>
                      <p
                        className={`font-semibold ${
                          settings.themeMode === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        Dark theme
                      </p>
                      <p
                        className={`mt-1 text-sm ${
                          settings.themeMode === 'dark' ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        Dark operational surfaces from the reusable theme system.
                      </p>
                    </button>
                  </div>

                  <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    The app is using <span className="font-semibold">{settings.themeMode}</span> via
                    the Customs <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs">#root</code>
                    <code className="rounded bg-white px-1.5 py-0.5 text-xs">data-theme</code>.
                  </div>
                </div>
              )}

              {/* Profile Section */}
              {activeSection === 'profile' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Personal Information</h2>
                  <p className="text-slate-600 mb-6">
                    Update your personal details and contact information
                  </p>

                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          placeholder="Smith"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        placeholder="+44 20 1234 5678"
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-md hover:shadow-lg"
                      >
                        Save Profile
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Company Section */}
              {activeSection === 'company' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Company Information</h2>
                  <p className="text-slate-600 mb-6">
                    Manage your company details and bank information for refund payments
                  </p>

                  <form onSubmit={handleSaveCompany} className="space-y-8">
                    {/* Company Details */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Company Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Company Name
                          </label>
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            placeholder="Your Company Ltd"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            EORI Number
                          </label>
                          <input
                            type="text"
                            value={eoriNumber}
                            onChange={(e) => setEoriNumber(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            placeholder="GB123456789000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            VAT Number
                          </label>
                          <input
                            type="text"
                            value={vatNumber}
                            onChange={(e) => setVatNumber(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            placeholder="GB123456789"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Company Email
                          </label>
                          <input
                            type="email"
                            value={companyEmail}
                            onChange={(e) => setCompanyEmail(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            placeholder="info@company.com"
                          />
                        </div>
                      </div>
                      <div className="mt-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Company Address
                        </label>
                        <textarea
                          value={companyAddress}
                          onChange={(e) => setCompanyAddress(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          placeholder="123 Business Street, London, UK"
                        />
                      </div>
                      <div className="mt-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Company Phone
                        </label>
                        <input
                          type="tel"
                          value={companyPhone}
                          onChange={(e) => setCompanyPhone(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          placeholder="+44 20 1234 5678"
                        />
                      </div>
                    </div>

                    {/* Bank Details */}
                    <div className="pt-6 border-t border-slate-200">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">
                        Bank Details for Refund Payments
                      </h3>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            placeholder="Barclays Bank"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Account Name
                            </label>
                            <input
                              type="text"
                              value={accountName}
                              onChange={(e) => setAccountName(e.target.value)}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                              placeholder="Your Company Ltd"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Sort Code
                            </label>
                            <input
                              type="text"
                              value={sortCode}
                              onChange={(e) => setSortCode(e.target.value)}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                              placeholder="12-34-56"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Account Number
                            </label>
                            <input
                              type="text"
                              value={accountNumber}
                              onChange={(e) => setAccountNumber(e.target.value)}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                              placeholder="12345678"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              IBAN
                            </label>
                            <input
                              type="text"
                              value={iban}
                              onChange={(e) => setIban(e.target.value)}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                              placeholder="GB29 NWBK 6016 1331 9268 19"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            SWIFT/BIC Code
                          </label>
                          <input
                            type="text"
                            value={swift}
                            onChange={(e) => setSwift(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            placeholder="NWBKGB2L"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-md hover:shadow-lg"
                      >
                        Save Company Details
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Team Section */}
              {activeSection === 'team' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">Team & Users</h2>
                      <p className="text-slate-600">Manage team members and pending invitations</p>
                    </div>
                    <button
                      onClick={() => setShowInviteForm(true)}
                      className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite User
                    </button>
                  </div>

                  {/* Active Users Table */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Active Users</h3>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                              Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                              Email
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                              Role
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                              Joined
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <span className="text-yellow-700 font-semibold text-sm">
                                      {user.first_name[0]}
                                      {user.last_name[0]}
                                    </span>
                                  </div>
                                  <span className="font-medium text-slate-900">
                                    {user.first_name} {user.last_name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-slate-600">{user.email}</td>
                              <td className="px-4 py-4">
                                <span
                                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                    user.role === 'admin'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {user.role === 'admin' ? 'Admin' : 'User'}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-slate-600 text-sm">
                                {formatDate(user.created_at)}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                                    title="Change role"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                    title="Remove user"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {users.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                                No team members yet. Invite users to collaborate.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pending Invitations */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">
                      Pending Invitations {invitations.length > 0 && `(${invitations.length})`}
                    </h3>
                    {invitations.length > 0 ? (
                      <div className="space-y-3">
                        {invitations.map((invite) => {
                          const expired = isExpired(invite.expires_at);
                          return (
                            <div
                              key={invite.id}
                              className={`p-4 rounded-lg border ${
                                expired ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Mail className="w-5 h-5 text-slate-400" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-slate-900">{invite.email}</p>
                                      <span
                                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                          expired
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-amber-100 text-amber-700'
                                        }`}
                                      >
                                        {expired ? 'Expired' : 'Pending'}
                                      </span>
                                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                                        {invite.role}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                      Sent {formatDate(invite.created_at)} • Expires{' '}
                                      {formatDate(invite.expires_at)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      copyInviteLink(invite.invitation_link, invite.email)
                                    }
                                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                                    title="Copy invitation link"
                                  >
                                    {copiedLink === invite.email ? (
                                      <>
                                        <Check className="w-4 h-4" /> Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-4 h-4" /> Copy
                                      </>
                                    )}
                                  </button>
                                  <button
                                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                                    title="Resend invitation"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteInvitation(invite.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                    title="Delete invitation"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center border border-slate-200 rounded-lg bg-slate-50">
                        <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-600">No pending invitations</p>
                        <p className="text-sm text-slate-500 mt-1">
                          Invite team members to get started
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* HMRC API Section */}
              {activeSection === 'hmrc' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">HMRC API Integration</h2>
                  <p className="text-slate-600 mb-6">
                    Connect your HMRC API credentials to enable automated submission, refund
                    tracking, and CDS imports
                  </p>

                  {/* Status Banner */}
                  {hmrcStatus === 'connected' ? (
                    <div className="mb-6 p-4 rounded-lg border border-emerald-200 bg-emerald-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-emerald-900">
                            Connected to HMRC{' '}
                            {hmrcEnvironment === 'sandbox' ? 'Sandbox' : 'Production'}
                          </p>
                          {hmrcLastVerified && (
                            <p className="text-sm text-emerald-700">
                              Last verified: {formatDate(hmrcLastVerified)}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                        Active
                      </span>
                    </div>
                  ) : (
                    <div className="mb-6 p-4 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-slate-500" />
                      <p className="text-slate-700">
                        Not connected. Enter your credentials below to connect.
                      </p>
                    </div>
                  )}

                  <form className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Client ID
                      </label>
                      <input
                        type="text"
                        value={hmrcClientId}
                        onChange={(e) => setHmrcClientId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        placeholder="Enter your HMRC Client ID"
                      />
                      <p className="text-xs text-slate-500 mt-1">Obtain from HMRC Developer Hub</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Client Secret
                      </label>
                      <input
                        type="password"
                        value={hmrcClientSecret}
                        onChange={(e) => setHmrcClientSecret(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        placeholder="Enter your HMRC Client Secret"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Keep this secure and never share it
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Environment
                      </label>
                      <select
                        value={hmrcEnvironment}
                        onChange={(e) =>
                          setHmrcEnvironment(e.target.value as 'sandbox' | 'production')
                        }
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      >
                        <option value="sandbox">Sandbox (Testing)</option>
                        <option value="production">Production (Live)</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        Use Sandbox for testing, Production for live submissions
                      </p>
                    </div>

                    {/* Test Result */}
                    {hmrcTestResult && (
                      <div
                        className={`p-4 rounded-lg border ${
                          hmrcTestResult === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-red-200 bg-red-50 text-red-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {hmrcTestResult === 'success' ? (
                            <>
                              <CheckCircle2 className="w-5 h-5" /> Connection successful!
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-5 h-5" /> Connection failed. Check your
                              credentials.
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={handleTestHmrcConnection}
                        disabled={testingHmrc || !hmrcClientId || !hmrcClientSecret}
                        className="px-6 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={`w-4 h-4 ${testingHmrc ? 'animate-spin' : ''}`} />
                        {testingHmrc ? 'Testing...' : 'Test Connection'}
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-md hover:shadow-lg"
                      >
                        Save Credentials
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Gov Gateway Section */}
              {activeSection === 'gov-gateway' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Government Gateway</h2>
                  <p className="text-slate-600 mb-6">
                    Store your Government Gateway credentials for quick access to HMRC services
                  </p>

                  {/* Context Box */}
                  <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50 flex gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-1">About Government Gateway</p>
                      <p>
                        Your Government Gateway credentials allow this software to request CDS
                        import data automatically on your behalf. All credentials are encrypted and
                        stored securely.
                      </p>
                    </div>
                  </div>

                  <form className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        User ID
                      </label>
                      <input
                        type="text"
                        value={govGatewayUserId}
                        onChange={(e) => setGovGatewayUserId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        placeholder="Enter your Government Gateway User ID"
                      />
                      {govGatewayUserId && (
                        <div className="flex items-center gap-2 mt-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs text-emerald-600 font-medium">Valid format</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showGovPassword ? 'text' : 'password'}
                          value={govGatewayPassword}
                          onChange={(e) => setGovGatewayPassword(e.target.value)}
                          className="w-full px-4 py-2.5 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          placeholder="Enter your Government Gateway Password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGovPassword(!showGovPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showGovPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {govGatewayPassword && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            {govGatewayPassword.length >= 8 ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs text-emerald-600 font-medium">
                                  Strong password
                                </span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <span className="text-xs text-amber-600 font-medium">
                                  Password should be at least 8 characters
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        🔒 Credentials are encrypted and stored securely
                      </p>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-md hover:shadow-lg"
                      >
                        Save Credentials
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Invite Team Member</h3>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'user' | 'admin')}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Admins can invite and manage other users
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </UniversalPageLayout>
  );
}
