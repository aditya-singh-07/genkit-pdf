import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';

const bootstrap = () => bootstrapApplication(App, appConfig);

export default bootstrap; 