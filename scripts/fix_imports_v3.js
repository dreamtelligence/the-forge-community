const fs = require('fs');
const path = require('path');

const replacements = {
    "@/lib/ventures/index/access": "@/lib/ventures/access",
    "@/lib/ventures/index/index": "@/lib/ventures/index",
    "@/lib/ventures/index/personal-studio": "@/lib/ventures/personal-studio",
    "@/lib/ventures/index/templates": "@/lib/ventures/templates",
    "@/lib/rate-limit": "@/lib/security/rate-limit"
};

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.next')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const root = process.cwd();
const files = walk(root);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Fix absolute alias imports
    Object.keys(replacements).forEach(oldPath => {
        const newPath = replacements[oldPath];
        const regexes = [
            new RegExp(`(['"])${oldPath}(['"])`, 'g'),
            new RegExp(`(['"])${oldPath}/`, 'g')
        ];

        if (regexes[0].test(content)) {
            content = content.replace(regexes[0], `$1${newPath}$2`);
            changed = true;
        }
        if (regexes[1].test(content)) {
            content = content.replace(regexes[1], `$1${newPath}/`);
            changed = true;
        }
    });

    // Fix specific broken relative imports in lib/ai/
    if (file.includes('lib/ai/')) {
        if (content.includes("from './ai'")) {
            content = content.replace(/from '\.\/ai'/g, "from './index'");
            changed = true;
        }
        if (content.includes('from "./ai"')) {
            content = content.replace(/from "\.\/ai"/g, 'from "./index"');
            changed = true;
        }
        if (content.includes("from './research'")) {
            // Check if it's research.ts trying to import from itself or others
            if (file.endsWith('research.ts')) {
                 // research.ts should probably import from research-core if needed, 
                 // but let's see. The error said braveSearch not found in research.ts
            }
        }
    }

    // Fix broken relative imports in lib/security/
    if (file.includes('lib/security/')) {
        if (content.includes("from './ai'")) {
            content = content.replace(/from '\.\/ai'/g, "from '../ai'");
            changed = true;
        }
        if (content.includes('from "./ai"')) {
            content = content.replace(/from "\.\/ai"/g, 'from "../ai"');
            changed = true;
        }
        if (content.includes("from './prisma'")) {
            content = content.replace(/from '\.\/prisma'/g, "from '../database/prisma'");
            changed = true;
        }
        if (content.includes('from "./prisma"')) {
            content = content.replace(/from "\.\/prisma"/g, 'from "../database/prisma"');
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Updated imports in: ${path.relative(root, file)}`);
    }
});
