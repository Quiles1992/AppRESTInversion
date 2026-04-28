import app from './app';
import config from './config/config';
import connectDatabase from './config/database';

const bootstrap = async () => {
  await connectDatabase();

  app.listen(app.get('port'), () => {
    console.log(
      `\n🚀 Server is running on: http://${config.HOST}:${app.get('port')}${config.API_URL}`
    );
    console.log(
      `📖 Swagger docs available on: http://${config.HOST}:${app.get('port')}${config.API_URL}/api-docs\n`
    );
  });
};

bootstrap();
