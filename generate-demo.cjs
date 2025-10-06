// generate-demo.cjs
const fs = require('fs').promises;
const path = require('path');
const Diff = require('diff');
const webFeatures = require('web-features');
const applyCSSAutofix = require('./src/autofix-css.js');
const { applyJSAutofix } = require('./src/autofix-ast.js');

const testFolder = path.join(__dirname, 'test');
const outputHTMLPath = path.join(__dirname, 'demo', 'demo.html');

async function getTestFiles() {
    const files = await fs.readdir(testFolder);
    const cssFilePromises = files
        .filter(f => f.endsWith('.css'))
        .map(async f => ({ name: f, content: await fs.readFile(path.join(testFolder, f), 'utf-8') }));
    const jsFilePromises = files
        .filter(f => f.endsWith('.js'))
        .map(async f => ({ name: f, content: await fs.readFile(path.join(testFolder, f), 'utf-8') }));
    return {
        css: await Promise.all(cssFilePromises),
        js: await Promise.all(jsFilePromises)
    };
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function createSideBySideDiff(original, fixed) {
    const diff = Diff.diffLines(original, fixed);
    let beforeHTML = '';
    let afterHTML = '';
    let lineNumBefore = 1;
    let lineNumAfter = 1;
    const buildLine = (num, content, type) => `<div class="line ${type}"><span class="line-num">${num}</span><pre><code>${escapeHTML(content)}</code></pre></div>`;
    diff.forEach(part => {
        const lines = part.value.replace(/\n$/, '').split('\n');
        if (part.added) {
            lines.forEach(line => afterHTML += buildLine(lineNumAfter++, line, 'line-added'));
        } else if (part.removed) {
            lines.forEach(line => beforeHTML += buildLine(lineNumBefore++, line, 'line-removed'));
        } else {
            lines.forEach(line => {
                beforeHTML += buildLine(lineNumBefore++, line, '');
                afterHTML += buildLine(lineNumAfter++, line, '');
            });
        }
    });
    return { before: beforeHTML, after: afterHTML };
}

async function generateDemo() {
    const testFiles = await getTestFiles();
    let fileSections = '';
    const insights = {
        totalFiles: testFiles.css.length + testFiles.js.length,
        totalIssues: 0,
        featureCounts: {}
    };
    const allFiles = [...testFiles.css, ...testFiles.js];
    for (const f of allFiles) {
        let result;
        const isJs = f.name.endsWith('.js');
        const language = isJs ? 'javascript' : 'css';
        if (isJs) {
            result = applyJSAutofix(f.content);
        } else {
            result = await applyCSSAutofix(f.content);
        }
        for (const issueId of result.issuesFound) {
            insights.totalIssues++;
            if (!insights.featureCounts[issueId]) {
                // This is the smart fallback link fix
                insights.featureCounts[issueId] = { count: 0, data: webFeatures[issueId] || { name: issueId, spec: `https://developer.mozilla.org/en-US/search?q=${issueId}` } };
            }
            insights.featureCounts[issueId].count++;
        }
        const { before, after: afterDiff } = createSideBySideDiff(f.content, result.fixedCode);
        fileSections += `
            <div class="file-card">
                <h3>${f.name}</h3>
                <div class="diff-container">
                    <div class="code-pane"><div class="pane-header">Before</div><div class="code-content language-${language}">${before}</div></div>
                    <div class="code-pane"><div class="pane-header">After</div><div class="code-content language-${language}">${afterDiff}</div></div>
                </div>
            </div>`;
    }
    let insightsHTML = '';
    for (const [id, { count, data }] of Object.entries(insights.featureCounts)) {
        const browsers = ['chrome', 'firefox', 'safari'];
        const browserSupportHTML = browsers.map(b => {
            const supported = data.support && data.support[b];
            return `<span class="browser-icon ${supported ? 'supported' : ''}" title="${b} ${supported ? 'supported' : 'not supported'}">${b.charAt(0).toUpperCase()}</span>`;
        }).join('');
        insightsHTML += `<li>
            <a href="${data.spec}" target="_blank">${data.name}</a>
            <div class="insight-details">
                <div class="browser-support">${browserSupportHTML}</div>
                <span>${count} instance(s)</span>
            </div>
        </li>`;
    }
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Baseline Autopilot | Scan Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Roboto+Mono&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
    <style>
        body { background-color: #0d1117; color: #c9d1d9; font-family: 'Inter', sans-serif; margin: 0; padding: 40px; visibility: hidden; }
        header { text-align: center; margin-bottom: 40px; }
        h1 { font-size: 2.5em; color: #58a6ff; }
        .stats-container { display: grid; grid-template-columns: 200px 200px 1fr; gap: 30px; justify-content: center; margin-bottom: 40px; align-items: start; max-width: 1200px; margin-left: auto; margin-right: auto; }
        .stat-card, .insights-card { background-color: #161b22; padding: 25px; border-radius: 10px; border: 1px solid #30363d; }
        .stat-card { text-align: center; }
        .stat-value { font-size: 2.5em; font-weight: bold; color: white; }
        .stat-label { color: #8b949e; }
        .insights-card h2 { margin-top: 0; color: #c9d1d9; border-bottom: 1px solid #30363d; padding-bottom: 10px; }
        .insights-card ul { list-style: none; padding: 0; margin: 0; }
        .insights-card li { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #21262d; }
        .insights-card li:last-child { border-bottom: none; }
        .insights-card a { color: #58a6ff; text-decoration: none; }
        .insights-card a:hover { text-decoration: underline; }
        .insight-details { display: flex; align-items: center; gap: 20px; }
        .browser-support { display: flex; gap: 5px; }
        .browser-icon { font-family: monospace; font-weight: bold; width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: #f85149; color: white; opacity: 0.5; cursor: default; }
        .browser-icon.supported { background: #2ea043; opacity: 1; }
        .file-card { background-color: #161b22; border-radius: 10px; border: 1px solid #30363d; margin-bottom: 30px; overflow: hidden; max-width: 1200px; margin-left: auto; margin-right: auto; }
        h3 { padding: 15px 20px; margin: 0; border-bottom: 1px solid #30363d; color: #c9d1d9; }
        .diff-container { display: flex; }
        .code-pane { flex: 1; width: 50%; }
        .pane-header { padding: 10px; background-color: #010409; border-bottom: 1px solid #30363d; text-align: center; font-weight: bold; }
        .code-content { font-family: 'Roboto Mono', monospace; font-size: 14px; }
        .line { display: flex; align-items: stretch; }
        .line-num { background-color: #0d1117; color: #484f58; padding: 0 10px; text-align: right; min-width: 40px; user-select: none; border-right: 1px solid #30363d;}
        .line pre { margin: 0; padding: 0 15px; flex-grow: 1; white-space: pre-wrap; word-break: break-all; }
        .line-added { background-color: rgba(46, 160, 67, 0.15); }
        .line-removed { background-color: rgba(248, 81, 73, 0.15); }
        .line-added .line-num { color: #3fb950; }
        .line-removed .line-num { color: #e5534b; }
    </style>
</head>
<body>
    <header><h1>🚀 Baseline Autopilot Scan Report</h1></header>
    <div class="stats-container">
        <div class="stat-card"><div class="stat-value">${insights.totalFiles}</div><div class="stat-label">Files Scanned</div></div>
        <div class="stat-card"><div class="stat-value">${insights.totalIssues}</div><div class="stat-label">Issues Found</div></div>
        <div class="insights-card">
            <h2>Scan Insights</h2>
            <ul>${insightsHTML || '<li>No non-baseline features found! ✨</li>'}</ul>
        </div>
    </div>
    ${fileSections}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script>
        hljs.highlightAll();
        document.body.style.visibility = 'visible';
    </script>
</body>
</html>`;

    await fs.mkdir(path.join(__dirname, 'demo'), { recursive: true });
    await fs.writeFile(outputHTMLPath, html, 'utf-8');
    console.log(`✅ Premium demo generated at: ${outputHTMLPath}`);
}

generateDemo();