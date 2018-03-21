import path from 'path';
import nodemailer from 'nodemailer';
import twig from 'twig';
import htmlToText from 'html-to-text';
import fs from 'fs';

class Email {
  static init({ config }) {
    this.config = config;
  }

  static send({ template, dir }, { from, to, subject, bcc, cc, attachments }, input) {
    let transporter = this._createTransport();
    let emailConfig = this._getEmailConfig();

    return new Promise((resolve, reject) => {
      this._renderTemplate({ template, dir }, input)
        .then((html) => {
          let mailOptions = {
            from: from || emailConfig.from,
            to: to,
            cc: cc,
            bcc: bcc,
            subject: subject || 'New Mail',
            text: htmlToText.fromString(html),
            html: html,
            attachments: attachments
          };
          return transporter.sendMail(mailOptions);
        })
        .then((res) => {
          resolve(true);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  static _getEmailConfig() {
    return this.config[process.env['NODE_ENV'] || 'development'];
  }

  static _createTransport() {
    let emailConfig = this._getEmailConfig();

    if (emailConfig.transport === 'aws-ses') {

    } else if (emailConfig.transport === 'smtp' || !emailConfig.transport) {
      return nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port || 587,
        secure: emailConfig.secure || false, // true for 465, false for other ports
        auth: emailConfig.auth
      });
    }
  }
  static _renderTemplate({template, dir}, input) {
    return new Promise((resolve, reject) => {
      twig.renderFile(path.resolve(dir, template), input, (err, html) => {
        if (err) {
          reject(err);
        } else {
          resolve(html);
        }
      });
    })
  }
}

export default Email;
