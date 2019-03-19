const Koa2 = require('../lib/application');
const app = new Koa2();

app.ues((context, next) => {
  console.log(1);
  next();
});

app.ues((context, next) => {
  console.log(2);
  next();
});

app.ues((context, next) => {
  console.log(3);
  next();
});

app.listen(2333);
