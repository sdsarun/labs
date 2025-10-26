// import z from "zod";

// const schema = z.object({
//   bod: z.date(),
// });

// console.log(schema.safeParse({ bod: new Date("2020") }));
// console.log(schema.safeParse({ bod: new Date(Date.parse("2020")) }));
// console.log(new Date(Date.parse("hello world 2022-01-01")));

// const now = new Date();
// now.getDate();

// console.log(now.getTime());
// console.log(now);
// console.log(Date.parse("2022-1-1"));
// now.setTime(Date.parse("2022-01-01"));
// console.log(now);
// console.log(now.getTime());
// console.log(now.getTime());
// console.log(new Date(Date.parse("2022-01-01")));
// console.log(Date.parse(""));
// console.log((new Date().getTimezoneOffset() / 60) * -1);
// console.log(new Date("2022"), new Date("2022").getTimezoneOffset());
// console.log(
//   new Date("2022-01-01T20:01:01-23:00"), // it mean: 20:01:01 - 23:00:00 -> UTC
//   new Date("2022-01-01T20:01:01").toLocaleString(),
// ); // it convert this time - local time = utc

// timezone always set as local machine.
// but time is set to midnight if not present

const timestampWithoutTimezone = new Date("2022-01-01");
console.log(timestampWithoutTimezone);
console.log(timestampWithoutTimezone.getDate());
