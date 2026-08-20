import React, { useState, useEffect } from 'react';
import { Users, Circle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getOnlineUsers,
  getUsersViewingQuotation,
  updateUserPresence,
  markUserOffline,
  subscribeToPresenceChanges,
  UserPresenceWithProfile,
} from '../services/userPresenceService';

export function ActiveUsers() {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<UserPresenceWithProfile[]>([]);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    if (!user) return;

    let isActive = true;

    const updatePresence = () => {
      if (isActive && !document.hidden) {
        updateUserPresence(user.id, true, null);
      }
    };

    updatePresence();

    const interval = setInterval(updatePresence, 30000);

    const handleBeforeUnload = () => {
      markUserOffline(user.id);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && isActive) {
        updatePresence();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isActive = false;
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      markUserOffline(user.id);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let isActive = true;

    const fetchUsers = async () => {
      if (!isActive || document.hidden) return;

      const { data } = await getOnlineUsers();

      if (data && isActive) {
        setActiveUsers(data);
      }
    };

    fetchUsers();

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchUsers();
      }
    }, 10000);

    const channel = subscribeToPresenceChanges(
      null,
      () => {
        if (!document.hidden && isActive) {
          fetchUsers();
        }
      }
    );

    return () => {
      isActive = false;
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, [user]);

  if (!user) return null;

  const totalUsers = activeUsers.length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowList(!showList)}
        className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
        title={`${totalUsers} user${totalUsers !== 1 ? 's' : ''} online - Click to see who's active`}
      >
        <Users className="w-4 h-4 text-green-700" />
        <span className="text-sm font-medium text-green-700">
          {totalUsers}
        </span>
        <Circle className="w-2 h-2 text-green-500 fill-green-500 animate-pulse" />
      </button>

      {showList && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center"
            onClick={() => setShowList(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-4">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
              <Users className="w-5 h-5 text-green-700" />
              <h3 className="font-semibold text-gray-900">
                Users Online ({totalUsers})
              </h3>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activeUsers.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  No users online
                </div>
              ) : (
                activeUsers.map((activeUser) => {
                  const isCurrentUser = activeUser.user_id === user.id;

                  return (
                    <div
                      key={activeUser.user_id}
                      className={`flex items-start gap-3 p-2 rounded-lg ${isCurrentUser ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}
                    >
                      <Circle className="w-2 h-2 text-green-500 fill-green-500 flex-shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {activeUser.full_name || activeUser.email || 'Unknown User'}
                          </div>
                          {isCurrentUser && (
                            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                        {activeUser.full_name && activeUser.email && (
                          <div className="text-xs text-gray-500 truncate">
                            {activeUser.email}
                          </div>
                        )}
                        {activeUser.current_quotation_id ? (
                          <div className="text-xs text-gray-600 mt-1">
                            Viewing a proposal
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 mt-1">
                            On dashboard
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
