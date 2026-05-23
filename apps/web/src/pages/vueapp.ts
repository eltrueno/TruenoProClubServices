import type { App } from 'vue';
import Donut from 'vue-css-donut-chart';
import 'vue-css-donut-chart/dist/vcdonut.css';

export default (app: App) => {
  // @ts-ignore - plugin structure depends on build environment
  const plugin = Donut.default || Donut;
  app.use(plugin)
};