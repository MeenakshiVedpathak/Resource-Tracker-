const fs = require('fs');
const path = require('path');

const dir = 'd:/RUT/Resource-Tracker-/frontend/src/pages';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.jsx')) results.push(file);
        }
    });
    return results;
}

const files = walk(dir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // We will look for <SearchableSelect and the next few lines.
    // If the options seem static, we replace the opening tag.
    
    // Split by <SearchableSelect
    let parts = content.split('<SearchableSelect');
    if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
            let part = parts[i];
            let endOfTag = part.indexOf('/>');
            if (endOfTag === -1) continue; // couldn't find end of tag
            
            let tagContent = part.substring(0, endOfTag);
            
            // Heuristic for static dropdowns:
            let isStatic = false;
            
            // 1. Month
            if (tagContent.includes('MONTH_OPTIONS')) isStatic = true;
            // 2. Year (Array.from)
            if (tagContent.includes('Array.from')) isStatic = true;
            // 3. Status (Active, Inactive, etc)
            if (tagContent.includes('"active"')) isStatic = true;
            if (tagContent.includes('"in-progress"')) isStatic = true;
            // 4. Billable (Yes, No)
            if (tagContent.includes('"yes"')) isStatic = true;
            // 5. Frequency
            if (tagContent.includes('"monthly"')) isStatic = true;
            
            // 6. Dynamic filters (Client, Employee, PO, Subproject, User, etc) have .map(
            if (tagContent.includes('.map(') && !tagContent.includes('Array.from')) {
                isStatic = false;
            }

            if (isStatic && !tagContent.includes('showSearch={false}')) {
                parts[i] = ' showSearch={false}' + part;
            }
        }
        
        content = parts.join('<SearchableSelect');
        if (content !== original) {
            fs.writeFileSync(file, content, 'utf8');
            console.log('Updated ' + file);
        }
    }
});
