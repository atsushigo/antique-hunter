import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

export const vuetify = createVuetify({
  theme: {
    defaultTheme: 'antiqueLight',
    themes: {
      antiqueLight: {
        dark: false,
        colors: {
          primary: '#795548',
          secondary: '#8D6E63',
          accent: '#D7A86E',
          background: '#FAF7F2',
          surface: '#FFFFFF',
          error: '#C62828',
          info: '#0277BD',
          success: '#2E7D32',
          warning: '#EF6C00',
        },
      },
    },
  },
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
});
