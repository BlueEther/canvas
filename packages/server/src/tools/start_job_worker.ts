import { Jobs } from "../jobs/Jobs";
import { loadSettings } from "../lib/Settings";

loadSettings(true).then(() => {
  new Jobs();
});
