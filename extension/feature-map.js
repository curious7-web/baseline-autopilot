// src/feature-map.js
module.exports = {
  'css-has': {
    type: 'CSS',
    detect: /:has\(/
  },
  'css-container-queries': {
    type: 'CSS',
    detect: /@container/
  },
  'css-focus-visible': {
    type: 'CSS',
    detect: /:focus-visible/
  },
  'css-aspect-ratio': {
    type: 'CSS',
    detect: /aspect-ratio:/
  },
  'css-position-sticky': {
    type: 'CSS',
    detect: /position:\s*sticky/
  },
  'javascript-structuredclone': {
    type: 'JS',
    detect: /structuredClone\s*\(/
  },
  'api-abortcontroller': {
    type: 'JS',
    detect: /new AbortController\s*\(/
  },
  'javascript-promise-any': {
    type: 'JS',
    detect: /Promise\.any\s*\(/
  }
};
