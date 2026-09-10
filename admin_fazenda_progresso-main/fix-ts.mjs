import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      results.push(file);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src')).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove unused React imports
  content = content.replace(/^import React from 'react';\r?\n/m, '');
  
  // Fix ReactNode import in AuthContext.tsx
  content = content.replace(/import React, \{ createContext, useContext, useState, ReactNode \} from 'react';/, "import { createContext, useContext, useState } from 'react';\nimport type { ReactNode } from 'react';");

  // Fix AppRoutes.tsx React import
  content = content.replace(/import React from 'react';\r?\n/, '');
  content = content.replace(/children: React\.ReactNode/g, 'children: ReactNode');
  if (file.includes('AppRoutes.tsx')) {
      content = "import type { ReactNode } from 'react';\n" + content;
  }
  
  // Fix User type import
  content = content.replace(/import \{ User \} from '\.\.\/types';/g, "import type { User } from '../types';");

  fs.writeFileSync(file, content, 'utf8');
}

console.log("Fixed TS errors");
