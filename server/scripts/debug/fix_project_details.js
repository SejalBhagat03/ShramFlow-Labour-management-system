
const fs = require('fs');
const path = 'client/src/pages/ProjectDetails.jsx';

try {
    let content = fs.readFileSync(path, 'utf8');
    let lines = content.split(/\r?\n/);

    // Remove line 226 (index 225) which is the extra </div>
    // But let's verify the content first.
    console.log(`Line 225: [${lines[224]}]`);
    console.log(`Line 226: [${lines[225]}]`);
    console.log(`Line 227: [${lines[226]}]`);

    if (lines[225].trim() === '</div>' && lines[224].trim() === '</div>') {
        console.log("Found extra </div> at line 226. Removing it.");
        lines.splice(225, 1); // Remove line 226
        
        // Also fix the indentation of what was line 225
        lines[224] = '                                </div>';
        
        fs.writeFileSync(path, lines.join('\n'), 'utf8');
        console.log("File updated successfully.");
    } else {
        console.log("Pattern did not match. Trying a more flexible match.");
        // Look for the specific block
        let targetIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('</div>') && i > 0 && lines[i-1].includes('</div>')) {
                 // Check if it's in the budget section
                 if (i > 100 && i < 250) {
                     console.log(`Found double </div> at line ${i+1}`);
                     targetIndex = i;
                     break;
                 }
            }
        }
        if (targetIndex !== -1) {
            lines.splice(targetIndex, 1);
            fs.writeFileSync(path, lines.join('\n'), 'utf8');
            console.log("File updated successfully using flexible match.");
        } else {
            console.log("Could not find the double </div> pattern.");
        }
    }
} catch (err) {
    console.error("Error:", err);
}
