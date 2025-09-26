import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  FolderOpen, 
  Database, 
  Users, 
  Activity,
  Plus,
  TrendingUp,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    projects: 0,
    parameters: 0,
    users: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [recentProjects, setRecentProjects] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch projects
        const projects = await apiService.getProjects();
        setRecentProjects(projects.slice(0, 5)); // Get 5 most recent projects
        
        // Calculate stats
        const totalParameters = projects.reduce((sum, project) => sum + (project._count?.parameters || 0), 0);
        
        setStats({
          projects: projects.length,
          parameters: totalParameters,
          users: 0, // TODO: Implement users count if available
          recentActivity: [] // TODO: Implement activity feed
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Total Projects',
      value: stats.projects,
      icon: FolderOpen,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
      trend: '+12%',
    },
    {
      title: 'Parameters',
      value: stats.parameters,
      icon: Database,
      color: 'text-success-600',
      bgColor: 'bg-success-100',
      trend: '+8%',
    },
    {
      title: 'Team Members',
      value: stats.users,
      icon: Users,
      color: 'text-accent-600',
      bgColor: 'bg-accent-100',
      trend: '+3%',
    },
    {
      title: 'Monthly Activity',
      value: '2.4k',
      icon: Activity,
      color: 'text-warning-600',
      bgColor: 'bg-warning-100',
      trend: '+18%',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-neutral-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-neutral-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">
            Welcome back, {user?.displayName || user?.email || 'User'}!
          </h1>
          <p className="text-neutral-600 mt-1">
            Here's what's happening with your configurations today.
          </p>
        </div>
        <Button
          as={Link}
          to="/projects"
          variant="primary"
          leftIcon={<Plus size={16} />}
        >
          New Project
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card hover className="p-6">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
                    <p className="text-sm text-neutral-600">{stat.title}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <TrendingUp className="w-4 h-4 text-success-600" />
                  <span className="text-sm text-success-600 ml-1">{stat.trend}</span>
                  <span className="text-sm text-neutral-500 ml-1">from last month</span>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900">Recent Projects</h3>
                <Button as={Link} to="/projects" variant="ghost" size="sm">
                  View all
                </Button>
              </div>
            </Card.Header>
            <Card.Content className="space-y-4">
              {recentProjects.length > 0 ? (
                recentProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    whileHover={{ x: 5 }}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">{project.name}</p>
                        <p className="text-sm text-neutral-500">
                          {project._count?.parameters || 0} parameters
                        </p>
                      </div>
                    </div>
                    <Badge variant="neutral" size="sm">
                      {project.organization?.name}
                    </Badge>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                  <p className="text-neutral-600">No projects found</p>
                  <Button
                    as={Link}
                    to="/projects"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    Create your first project
                  </Button>
                </div>
              )}
            </Card.Content>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-neutral-900">Quick Actions</h3>
            </Card.Header>
            <Card.Content className="space-y-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  as={Link}
                  to="/projects"
                  variant="outline"
                  className="w-full justify-start"
                  leftIcon={<Plus size={16} />}
                >
                  Create New Project
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  as={Link}
                  to="/parameters"
                  variant="outline"
                  className="w-full justify-start"
                  leftIcon={<Database size={16} />}
                >
                  Browse Parameters
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  leftIcon={<Shield size={16} />}
                >
                  Security Overview
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  as={Link}
                  to="/users"
                  variant="outline"
                  className="w-full justify-start"
                  leftIcon={<Users size={16} />}
                >
                  Manage Team
                </Button>
              </motion.div>
            </Card.Content>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;