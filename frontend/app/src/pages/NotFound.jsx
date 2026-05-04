import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Shield } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md mx-auto"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="mx-auto w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-8"
        >
          <Shield className="w-10 h-10 text-primary-600" />
        </motion.div>

        {/* 404 Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h1 className="text-8xl font-bold text-primary-600 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
            Page Not Found
          </h2>
          <p className="text-neutral-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              as={Link}
              to="/"
              variant="primary"
              leftIcon={<Home size={16} />}
            >
              Go Home
            </Button>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              leftIcon={<ArrowLeft size={16} />}
            >
              Go Back
            </Button>
          </div>
          
          <p className="text-sm text-neutral-500 mt-6">
            If you believe this is an error, please contact support.
          </p>
        </motion.div>

        {/* Decorative Elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 flex justify-center space-x-2"
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
              className="w-2 h-2 bg-primary-300 rounded-full"
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;