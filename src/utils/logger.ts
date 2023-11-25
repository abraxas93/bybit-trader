/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {format, transports, createLogger} from 'winston';
import path from 'path';
// import fs from 'fs';

const folderPath = 'logs/' + new Date().toISOString();

// fs.mkdirSync(folderPath, {recursive: true});

const colorizer = format.colorize();
const outputFormat = format.printf(info => {
  const {timestamp, label, message, level} = info;
  return `${colorizer.colorize(level, timestamp)}${colorizer.colorize(
    level,
    label
  )}${colorizer.colorize(level, message)}`;
});

// Define the format for the file which does not include colors
const fileFormat = format.combine(
  format.timestamp(),
  format.printf(info => {
    return `${info.timestamp} [${info.label}]: ${info.message}`;
  })
);

export function initLogger(label: string, logFileName: string, mute = false) {
  // const parsed = file.split('/');
  // const label = parsed.pop();
  return createLogger({
    format: format.combine(
      format.label({label: `${label}`}),
      format.timestamp(),
      outputFormat
    ),
    exitOnError: true,
    transports: [
      new transports.Console({
        silent: mute,
      }),
      new transports.File({
        filename: `${folderPath}/${logFileName}`,
        silent: process.env.LOGS ? false : true,
        format: fileFormat,
      }),
    ],
  });
}
