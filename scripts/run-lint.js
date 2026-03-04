import { ESLint } from 'eslint';
import fs from 'fs/promises';

async function run() {
    const eslint = new ESLint();
    const results = await eslint.lintFiles(['src/**/*.jsx', 'src/**/*.js']);

    let out = '';
    for (const result of results) {
        if (result.errorCount > 0 || result.warningCount > 0) {
            out += `\n=== ${result.filePath} ===\n`;
            for (const msg of result.messages) {
                out += `  Line ${msg.line}: ${msg.message} (${msg.ruleId})\n`;
            }
        }
    }

    await fs.writeFile('eslint-report.txt', out);
    console.log('Lint report saved to eslint-report.txt');
}

run().catch(console.error);
