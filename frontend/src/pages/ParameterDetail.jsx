import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Database, 
  History, 
  Plus,
  Eye,
  EyeOff,
  Copy,
  Calendar,
  User,
  GitBranch,
  Check
} from 'lucide-react';
import apiService from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';

const ParameterDetail = () => {
  const { parameterId } = useParams();
  const navigate = useNavigate();
  
  const [parameter, setParameter] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showValue, setShowValue] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [newVersion, setNewVersion] = useState({
    versionTag: '',
    value: '',
    description: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // For now, we'll need to get the project ID somehow
        // This is a simplified version - in real app you'd pass projectId
        const projects = await apiService.getProjects();
        if (projects.length > 0) {
          const projectId = projects[0].id; // Use first project for demo
          
          const parameterData = await apiService.getParameter(projectId, parameterId);
          setParameter(parameterData);
          
          const versionsData = await apiService.getVersions(projectId, parameterId);
          setVersions(versionsData.versions || []);
          
          if (versionsData.versions && versionsData.versions.length > 0) {
            setSelectedVersion(versionsData.versions[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch parameter details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [parameterId]);

  const handleCopyValue = async () => {
    if (selectedVersion?.decryptedValue) {
      try {
        await navigator.clipboard.writeText(selectedVersion.decryptedValue);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  };

  const handleCreateVersion = async () => {
    try {
      const projects = await apiService.getProjects();
      if (projects.length > 0) {
        const projectId = projects[0].id;
        const createdVersion = await apiService.createVersion(projectId, parameterId, newVersion);
        setVersions([createdVersion, ...versions]);
        setSelectedVersion(createdVersion);
        setShowCreateModal(false);
        setNewVersion({ versionTag: '', value: '', description: '' });
      }
    } catch (error) {
      console.error('Failed to create version:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 bg-neutral-200 rounded animate-pulse"></div>
          <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-neutral-200 rounded-lg animate-pulse"></div>
          <div className="h-96 bg-neutral-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!parameter) {
    return (
      <div className="text-center py-12">
        <Database className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          Parameter not found
        </h3>
        <p className="text-neutral-600 mb-6">
          The parameter you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button onClick={() => navigate('/parameters')} leftIcon={<ArrowLeft size={16} />}>
          Back to Parameters
        </Button>
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
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/parameters')}
            leftIcon={<ArrowLeft size={16} />}
          >
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">{parameter.name}</h1>
            <p className="text-neutral-600 mt-1">
              Parameter in {parameter.project?.name}
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          leftIcon={<Plus size={16} />}
        >
          New Version
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Value */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900">Current Value</h3>
                <div className="flex items-center space-x-2">
                  {selectedVersion && (
                    <Badge variant="primary">
                      v{selectedVersion.versionTag}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowValue(!showValue)}
                    leftIcon={showValue ? <EyeOff size={14} /> : <Eye size={14} />}
                  >
                    {showValue ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Content>
              {selectedVersion ? (
                <div className="space-y-4">
                  <div className="bg-neutral-50 rounded-lg p-4 relative">
                    <pre className="text-sm text-neutral-800 font-mono whitespace-pre-wrap">
                      {showValue 
                        ? selectedVersion.decryptedValue || '[Encrypted Value]'
                        : '••••••••••••••••••••••••••••••••'
                      }
                    </pre>
                    {showValue && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyValue}
                        className="absolute top-2 right-2"
                        leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    )}
                  </div>

                  {selectedVersion.description && (
                    <div>
                      <p className="text-sm font-medium text-neutral-700 mb-1">Description:</p>
                      <p className="text-sm text-neutral-600">{selectedVersion.description}</p>
                    </div>
                  )}

                  <div className="flex items-center space-x-6 text-sm text-neutral-600">
                    <div className="flex items-center space-x-2">
                      <Calendar size={14} />
                      <span>Created {new Date(selectedVersion.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User size={14} />
                      <span>by User</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <GitBranch className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                  <p className="text-neutral-600">No versions available</p>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    Create first version
                  </Button>
                </div>
              )}
            </Card.Content>
          </Card>
        </motion.div>

        {/* Version History */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <Card>
            <Card.Header>
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-neutral-600" />
                <h3 className="text-lg font-semibold text-neutral-900">Version History</h3>
              </div>
            </Card.Header>
            <Card.Content className="space-y-3 max-h-96 overflow-y-auto">
              {versions.length > 0 ? (
                versions.map((version) => (
                  <motion.button
                    key={version.id}
                    onClick={() => setSelectedVersion(version)}
                    whileHover={{ x: 5 }}
                    className={`w-full text-left p-3 rounded-lg transition-colors border ${
                      selectedVersion?.id === version.id
                        ? 'bg-primary-50 border-primary-200 text-primary-700'
                        : 'hover:bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge 
                        variant={selectedVersion?.id === version.id ? 'primary' : 'neutral'}
                        size="sm"
                      >
                        v{version.versionTag}
                      </Badge>
                      <span className="text-xs text-neutral-500">
                        {new Date(version.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {version.description && (
                      <p className="text-sm text-neutral-600 truncate">
                        {version.description}
                      </p>
                    )}
                  </motion.button>
                ))
              ) : (
                <div className="text-center py-6">
                  <History className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                  <p className="text-sm text-neutral-600">No versions yet</p>
                </div>
              )}
            </Card.Content>
          </Card>
        </motion.div>
      </div>

      {/* Create Version Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Version"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Version Tag"
            placeholder="e.g., 1.0.0, latest, prod"
            value={newVersion.versionTag}
            onChange={(e) => setNewVersion({ ...newVersion, versionTag: e.target.value })}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700">Value</label>
            <textarea
              className="input min-h-24 resize-y"
              placeholder="Enter parameter value"
              value={newVersion.value}
              onChange={(e) => setNewVersion({ ...newVersion, value: e.target.value })}
            />
          </div>
          <Input
            label="Description (Optional)"
            placeholder="Describe this version change"
            value={newVersion.description}
            onChange={(e) => setNewVersion({ ...newVersion, description: e.target.value })}
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
              onClick={handleCreateVersion}
              disabled={!newVersion.versionTag || !newVersion.value}
            >
              Create Version
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ParameterDetail;