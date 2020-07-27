// server.js
// 由于node提供了HTTP这个核心模块所以不用特别安装就可以直接require进来使用
const http = require('http');
http.createServer((req, res) => {
    let body = [];
    req.on('error', (err) => {
        console.log('err', err);
    }).on('data', (chunk) => {
        body.push(chunk.toString());
    }).on('end', () => {
        // const bufferedBody = Buffer.from(body);
        console.log('body', body);
        body = [].concat(body).toString();
        console.log("body:", body);
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(' hello world\n');
    })
}).listen(8088);
console.log('server started'); // eslint-disable-line
// ========================我是分割线========================
// 导入http模块:
// const http = require('http');
// // 创建http server，并传入回调函数:
// const server = http.createServer(function (req, res) {
//     // 回调函数接收request和response对象,
//     // 获得HTTP请求的method和url:
//     console.log(req.method + ': ' + req.url);
//     // 将HTTP响应200写入response, 同时设置Content-Type: text/html:
//     req.on('data', (chunk) => {
//         body.push(chunk.toString());
//     }).on('end', () => {
//         res.writeHead(200, {'Content-Type': 'text/html'});
//         // 将HTTP响应的HTML内容写入response:
//         res.end('Hello world!');
//     })
//
// });

// 让服务器监听8080端口:
// server.listen(8088);

// console.log('Server is running at http://localhost:8088/');
// ========================我是分割线========================

// const http = require('http');
//
// http.createServer((request, response) => {
//     const { headers, method, url } = request;
//     let body = [];
//     request.on('error', (err) => {
//         console.error(err);
//     }).on('data', (chunk) => {
//         body.push(chunk.toString());
//     }).on('end', () => {
//         body = Buffer.concat(body).toString();
//         // BEGINNING OF NEW STUFF
//
//         response.on('error', (err) => {
//             console.error(err);
//         });
//
//         response.statusCode = 200;
//         response.setHeader('Content-Type', 'text/html');
//         // Note: the 2 lines above could be replaced with this next one:
//         // response.writeHead(200, {'Content-Type': 'application/json'})
//
//         const responseBody = { headers, method, url, body };
//
//         response.write(JSON.stringify(responseBody));
//         response.end('hello world\n');
//         // Note: the 2 lines above could be replaced with this next one:
//         // response.end(JSON.stringify(responseBody))
//
//         // END OF NEW STUFF
//     });
// }).listen(8080);
// console.log('server is running on 8080');
