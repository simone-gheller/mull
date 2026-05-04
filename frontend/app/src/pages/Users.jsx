import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users as UsersIcon, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Mail,
  Shield,
  Calendar,
  Edit,
  Trash2
} from 'lucide-react';
import apiService from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersData = await apiService.getUsers();
        setUsers(usersData);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        // Mock data for demo
        setUsers([
          {
            id: '1',
            email: 'admin@example.com',
            displayName: 'Admin User',
            role: 'OWNER',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          },
          {
            id: '2',
            email: 'user@example.com',
            displayName: 'Regular User',
            role: 'MEMBER',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            lastLogin: new Date(Date.now() - 3600000).toISOString()
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'OWNER': return 'error';
      case 'ADMIN': return 'warning';
      case 'MEMBER': return 'primary';
      default: return 'neutral';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-neutral-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Users</h1>
          <p className="text-neutral-600 mt-1">
            Manage team members and their permissions
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />}>
          Invite User
        </Button>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center space-x-4"
      >
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-neutral-400" />}
          />
        </div>
        <Button variant="outline" leftIcon={<Filter size={16} />}>
          Filter
        </Button>
      </motion.div>

      {/* Users List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {filteredUsers.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card hover>
              <Card.Content className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary-600">
                        {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-neutral-900">
                        {user.displayName || 'Unknown User'}
                      </h4>
                      <div className="flex items-center space-x-2 text-sm text-neutral-600">
                        <Mail size={14} />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-neutral-500">
                        <div className="flex items-center space-x-1">
                          <Calendar size={12} />
                          <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                        {user.lastLogin && (
                          <span>
                            Last login {new Date(user.lastLogin).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Shield size={16} className="text-neutral-400" />
                      <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                        {user.role}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Edit size={14} />}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <MoreHorizontal size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {filteredUsers.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <UsersIcon className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            {searchTerm ? 'No users found' : 'No team members yet'}
          </h3>
          <p className="text-neutral-600 mb-6">
            {searchTerm 
              ? `No users match "${searchTerm}"`
              : 'Invite your first team member to get started'
            }
          </p>
          {!searchTerm && (
            <Button variant="primary" leftIcon={<Plus size={16} />}>
              Invite Your First User
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default Users;