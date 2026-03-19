import type { App } from 'vue';
import Donut from 'vue-css-donut-chart';
import 'vue-css-donut-chart/dist/vcdonut.css';

export default (app: App) => {
  app.use(Donut)
};