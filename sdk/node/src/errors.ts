export class MullError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'MullError';
  }
}

export class MullAuthError extends MullError {
  constructor(message = 'Invalid or expired token') {
    super(message, 'AUTH_ERROR');
    this.name = 'MullAuthError';
  }
}

export class MullNotFoundError extends MullError {
  constructor(resource: string) {
    super(`Not found: ${resource}`, 'NOT_FOUND');
    this.name = 'MullNotFoundError';
  }
}

export class MullNetworkError extends MullError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
    this.name = 'MullNetworkError';
  }
}

export class MullConfigError extends MullError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'MullConfigError';
  }
}
