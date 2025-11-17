import React, { useState } from 'react';
import { Button, Input, Modal, Alert, Checkbox } from '@components/index';
import { OAuthClient, CreateClientRequest, UpdateClientRequest } from '@types/index';
import { validateClientName, validateRedirectUri } from '@utils/validation';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClientRequest | UpdateClientRequest) => Promise<void>;
  client?: OAuthClient;
  isLoading?: boolean;
}

export const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, onSubmit, client, isLoading = false }) => {
  const [formData, setFormData] = useState({
    clientName: client?.clientName || '',
    clientType: client?.clientType || 'web',
    redirectUris: client?.redirectUris?.join('\n') || '',
    scopes: client?.allowedScopes?.join(', ') || 'openid profile email',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientName) {
      newErrors.clientName = 'Client name is required';
    } else if (!validateClientName(formData.clientName)) {
      newErrors.clientName = 'Client name must be 3-100 characters';
    }

    if (!formData.redirectUris) {
      newErrors.redirectUris = 'At least one redirect URI is required';
    } else {
      const uris = formData.redirectUris.split('\n').filter(u => u.trim());
      const invalidUris = uris.filter(uri => !validateRedirectUri(uri.trim()));
      if (invalidUris.length > 0) {
        newErrors.redirectUris = `Invalid URI(s): ${invalidUris.join(', ')}`;
      }
    }

    if (!client && !agreedToTerms) {
      newErrors.terms = 'You must agree to the terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const redirectUris = formData.redirectUris.split('\n').map(u => u.trim()).filter(u => u);

    try {
      if (client) {
        await onSubmit({
          clientName: formData.clientName,
          clientType: formData.clientType as any,
          redirectUris,
          allowedScopes: formData.scopes.split(',').map(s => s.trim()),
        });
      } else {
        await onSubmit({
          clientName: formData.clientName,
          clientType: formData.clientType as any,
          redirectUris,
          allowedScopes: formData.scopes.split(',').map(s => s.trim()),
        });
      }
      handleClose();
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleClose = () => {
    setFormData({
      clientName: client?.clientName || '',
      clientType: client?.clientType || 'web',
      redirectUris: client?.redirectUris?.join('\n') || '',
      scopes: client?.allowedScopes?.join(', ') || 'openid profile email',
    });
    setErrors({});
    setAgreedToTerms(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={client ? 'Edit OAuth Client' : 'Create OAuth Client'}
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isLoading}>
            {client ? 'Update Client' : 'Create Client'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="clientName" className="form-label">Client Name</label>
          <Input
            id="clientName"
            name="clientName"
            placeholder="My Application"
            value={formData.clientName}
            onChange={handleChange}
            error={errors.clientName}
            fullWidth
          />
        </div>

        <div>
          <label htmlFor="clientType" className="form-label">Client Type</label>
          <select
            id="clientType"
            name="clientType"
            value={formData.clientType}
            onChange={handleChange}
            className="form-input w-full"
            disabled={!!client}
          >
            <option value="web">Web Application</option>
            <option value="native">Native Application</option>
            <option value="spa">Single Page Application</option>
          </select>
        </div>

        <div>
          <label htmlFor="redirectUris" className="form-label">Redirect URIs</label>
          <textarea
            id="redirectUris"
            name="redirectUris"
            placeholder="https://example.com/callback&#10;https://example.com/logout"
            value={formData.redirectUris}
            onChange={handleChange as any}
            className="form-input w-full min-h-24 resize-vertical"
          />
          <p className="text-xs text-gray-500 mt-1">Enter one URI per line</p>
          {errors.redirectUris && <p className="text-xs text-red-600 mt-1">{errors.redirectUris}</p>}
        </div>

        <div>
          <label htmlFor="scopes" className="form-label">Scopes</label>
          <Input
            id="scopes"
            name="scopes"
            placeholder="openid profile email"
            value={formData.scopes}
            onChange={handleChange}
            helperText="Comma-separated list of scopes"
            fullWidth
          />
        </div>

        {!client && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <Checkbox
              id="terms"
              label="I understand that I will receive a client secret that must be kept secure"
              checked={agreedToTerms}
              onChange={(e) => {
                setAgreedToTerms((e.target as HTMLInputElement).checked);
                if (errors.terms) {
                  setErrors({ ...errors, terms: '' });
                }
              }}
            />
          </div>
        )}
      </form>
    </Modal>
  );
};
