import { createConsola } from "consola";

const consola = createConsola({
  fancy: true,
  formatOptions: {
    showLogLevel: true,
    colors: true,
    date: false,
  },
});

export default consola;
