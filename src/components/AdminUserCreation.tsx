import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { profileService } from '../services/profileService';

interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

interface AdminUserCreationProps {
  onSuccess?: () => void;
}

export function AdminUserCreation({ onSuccess }: AdminUserCreationProps) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    company: '',
    role: 'viewer' as 'viewer' | 'foreman' | 'project_engineer' | 'admin'
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const profileResult = await profileService.getCurrentUserProfile();
      if (profileResult.data) {
        setIsAdmin(profileResult.data.is_admin || false);
      }
      setLoading(false);
    };

    loadProfile();
  }, [user]);

  const log = (message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time, type, message }]);
    console.log(`[${type.toUpperCase()}]`, message);
  };

  const createUser = async () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      log('Please fill in all required fields (email, password, full name)', 'error');
      return;
    }

    if (formData.password.length < 6) {
      log('Password must be at least 6 characters', 'error');
      return;
    }

    log('=== Starting user creation via admin API ===', 'info');
    log(`Creating user: ${formData.email}`, 'info');

    try {
      // Get current session for authorization
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        log('No active session found', 'error');
        return;
      }

      log('Step 1: Calling create-user edge function...', 'info');

      // Use the edge function to create user with admin API
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          company: formData.company || '',
          role: formData.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.error || 'Unknown error';
        log(`User creation failed (${response.status}): ${errorMsg}`, 'error');
        console.error('Full error response:', result);
        return;
      }

      log(`User created successfully with ID: ${result.user.id}`, 'success');
      log(`Profile and permissions configured`, 'success');
      log(`SUCCESS! User ${formData.email} created with role: ${formData.role}`, 'success');

      // Clear form
      setFormData({
        email: '',
        password: '',
        fullName: '',
        company: '',
        role: 'viewer'
      });

      // Call success callback after a short delay to let user see the success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 1500);

    } catch (err: any) {
      log(`Unexpected error: ${err.message}`, 'error');
      console.error('Full error:', err);
    }

    log('=== User creation attempt completed ===', 'info');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Create New User</h1>

        {/* Current User Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600">
            <strong>Logged in as:</strong> {user?.email}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Admin Status:</strong> {isAdmin ? '✓ Admin' : '✗ Not Admin'}
          </p>
        </div>

        {/* Create User Form */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b-2 border-gray-200 pb-2">
            Create New User
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimum 6 characters"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Company (optional)
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Company Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="viewer">Viewer</option>
                <option value="foreman">Foreman</option>
                <option value="project_engineer">Project Engineer</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={createUser}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                Create User
              </button>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Activity Log</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-md max-h-96 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-gray-500">No activity yet. Fill in the form above to create a user.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-2 pb-2 border-b border-gray-700">
                  <span className="text-gray-500">[{log.time}]</span>{' '}
                  <span className={`font-bold ${
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    'text-blue-400'
                  }`}>
                    {log.type.toUpperCase()}
                  </span>{' '}
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
