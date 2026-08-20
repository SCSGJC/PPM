import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, UserCheck, AlertCircle, Clock, Trash2, Mail, KeyRound, Star, Save, ChevronDown } from 'lucide-react';
import { userApprovalService, UserProfile } from '../services/userApprovalService';
import { userDepartmentService } from '../services/userDepartmentService';
import { departmentService, Department } from '../services/departmentService';
import { useToast } from '../context/ToastContext';

interface UserApprovalManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DepartmentAssignment {
  departments: Set<string>;
  primary: string | null;
}

export function UserApprovalManager({ isOpen, onClose }: UserApprovalManagerProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [userRoles, setUserRoles] = useState<{ [userId: string]: 'admin' | 'project_engineer' | 'foreman' | 'viewer' }>({});
  const [savingRoles, setSavingRoles] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userDepartments, setUserDepartments] = useState<{ [userId: string]: DepartmentAssignment }>({});
  const [savingDepartments, setSavingDepartments] = useState<Set<string>>(new Set());
  const { showToast, confirm } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
      loadUsers();
    }
  }, [isOpen, activeTab]);

  const loadDepartments = async () => {
    const { data, error } = await departmentService.getDepartments();
    if (!error && data) {
      setDepartments(data);
    }
  };

  const loadUserDepartments = async (userIds: string[]) => {
    const assignments: { [userId: string]: DepartmentAssignment } = {};

    for (const userId of userIds) {
      const { data } = await userDepartmentService.getUserDepartments(userId);
      if (data && data.length > 0) {
        const deptSet = new Set(data.map(d => d.department_id));
        const primaryDept = data.find(d => d.is_primary)?.department_id || data[0].department_id;
        assignments[userId] = {
          departments: deptSet,
          primary: primaryDept
        };
      } else {
        assignments[userId] = {
          departments: new Set(),
          primary: null
        };
      }
    }

    setUserDepartments(assignments);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        const { data, error } = await userApprovalService.getPendingUsers();
        if (error) {
          showToast('Failed to load pending users: ' + error.message, 'error');
        } else {
          setUsers(data || []);
          initializeUserRoles(data || []);
          if (data && data.length > 0) {
            await loadUserDepartments(data.map(u => u.id));
          }
        }
      } else {
        const { data, error } = await userApprovalService.getAllUsers();
        if (error) {
          showToast('Failed to load users: ' + error.message, 'error');
        } else {
          setUsers(data || []);
          initializeUserRoles(data || []);
          if (data && data.length > 0) {
            await loadUserDepartments(data.map(u => u.id));
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeUserRoles = (userList: UserProfile[]) => {
    const roles: { [userId: string]: 'admin' | 'project_engineer' | 'foreman' | 'viewer' } = {};
    userList.forEach(user => {
      roles[user.id] = user.role || 'viewer';
    });
    setUserRoles(roles);
  };

  const handleApprove = async (userId: string) => {
    const userNotes = notes[userId];
    const { error } = await userApprovalService.approveUser(userId, userNotes);
    if (error) {
      showToast('Failed to approve user: ' + error.message, 'error');
    } else {
      showToast('User approved successfully!', 'success');
      setNotes({ ...notes, [userId]: '' });
      loadUsers();
    }
  };

  const handleReject = async (userId: string) => {
    const userNotes = notes[userId] || 'Account rejected by admin';
    const confirmed = await confirm('Are you sure you want to reject and REMOVE this user?\n\nThey will be permanently blocked from accessing the system.');

    if (confirmed) {
      const { error } = await userApprovalService.rejectUser(userId, userNotes);
      if (error) {
        showToast('Failed to reject user: ' + error.message, 'error');
      } else {
        showToast('User rejected and removed from the system.', 'success');
        setNotes({ ...notes, [userId]: '' });
        loadUsers();
      }
    }
  };

  const handleRevokeApproval = async (userId: string) => {
    const userNotes = notes[userId] || 'Approval revoked by admin';
    const confirmed = await confirm('Are you sure you want to revoke approval for this user?\n\nThey will lose access to the system.');

    if (confirmed) {
      const { error } = await userApprovalService.revokeApproval(userId, userNotes);
      if (error) {
        showToast('Failed to revoke approval: ' + error.message, 'error');
      } else {
        showToast('User approval revoked successfully.', 'success');
        setNotes({ ...notes, [userId]: '' });
        loadUsers();
      }
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    const confirmed = await confirm(`⚠️ PERMANENT DELETE\n\nAre you sure you want to completely delete ${email}?\n\nThis will:\n• Remove them from the authentication system\n• Delete all their data\n• Free up their email for new signups\n\nThis action CANNOT be undone!`);

    if (confirmed) {
      const { error } = await userApprovalService.deleteUserCompletely(userId);
      if (error) {
        showToast('Failed to delete user: ' + error.message, 'error');
      } else {
        showToast('User permanently deleted from the system.', 'success');
        loadUsers();
      }
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    const confirmed = await confirm(`Send password reset email to ${email}?`);

    if (confirmed) {
      const { error } = await userApprovalService.sendPasswordReset(email);
      if (error) {
        showToast('Failed to send password reset: ' + error.message, 'error');
      } else {
        showToast('Password reset email sent successfully!', 'success');
      }
    }
  };

  const toggleDepartment = (userId: string, departmentId: string) => {
    setUserDepartments(prev => {
      const current = prev[userId] || { departments: new Set(), primary: null };
      const newDepartments = new Set(current.departments);

      if (newDepartments.has(departmentId)) {
        newDepartments.delete(departmentId);
        // If removing the primary, clear primary
        const newPrimary = current.primary === departmentId ? null : current.primary;
        return {
          ...prev,
          [userId]: { departments: newDepartments, primary: newPrimary }
        };
      } else {
        newDepartments.add(departmentId);
        // If this is the first department, make it primary
        const newPrimary = current.primary || departmentId;
        return {
          ...prev,
          [userId]: { departments: newDepartments, primary: newPrimary }
        };
      }
    });
  };

  const setPrimaryDepartment = (userId: string, departmentId: string) => {
    setUserDepartments(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        primary: departmentId
      }
    }));
  };

  const handleSaveDepartments = async (userId: string) => {
    const assignment = userDepartments[userId];
    if (!assignment || assignment.departments.size === 0) {
      showToast('Please select at least one department', 'warning');
      return;
    }

    if (!assignment.primary) {
      showToast('Please select a primary department', 'warning');
      return;
    }

    setSavingDepartments(prev => new Set(prev).add(userId));

    try {
      await userDepartmentService.replaceUserDepartments(
        userId,
        Array.from(assignment.departments),
        assignment.primary
      );
      showToast('Departments saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving departments:', error);
      showToast('Failed to save departments: ' + (error as Error).message, 'error');
    } finally {
      setSavingDepartments(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const toggleUserExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleRoleChange = (userId: string, role: 'admin' | 'project_engineer' | 'foreman' | 'viewer') => {
    setUserRoles(prev => ({
      ...prev,
      [userId]: role
    }));
  };

  const handleSaveRole = async (userId: string) => {
    const role = userRoles[userId];
    if (!role) {
      showToast('Please select a role', 'warning');
      return;
    }

    setSavingRoles(prev => new Set(prev).add(userId));

    try {
      const { error } = await userApprovalService.updateUserRole(userId, role);
      if (error) {
        showToast('Failed to update role: ' + error.message, 'error');
      } else {
        showToast('User role updated successfully!', 'success');
        loadUsers();
      }
    } catch (error) {
      console.error('Error saving role:', error);
      showToast('Failed to save role: ' + (error as Error).message, 'error');
    } finally {
      setSavingRoles(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <UserCheck className="w-6 h-6 text-emerald-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">User Approval Manager</h2>
              <p className="text-sm text-gray-600">Review and approve new user accounts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex gap-2 px-6">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending Approval
              </div>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                All Users
              </div>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading users...</div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mb-3 text-gray-400" />
              <p className="text-lg font-medium">No {activeTab === 'pending' ? 'pending' : ''} users found</p>
              <p className="text-sm">
                {activeTab === 'pending'
                  ? 'All users have been reviewed'
                  : 'No users in the system yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.sort((a, b) => {
                const nameA = (a.full_name || a.email).toLowerCase();
                const nameB = (b.full_name || b.email).toLowerCase();
                return nameA.localeCompare(nameB);
              }).map((user) => {
                const isExpanded = expandedUsers.has(user.id);
                const assignment = userDepartments[user.id];
                const departmentCount = assignment?.departments.size || 0;

                return (
                  <div
                    key={user.id}
                    className={`border rounded-lg transition-all ${
                      user.approved
                        ? 'bg-green-50 border-green-200'
                        : 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between p-4 gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 truncate">{user.email}</h3>
                          {user.approved ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full whitespace-nowrap">
                              <CheckCircle className="w-3 h-3" />
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full whitespace-nowrap">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                          {!isExpanded && (
                            <>
                              <span className="text-xs text-gray-600">
                                {departmentCount} department{departmentCount !== 1 ? 's' : ''}
                              </span>
                              {user.last_sign_in_at && (
                                <span className="text-xs text-gray-500">
                                  • Last online: {new Date(user.last_sign_in_at).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        {!isExpanded && user.full_name && (
                          <p className="text-sm text-gray-600 mt-1">{user.full_name}</p>
                        )}
                      </div>

                      <button
                        onClick={() => toggleUserExpanded(user.id)}
                        className="flex-shrink-0 p-2 hover:bg-white/50 rounded-lg transition-colors"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        <ChevronDown
                          className={`w-5 h-5 text-gray-600 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-200/50 pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">

                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <p className="text-xs text-gray-500">Full Name</p>
                                <p className="text-sm text-gray-900">{user.full_name || 'Not provided'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Company</p>
                                <p className="text-sm text-gray-900">{user.company || 'Not provided'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Registered</p>
                                <p className="text-sm text-gray-900">
                                  {new Date(user.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              {user.approved_at && (
                                <div>
                                  <p className="text-xs text-gray-500">Approved</p>
                                  <p className="text-sm text-gray-900">
                                    {new Date(user.approved_at).toLocaleDateString()}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-gray-500">Last Login</p>
                                <p className="text-sm text-gray-900">
                                  {user.last_sign_in_at
                                    ? new Date(user.last_sign_in_at).toLocaleString()
                                    : 'Never'}
                                </p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs text-gray-500 mb-2">User Role</p>
                                <div className="flex items-center gap-3 mb-2">
                                  <select
                                    value={userRoles[user.id] || 'viewer'}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'project_engineer' | 'foreman' | 'viewer')}
                                    className="flex-1 px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    <option value="viewer">Viewer</option>
                                    <option value="foreman">Foreman</option>
                                    <option value="project_engineer">Project Engineer</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                  <button
                                    onClick={() => handleSaveRole(user.id)}
                                    disabled={savingRoles.has(user.id)}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                  >
                                    <Save className="w-3 h-3" />
                                    {savingRoles.has(user.id) ? 'Saving...' : 'Save Role'}
                                  </button>
                                </div>
                                {user.is_admin && (
                                  <div className="flex items-center gap-1 text-xs text-blue-600 mb-2">
                                    <Star className="w-3 h-3" fill="currentColor" />
                                    <span>Admin User</span>
                                  </div>
                                )}
                                <p className="text-xs text-gray-500 mb-3">
                                  Admins can approve users and manage all roles including other admins
                                </p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs text-gray-500 mb-2">Departments (select multiple)</p>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  {departments.map(dept => {
                                    const deptAssignment = userDepartments[user.id];
                                    const isSelected = deptAssignment?.departments.has(dept.id) || false;
                                    const isPrimary = deptAssignment?.primary === dept.id;

                                    return (
                                      <label
                                        key={dept.id}
                                        className={`flex items-center gap-2 p-2 rounded border-2 cursor-pointer transition-all ${
                                          isPrimary
                                            ? 'border-blue-500 bg-blue-50'
                                            : isSelected
                                            ? 'border-emerald-500 bg-emerald-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleDepartment(user.id, dept.id)}
                                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                        />
                                        <span className="text-sm flex-1">{dept.name}</span>
                                        {isSelected && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              setPrimaryDepartment(user.id, dept.id);
                                            }}
                                            className={`p-1 rounded ${
                                              isPrimary
                                                ? 'text-blue-600'
                                                : 'text-gray-400 hover:text-blue-500'
                                            }`}
                                            title="Set as primary department"
                                          >
                                            <Star className="w-3 h-3" fill={isPrimary ? 'currentColor' : 'none'} />
                                          </button>
                                        )}
                                      </label>
                                    );
                                  })}
                                </div>
                                <button
                                  onClick={() => handleSaveDepartments(user.id)}
                                  disabled={savingDepartments.has(user.id)}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Save className="w-3 h-3" />
                                  {savingDepartments.has(user.id) ? 'Saving...' : 'Save Departments'}
                                </button>
                                <p className="text-xs text-gray-500 mt-1">
                                  Click the star to set primary department
                                </p>
                              </div>
                            </div>

                            {user.approval_notes && (
                              <div className="mb-3">
                                <p className="text-xs text-gray-500">Notes</p>
                                <p className="text-sm text-gray-700 italic">{user.approval_notes}</p>
                              </div>
                            )}

                            <div className="mb-3">
                              <label className="text-xs text-gray-500 mb-1 block">Add Notes</label>
                              <textarea
                                value={notes[user.id] || ''}
                                onChange={(e) => setNotes({ ...notes, [user.id]: e.target.value })}
                                placeholder="Optional notes about this user..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                rows={2}
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            {!user.approved ? (
                              <>
                                <button
                                  onClick={() => handleApprove(user.id)}
                                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors whitespace-nowrap"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(user.id)}
                                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors whitespace-nowrap"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Reject
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleRevokeApproval(user.id)}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors whitespace-nowrap"
                              >
                                <XCircle className="w-4 h-4" />
                                Revoke
                              </button>
                            )}

                            <div className="border-t border-gray-300 my-2"></div>

                            <button
                              onClick={() => handleSendPasswordReset(user.email)}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors whitespace-nowrap"
                              title="Send password reset email"
                            >
                              <KeyRound className="w-4 h-4" />
                              Reset Password
                            </button>

                            <button
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-700 transition-colors whitespace-nowrap"
                              title="Permanently delete user and free email"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete User
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
