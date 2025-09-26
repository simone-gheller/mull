import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  FolderOpen, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Database,
  Calendar,
  Trash2,
  Edit
} from 'lucide-react';
import apiService from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', orgId: '' });

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await apiService.getProjects();
        setProjects(data);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.organization?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateProject = async () => {
    try {
      const createdProject = await apiService.createProject(newProject);
      setProjects([createdProject, ...projects]);
      setShowCreateModal(false);
      setNewProject({ name: '', orgId: '' });
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-neutral-200 rounded-lg animate-pulse"></div>
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
          <h1 className="text-3xl font-bold text-neutral-900">Projects</h1>
          <p className="text-neutral-600 mt-1">
            Manage your configuration projects and parameters
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          leftIcon={<Plus size={16} />}
        >
          New Project
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
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-neutral-400" />}
          />
        </div>
        <Button variant="outline" leftIcon={<Filter size={16} />}>
          Filter
        </Button>
      </motion.div>

      {/* Projects Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredProjects.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card hover className="h-full">
              <Card.Header>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <FolderOpen className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 truncate">
                        {project.name}
                      </h3>
                      <Badge variant="neutral" size="sm">
                        {project.organization?.name}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal size={16} />
                  </Button>
                </div>
              </Card.Header>

              <Card.Content>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-neutral-600">
                      <Database size={16} />
                      <span>{project._count?.parameters || 0} parameters</span>
                    </div>
                    <div className="flex items-center space-x-2 text-neutral-600">
                      <Calendar size={16} />
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-neutral-600">Recent Parameters:</p>
                    {project.parameters && project.parameters.length > 0 ? (
                      <div className="space-y-1">
                        {project.parameters.slice(0, 3).map((param) => (
                          <div
                            key={param.id}
                            className="text-sm text-neutral-700 bg-neutral-50 px-2 py-1 rounded"
                          >
                            {param.name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-500 italic">No parameters yet</p>
                    )}
                  </div>
                </div>
              </Card.Content>

              <Card.Footer>
                <div className="flex items-center space-x-2">
                  <Button
                    as={Link}
                    to={`/parameters?project=${project.id}`}
                    variant="primary"
                    size="sm"
                    className="flex-1"
                  >
                    View Parameters
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit size={16} />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 size={16} className="text-error-600" />
                  </Button>
                </div>
              </Card.Footer>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {filteredProjects.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <FolderOpen className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            {searchTerm ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="text-neutral-600 mb-6">
            {searchTerm 
              ? `No projects match "${searchTerm}"`
              : 'Create your first project to get started with SafeConfig'
            }
          </p>
          {!searchTerm && (
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="primary"
              leftIcon={<Plus size={16} />}
            >
              Create Your First Project
            </Button>
          )}
        </motion.div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Project"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            placeholder="Enter project name"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
          />
          <Input
            label="Organization ID"
            placeholder="Enter organization ID"
            value={newProject.orgId}
            onChange={(e) => setNewProject({ ...newProject, orgId: e.target.value })}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="primary"
              onClick={handleCreateProject}
              disabled={!newProject.name || !newProject.orgId}
            >
              Create Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Projects;