import dayjs from 'dayjs';

export const SATURDAY_OFF_RULES = {
  ALL: 'ALL',
  ALT_1_3: 'ALT_1_3',
  ALT_2_4: 'ALT_2_4',
  NONE: 'NONE',
};

export const WEEK_OFF_POLICY_OPTIONS = [
  {
    value: SATURDAY_OFF_RULES.ALL,
    label: 'Every Saturday Off',
    dots: [true, true, true, true],
    indicator: '● ● ● ●',
    description: 'Every Saturday is off',
  },
  {
    value: SATURDAY_OFF_RULES.ALT_1_3,
    label: '1st & 3rd Saturday Off',
    dots: [true, false, true, false],
    indicator: '● ○ ● ○',
    description: 'Only 1st & 3rd Saturdays are off',
  },
  {
    value: SATURDAY_OFF_RULES.ALT_2_4,
    label: '2nd & 4th Saturday Off',
    dots: [false, true, false, true],
    indicator: '○ ● ○ ●',
    description: 'Only 2nd & 4th Saturdays are off',
  },
  {
    value: SATURDAY_OFF_RULES.NONE,
    label: 'All Saturdays Working (None)',
    dots: [false, false, false, false],
    indicator: '○ ○ ○ ○',
    description: 'All 6 days Mon-Sat are working days',
  },
];

/**
 * Computes whether a given date is an off-day based on the BU's saturday_off_rule.
 * - Sunday is ALWAYS off for every BU.
 * - Monday through Friday are NEVER off.
 * - Saturday off-ness depends on saturday_off_rule:
 *     - ALL: every Saturday is off
 *     - ALT_1_3: only 1st and 3rd Saturday of month are off (nth = ceil(day / 7))
 *     - ALT_2_4: only 2nd and 4th Saturday of month are off
 *     - NONE: no Saturdays are off
 *
 * @param {string | Date | dayjs.Dayjs} dateInput
 * @param {string} [saturdayOffRule='ALL']
 * @returns {boolean}
 */
export const isOffDay = (dateInput, saturdayOffRule = SATURDAY_OFF_RULES.ALL) => {
  if (!dateInput) return false;
  const d = dayjs(dateInput);
  if (!d.isValid()) return false;

  const dayOfWeek = d.day(); // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0) return true; // Sunday is always off
  if (dayOfWeek !== 6) return false; // Mon–Fri are normal working days

  // Saturday calculation: Nth Saturday of month = Math.ceil(day / 7)
  const nthSaturday = Math.ceil(d.date() / 7);

  switch (saturdayOffRule) {
    case SATURDAY_OFF_RULES.ALL:
      return true;
    case SATURDAY_OFF_RULES.ALT_1_3:
      return nthSaturday === 1 || nthSaturday === 3;
    case SATURDAY_OFF_RULES.ALT_2_4:
      return nthSaturday === 2 || nthSaturday === 4;
    case SATURDAY_OFF_RULES.NONE:
      return false;
    default:
      return true;
  }
};
