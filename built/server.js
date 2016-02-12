'use strict';

var fs = require('fs');
var http = require('http');
var https = require('https');
var cluster = require('cluster');
var express = require('express');
var bodyParser = require('body-parser');
var gm = require('gm');
var config_1 = require('./config');
var app = express();
app.disable('x-powered-by');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(function (req, res, next) {
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'false'
    });
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});
app.get('/', function (req, res) {
    res.send('Misskeyにアップロードされたファイルを保管・配信するサーバーです。https://misskey.xyz');
});
app.get('*', function (req, res) {
    var path = decodeURI(req.path);
    var g = null;
    if (path.indexOf('..') !== -1) {
        return res.status(400).send('invalid path');
    }
    if (req.query.download !== undefined) {
        res.header('Content-Disposition', 'attachment');
        res.sendFile(config_1.default.storagePath + '/' + path);
        return;
    }
    if (req.query.thumbnail !== undefined) {
        gm(config_1.default.storagePath + '/' + path).resize(150, 150).compress('jpeg').quality('80').toBuffer('jpeg', function (genThumbnailErr, thumbnail) {
            res.header('Content-Type', 'image/jpeg');
            res.send(thumbnail);
        });
        return;
    }
    if (req.query.size !== undefined) {
        if (g === null) {
            g = gm(config_1.default.storagePath + '/' + path);
        }
        g = g.resize(req.query.size, req.query.size);
    }
    if (req.query.quality !== undefined) {
        if (g === null) {
            g = gm(config_1.default.storagePath + '/' + path);
        }
        g = g.compress('jpeg').quality(req.query.quality);
    }
    if (g !== null) {
        g.toBuffer('jpeg', function (err, img) {
            if (err !== undefined && err !== null) {
                console.error(err);
                res.status(500).send(err);
                return;
            }
            res.header('Content-Type', 'image/jpeg');
            res.send(img);
        });
    } else {
        res.sendFile(config_1.default.storagePath + '/' + path);
    }
});
var server = undefined;
var port = undefined;
if (config_1.default.https.enable) {
    port = config_1.default.port.https;
    server = https.createServer({
        key: fs.readFileSync(config_1.default.https.keyPath),
        cert: fs.readFileSync(config_1.default.https.certPath)
    }, app);
    http.createServer(function (req, res) {
        res.writeHead(301, {
            Location: config_1.default.url + req.url
        });
        res.end();
    }).listen(config_1.default.port.http);
} else {
    port = config_1.default.port.http;
    server = http.createServer(app);
}
server.listen(port, function () {
    var listenhost = server.address().address;
    var listenport = server.address().port;
    console.log('\u001b[1;32m' + cluster.worker.id + ' is now listening at ' + listenhost + ':' + listenport + '\u001b[0m');
});