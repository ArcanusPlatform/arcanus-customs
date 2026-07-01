import { useEffect, useMemo, useState } from 'react';
import {
  Info,
  Users,
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowUpDown,
  Mail,
  Phone,
  Building2,
} from 'lucide-react';
import { contactsAPI } from '@/lib/api-service';
import type { Contact } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import SupportContactModal, {
  SupportContactFormData,
  SupportContactType,
} from '@/components/SupportContactModal';
import SearchFilterBar from '@/components/ui/SearchFilterBar';

export default function Contacts() {
  const { settings } = useSettings();
  const [directoryContacts, setDirectoryContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    open: boolean;
    type: SupportContactType;
    contact: Contact | null;
  }>({ open: false, type: 'agent', contact: null });
  const [isSaving, setIsSaving] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'agent' | 'hmrc'>('all');
  const [sortColumn, setSortColumn] = useState<'name' | 'organisation' | 'email'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const userType = settings.userType === 'agent' ? 'AGENT' : 'SELF';

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const loadContacts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await contactsAPI.getContacts({
        type: ['agent', 'hmrc'],
        search: search || undefined,
        sort_by: 'name',
        sort_order: 'asc',
        limit: 200,
      });
      setDirectoryContacts(response.contacts);
    } catch (err) {
      console.error('Failed to load support contacts', err);
      setError(err instanceof Error ? err.message : 'Unable to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userType === 'AGENT') {
      loadContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, userType]);

  const filteredAndSortedContacts = useMemo(() => {
    let filtered = [...directoryContacts];

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((contact) => contact.type === filterType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: string = '';
      let bVal: string = '';

      switch (sortColumn) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'organisation':
          aVal = (a.contact_person || '').toLowerCase();
          bVal = (b.contact_person || '').toLowerCase();
          break;
        case 'email':
          aVal = (a.email || '').toLowerCase();
          bVal = (b.email || '').toLowerCase();
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [directoryContacts, filterType, sortColumn, sortDirection]);

  const agentContacts = useMemo(
    () => directoryContacts.filter((contact) => contact.type === 'agent'),
    [directoryContacts]
  );
  const hmrcContacts = useMemo(
    () => directoryContacts.filter((contact) => contact.type === 'hmrc'),
    [directoryContacts]
  );

  const openModal = (type: SupportContactType, contact: Contact | null = null) => {
    setModalState({ open: true, type, contact });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, open: false, contact: null }));
  };

  const handleSupportSubmit = async (data: SupportContactFormData) => {
    setIsSaving(true);
    try {
      if (modalState.contact) {
        await contactsAPI.updateContact(modalState.contact.id, {
          ...modalState.contact,
          ...data,
        });
      } else {
        await contactsAPI.createContact({
          ...data,
          type: modalState.type,
        } as Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'created_by'>);
      }
      closeModal();
      loadContacts();
    } catch (err) {
      console.error('Failed to save contact', err);
      alert('Unable to save contact');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async (contact: Contact) => {
    if (!confirm(`Remove ${contact.name} from the directory?`)) return;
    try {
      await contactsAPI.deleteContact(contact.id);
      loadContacts();
    } catch (err) {
      console.error('Failed to delete contact', err);
      alert('Unable to delete contact');
    }
  };

  if (userType === 'SELF') {
    return (
      <div className="dashboard">
        <div className="header">
          <div>
            <h1>Contacts</h1>
            <p>Contact management is reserved for Agent plans</p>
          </div>
        </div>
        <div
          style={{
            maxWidth: '560px',
            margin: '3rem auto',
            padding: '2.5rem',
            borderRadius: '20px',
            border: '1px solid rgba(59,130,246,.15)',
            background: 'linear-gradient(145deg, rgba(59,130,246,.08), rgba(15,23,42,.5))',
            textAlign: 'center',
            color: '#e2e8f0',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              margin: '0 auto 1.5rem',
              background: 'rgba(59,130,246,.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Info size={36} />
          </div>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Agent Directory Access</h2>
          <p style={{ lineHeight: 1.6 }}>
            Client management now lives in the Clients module. To unlock the Agents & HMRC
            directory, upgrade to an Agent plan or contact support for access.
          </p>
          <button
            onClick={() => (window.location.href = '/settings')}
            style={{
              marginTop: '1.5rem',
              border: 0,
              padding: '0.75rem 1.75rem',
              borderRadius: '999px',
              background: '#3b82f6',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            Review Plan Options
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border-b" style={{ borderColor: 'var(--color-border-soft)' }}>
        <div className="px-6 py-6" style={{ backgroundColor: 'var(--color-chrome)' }}>
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text-light)' }}>Contacts</h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Manage agent partners and HMRC office contacts</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => openModal('agent')} className="btn-secondary">
                  <Plus size={20} /> Add Agent
                </button>
                <button onClick={() => openModal('hmrc')} className="btn-primary btn-contacts">
                  <Plus size={20} /> Add HMRC Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Users className="mb-3 h-8 w-8 text-amber-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total Contacts
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{directoryContacts.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Building2 className="mb-3 h-8 w-8 text-blue-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Agent Partners
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{agentContacts.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <FileText className="mb-3 h-8 w-8 text-emerald-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              HMRC Offices
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{hmrcContacts.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Mail className="mb-3 h-8 w-8 text-purple-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quick Access
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {directoryContacts.filter((c) => c.email).length}
            </p>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search contacts by name, email, or organization..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-full border-0 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {[
                { label: 'All Contacts', value: 'all' },
                { label: 'Agent Partners', value: 'agent' },
                { label: 'HMRC Offices', value: 'hmrc' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterType(filter.value as typeof filterType)}
                  className={`rounded-full px-4 py-1 ${
                    filterType === filter.value
                      ? 'bg-black text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        {/* Contacts Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            {isLoading ? (
              <p className="py-10 text-center text-sm text-slate-500">Loading contacts...</p>
            ) : filteredAndSortedContacts.length === 0 ? (
              <div className="py-10 text-center">
                <Users className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                <p className="text-slate-600">No contacts match your search.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900"
                      >
                        Name
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('organisation')}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900"
                      >
                        Contact Person
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('email')}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900"
                      >
                        Email
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Location
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            {contact.type === 'agent' ? (
                              <Building2 className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </div>
                          <span className="font-semibold text-slate-900">{contact.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            contact.type === 'agent'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {contact.type === 'agent' ? 'Agent' : 'HMRC'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {contact.contact_person || '—'}
                      </td>
                      <td className="px-6 py-4">
                        {contact.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {contact.email}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {contact.phone ? (
                          <a
                            href={`tel:${contact.phone}`}
                            className="flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {contact.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {contact.city || contact.postcode ? (
                          <>
                            {contact.city}
                            {contact.city && contact.postcode && ', '}
                            {contact.postcode}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openModal(contact.type as SupportContactType, contact)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteContact(contact)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <SupportContactModal
        isOpen={modalState.open}
        type={modalState.type}
        contact={modalState.contact}
        onClose={closeModal}
        onSubmit={handleSupportSubmit}
        isSaving={isSaving}
      />
    </>
  );
}
