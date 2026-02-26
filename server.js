// server.js
const express = require('express');
const applyCSSAutofix = require('./src/autofix-css.js');
const { applyJSAutofix } = require('./src/autofix-ast.js');

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname)); 

app.post('/analyze', async (req, res) => {
    const { code, language } = req.body;
    let result;

    try {
        if (language === 'css') {
            result = await applyCSSAutofix(code);
        } else {
            result = applyJSAutofix(code);
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ fixedCode: `An error occurred on the server: ${error.message}` });
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`🚀 Playground server is running!`);
    console.log(`Open this URL in your browser: http://localhost:${port}/playground.html`);
});
