const fs = require('fs');
const file = 'c:/Users/User/Desktop/admin/admin/client/src/components/UserSettingsEnhanced.js';
let content = fs.readFileSync(file, 'utf8');

const target = `                <button className="reset-btn" onClick={handleResetTheme}>
                🔄 Reset to Default
              </button>
            </div>
          )}`;

const replacement = `                <button className="reset-btn" onClick={handleResetTheme}>
                🔄 Reset to Default
              </button>
            </div>
          </div>
          )}`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed syntax error!');
} else {
    // try fall back
    const re = /<button className="reset-btn" onClick=\{handleResetTheme\}>\s*🔄 Reset to Default\s*<\/button>\s*<\/div>\s*\)\}/;
    if (re.test(content)) {
        content = content.replace(re, `<button className="reset-btn" onClick={handleResetTheme}>\n                🔄 Reset to Default\n              </button>\n            </div>\n          </div>\n          )}`);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed syntax error via regex!');
    } else {
        console.log('Could not find the target text :(');
    }
}
