#!/usr/bin/env node

// GrdlHub Debug Script
// This script helps diagnose common issues

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

console.log('🔍 GrdlHub Debug Script\n');

async function checkEnvironmentVariables() {
  console.log('📋 Checking Environment Variables...');
  
  try {
    const envPath = join(projectRoot, '.env.local');
    const envContent = await readFile(envPath, 'utf-8');
    
    const requiredVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID'
    ];
    
    const foundVars = {};
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && key.startsWith('VITE_FIREBASE_')) {
        foundVars[key.trim()] = value.trim();
      }
    });
    
    let allFound = true;
    requiredVars.forEach(varName => {
      if (foundVars[varName]) {
        console.log(`  ✅ ${varName}: Found`);
      } else {
        console.log(`  ❌ ${varName}: Missing`);
        allFound = false;
      }
    });
    
    if (allFound) {
      console.log('  🎉 All required environment variables found\n');
    } else {
      console.log('  ⚠️ Some environment variables are missing\n');
    }
    
    return allFound;
    
  } catch (error) {
    console.log(`  ❌ Error reading .env.local: ${error.message}\n`);
    return false;
  }
}

async function checkProjectStructure() {
  console.log('📁 Checking Project Structure...');
  
  const requiredFiles = [
    'package.json',
    'vite.config.js',
    'index.html',
    'auth.html',
    'src/main-app.js',
    'src/auth-app.js',
    'src/auth-standalone.js',
    'src/accessControl.js',
    'firestore.rules'
  ];
  
  let allFound = true;
  
  for (const file of requiredFiles) {
    try {
      await readFile(join(projectRoot, file));
      console.log(`  ✅ ${file}: Found`);
    } catch (error) {
      console.log(`  ❌ ${file}: Missing or inaccessible`);
      allFound = false;
    }
  }
  
  if (allFound) {
    console.log('  🎉 All required files found\n');
  } else {
    console.log('  ⚠️ Some required files are missing\n');
  }
  
  return allFound;
}

async function checkPackageJson() {
  console.log('📦 Checking package.json...');
  
  try {
    const packagePath = join(projectRoot, 'package.json');
    const packageContent = await readFile(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);
    
    const requiredDeps = ['firebase', 'vite', 'vite-plugin-pwa', 'idb'];
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    let allFound = true;
    requiredDeps.forEach(dep => {
      if (allDeps[dep]) {
        console.log(`  ✅ ${dep}: ${allDeps[dep]}`);
      } else {
        console.log(`  ❌ ${dep}: Missing`);
        allFound = false;
      }
    });
    
    // Check scripts
    const requiredScripts = ['dev', 'build', 'check-firebase'];
    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        console.log(`  ✅ script:${script}: Found`);
      } else {
        console.log(`  ❌ script:${script}: Missing`);
        allFound = false;
      }
    });
    
    if (allFound) {
      console.log('  🎉 package.json looks good\n');
    } else {
      console.log('  ⚠️ package.json has some issues\n');
    }
    
    return allFound;
    
  } catch (error) {
    console.log(`  ❌ Error reading package.json: ${error.message}\n`);
    return false;
  }
}

async function suggestNextSteps(envOk, structureOk, packageOk) {
  console.log('🚀 Suggestions:');
  
  if (!envOk) {
    console.log('  1. ⚠️ Fix environment variables in .env.local');
    console.log('     - Copy .env.example to .env.local');
    console.log('     - Fill in your Firebase project details from console.firebase.google.com');
  }
  
  if (!structureOk) {
    console.log('  2. ⚠️ Some project files are missing - check git status');
  }
  
  if (!packageOk) {
    console.log('  3. ⚠️ Install missing dependencies with: npm install');
  }
  
  if (envOk && structureOk && packageOk) {
    console.log('  ✅ Project structure looks good!');
    console.log('  📋 To debug further:');
    console.log('     1. Run: npm run dev');
    console.log('     2. Open: http://localhost:5173/debug.html');
    console.log('     3. Test Firebase config and auth state');
    console.log('     4. Check browser console for JavaScript errors');
    console.log('     5. Verify Firebase Authentication is enabled in console.firebase.google.com');
  }
  
  console.log('\n📚 Useful commands:');
  console.log('  - npm run check-firebase  # Check Firebase configuration');
  console.log('  - npm run dev             # Start development server');
  console.log('  - npm run build           # Build for production');
  console.log('  - Open debug.html         # Use debug console');
}

async function main() {
  const envOk = await checkEnvironmentVariables();
  const structureOk = await checkProjectStructure();
  const packageOk = await checkPackageJson();
  
  await suggestNextSteps(envOk, structureOk, packageOk);
}

main().catch(console.error);
