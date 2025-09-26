import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const Card = ({
  children,
  className = '',
  animate = true,
  hover = false,
  ...props
}) => {
  const cardClasses = clsx(
    'bg-white rounded-lg border border-gray-200 shadow-sm',
    {
      'hover:shadow-md hover:border-gray-300 transition-all duration-200': hover,
    },
    className
  );

  const CardComponent = animate ? motion.div : 'div';
  const animationProps = animate ? {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: 'easeOut' },
    ...(hover && {
      whileHover: { y: -2 },
      transition: { type: 'spring', stiffness: 300, damping: 20 }
    })
  } : {};

  return (
    <CardComponent
      className={cardClasses}
      {...animationProps}
      {...props}
    >
      {children}
    </CardComponent>
  );
};

const CardHeader = ({ children, className = '', ...props }) => {
  return (
    <div className={clsx('px-6 py-4 border-b border-gray-200', className)} {...props}>
      {children}
    </div>
  );
};

const CardContent = ({ children, className = '', ...props }) => {
  return (
    <div className={clsx('px-6 py-4', className)} {...props}>
      {children}
    </div>
  );
};

const CardFooter = ({ children, className = '', ...props }) => {
  return (
    <div className={clsx('px-6 py-4 bg-gray-50 rounded-b-lg', className)} {...props}>
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;