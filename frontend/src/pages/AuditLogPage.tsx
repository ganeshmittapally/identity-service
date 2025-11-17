import React, { useEffect, useState } from 'react';
import { Card, CardTitle, Input, Button, Alert } from '@components/index';
import { Search, Filter, Download, Clock, User, Shield, AlertCircle } from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  actorEmail: string;
  resource: string;
  resourceId: string;
  status: 'success' | 'failure';
  ipAddress: string;
  userAgent: string;
  details?: string;
}

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const actionTypes = [
    'all',
    'login',
    'logout',
    'register',
    'password_change',
    'twofa_enable',
    'twofa_disable',
    'client_create',
    'client_delete',
    'client_update',
    'admin_action',
  ];

  useEffect(() => {
    // Simulate fetching audit logs from API
    const mockLogs: AuditLog[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        action: 'login',
        actor: 'John Doe',
        actorEmail: 'john@example.com',
        resource: 'User',
        resourceId: 'user123',
        status: 'success',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        action: 'client_create',
        actor: 'Jane Smith',
        actorEmail: 'jane@example.com',
        resource: 'OAuthClient',
        resourceId: 'client456',
        status: 'success',
        ipAddress: '10.0.0.5',
        userAgent: 'Mozilla/5.0...',
        details: 'Created web application client',
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        action: 'password_change',
        actor: 'John Doe',
        actorEmail: 'john@example.com',
        resource: 'User',
        resourceId: 'user123',
        status: 'success',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        action: 'twofa_enable',
        actor: 'Admin User',
        actorEmail: 'admin@example.com',
        resource: 'User',
        resourceId: 'user789',
        status: 'success',
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0...',
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 18000000).toISOString(),
        action: 'login',
        actor: 'Invalid Actor',
        actorEmail: 'hacker@evil.com',
        resource: 'User',
        resourceId: 'user123',
        status: 'failure',
        ipAddress: '203.0.113.45',
        userAgent: 'curl/7.68...',
        details: 'Invalid credentials',
      },
    ];

    setLogs(mockLogs);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let filtered = logs;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.actorEmail.toLowerCase().includes(term) ||
          log.action.toLowerCase().includes(term) ||
          log.resourceId.toLowerCase().includes(term) ||
          log.ipAddress.includes(term)
      );
    }

    // Filter by action
    if (selectedAction !== 'all') {
      filtered = filtered.filter((log) => log.action === selectedAction);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((log) => log.status === selectedStatus);
    }

    // Filter by date range
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      filtered = filtered.filter((log) => new Date(log.timestamp) >= fromDate);
    }
    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => new Date(log.timestamp) <= toDate);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, selectedAction, selectedStatus, dateRange]);

  const handleDownloadLogs = () => {
    const csv = [
      ['Timestamp', 'Action', 'Actor', 'Email', 'Resource', 'Status', 'IP Address'].join(','),
      ...filteredLogs.map((log) =>
        [
          log.timestamp,
          log.action,
          log.actor,
          log.actorEmail,
          log.resource,
          log.status,
          log.ipAddress,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
      case 'logout':
        return <User size={16} />;
      case 'client_create':
      case 'client_delete':
      case 'client_update':
        return <Shield size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('client')) return 'text-blue-600';
    if (action.includes('twofa')) return 'text-green-600';
    if (action.includes('password')) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-600 mt-1">View system-wide activity and security events</p>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by email, action, resource, or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {actionTypes.map((action) => (
                  <option key={action} value={action}>
                    {action === 'all' ? 'All Actions' : action.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedAction('all');
                setSelectedStatus('all');
                setDateRange({ from: '', to: '' });
              }}
            >
              Reset Filters
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex items-center gap-2 ml-auto"
              onClick={handleDownloadLogs}
            >
              <Download size={16} />
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold">{filteredLogs.length}</span> of{' '}
          <span className="font-semibold">{logs.length}</span> logs
        </p>
      </div>

      {/* Logs List */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <svg
              className="animate-spin h-8 w-8 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No audit logs found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Log Item */}
                <button
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  className="w-full p-4 text-left flex items-center justify-between"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Timestamp */}
                    <div>
                      <p className="text-xs text-gray-500">Time</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    <div>
                      <p className="text-xs text-gray-500">Action</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-sm font-medium ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Actor */}
                    <div>
                      <p className="text-xs text-gray-500">By</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{log.actorEmail}</p>
                    </div>

                    {/* Status */}
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <span
                        className={`inline-block text-xs font-semibold px-2 py-1 rounded mt-1 ${
                          log.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>

                    {/* IP Address */}
                    <div>
                      <p className="text-xs text-gray-500">IP Address</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{log.ipAddress}</p>
                    </div>
                  </div>

                  {/* Expand Icon */}
                  <div className="ml-4">
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        expandedLog === log.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedLog === log.id && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Resource</p>
                        <p className="text-gray-900 font-medium mt-1">
                          {log.resource} ({log.resourceId})
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Actor Name</p>
                        <p className="text-gray-900 font-medium mt-1">{log.actor}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-gray-500 text-xs">User Agent</p>
                        <p className="text-gray-900 font-mono text-xs mt-1 break-all">
                          {log.userAgent}
                        </p>
                      </div>
                      {log.details && (
                        <div className="md:col-span-2">
                          <p className="text-gray-500 text-xs">Details</p>
                          <p className="text-gray-900 mt-1">{log.details}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
