const mongoose = require('mongoose');
const { Schema } = mongoose;
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Define the user schema
const userSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email!'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email!'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password!'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password!'],
    select: false,
    validate: {
      // this only works on save and create
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords must match!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    // This is for deleting users without actually deleting them from the database
    type: Boolean,
    default: true,
    select: false,
  },
});

// We are pre-saving the password to hash it before saving it to the database!
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  // We want to find only the users that are active
  this.find({ active: { $ne: false } });
  next();
});

// Instance method to check if the password is correct
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  // this.password is not available because it was set to select: false
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // If the user has changed the password after the token was issued, then the token is invalid
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    // If the password has been changed after the token was issued, return true
    return changedTimestamp > JWTTimestamp;
  }

  // If the password hasn't been changed, return false
  return false;
};

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.createPasswordResetToken = function () {
  // Create a random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Encrypt the token and save it to the database
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  // Set the passwordResetExpires property to 10 minutes from now
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // Return the unencrypted token
  return resetToken;
};

// Export the user model
const User = mongoose.model('User', userSchema);
module.exports = User;
