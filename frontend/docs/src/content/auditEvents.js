export const AUDIT_EVENTS = [
  ['config.fetch', 'A token or user fetched resolved config.'],
  ['parameter_value.update', 'A value was changed for an environment.'],
  ['parameter_value.reveal_current', 'A plaintext value was revealed.'],
  ['parameter_value.rollback', 'A value was rolled back to a prior version.'],
  ['access_key.create', 'A personal or organization token was created.'],
  ['access_key.revoke', 'A token was revoked.'],
  ['member.role_update', "A member's role was changed."],
  ['app.create / app.delete', 'An app was created or deleted.'],
  ['environment.create / environment.delete', 'An environment was created or deleted.'],
];
