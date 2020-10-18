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
const { IamTokenManager, IamAuthenticator } = require('ibm-watson/auth');
const LanguageTranslatorV3 = require('ibm-watson/language-translator/v3');

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
    } else if (error) {
      res.status(500).end(JSON.stringify(error));
    } else {
      res.status(response.statusCode).end(JSON.stringify(body));
      console.log(`error = ${response.statusCode}, ${body}`);
    }
  });
});

app.post('/api/v2/translate', (req, res) => {
  if (!req.body || !req.body.text || !req.body.text.trim()) {
    res.json({ result: '' });
    return;
  }

  request.post({
    url: 'https://dapi.kakao.com/v2/translation/translate',
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
    form: { src_lang: 'jp', target_lang: 'kr', query: req.body.text },
  },
  (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const json = JSON.parse(body);
      res.json({
        result: json.translated_text.join('\n'),
      });
    } else if (error) {
      res.status(500).end(JSON.stringify(error));
    } else {
      res.status(response.statusCode).end(JSON.stringify(body));
      console.log(`error = ${response.statusCode}, ${body}`);
    }
  });
});

app.post('/api/v3/translate', (req, res) => {
  if (!req.body || !req.body.text || !req.body.text.trim()) {
    res.json({ result: '' });
    return;
  }

  new LanguageTranslatorV3({
    authenticator: new IamAuthenticator({ apikey: process.env.LANGUAGE_TRANSLATOR_IAM_APIKEY }),
    serviceUrl: process.env.LANGUAGE_TRANSLATOR_URL,
    version: '2018-05-01',
  }).translate(
    {
      text: req.body.text,
      source: 'ja',
      target: 'ko',
    },
  )
    .then((response) => {
      res.json({
        result: response.result.translations.map((x) => x.translation).join('\n'),
      });
    })
    .catch((err) => {
      res.status(500).end(JSON.stringify(err));
      console.log('error: ', err);
    });
});

app.post('/api/v4/translate', (req, res) => {
  if (!req.body || !req.body.text || !req.body.text.trim()) {
    res.json({ result: '' });
    return;
  }

  request.post({
    url: 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=ja&to=ko',
    headers: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_TRANSLATOR_KEY, 'Ocp-Apim-Subscription-Region': 'koreacentral' },
    json: [{ Text: req.body.text }],
  },
  (error, response, body) => {
    if (!error && response.statusCode === 200) {
      res.json({
        result: body[0].translations.map((x) => x.text).join('\n'),
      });
    } else {
      console.log(`error = ${response.statusCode}`, body);
      res.status(response.statusCode).end(JSON.stringify(body));
    }
  });
});

module.exports = app;
