// src/scanner.js
const fs = require("fs").promises;
const path = require("path");
const applyCSSAutofix = require("./autofix-css");
const { applyJSAutofix } = require("./autofix-ast");

async function scanFile(filePath, report) {
  const ext = path.extname(filePath);
  let originalContent;

  try {
    originalContent = await fs.readFile(filePath, "utf8");
  } catch (error) {
    report.push(`❌ Error reading file: ${filePath}`);
    return;
  }

  let result;
  let fixType = null;
  if (ext === ".js") {
    result = applyJSAutofix(originalContent);
    fixType = "JS";
  } else if (ext === ".css") {
    result = await applyCSSAutofix(originalContent);
    fixType = "CSS";
  }

  if (result && result.fixedCode !== originalContent) {
    try {
      await fs.writeFile(filePath, result.fixedCode, "utf8");
      report.push(`✅ ${fixType} autofix applied: ${filePath}`);
    } catch (error) {
      report.push(`❌ Error writing file: ${filePath}`);
    }
  } else {
    report.push(`ℹ️ No changes needed: ${filePath}`);
  }
}

async function scanFolder(folderPath, report) {
  try {
    const items = await fs.readdir(folderPath, { withFileTypes: true });
    const scanPromises = items.map(item => {
      const fullPath = path.join(folderPath, item.name);
      if (item.isDirectory()) {
        return scanFolder(fullPath, report);
      } else if (item.isFile() && ['.js', '.css'].includes(path.extname(item.name))) {
        return scanFile(fullPath, report);
      }
      return Promise.resolve();
    });
    await Promise.all(scanPromises);
  } catch (error) {
    report.push(`❌ Could not scan folder: ${folderPath}`);
  }
}

async function runScanner() {
  const args = process.argv.slice(2);
  const folder = args.find(a => !a.startsWith("--"));
  const reportFlag = args.includes("--report");
  const report = [];

  if (!folder) {
    console.error("❌ Please provide a folder path to scan.");
    return;
  }

  console.log(`🚀 Scanning files in ${folder}...`);
  await scanFolder(folder, report);

  if (reportFlag) {
    const reportPath = "scan-report.md";
    const mdReport = report.map(line => `- ${line}`).join("\n");
    try {
      await fs.writeFile(reportPath, mdReport, "utf8");
      console.log(`📄 Markdown report generated: ${reportPath}`);
    } catch (error) {
      console.error("❌ Failed to write report:", error);
    }
  }

  console.log("✅ Scan complete!");
}

runScanner();