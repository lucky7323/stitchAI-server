import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const docsConfig = new DocumentBuilder()
  .setTitle('Stitch AI Agent API')
  .setVersion('0.0.1')
  .addBearerAuth()
  .build();

const setupDocs = async (app: INestApplication) => {
  const document = SwaggerModule.createDocument(app, docsConfig);

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      operationsSorter: 'alpha',
      tagsSorter: 'alpha',
      persistAuthorization: true,
      defaultModelsExpandDepth: 10,
    },
  });
};

export default setupDocs;
