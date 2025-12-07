import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Manually load .env and .env.local files
function loadEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            result[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
  }
  return result;
}

export default defineConfig(() => {
    const envDir = process.cwd();
    const envFromFile = {
      ...loadEnvFile(path.join(envDir, '.env')),
      ...loadEnvFile(path.join(envDir, '.env.local')),
    };
    
    // Check for API key in various formats
    const apiKey = envFromFile.GEMINI_API_KEY || envFromFile.VITE_GEMINI_API_KEY || envFromFile.API_KEY;

    console.log('📁 Looking for env files in:', envDir);
    console.log('🔑 Found keys:', Object.keys(envFromFile));

    if (apiKey) {
      console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');
    } else {
      console.warn('⚠️  WARNING: No API Key found in environment configuration.');
    }

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
