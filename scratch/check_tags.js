
const fs = require('fs');
const content = fs.readFileSync('client/src/pages/ProjectDetails.jsx', 'utf8');

function checkTagsWhole(text) {
    let stack = [];
    // Improved regex to handle self-closing tags correctly
    let regex = /<(\/?)([a-zA-Z0-9]+)(\s+[^>]*?)?(\/?)>/g;
    let match;
    let lineOffsets = [0];
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n') lineOffsets.push(i + 1);
    }
    
    function getLine(offset) {
        let index = lineOffsets.findIndex(o => o > offset);
        return index === -1 ? lineOffsets.length : index;
    }

    while ((match = regex.exec(text)) !== null) {
        let isClosing = match[1] === '/';
        let tagName = match[2];
        let selfClosing = match[4] === '/';
        
        if (isClosing) {
            if (stack.length === 0) {
                console.log(`Extra closing </${tagName}> at line ${getLine(match.index)}`);
            } else {
                let last = stack.pop();
                if (last.tagName !== tagName) {
                    console.log(`Mismatch: <${last.tagName}> at line ${last.line} closed by </${tagName}> at line ${getLine(match.index)}`);
                }
            }
        } else if (!selfClosing) {
            stack.push({ tagName, line: getLine(match.index) });
        }
    }
    while (stack.length > 0) {
        let last = stack.pop();
        console.log(`Unclosed <${last.tagName}> from line ${last.line}`);
    }
}

checkTagsWhole(content);
