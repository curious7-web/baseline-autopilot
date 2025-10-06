// src/autofix-ast.js
const acorn = require("acorn");
const estraverse = require("estraverse");
const escodegen = require("escodegen");

function applyJSAutofix(code) {
  const ast = acorn.parse(code, { ecmaVersion: "latest", sourceType: "module" });
  const issuesFound = new Set();

  estraverse.traverse(ast, {
    enter(node) {
      if (node.type === "CallExpression" && node.callee.name === "structuredClone") {
        issuesFound.add('javascript-structuredclone');
      }
      if (node.type === "NewExpression" && node.callee.name === "AbortController") {
        issuesFound.add('api-abortcontroller');
        node.callee.name = "ManualAbortController";
      }
      if (node.type === "CallExpression" && node.callee.property && node.callee.property.name === "any") {
        if (node.callee.object && node.callee.object.name === "Promise") {
          issuesFound.add('javascript-promise-any');
        }
      }
    }
  });

  const fixedCode = escodegen.generate(ast);
  return { fixedCode, issuesFound: Array.from(issuesFound) };
}

module.exports = { applyJSAutofix };