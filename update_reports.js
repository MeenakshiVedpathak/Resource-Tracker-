const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend/src/pages/reports');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx') && f !== 'ReportsLayout.jsx');

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // 1. Overlay bug fix (re-apply from earlier)
  if (content.includes('<thead className="sticky top-0 z-20">')) {
    content = content.replace('<thead className="sticky top-0 z-20">', '<thead className="sticky top-0 z-20 bg-background">');
    changed = true;
  }

  // 2. Change limit=20 to limit=10
  if (content.includes('const [limit, setLimit] = useState(20);')) {
    content = content.replace('const [limit, setLimit] = useState(20);', 'const [limit, setLimit] = useState(10);');
    changed = true;
  }

  // 3. Add tableContainerClassName to DataTable
  if (content.includes('<DataTable')) {
    if (!content.includes('tableContainerClassName')) {
      content = content.replace(/<DataTable/g, '<DataTable\n        tableContainerClassName="max-h-[50vh]"');
      changed = true;
    }
  }

  // 4. For native tables
  if (!content.includes('<DataTable')) {
    // Add max-h-[50vh]
    if (content.includes('overflow-x-auto max-h-[70vh]')) {
      content = content.replace('overflow-x-auto max-h-[70vh]', 'overflow-auto max-h-[50vh]');
      changed = true;
    } else if (content.includes('overflow-x-auto') && !content.includes('max-h-[50vh]')) {
      content = content.replace('overflow-x-auto', 'overflow-auto max-h-[50vh]');
      changed = true;
    }

    // Add limit state correctly
    if (!content.includes('const [limit, setLimit] = useState(10);')) {
      content = content.replace(/const \[page,\s*setPage\]\s*=\s*useState\(1\);/, 'const [page, setPage] = useState(1);\n  const [limit, setLimit] = useState(10);');
      
      // Update params safely. Find `page,` inside the params object.
      content = content.replace(/(\n\s*page,)/, '$1\n    limit,');
      
      // Add page size selector UI
      const selectHtml = `
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-7 w-[60px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>`;

      if (content.includes('Previous\n                </Button>')) {
        content = content.replace(/<div className="flex items-center gap-1">/, `<div className="flex items-center gap-3">${selectHtml}\n                <div className="flex items-center gap-1">`);
        
        // Add the closing div after Next button.
        content = content.replace(/(Next\n                <\/Button>\n              <\/div>)/, '$1\n              </div>');
      }
      changed = true;
    }

    // Fix meta.limit fallback
    if (content.includes('meta.limit ?? 10') || content.includes('meta.limit ?? 50')) {
      content = content.replace(/meta\.limit \?\? (10|50)/g, 'meta.limit ?? limit');
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
}
