import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';
import { Amplify } from 'aws-amplify';
import { I18n } from 'aws-amplify/utils';
import { translations } from '@aws-amplify/ui-angular';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs);
I18n.putVocabularies(translations);
I18n.setLanguage('es');

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
