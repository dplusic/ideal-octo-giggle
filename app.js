/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const process = require('process');
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

const app = express();
app.use(bodyParser.json());
const { IamTokenManager } = require('ibm-watson/auth');

// Bootstrap application settings
require('./config/express')(app);

const serviceUrl = process.env.SPEECH_TO_TEXT_URL;

const tokenManager = new IamTokenManager({
  apikey: process.env.SPEECH_TO_TEXT_IAM_APIKEY || '<iam_apikey>',
});


app.get('/', (req, res) => res.render('index'));

// Get credentials using your credentials
app.get('/api/v1/credentials', async (req, res, next) => {
  try {
    const accessToken = await tokenManager.getToken();
    res.json({
      accessToken,
      serviceUrl,
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/v1/translate', (req, res) => {
  if (!req.body || !req.body.text || !req.body.text.trim()) {
    res.json({ result: '' });
    return;
  }

  const apiUrl = 'https://naveropenapi.apigw.ntruss.com/nmt/v1/translation';
  const options = {
    url: apiUrl,
    form: { source: 'ja', target: 'ko', text: req.body.text },
    headers: { 'X-NCP-APIGW-API-KEY-ID': process.env.NCLOUD_CLIENT_ID, 'X-NCP-APIGW-API-KEY': process.env.NCLOUD_CLIENT_SECRET },
  };
  request.post(options, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const json = JSON.parse(body);
      res.json({
        result: json.message.result.translatedText,
      });
    } else {
      res.status(response.statusCode).end(body);
      console.log(`error = ${response.statusCode}, ${body}`);
    }
  });
});

module.exports = app;
