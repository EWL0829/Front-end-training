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
        res.end(`
        <html maaa=a>
        <head>
            <style>
                body div #myid {
                    width: 100px;
                }
                body div img {
                    width: 30px;
                    background-color: #ff1111;
                }
        
            </style>
        </head>
        <body>
            <div>
                <img id="myid" />
                <img />
            </div>
        </body>
        </html>
    `);
    })
}).listen(8088);
console.log('server started'); // eslint-disable-line

