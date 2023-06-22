const path = require('path');
const { createServer } = require('http');

const Koa = require('koa');
const Router = require('koa-router');
const serve = require('koa-static');
const Socket = require('./socket');
const { getGame } = require('./utils/game');
const app = new Koa();
const router = new Router();

const httpServer = createServer(app.callback());

new Socket(httpServer);

app
    .use(serve(path.join(__dirname, '../../client/dist')))
    .use(router.routes())
    .use(router.allowedMethods());

router.get('/api/test', async (ctx) => {
    ctx.body = 'Test';
});

router.get('/api/debug/game', async (ctx) => {
    ctx.body = JSON.stringify(getGame());
});

httpServer.listen(3000, () => {
    console.log('server listening on *:3000');
});
