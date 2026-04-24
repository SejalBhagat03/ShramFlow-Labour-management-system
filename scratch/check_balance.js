
const fs = require('fs');
const content = fs.readFileSync('client/src/pages/ProjectDetails.jsx', 'utf8');

function checkBalance(text) {
    let stack = [];
    let pairs = { '{': '}', '(': ')', '[': ']' };
    let lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        for (let j = 0; j < line.length; j++) {
            let char = line[j];
            if (pairs[char]) {
                stack.push({ char, line: i + 1, col: j + 1 });
            } else if (Object.values(pairs).includes(char)) {
                if (stack.length === 0) {
                    console.log(`Extra closing ${char} at line ${i+1}, col ${j+1}`);
                } else {
                    let last = stack.pop();
                    if (pairs[last.char] !== char) {
                        console.log(`Mismatch: ${last.char} at line ${last.line} closed by ${char} at line ${i+1}`);
                    }
                }
            }
        }
    }
    while (stack.length > 0) {
        let last = stack.pop();
        console.log(`Unclosed ${last.char} from line ${last.line}`);
    }
}

checkBalance(content);
