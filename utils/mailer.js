const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text'); // transforms the html to a text

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Angel <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Used Brevos to send emails in production
      return nodemailer.createTransport({
        service: 'brevos',
        host: process.env.EMAIL_HOST_PROD,
        port: process.env.EMAIL_PORT_PROD,
        auth: {
          user: process.env.EMAIL_USERNAME_PROD,
          pass: process.env.EMAIL_PASSWORD_PROD,
        },
      });
    }

    return nodemailer.createTransport({
      // everything here is received from nodemailer.
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  send = async function (template, subject) {
    // 1) render HTML based on pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2) define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),
    };

    // 3) Create a transport to send email
    await this.newTransport().sendMail(mailOptions);
  };
  sendWelcome = async function () {
    await this.send('welcome', `Welcome to Natours ${this.firstName}!`);
  };

  sendPasswordReset = async function () {
    await this.send(
      'passwordReset',
      `Your password reset token (valid for only 10 minutes)`
    );
  };
};
