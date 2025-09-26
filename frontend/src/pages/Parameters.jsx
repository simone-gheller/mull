import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Database, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  FolderOpen,
  Clock
} from 'lucide-react';
import apiService from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

const Parameters = () => {
  const [searchParams] = useSearchParams();
  const selectedProjectId = searchParams.get('project');
  
  const [projects, setProjects] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectsData = await apiService.getProjects();
        setProjects(projectsData);

        // If a specific project is selected, load its parameters
        if (selectedProjectId) {
          const project = projectsData.find(p => p.id === selectedProjectId);
          if (project) {
            setCurrentProject(project);
            const parametersData = await apiService.getParameters(selectedProjectId);
            setParameters(parametersData.parameters);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedProjectId]);

  const handleProjectSelect = async (project) => {
    setCurrentProject(project);
    setLoading(true);
    try {
      const parametersData = await apiService.getParameters(project.id);
      setParameters(parametersData.parameters);
    } catch (error) {
      console.error('Failed to fetch parameters:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredParameters = parameters.filter(param =>
    param.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !currentProject) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="h-96 bg-neutral-200 rounded-lg animate-pulse"></div>
          <div className="lg:col-span-3 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-neutral-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
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
          <h1 className="text-3xl font-bold text-neutral-900">Parameters</h1>
          <p className="text-neutral-600 mt-1">
            Manage configuration parameters across your projects
          </p>
        </div>
        {currentProject && (
          <Button variant="primary" leftIcon={<Plus size={16} />}>
            New Parameter
          </Button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Project Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <Card>
            <Card.Header>
              <h3 className="font-semibold text-neutral-900">Projects</h3>
            </Card.Header>
            <Card.Content className="space-y-2 max-h-96 overflow-y-auto">
              {projects.map((project) => (
                <motion.button
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  whileHover={{ x: 5 }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    currentProject?.id === project.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <FolderOpen className="w-4 h-4" />
                    <div className="flex-1">
                      <p className="font-medium truncate">{project.name}</p>
                      <p className="text-sm text-neutral-500">
                        {project._count?.parameters || 0} params
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </Card.Content>
          </Card>
        </motion.div>

        {/* Parameters Content */}
        <div className="lg:col-span-3 space-y-4">
          {currentProject ? (
            <>
              {/* Search and Filters */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <Input
                    placeholder="Search parameters..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leftIcon={<Search className="w-4 h-4 text-neutral-400" />}
                    className="max-w-md"
                  />
                  <Button variant="outline" leftIcon={<Filter size={16} />}>
                    Filter
                  </Button>
                </div>
                <Badge variant="primary">
                  {currentProject.name}
                </Badge>
              </motion.div>

              {/* Parameters List */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
              >
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-neutral-200 rounded-lg animate-pulse"></div>
                  ))
                ) : filteredParameters.length > 0 ? (
                  filteredParameters.map((parameter, index) => (
                    <motion.div
                      key={parameter.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card hover>
                        <Card.Content className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                                <Database className="w-5 h-5 text-success-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-neutral-900">
                                  {parameter.name}
                                </h4>
                                <div className="flex items-center space-x-4 text-sm text-neutral-500 mt-1">
                                  <div className="flex items-center space-x-1">
                                    <Clock size={14} />
                                    <span>
                                      {parameter.versions?.length || 0} versions
                                    </span>
                                  </div>
                                  <span>
                                    Updated {new Date(parameter.updatedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Button
                                as={Link}
                                to={`/parameters/${parameter.id}`}
                                variant="outline"
                                size="sm"
                                leftIcon={<Eye size={14} />}
                              >
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Edit size={14} />}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Trash2 size={14} className="text-error-600" />}
                              >
                              </Button>
                            </div>
                          </div>

                          {parameter.versions && parameter.versions.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-neutral-200">
                              <p className="text-sm text-neutral-600 mb-2">Recent Versions:</p>
                              <div className="flex space-x-2">
                                {parameter.versions.slice(0, 3).map((version) => (
                                  <Badge key={version.id} variant="neutral" size="sm">
                                    {version.versionTag}
                                  </Badge>
                                ))}
                                {parameter.versions.length > 3 && (
                                  <Badge variant="neutral" size="sm">
                                    +{parameter.versions.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </Card.Content>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Database className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                      {searchTerm ? 'No parameters found' : 'No parameters yet'}
                    </h3>
                    <p className="text-neutral-600 mb-6">
                      {searchTerm 
                        ? `No parameters match "${searchTerm}"`
                        : `Create your first parameter in ${currentProject.name}`
                      }
                    </p>
                    {!searchTerm && (
                      <Button variant="primary" leftIcon={<Plus size={16} />}>
                        Create Parameter
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <FolderOpen className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                Select a Project
              </h3>
              <p className="text-neutral-600">
                Choose a project from the sidebar to view its parameters
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Parameters;