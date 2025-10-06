// src/autofix-css.js
const postcss = require("postcss");
const postcssScss = require('postcss-scss');

async function applyCSSAutofix(cssCode) {
  const issuesFound = new Set();
  
  const baselineAutopilotPlugin = () => {
    return {
      postcssPlugin: 'baseline-autopilot',
      // The AtRule visitor now works correctly because of the new parser.
      AtRule: {
        'container': (atRule) => {
          issuesFound.add('css-container-queries');
          atRule.name = 'media';
          atRule.params = `(min-width: ${atRule.params.match(/\d+/)[0] || '800'}px)`;
          atRule.before(postcss.comment({ text: "fallback for @container" }));
        }
      },
      Rule(rule) {
        if (rule.selector.includes(":has(")) {
          issuesFound.add('css-has');
          rule.selector = rule.selector.replace(/:has\(([^)]+)\)/g, (match, inner) => `.has-${inner.replace(/[.#]/g, '')}`);
          rule.before(postcss.comment({ text: "fallback for :has()" }));
        }
        if (rule.selector.includes(":focus-visible")) {
          issuesFound.add('css-focus-visible');
          rule.selector = rule.selector.replace(/:focus-visible/g, ':focus');
        }
      },
      Declaration: {
        'aspect-ratio': (decl) => {
          issuesFound.add('css-aspect-ratio');
          decl.replaceWith(
            postcss.decl({ prop: 'padding-top', value: '56.25%' }),
            postcss.decl({ prop: 'height', value: '0' }),
            postcss.decl({ prop: 'position', value: 'relative' })
          );
        },
        'position': (decl) => {
          if (decl.value === 'sticky') {
            issuesFound.add('css-position-sticky');
          }
        }
      }
    };
  };
  baselineAutopilotPlugin.postcss = true;

  // Run PostCSS with the new, more powerful parser
  const result = await postcss([baselineAutopilotPlugin()]).process(cssCode, { from: undefined, syntax: postcssScss });
  
  return { fixedCode: result.css, issuesFound: Array.from(issuesFound) };
}

module.exports = applyCSSAutofix;