const fs = require('fs');
const path = require('path');

const replacements = {
    "../lib/integrations/notion": "../lib/integrations/notion",
    "../lib/database/prisma": "../lib/database/prisma",
    "../lib/ai/index/index": "../lib/ai/index/index",
    "../lib/billing/v2": "../lib/billing/v2",
    "../lib/finance/energy": "../lib/finance/energy",
    "../lib/security/rate-limit": "../lib/security/rate-limit",
    "@/lib/database/prisma": "@/lib/database/prisma",
    "@/lib/integrations/notion": "@/lib/integrations/notion"
};

const scriptsDir = path.resolve(__dirname, '..', 'scripts');
const list = fs.readdirSync(scriptsDir);

list.forEach(file => {
    if (!file.endsWith('.ts') && !file.endsWith('.js') && !file.endsWith('.mjs')) return;
    const fullPath = path.join(scriptsDir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    let changed = false;

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

    if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated imports in script: ${file}`);
    }
});
