import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './src/app/app.config';
import { App } from './src/app/app';

const bootstrap = () => bootstrapApplication(App, appConfig);

export default bootstrap; 