/* eslint global-require: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import log from 'electron-log';
import printer from "pdf-to-printer";
import MenuBuilder from './menu';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    webPreferences: {
      nodeIntegration: true
    }
  });

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', createWindow);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});

ipcMain.on('print', (event, arg) => {
  const dir = `${app.getPath('documents')}/print-test`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  fs.writeFile(`${dir}/badge.html`, `
  <html><head><link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css?family=Georgia|Asap|Arial|Helvetica|Arial+Black|Gadget|Comic+Sans+MS|Impact|Charcoal|Tahoma|Geneva|Verdana|Geneva|Courier+New|Courier|serif"><link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css?subset=arabic&family=Cairo|Amiri|Changa|Mada|Lateef|Baloo+Bhaijaan|Reem+Kufi|Lalezar|Scheherazade|El+Messiri|Aref+Ruqaa|Harmattan|Lemonada|Mirza|Rakkas|Katibeh|Jomhuria"><title>Ticket</title></head><body style="padding:0; margin:0"><div class="layout" style="height:40mm; width:60mm;">    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="100%" height="100%"> <g transform="translate(114.04375909423828 31.41623764038086) rotate(0) translate(-106.3485 -20.2375)"><rect x="0" y="0" fill="transparent" width="212.697" height="40.475"></rect><foreignObject x="0" y="0" width="212.697" height="40.475"><div class="innerDiv" style="margin: 0px; padding: 0px; overflow: hidden; text-align: center; width: 212.697px; height: 40.475px; overflow-wrap: break-word; direction: ltr;"><p class="innerP" style="margin: 0px; padding: 0px; font-family: Verdana, Geneva, sans-serif; font-size: 17px; font-weight: bold; font-style: normal; text-decoration: none; color: rgb(0, 0, 0); text-shadow: transparent -1px 0px, transparent 0px 1px, transparent 1px 0px, transparent 0px -1px; letter-spacing: 0px; word-spacing: 0px; direction: ltr;">Nassim HAsbani</p></div></foreignObject></g><g transform="translate(44.03322265625 120.49558459472657) rotate(0) translate(-39.4175 -37.1495)"><image xlink:href="https://register.monshaat.gov.sa/chart/encode/qrcode.html?width=78&height=74&code=JJWV7hwFcM" width="78.835" height="74.299"></image><rect fill="transparent" width="78.835" height="74.299"></rect></g><g transform="translate(184.30313873291016 133.57733154296875) rotate(0) translate(-88.3515625 4.734375)"><rect x="0" y="-12" fill="transparent" width="176.703125" height="14.53125"></rect><text transform="translate(0 0)" style="font-family: Verdana, Geneva, sans-serif; font-size: 12px; direction: ltr;">38911166</text></g></svg></div></body></html>`, errorFile => {
    if (errorFile) throw new Error(errorFile);
    // const printOptions = arg.options;

    const rand = Math.random().toString(36).substring(7);
    const option = {
      landscape: true,
      marginsType: 1,
      printBackground: false,
      printSelectionOnly: false,
      pageSize: {
        height: 40000,
        width: 60000
      }
    };
    let windowPDF = new BrowserWindow({ show: false });
    windowPDF.loadURL(`file://${dir}/badge.html`);
    windowPDF.webContents.on('did-finish-load', () => {
      if (!windowPDF) {
        throw new Error('"print failed" is not defined');
      }

      windowPDF.webContents
        .printToPDF(option)
        .then(data => {
          const filepath = `${dir}/test.pdf`;

          fs.writeFile(filepath, data, errorFile => {
            if (errorFile) throw new Error(errorFile);
            const args = [];
            args.push("-print-to-default");
            args.push("-silent", filepath);
            let file = path.join(`${__dirname}`, "SumatraPDF.exe");
            console.log(file)

            const child = execFile(file, args, (error, stdout, stderr) => {
              if (error) {
                throw error;
              }
              console.log(stdout);
            });

            // printer
            // .print(filepath)
            // .then(console.log)
            // .catch(console.error);
            event.reply('printed', filepath);
            windowPDF.destroy();
          });
        })
        .catch(error => {
          event.reply('pdf-failed', 'two');
          console.log(error);
          windowPDF.destroy();
        });
    });

    windowPDF.on('closed', () => {
      windowPDF = null;
    });
  });
});
