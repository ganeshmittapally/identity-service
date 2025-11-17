import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardTitle, Table, Alert, Modal } from '@components/index';
import { useClients } from '@hooks/useClients';
import { ClientModal } from '@components/ClientModal';
import { Plus, Copy, Trash2, Edit2, Eye } from 'lucide-react';

export const ClientsPage: React.FC = () => {
  const { clients, isLoading, error, pagination, fetchClients, createClient, deleteClient } = useClients();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [copiedSecret, setCopiedSecret] = useState('');

  useEffect(() => {
    fetchClients((currentPage - 1) * pagination.limit, pagination.limit);
  }, [currentPage]);

  const handleCreateClient = async (data: any) => {
    try {
      await createClient(data);
      setShowCreateModal(false);
      fetchClients((currentPage - 1) * pagination.limit, pagination.limit);
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      try {
        await deleteClient(clientId);
        fetchClients((currentPage - 1) * pagination.limit, pagination.limit);
      } catch (err) {
        // Error handled by hook
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(text);
    setTimeout(() => setCopiedSecret(''), 2000);
  };

  const columns = [
    {
      key: 'clientName',
      label: 'Application Name',
      render: (value: string, row: any) => (
        <div>
          <p className="font-medium text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{row.clientId}</p>
        </div>
      ),
    },
    {
      key: 'clientType',
      label: 'Type',
      render: (value: string) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm capitalize">
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded text-sm capitalize ${
          value === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'tokenCount',
      label: 'Tokens Used',
      render: (value: number) => (
        <span className="font-medium text-gray-900">{value}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">OAuth Clients</h1>
          <p className="text-gray-600 mt-1">Manage your registered applications</p>
        </div>
        <Button
          variant="primary"
          size="md"
          className="flex items-center gap-2"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={18} />
          Create Client
        </Button>
      </div>

      {error && (
        <Alert type="error" title="Error" closable>
          {error}
        </Alert>
      )}

      <Card>
        <CardTitle level="h2">Your Applications</CardTitle>
        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <svg
                className="animate-spin h-8 w-8 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No OAuth clients created yet</p>
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                Create Your First Client
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map((client) => (
                <div
                  key={client.clientId}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{client.clientName}</p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{client.clientId}</p>
                  </div>

                  <div className="flex items-center gap-2 mr-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs capitalize">
                      {client.clientType}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        client.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {client.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedClient(client);
                        setShowSecretModal(true);
                      }}
                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={18} className="text-blue-600" />
                    </button>
                    <button
                      onClick={() => navigate(`/clients/${client.clientId}/edit`)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={18} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.clientId)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <ClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateClient}
        isLoading={isLoading}
      />

      {/* Client Details Modal */}
      <Modal
        isOpen={showSecretModal}
        onClose={() => {
          setShowSecretModal(false);
          setSelectedClient(null);
        }}
        title="Client Details"
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setShowSecretModal(false)}>
            Close
          </Button>
        }
      >
        {selectedClient && (
          <div className="space-y-6">
            <Alert type="warning" title="Secure Your Credentials">
              Never share your client secret! Keep it safe as you would a password.
            </Alert>

            <div>
              <label className="form-label">Client ID</label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <code className="flex-1 text-sm font-mono text-gray-900">{selectedClient.clientId}</code>
                <button
                  onClick={() => copyToClipboard(selectedClient.clientId)}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                >
                  {copiedSecret === selectedClient.clientId ? (
                    '✓ Copied'
                  ) : (
                    <Copy size={18} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="form-label">Client Secret</label>
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <code className="flex-1 text-sm font-mono text-gray-900">••••••••••••••••</code>
                <button
                  onClick={() => copyToClipboard('your-client-secret')}
                  className="p-2 hover:bg-red-100 rounded transition-colors"
                >
                  <Copy size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Shown only at creation time</p>
            </div>

            <div>
              <label className="form-label">Redirect URIs</label>
              <div className="space-y-2">
                {selectedClient.redirectUris?.map((uri: string, idx: number) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded text-sm text-gray-900">
                    {uri}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">Scopes</label>
              <div className="flex flex-wrap gap-2">
                {selectedClient.allowedScopes?.map((scope: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {scope}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
