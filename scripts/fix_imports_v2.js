const fs = require('fs');
const path = require('path');

const replacements = {
    "@/app/components": "@/components",
    "@/lib/database/prisma": "@/lib/database/prisma"
};

function walk(dir) {
    let results = [];
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
        fs.writeFileSync(file, content);
        console.log(`Updated imports in: ${path.relative(root, file)}`);
    }
});
