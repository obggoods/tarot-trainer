import major_00_fool from "./major/00_fool.json";
import major_01_magician from "./major/01_magician.json";
import major_02_high_priestess from "./major/02_high_priestess.json";
import major_03_empress from "./major/03_empress.json";
import major_04_emperor from "./major/04_emperor.json";
import major_05_hierophant from "./major/05_hierophant.json";
import major_06_lovers from "./major/06_lovers.json";
import major_07_chariot from "./major/07_chariot.json";
import major_08_strength from "./major/08_strength.json";
import major_09_hermit from "./major/09_hermit.json";
import major_10_wheel_of_fortune from "./major/10_wheel_of_fortune.json";
import major_11_justice from "./major/11_justice.json";
import major_12_hanged_man from "./major/12_hanged_man.json";
import major_13_death from "./major/13_death.json";
import major_14_temperance from "./major/14_temperance.json";
import major_15_devil from "./major/15_devil.json";
import major_16_tower from "./major/16_tower.json";
import major_17_star from "./major/17_star.json";
import major_18_moon from "./major/18_moon.json";
import major_19_sun from "./major/19_sun.json";
import major_20_judgement from "./major/20_judgement.json";
import major_21_world from "./major/21_world.json";
import wands_ace from "./minor/wands/ace.json";
import wands_02 from "./minor/wands/02.json";
import wands_03 from "./minor/wands/03.json";
import wands_04 from "./minor/wands/04.json";
import wands_05 from "./minor/wands/05.json";
import wands_06 from "./minor/wands/06.json";
import wands_07 from "./minor/wands/07.json";
import wands_08 from "./minor/wands/08.json";
import wands_09 from "./minor/wands/09.json";
import wands_10 from "./minor/wands/10.json";
import wands_page from "./minor/wands/page.json";
import wands_knight from "./minor/wands/knight.json";
import wands_queen from "./minor/wands/queen.json";
import wands_king from "./minor/wands/king.json";
import cups_ace from "./minor/cups/ace.json";
import cups_02 from "./minor/cups/02.json";
import cups_03 from "./minor/cups/03.json";
import cups_04 from "./minor/cups/04.json";
import cups_05 from "./minor/cups/05.json";
import cups_06 from "./minor/cups/06.json";
import cups_07 from "./minor/cups/07.json";
import cups_08 from "./minor/cups/08.json";
import cups_09 from "./minor/cups/09.json";
import cups_10 from "./minor/cups/10.json";
import cups_page from "./minor/cups/page.json";
import cups_knight from "./minor/cups/knight.json";
import cups_queen from "./minor/cups/queen.json";
import cups_king from "./minor/cups/king.json";
import swords_ace from "./minor/swords/ace.json";
import swords_02 from "./minor/swords/02.json";
import swords_03 from "./minor/swords/03.json";
import swords_04 from "./minor/swords/04.json";
import swords_05 from "./minor/swords/05.json";
import swords_06 from "./minor/swords/06.json";
import swords_07 from "./minor/swords/07.json";
import swords_08 from "./minor/swords/08.json";
import swords_09 from "./minor/swords/09.json";
import swords_10 from "./minor/swords/10.json";
import swords_page from "./minor/swords/page.json";
import swords_knight from "./minor/swords/knight.json";
import swords_queen from "./minor/swords/queen.json";
import swords_king from "./minor/swords/king.json";
import pentacles_ace from "./minor/pentacles/ace.json";
import pentacles_02 from "./minor/pentacles/02.json";
import pentacles_03 from "./minor/pentacles/03.json";
import pentacles_04 from "./minor/pentacles/04.json";
import pentacles_05 from "./minor/pentacles/05.json";
import pentacles_06 from "./minor/pentacles/06.json";
import pentacles_07 from "./minor/pentacles/07.json";
import pentacles_08 from "./minor/pentacles/08.json";
import pentacles_09 from "./minor/pentacles/09.json";
import pentacles_10 from "./minor/pentacles/10.json";
import pentacles_page from "./minor/pentacles/page.json";
import pentacles_knight from "./minor/pentacles/knight.json";
import pentacles_queen from "./minor/pentacles/queen.json";
import pentacles_king from "./minor/pentacles/king.json";
import type { RawMeaningEntry } from "../../../types/tarot";

export const rawMeaningsByCardId = {
  major_00_fool: major_00_fool,
  major_01_magician: major_01_magician,
  major_02_high_priestess: major_02_high_priestess,
  major_03_empress: major_03_empress,
  major_04_emperor: major_04_emperor,
  major_05_hierophant: major_05_hierophant,
  major_06_lovers: major_06_lovers,
  major_07_chariot: major_07_chariot,
  major_08_strength: major_08_strength,
  major_09_hermit: major_09_hermit,
  major_10_wheel_of_fortune: major_10_wheel_of_fortune,
  major_11_justice: major_11_justice,
  major_12_hanged_man: major_12_hanged_man,
  major_13_death: major_13_death,
  major_14_temperance: major_14_temperance,
  major_15_devil: major_15_devil,
  major_16_tower: major_16_tower,
  major_17_star: major_17_star,
  major_18_moon: major_18_moon,
  major_19_sun: major_19_sun,
  major_20_judgement: major_20_judgement,
  major_21_world: major_21_world,
  wands_ace: wands_ace,
  wands_02: wands_02,
  wands_03: wands_03,
  wands_04: wands_04,
  wands_05: wands_05,
  wands_06: wands_06,
  wands_07: wands_07,
  wands_08: wands_08,
  wands_09: wands_09,
  wands_10: wands_10,
  wands_page: wands_page,
  wands_knight: wands_knight,
  wands_queen: wands_queen,
  wands_king: wands_king,
  cups_ace: cups_ace,
  cups_02: cups_02,
  cups_03: cups_03,
  cups_04: cups_04,
  cups_05: cups_05,
  cups_06: cups_06,
  cups_07: cups_07,
  cups_08: cups_08,
  cups_09: cups_09,
  cups_10: cups_10,
  cups_page: cups_page,
  cups_knight: cups_knight,
  cups_queen: cups_queen,
  cups_king: cups_king,
  swords_ace: swords_ace,
  swords_02: swords_02,
  swords_03: swords_03,
  swords_04: swords_04,
  swords_05: swords_05,
  swords_06: swords_06,
  swords_07: swords_07,
  swords_08: swords_08,
  swords_09: swords_09,
  swords_10: swords_10,
  swords_page: swords_page,
  swords_knight: swords_knight,
  swords_queen: swords_queen,
  swords_king: swords_king,
  pentacles_ace: pentacles_ace,
  pentacles_02: pentacles_02,
  pentacles_03: pentacles_03,
  pentacles_04: pentacles_04,
  pentacles_05: pentacles_05,
  pentacles_06: pentacles_06,
  pentacles_07: pentacles_07,
  pentacles_08: pentacles_08,
  pentacles_09: pentacles_09,
  pentacles_10: pentacles_10,
  pentacles_page: pentacles_page,
  pentacles_knight: pentacles_knight,
  pentacles_queen: pentacles_queen,
  pentacles_king: pentacles_king,
} as Record<string, RawMeaningEntry>;

export const allMeaningCardIds = Object.keys(rawMeaningsByCardId);
