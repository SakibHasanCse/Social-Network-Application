

import koa from 'koa'
const app = new koa()

app.use('/app', function () {
    this.body = 'Hello , world'
})
app.listen(3000)