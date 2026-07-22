const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

let count = 0;
walkDir('src/features', (filePath) => {
  if (filePath.includes('pages') && filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it's already using PageContainer correctly
    if (content.includes('<PageContainer') && content.includes('@/components/layouts/PageContainer')) {
       return; // skip
    }

    // Add import if missing
    if (!content.includes('@/components/layouts/PageContainer')) {
      const importStmt = "import PageContainer from '@/components/layouts/PageContainer';\n";
      let lines = content.split('\n');
      let lastImportIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) lastImportIdx = i;
      }
      
      if (lastImportIdx !== -1) {
        lines.splice(lastImportIdx + 1, 0, importStmt);
      } else {
        lines.unshift(importStmt);
      }
      content = lines.join('\n');
    }
    
    // Replace main wrapper
    // We look for 'return (' followed by '<div' or '<>' or '<main'
    let returnMatch = content.match(/return\s*\(\s*<(div|main|Fragment|)[^>]*>/);
    if (returnMatch) {
      let tag = returnMatch[0];
      
      // If the first tag after return is <PageContainer>, skip replacement
      if (tag.includes('<PageContainer')) {
        fs.writeFileSync(filePath, content, 'utf8');
        count++;
        return;
      }

      // Replace the first tag
      content = content.replace(tag, tag.replace(/<(div|main|Fragment|)[^>]*>/, '<PageContainer>'));
      
      // We need to replace the last closing tag before );
      // Reverse string trick
      let reversed = content.split('').reverse().join('');
      // The last closing tag could be </div> or </main> or </>
      // Match `);` then space then `>.../`
      reversed = reversed.replace(/^([^]*?);\)\s*>([^<]*)\/<\s*/, '$1;)>\n    reniatnoCegaP/<');
      
      let newContent = reversed.split('').reverse().join('');
      
      // Fallback if reverse regex failed
      if (!newContent.includes('</PageContainer>')) {
         let lastClosing = content.lastIndexOf('</');
         if (lastClosing !== -1) {
             let endTag = content.indexOf('>', lastClosing);
             newContent = content.substring(0, lastClosing) + '</PageContainer>' + content.substring(endTag + 1);
         } else {
             newContent = content; // give up
         }
      }
      
      fs.writeFileSync(filePath, newContent, 'utf8');
      count++;
    }
  }
});
console.log('Updated ' + count + ' files');
