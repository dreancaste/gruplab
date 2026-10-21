import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'gruplabStorage',
  access: (allow) => ({
    'cards/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});
