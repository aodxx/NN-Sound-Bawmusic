const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const sandbox = {
  console,
  Utilities: {
    formatDate(date, timezone, format) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(date).reduce((out, part) => {
        out[part.type] = part.value;
        return out;
      }, {});
      return format === 'HH:mm'
        ? `${parts.hour}:${parts.minute}`
        : `${parts.year}-${parts.month}-${parts.day}`;
    }
  },
  Session: { getScriptTimeZone: () => 'Asia/Bangkok' }
};

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('code.gs', 'utf8'), sandbox);
sandbox.getSettings = () => ({
  bookingBufferBeforeMinutes: '120',
  bookingBufferAfterMinutes: '120'
});
sandbox.listEquipment = () => [];

function conflicts(candidate, existing) {
  sandbox.listBookings = () => existing;
  return sandbox.checkConflicts(candidate);
}

assert.equal(conflicts(
  { date: '2026-08-01', endDate: '2026-08-01', startTime: '18:00', endTime: '22:00' },
  [{ id: 'morning', status: 'confirmed', date: '2026-08-01', endDate: '2026-08-01', startTime: '10:00', endTime: '14:00' }]
).hasConflict, false, 'normal jobs with non-overlapping buffered ranges should be available');

assert.equal(conflicts(
  { date: '2026-08-02', endDate: '2026-08-02', startTime: '05:00', endTime: '09:00' },
  [{ id: 'overnight', status: 'confirmed', date: '2026-08-01', endDate: '2026-08-02', startTime: '20:00', endTime: '01:00' }]
).hasConflict, false, 'next-morning job after overnight buffer should be available');

assert.equal(conflicts(
  { date: '2026-08-02', endDate: '2026-08-02', startTime: '02:00', endTime: '06:00' },
  [{ id: 'overnight', status: 'confirmed', date: '2026-08-01', endDate: '2026-08-02', startTime: '20:00', endTime: '01:00' }]
).hasConflict, true, 'next-morning job inside overnight buffer should conflict');

assert.equal(conflicts(
  { date: '2026-08-03', endDate: '2026-08-03', startTime: '', endTime: '' },
  [{ id: 'timed', status: 'confirmed', date: '2026-08-03', endDate: '2026-08-03', startTime: '18:00', endTime: '22:00' }]
).hasConflict, true, 'missing times should reserve the full day');

assert.throws(
  () => sandbox.normalizeBookingScheduleData_({
    date: '2026-08-01',
    endDate: '2026-08-01',
    startTime: '20:00',
    endTime: '01:00'
  }),
  /วันถัดไป/,
  'new overnight bookings must explicitly select the next end date'
);

console.log('overnight booking tests passed');
