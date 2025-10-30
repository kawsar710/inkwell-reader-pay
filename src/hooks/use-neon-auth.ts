import { useContext } from 'react';
import { AuthContext } from '../lib/neon-auth';

export function useNeonAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useNeonAuth must be used within a NeonAuthProvider');
  }
  return context;
}