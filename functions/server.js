// functions/server.js
const express = require('express');
const serverless = require('serverless-http');
const applyCSSAutofix = require('../src/autofix-css.js');
const { applyJSAutofix } = require('../src/autofix-ast.js');

const app = express();
const router = express.Router();

app.use(express.json({ limit: '5mb' }));

router.post('/analyze', async (req, res) => {
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

app.use('/.netlify/functions/server', router);

module.exports.handler = serverless(app);