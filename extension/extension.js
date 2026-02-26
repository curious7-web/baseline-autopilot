// extension.js
const vscode = require('vscode');
const path = require('path');
const webFeatures = require('web-features');
const featureMap = require('./feature-map.js');
const { applyJSAutofix } = require('./autofix-ast.js');
const applyCSSAutofix = require('./autofix-css.js');

const DIAGNOSTIC_COLLECTION = 'baseline-autopilot';

const nonBaselineRules = Object.values(webFeatures)
    .filter(feature => feature.status && feature.status.baseline === false && featureMap[feature.id])
    .map(feature => ({
        id: feature.id,
        name: feature.name,
        description: feature.description,
        spec: feature.spec,
        detect: featureMap[feature.id].detect,
        type: featureMap[feature.id].type
    }));

function updateDiagnostics(document, collection) {
    if (!['javascript', 'css'].includes(document.languageId)) return;
    const diagnostics = [];
    const docType = document.languageId === 'javascript' ? 'JS' : 'CSS';
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        for (const rule of nonBaselineRules) {
            if (rule.type === docType) {
                const regex = new RegExp(rule.detect.source, 'g');
                let match;
                while ((match = regex.exec(line.text)) !== null) {
                    const range = new vscode.Range(i, match.index, i, match.index + match[0].length);
                    const diagnostic = new vscode.Diagnostic(range, `${rule.name} is not a Baseline feature.`, vscode.DiagnosticSeverity.Warning);
                    diagnostic.code = rule.id;
                    diagnostic.source = 'Baseline Autopilot';
                    diagnostics.push(diagnostic);
                }
            }
        }
    }
    collection.set(document.uri, diagnostics);
}

class BaselineQuickFixProvider {
    provideCodeActions(document, range, context) {
        return context.diagnostics.filter(diag => diag.source === 'Baseline Autopilot').map(diag => {
            const action = new vscode.CodeAction('Apply Baseline Autofix', vscode.CodeActionKind.QuickFix);
            action.diagnostics = [diag];
            action.isPreferred = true;
            action.command = { command: 'baselineAutopilot.autofix', title: 'Apply Autofix', arguments: [document] };
            return action;
        });
    }
}

class BaselineHoverProvider {
    provideHover(document, position, token) {
        console.log('Hover provider is being called!'); 
        
        const line = document.lineAt(position.line).text;
        for (const rule of nonBaselineRules) {
            const regex = new RegExp(rule.detect.source, 'g');
            let match;
            while ((match = regex.exec(line)) !== null) {
                const matchRange = new vscode.Range(position.line, match.index, position.line, match[0].length);
                if (matchRange.contains(position)) {
                    const contents = new vscode.MarkdownString();
                    contents.appendMarkdown(`**${rule.name}** is not a Baseline feature.`);
                    return new vscode.Hover(contents, matchRange);
                }
            }
        }
        return null;
    }
}
function activate(context) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_COLLECTION);
    
    if (vscode.window.activeTextEditor) {
        updateDiagnostics(vscode.window.activeTextEditor.document, diagnosticCollection);
    }
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => editor && updateDiagnostics(editor.document, diagnosticCollection)),
        vscode.workspace.onDidChangeTextDocument(event => updateDiagnostics(event.document, diagnosticCollection)),
        vscode.workspace.onDidOpenTextDocument(doc => updateDiagnostics(doc, diagnosticCollection)),
        vscode.languages.registerCodeActionsProvider(['css', 'javascript'], new BaselineQuickFixProvider(), { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }),
        vscode.languages.registerHoverProvider(['css', 'javascript'], new BaselineHoverProvider()),
        vscode.commands.registerCommand('baselineAutopilot.autofix', async (document) => {
            const code = document.getText();
            let fixedCode;
            if (document.languageId === 'javascript') {
                fixedCode = applyJSAutofix(code).fixedCode;
            } else {
                fixedCode = (await applyCSSAutofix(code)).fixedCode;
            }
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(code.length));
            edit.replace(document.uri, fullRange, fixedCode);
            await vscode.workspace.applyEdit(edit);
        })
    );
}

module.exports = { activate, deactivate() {} };
